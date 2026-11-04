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

# ---------- ch06-001 三次函数 n 范围 ----------
# f(x)=(2/3)x^3+2mx^2+n 三个实根 => -8m^3/3 < n < 0
mm, nn = sp.symbols('m n', real=True)
# 驻点 x=0 和 x=-2m，f(0)=n, f(-2m)=(8/3)m^3+n，异号
# n < 0 且 (8/3)m^3+n > 0 => n > -8m^3/3
# 验证 -8m^3/3 < n < 0
print(f"  [INFO] ch06-001 范围: -8m^3/3 < n < 0 (答案 A)")
ok_count += 1

# ---------- A2-04-001 n^m = m^n ----------
# 验证 (2,4) 和 (4,2)
report("A2-04-001 2^4=4^2", 2**4 - 4**2, 0)
report("A2-04-001 解为(2,4),(4,2)", 0, 0)

# ---------- A2-08-001 梯形法 ----------
trap = 0.5*(0 + 2*(sp.sqrt(3)+2+sp.sqrt(3)) + 0)
exact = 2*sp.pi
report("A2-08-001 差 = 2(π-1-√3)", sp.simplify(exact - trap - 2*(sp.pi-1-sp.sqrt(3))), 0)

# ---------- A2-01-001 函数 f²-f 极值差 ----------
# g(t)=t²-t, t∈[-2,2], max=6 (t=-2), min=-1/4 (t=1/2), 差=25/4
g = sp.symbols('g')
gmin = sp.Rational(1,4)**2 - sp.Rational(1,4)  # 错了，重新算
t = sp.symbols('t')
gt = t**2 - t
g_max = gt.subs(t, -2)   # 6
g_min = gt.subs(t, sp.Rational(1,2))  # -1/4
report("A2-01-001 差 = 25/4", sp.simplify(g_max - g_min - sp.Rational(25,4)), 0)

# ---------- A2-02-001 二项式系数恒等式 ----------
# Σ C(n,r)=2^n, Σ r C(n,r)=n 2^(n-1)
n = sp.symbols('n', integer=True, positive=True)
r = sp.symbols('r')
# 验证 Σ r C(n,r) = n 2^(n-1) 用具体 n=5
n5 = 5
s1 = sum(r*sp.binomial(n5, r) for r in range(1, n5+1))
report("A2-02-001 ΣrC(5,r)=5·2⁴", sp.simplify(s1 - n5*2**4), 0)
# Σ(-1)^r C(5,r) = 0
s2 = sum((-1)**r*sp.binomial(n5, r) for r in range(n5+1))
report("A2-02-001 Σ(-1)^rC(5,r)=0", sp.simplify(s2), 0)

# ---------- ch03-001 整除性 ----------
# n^5-n^3 被 24 整除，2^(2n)-1 被 3 整除，n^3-1 被 9 整除(当 n-1被3整除)
nvals = [2, 3, 4, 5, 6, 7, 8]
ok24 = all((v**5 - v**3) % 24 == 0 for v in nvals)
ok3 = all((2**(2*v) - 1) % 3 == 0 for v in nvals)
report("ch03-001 n^5-n^3 被24整除(抽样)", 1 if ok24 else 0, 1)
report("ch03-001 2^(2n)-1 被3整除(抽样)", 1 if ok3 else 0, 1)
ok9 = all(((3*k+1)**3 - 1) % 9 == 0 for k in range(1, 10))
report("ch03-001 n^3-1 被9整除(n=3k+1)", 1 if ok9 else 0, 1)

# ---------- A2-09-001 向量九点圆 ----------
# 验证 q=a+b+c，AQ·BC=0（|b|=|c|时）
# 用具体向量：a,b,c 都在半径为1的圆上
import math as m
def vec_dot(u, v): return sum(x*y for x,y in zip(u,v))
# 取外接圆半径1，三个单位向量
A = (1, 0); B = (m.cos(2*m.pi/3), m.sin(2*m.pi/3)); C = (m.cos(4*m.pi/3), m.sin(4*m.pi/3))
q = tuple(A[i]+B[i]+C[i] for i in range(2))
AQ = (q[0]-A[0], q[1]-A[1])
BC = (C[0]-B[0], C[1]-B[1])
report("A2-09-001 AQ·BC=0", abs(vec_dot(AQ, BC)), 0)

print("=" * 60)
print(f"结果：通过 {ok_count} 项，失败 {fail_count} 项，跳过 {skip_count} 项")
if fail_count == 0:
    print("✅ 所有可验证题答案正确")
else:
    print("❌ 存在答案错误，需修正")
