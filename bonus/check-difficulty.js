/*
 * check-difficulty.js — 难度自评一致性校验
 *
 * 依据 DIFFICULTY-GUIDE.md 的「5 项是非打分法」。
 *
 * 每道题的 solution 中应含一行自评注释，格式：
 *   [难度自评: Q1否 Q2是 Q3是 Q4是 Q5否 → 3星]
 *
 * 本脚本：
 *   1. 解析自评注释里的 5 个 Q 答案（是/否）与箭头后的星数；
 *   2. 独立复算：得分 = "是"的个数，难度 = 1 + 得分；
 *   3. 核对：(a) 复算难度是否 = 自评星数；(b) 自评星数是否 = 题目的 difficulty 字段；
 *   4. 任一不符 → 报错。
 *
 * 用法：node check-difficulty.js
 */

const fs = require('fs');
const path = require('path');
const QUESTIONS_DIR = path.join(__dirname, 'data', 'questions');

const SELF_ASSESS_RE = /\[难度自评:\s*(Q[1-5][是否])\s*(Q[1-5][是否])\s*(Q[1-5][是否])\s*(Q[1-5][是否])\s*(Q[1-5][是否])\s*→\s*(\d)星\]/;

const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));

let errors = 0;
let checked = 0;
let missing = 0;

files.forEach(f => {
  const q = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, f), 'utf8'));
  const sol = q.solution || '';
  const m = sol.match(SELF_ASSESS_RE);

  if (!m) {
    missing++;
    console.log(`  [缺失自评] ${q.id} — solution 中未找到 "[难度自评: ...]" 注释`);
    return;
  }

  checked++;
  // m[1..5] 是 Q 答案，m[6] 是自评星数
  const answers = [m[1], m[2], m[3], m[4], m[5]];
  const yesCount = answers.filter(a => a.endsWith('是')).length;
  const computed = 1 + yesCount;
  const claimed = parseInt(m[6], 10);

  const claimedMatch = computed === claimed;
  const fieldMatch = claimed === q.difficulty;

  if (!claimedMatch) {
    errors++;
    console.log(`  [自评自相矛盾] ${q.id}: 5题中"是"${yesCount}个 → 难度应为${computed}星，但自评写${claimed}星`);
  }
  if (!fieldMatch) {
    errors++;
    console.log(`  [自评与字段不符] ${q.id}: 自评${claimed}星，但 difficulty 字段=${q.difficulty}`);
  }
  if (q.difficulty < 3) {
    errors++;
    console.log(`  [难度过低] ${q.id}: difficulty=${q.difficulty}，低于 3 星，按规范不应入库`);
  }
});

console.log(`\n========== 难度自评校验结果 ==========`);
console.log(`已核对: ${checked} 道 | 缺失自评: ${missing} 道 | 错误: ${errors}`);
if (errors > 0) {
  console.log('❌ 存在难度不一致，请修正');
  process.exit(1);
} else if (missing > 0) {
  console.log('⚠️ 有题目未写自评注释（新题建议补上；旧题可忽略）');
} else {
  console.log('✅ 全部难度自评一致');
}
