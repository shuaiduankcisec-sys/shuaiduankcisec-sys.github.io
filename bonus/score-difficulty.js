/*
 * score-difficulty.js — 难度评分系统（可解释、可复核、保留人工修改）
 *
 * 用法：
 *   node score-difficulty.js            # 全量报告：建议难度 vs 现标注，列出偏差
 *   node score-difficulty.js --fix      # 将建议难度写回题目的 difficulty 字段（可选，默认只报告）
 *
 * 评分规则（纯规则，可复现，不依赖 LLM）：
 *   基础分 1 星。
 *   A. 解法步骤数（solution 按换行 + 步骤衔接词切分）：
 *        0-1 步 +0.0   2-3 步 +0.5   4-5 步 +1.0   6-8 步 +1.5   >=9 步 +2.0
 *   B. 解法技巧等级（识别关键词）：
 *        基础技巧（代入/直接展开/套公式） +0.0
 *        中级技巧（换元/分部积分/因式分解/配方/求导求极值/判别式）+0.5
 *        高级技巧（数学归纳法/反证法/递推/参数方程/隐函数/向量叉积·三重积/夹逼/构造/对称性/极坐标） +1.0
 *        （可叠加，封顶 +1.5）
 *   C. 题干复杂度：
 *        多小问 (i)(ii)(iii) 或 "hence"/"deduce" 延伸： +0.5
 *        选择题（有 options）： -0.5
 *        题干长（statement 长度 > 260）： +0.3
 *   D. 解法衔接密度（solution 中 hence/therefore/thus/then/gives/so 等衔接词计数）：
 *        每 2 处 +0.2，封顶 +0.6
 *
 *   总分 = 1 + A + B + C + D，四舍五入到 0.5，再 clamp 到 [1,5]。
 */

const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, 'data', 'questions');

// 技巧关键词
const ADVANCED_TECH = [
  /mathematical induction/i, /induction/i, /by contradiction/i, /recurrence/i, /recurren/i,
  /parametric/i, /implicit/i, /cross product/i, /triple product/i, /scalar product/i,
  /sandwich/i, /squeeze/i, /construct/i, /symmetry/i, /polar coord/i, /reduce/i,
  /inverse function/i, /odd function/i, /even function/i, /self-inverse/i, /iteration/i,
  /method of differences/i, /telescop/i, /newton/i, /fixed-point/i, /auxiliary/i
];
const INTERMEDIATE_TECH = [
  /substitut/i, /integration by parts/i, /parts/i, /factoris/i, /factoriz/i, /complet/i, /square/i,
  /differentiat/i, /derivativ/i, /maxim/i, /minim/i, /discriminant/i, /partial fraction/i,
  /double-angle/i, /half-angle/i, /product-to-sum/i, /sum-to-product/i, /compound angle/i,
  /rationalis/i, /logarithm/i, /change of base/i, /separation of variables/i, /integrating factor/i
];

// 衔接词
const CONNECTORS = /\b(hence|therefore|thus|so|then|gives|yields|it follows|we get|obtain|so that|consequently)\b/gi;

function countSteps(solution) {
  if (!solution) return 0;
  // 按换行切分，过滤空行
  const lines = solution.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  // 每行可能含多个独立步骤（用 hence/then 等再粗切一次，仅统计衔接词数量作为额外步数信号）
  const connectorCount = (solution.match(CONNECTORS) || []).length;
  return Math.max(lines.length, Math.min(connectorCount + 1, 20));
}

function techScore(solution) {
  if (!solution) return 0;
  let s = 0;
  ADVANCED_TECH.forEach(re => { if (re.test(solution)) s += 0.5; });
  INTERMEDIATE_TECH.forEach(re => { if (re.test(solution)) s += 0.25; });
  return Math.min(s, 1.5);
}

function statementComplexity(q) {
  let s = 0;
  const st = q.statement || '';
  // 多小问
  if (/\(i\)|\(ii\)|\(iii\)|\(a\)|\(b\)|\(c\)|\bhence\b|\bdeduce\b|\bshow that .* and\b/i.test(st)) s += 0.5;
  // 选择题降低
  if (q.options && q.options.length > 0) s -= 0.5;
  // 题干长
  if (st.length > 260) s += 0.3;
  return s;
}

function connectorScore(solution) {
  if (!solution) return 0;
  const n = (solution.match(CONNECTORS) || []).length;
  return Math.min(Math.floor(n / 2) * 0.2, 0.6);
}

function suggestDifficulty(q) {
  const sol = q.solution || '';
  const steps = countSteps(sol);
  let A;
  if (steps <= 1) A = 0.0;
  else if (steps <= 3) A = 0.5;
  else if (steps <= 5) A = 1.0;
  else if (steps <= 8) A = 1.5;
  else A = 2.0;

  const B = techScore(sol);
  const C = statementComplexity(q);
  const D = connectorScore(sol);

  const raw = 1 + A + B + C + D;
  // 四舍五入到 0.5
  const rounded = Math.round(raw * 2) / 2;
  const clamped = Math.max(1, Math.min(5, rounded));
  return { raw, suggested: clamped, steps, tech: B, complexity: C, connectors: D };
}

function main() {
  const fix = process.argv.includes('--fix');
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
  let rows = [];
  files.forEach(f => {
    const q = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, f), 'utf8'));
    const r = suggestDifficulty(q);
    rows.push({ q, f, ...r });
  });

  // 偏差统计
  let changed = 0;
  let same = 0;
  console.log(`\n难度评分报告（共 ${rows.length} 题）\n`);
  console.log('规则：1 + 步骤分 + 技巧分 + 题干复杂度分 + 衔接分，四舍五入到 0.5，clamp [1,5]\n');

  const deviations = rows.filter(r => Math.abs(r.suggested - r.q.difficulty) >= 0.5)
    .sort((a, b) => (b.suggested - b.q.difficulty) - (a.suggested - a.q.difficulty));

  console.log(`=== 建议难度与现标注偏差 >= 0.5 的题（共 ${deviations.length} 道）===\n`);
  deviations.forEach(r => {
    const delta = r.suggested - r.q.difficulty;
    const arrow = delta > 0 ? '⬆建议升' : '⬇建议降';
    console.log(`  ${r.q.id.padEnd(12)} 章${String(r.q.chapter).padEnd(5)} 现${r.q.difficulty}星 -> 建议${r.suggested}星 (${arrow} ${Math.abs(delta).toFixed(1)})  [步骤${r.steps} 技巧${r.tech.toFixed(2)} 复杂度${r.complexity.toFixed(2)} 衔接${r.connectors.toFixed(1)}]`);
  });

  console.log(`\n=== 统计 ===`);
  const dist = {};
  rows.forEach(r => { const d = r.suggested; dist[d] = (dist[d] || 0) + 1; });
  console.log('建议难度分布:', JSON.stringify(dist));

  if (fix) {
    // 写回
    deviations.forEach(r => {
      r.q.difficulty = r.suggested;
      fs.writeFileSync(path.join(QUESTIONS_DIR, r.f), JSON.stringify(r.q, null, 2) + '\n', 'utf8');
    });
    console.log(`\n已用建议难度覆盖 ${deviations.length} 道题的 difficulty 字段（其余 ${rows.length - deviations.length} 道保持人工标注）。`);
    console.log('提示：若某些题你认为建议值不合理，可人工再改回（脚本保留人工修改空间）。');
  } else {
    console.log(`\n（当前为报告模式。加 --fix 参数可将建议难度写回题目 difficulty 字段。）`);
  }
}

main();
