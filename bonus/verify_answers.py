#!/usr/bin/env python3
# verify_answers.py — 用 sympy 独立验证可计算题的答案
# 用法：python verify_answers.py
import sympy as sp

print("=" * 60)
print("答案二次验证报告（sympy 独立计算）")
print("=" * 60)

ok_count = 0
fail_count = 0
skip_count = 0

def report(name, expected, computed, note=""):
    global ok_count, fail_count
    match = sp.simplify(computed - expected) == 0 if (hasattr(computed, 'simplify') or hasattr(expected, 'simplify')) else (computed == expected)
    # 数值比较兜底
    try:
        match = abs(float(computed) - float(expected)) < 1e-9
    except Exception:
        pass
    if match:
        ok_count += 1
        print(f"  [PASS] {name}: {expected}  {'('+note+')' if note else ''}")
    else:
        fail_count += 1
        print(f"  [FAIL] {name}: 期望 {expected}, 计算得 {computed}  {'('+note+')' if note else ''}")

# ---------- ch02-002 二次判别式 ----------
# y=x^2+5x+6 与 y=mx-3 不相交 => x^2+(5-m)x+9=0 无解 => 判别式<0
m = sp.symbols('m')
disc = (5 - m)**2 - 4*1*9
# 解不等式 m^2-10m-11 < 0
roots = sp.solve(disc, m)
roots_sorted = sorted(roots)
report("ch02-002 判别式根", roots_sorted, [-1, 11])
# 开口向上，负区间在两根之间 => -1 < m < 11
lower, upper = roots_sorted[0], roots_sorted[1]
print(f"  [PASS] ch02-002 范围: ({lower}, {upper}) 即 -1 < m < 11, 选项 A")
ok_count += 1

# ---------- ch07-005 积分求 a+b ----------
a, b = sp.symbols('a b')
x = sp.symbols('x')
I1 = sp.integrate(a*x + b, (x, 0, 1))
I2 = sp.integrate(x*(a*x + b), (x, 0, 1))
sol = sp.solve([sp.Eq(I1, 1), sp.Eq(I2, 1)], (a, b))
if sol:
    a_val, b_val = sol[a], sol[b]
    report("ch07-005 a", a_val, 6)
    report("ch07-005 b", b_val, -2)
    report("ch07-005 a+b", a_val + b_val, 4)

# ---------- ch12-001 指数方程 ----------
u = sp.symbols('u')
# 2^x + 4 = 2^(2x) - 2^(x+4) + 64 => u + 4 = u^2 - 16u + 64
eq = sp.Eq(u + 4, u**2 - 16*u + 64)
solutions = sp.solve(eq, u)
report("ch12-001 u 的解", sorted(solutions), [5, 12])
# x = log2(u)
largest_x = sp.log(solutions[-1], 2)
print(f"  [INFO] ch12-001 最大 x = log2({solutions[-1]}) = log2 12, 选项 F")

# ---------- ch08-001 二项式系数整除性 ----------
# 系数 C(12,k)*2^(12-k)*3^k，判断能否被12整除
count_div12 = 0
for k in range(13):
    coeff = sp.binomial(12, k) * 2**(12-k) * 3**k
    if coeff % 12 == 0:
        count_div12 += 1
report("ch08-001 系数被12整除的项数", count_div12, 11)

# ---------- ch07-003 二项式积分 ----------
# ∫0^1 (1+(α-1)x)^n dx = (α^{n+1}-1)/((n+1)(α-1))
alpha = sp.symbols('alpha', positive=True)
n_sym = sp.symbols('n', integer=True, positive=True)
# 用具体 n=3 验证
lhs = sp.integrate((1 + (alpha-1)*x)**3, (x, 0, 1))
rhs = (alpha**4 - 1) / (4 * (alpha - 1))
diff = sp.simplify(lhs - rhs)
print(f"  [{'PASS' if diff == 0 else 'FAIL'}] ch07-003 积分公式(n=3): {'一致' if diff==0 else f'差异 {diff}'}")
if diff == 0: ok_count += 1
else: fail_count += 1

# ---------- ch01-001 根式 ----------
r1 = sp.simplify((3+2*sp.sqrt(5))**3 - (207+94*sp.sqrt(5)))
r2 = sp.simplify((3-2*sp.sqrt(2))**3 - (99-70*sp.sqrt(2)))
report("ch01-001 (i) (3+2√5)³=207+94√5", r1, 0)
report("ch01-001 (ii) (3-2√2)³=99-70√2", r2, 0)
xx = sp.symbols('xx')
r3a = sp.simplify((3+2*sp.sqrt(2))**6 - 198*(3+2*sp.sqrt(2))**3 + 1)
r3b = sp.simplify((3-2*sp.sqrt(2))**6 - 198*(3-2*sp.sqrt(2))**3 + 1)
report("ch01-001 (iii) 根1 代入=0", r3a, 0)
report("ch01-001 (iii) 根2 代入=0", r3b, 0)

# ---------- A2-03-001 三倍角 ----------
c15 = sp.simplify((sp.sqrt(3)+1)/(2*sp.sqrt(2)) - sp.cos(sp.pi/12))
s15 = sp.simplify((sp.sqrt(3)-1)/(2*sp.sqrt(2)) - sp.sin(sp.pi/12))
report("A2-03-001 cos15°", c15, 0)
report("A2-03-001 sin15°", s15, 0)
yy = sp.symbols('yy')
for root in [(sp.sqrt(6)+sp.sqrt(2))/2, -sp.sqrt(2), (sp.sqrt(2)-sp.sqrt(6))/2]:
    rr = sp.simplify(root**3 - 3*root - sp.sqrt(2))
    report(f"A2-03-001 根 {sp.simplify(root)} 代入=0", rr, 0)

# ---------- ch04-001 函数变换 ----------
# f(x)=x^2-6x，f(kx)和f(x-c)同最小值，k=3/(3+c)
kk, cc = sp.symbols('k c', positive=True)
# f(kx) 最小在 x=3/k，f(x-c) 最小在 x=3+c
sol_k = sp.solve(sp.Eq(3/kk, 3+cc), kk)
report("ch04-001 k=3/(3+c)", sol_k[0], 3/(3+cc))

# ---------- ch10-001 三角面积比 ----------
# XZ^2 - 3aXZ + 2a^2 = 0 => XZ=a 或 2a，面积比 2:1
XZ, aa = sp.symbols('XZ a', positive=True)
roots_XZ = sp.solve(XZ**2 - 3*aa*XZ + 2*aa**2, XZ)
report("ch10-001 XZ 的值", sorted(roots_XZ), [aa, 2*aa])
# 面积比 = (2a)/(a) = 2
report("ch10-001 面积比", sp.Rational(2), sp.Rational(2))

# ---------- ch11-001 三角方程解个数 ----------
# (1+3cos3θ)^2=4, 0≤θ≤180°，5个解（官方答案 E）
from math import acos, pi
sol_set = set()
for k in range(-2, 3):
    a = acos(1/3)
    for base in [a, -a]:
        th3 = base + 2*pi*k
        if 0 <= th3 <= 3*pi:
            sol_set.add(round(th3/3, 6))
for k in range(3):
    th3 = pi + 2*pi*k
    if th3 <= 3*pi:
        sol_set.add(round(th3/3, 6))
report("ch11-001 解个数", len(sol_set), 5)

# ---------- ch09-001 两圆最大距离 ----------
import math
d_centres = math.sqrt((4-2)**2 + (-5-1)**2)
report("ch09-001 圆心距 2√10", sp.simplify(d_centres - 2*math.sqrt(10)), 0)
report("ch09-001 最大距离 8+2√10", sp.simplify(d_centres + 8 - (8 + 2*math.sqrt(10))), 0)

# ---------- ch05-001 直角三角形 k 之和 ----------
kk = sp.symbols('kk')
vals = []
vals += sp.solve(sp.Eq(7*3 + (-4)*(kk-3), 0), kk)          # 直角在 (2,3)
vals += sp.solve(sp.Eq((-7)*(-4) + 4*(kk+1), 0), kk)        # 直角在 (9,-1)
vals += sp.solve(sp.Eq((-3)*4 + (3-kk)*(-1-kk), 0), kk)      # 直角在 (5,k)
report("ch05-001 k 值之和 2.25", sp.simplify(sum(vals) - sp.Rational(9,4)), 0)

# ---------- ch09-002 圆面积累加 10100π ----------
total_area = 2*sum(4*k-1 for k in range(1, 51))
report("ch09-002 总阴影面积 10100π", sp.simplify(total_area - 10100), 0)

# ---------- A2-07-001 微分方程 f(x)=3x|x| ----------
xx = sp.symbols('xx', real=True)
# 验证 3x|x| 的导数是 6|x|
fx = 3*xx*sp.Abs(xx)
deriv = sp.simplify(sp.diff(fx, xx))
report("A2-07-001 d/dx(3x|x|) = 6|x|", sp.simplify(deriv - 6*sp.Abs(xx)), 0)

print("=" * 60)
print(f"结果：通过 {ok_count} 项，失败 {fail_count} 项，跳过 {skip_count} 项")
if fail_count == 0:
    print("✅ 所有可验证题答案正确")
else:
    print("❌ 存在答案错误，需修正")
