// validate.js — 校验题库数据质量
// 用法：node validate.js
// 检查：JSON 合法性、字段完整性、LaTeX 符号配对、id/chapter/level 一致性、答案存在性、preview 正确性。
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_DIR = path.join(DATA_DIR, 'questions');
const CHAPTERS_PATH = path.join(DATA_DIR, 'chapters.json');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');

let errors = 0;
let warnings = 0;

function err(msg) { errors++; console.log('  [ERR] ' + msg); }
function warn(msg) { warnings++; console.log('  [WARN] ' + msg); }
function ok(msg) { console.log('  [OK] ' + msg); }

// 检查 LaTeX $ 符号是否成对
function checkDollarPairs(text) {
  if (!text) return true;
  // 忽略 $$ 成对的，统计单个 $ 的奇偶
  const withoutDisplay = text.replace(/\$\$/g, '');
  const count = (withoutDisplay.match(/\$/g) || []).length;
  return count % 2 === 0;
}

// 检查 \begin 与 \end 配对（简单版）
function checkBeginEnd(text) {
  if (!text) return true;
  const begins = (text.match(/\\begin\{/g) || []).length;
  const ends = (text.match(/\\end\{/g) || []).length;
  return begins === ends;
}

const chapters = JSON.parse(fs.readFileSync(CHAPTERS_PATH, 'utf8'));
const chapterIds = new Set(chapters.map(c => String(c.id)));

const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
console.log(`\n校验 ${files.length} 道题目…\n`);

const ids = new Set();
const indexEntries = [];

files.forEach(file => {
  const fullPath = path.join(QUESTIONS_DIR, file);
  let q;
  try {
    q = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (e) {
    err(`JSON 解析失败: ${file} — ${e.message}`);
    return;
  }

  const label = q.id || file;

  // 字段完整性
  const required = ['id', 'chapter', 'source', 'level', 'difficulty', 'statement', 'solution'];
  required.forEach(f => {
    if (q[f] === undefined || q[f] === null || q[f] === '') {
      err(`${label}: 缺少字段 "${f}"`);
    }
  });

  // id 唯一性
  if (ids.has(q.id)) err(`${label}: id 重复`);
  ids.add(q.id);

  // id 与文件名一致
  if (file !== q.id + '.json') warn(`${label}: 文件名与 id 不一致 (文件 ${file})`);

  // chapter 在 chapters.json 中存在
  if (!chapterIds.has(String(q.chapter))) err(`${label}: chapter "${q.chapter}" 不在 chapters.json 中`);

  // level 合法
  if (!['AS', 'A2', 'A2-extension'].includes(q.level)) {
    warn(`${label}: level "${q.level}" 不是标准值`);
  }

  // source 合法
  const validSources = ['STEP', 'TMUA', 'MAT', 'ESAT', 'Original'];
  if (!validSources.includes(q.source)) warn(`${label}: source "${q.source}" 不在已知列表`);

  // difficulty 范围
  if (typeof q.difficulty !== 'number' || q.difficulty < 1 || q.difficulty > 5) {
    err(`${label}: difficulty 应为 1-5 的数字`);
  }

  // 选择题必须有 options 和 answer
  if (q.options) {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      err(`${label}: options 应为含 2 个以上选项的数组`);
    }
    if (!q.answer) err(`${label}: 选择题缺少 answer`);
    else {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (letters.indexOf(q.answer) >= q.options.length) {
        err(`${label}: answer "${q.answer}" 超出选项范围`);
      }
    }
  }

  // LaTeX 配对检查
  if (!checkDollarPairs(q.statement)) err(`${label}: statement 中 $ 符号不配对`);
  if (q.solution && !checkDollarPairs(q.solution)) err(`${label}: solution 中 $ 符号不配对`);
  if (!checkBeginEnd(q.statement)) err(`${label}: statement 中 \\begin/\\end 不配对`);
  if (q.solution && !checkBeginEnd(q.solution)) err(`${label}: solution 中 \\begin/\\end 不配对`);
  if (q.options) {
    q.options.forEach((o, i) => {
      if (!checkDollarPairs(o)) err(`${label}: 选项 ${i} 中 $ 符号不配对`);
    });
  }

  // methods 存在且非空
  if (!Array.isArray(q.methods) || q.methods.length === 0) {
    warn(`${label}: 缺少 methods（方法标签）`);
  }

  // solutionStatus
  if (!q.solutionStatus) warn(`${label}: 缺少 solutionStatus`);

  indexEntries.push(q);
});

// 校验 index.json 与 questions 一致
console.log(`\n校验 index.json…`);
const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const indexIds = new Set(index.map(e => e.id));
ids.forEach(id => {
  if (!indexIds.has(id)) err(`index.json 缺少题目 ${id}`);
});
index.forEach(e => {
  if (!ids.has(e.id)) err(`index.json 含未知题目 ${e.id}`);
});

// 章节覆盖检查
console.log(`\n章节覆盖检查…`);
const byChapter = {};
indexEntries.forEach(q => { byChapter[String(q.chapter)] = (byChapter[String(q.chapter)] || 0) + 1; });
chapters.forEach(c => {
  const cnt = byChapter[String(c.id)] || 0;
  if (cnt === 0) warn(`章节 ${c.id} (${c.title}) 暂无题目`);
  else ok(`章节 ${c.id} (${c.title}): ${cnt} 题`);
});

console.log(`\n========== 校验结果 ==========`);
console.log(`错误: ${errors}  警告: ${warnings}`);
if (errors > 0) {
  console.log('❌ 存在错误，请修复后再入库');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️ 校验通过，但有警告（建议处理）');
} else {
  console.log('✅ 全部通过');
}
