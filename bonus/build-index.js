// build-index.js — 从 bonus/data/questions/*.json 自动生成 index.json
// 用法：node build-index.js
// 生成的 index.json 每项包含 preview（题目开头几行，用于列表直接显示）。
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_DIR = path.join(DATA_DIR, 'questions');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');

function makePreview(statement, maxLen) {
  if (!statement) return '';
  // flatten display math ($$...$$) to inline ($...$) so the preview stays compact
  let flat = statement.replace(/\$\$([^$]+)\$\$/g, '$ $1$ ');
  flat = flat.replace(/\n+/g, ' ').trim();
  if (flat.length <= maxLen) return flat;
  let cut = flat.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.6) cut = cut.slice(0, lastSpace);
  // if there's an odd number of $ delimiters, the last one is unclosed — trim it
  const dollars = (cut.match(/\$/g) || []).length;
  if (dollars % 2 === 1) {
    cut = cut.slice(0, cut.lastIndexOf('$'));
  }
  return cut + '…';
}

const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
const entries = files.map(f => {
  const q = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, f), 'utf8'));
  return {
    id: q.id,
    chapter: q.chapter,
    title: q.title,
    source: q.source,
    paper: q.paper || '',
    year: q.year || null,
    level: q.level,
    difficulty: q.difficulty,
    topics: q.topics || [],
    methods: q.methods || [],
    solutionStatus: q.solutionStatus || 'none',
    preview: makePreview(q.statement, 140)
  };
});

// sort by chapter (numeric AS first, then A2 string ids), then by id
entries.sort((a, b) => {
  const ca = String(a.chapter), cb = String(b.chapter);
  if (ca !== cb) {
    const na = Number(a.chapter), nb = Number(b.chapter);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    if (Number.isFinite(na)) return -1;
    if (Number.isFinite(nb)) return 1;
    return ca < cb ? -1 : 1;
  }
  return a.id < b.id ? -1 : 1;
});

fs.writeFileSync(INDEX_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf8');
console.log(`Generated index.json with ${entries.length} questions.`);
entries.forEach(e => console.log(`  ch${e.chapter} ${e.id} — ${e.title}`));
