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
  // 去掉 LaTeX 换行空白，取前 maxLen 字符，截断到完整行
  const flat = statement.replace(/\n+/g, ' ').trim();
  if (flat.length <= maxLen) return flat;
  let cut = flat.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.6) cut = cut.slice(0, lastSpace);
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
    solutionStatus: q.solutionStatus || 'none',
    preview: makePreview(q.statement, 140)
  };
});

// 按 chapter 排序，再按 id 排序
entries.sort((a, b) => (a.chapter - b.chapter) || (a.id < b.id ? -1 : 1));

fs.writeFileSync(INDEX_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf8');
console.log(`Generated index.json with ${entries.length} questions.`);
entries.forEach(e => console.log(`  ch${e.chapter} ${e.id} — ${e.title}`));
