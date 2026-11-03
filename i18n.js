const i18n = {
  en: {
    brandName: "Demo User",
    brandSub: "· Demo",
    navAbout: "About", navExp: "Experience", navSkills: "Expertise",
    navAch: "Achievements", navContact: "Contact",

    homeTitle: "Demo User | Personal Site",
    homeDesc: "Demo personal site: experience, expertise and achievements.",
    heroName: "Demo User",
    heroRole: "Your Role · Your Focus",
    heroTag: "Your tagline goes here.",
    formulaTitle: "Favorite formula: Euler's identity",
    btnContact: "Contact", btnLearn: "Learn more",
    exploreTitle: "Explore",
    exAboutT: "About", exAboutD: "Who I am",
    exExpT: "Experience", exExpD: "Demo journey",
    exSkillsT: "Expertise", exSkillsD: "What I do best",
    exAchT: "Achievements", exAchD: "Results & awards",
    exContactT: "Contact", exContactD: "Get in touch",

    aboutPageTitle: "About · Demo User",
    aboutDesc: "About demo user.",
    aboutTitle: "About",
    aboutPlaceholder: "Content coming soon.",

    expPageTitle: "Experience · Demo User",
    expDesc: "Demo experience section.",
    expTitle: "Experience",
    exp1Title: "XX High School · Demo Role / Lead",
    exp1Time: "2021 — Present",
    exp1Desc: "Taught math for Grades 10–11; led curriculum development and mentoring of young teachers.",
    exp2Title: "XX Education · Demo Researcher",
    exp2Time: "2018 — 2021",
    exp2Desc: "Authored textbook exercises and exam analysis; built an online Q&A system.",

    skillsPageTitle: "Expertise · Demo User",
    skillsDesc: "Demo expertise section.",
    skillsTitle: "Expertise",
    sk1Title: "Algebra & Geometry", sk1Desc: "Systematic teaching of functions, sequences and analytic geometry.",
    sk2Title: "Exam Preparation", sk2Desc: "A Level / Gaokao past papers, topic breakdown and sprint strategies.",
    sk3Title: "Teaching Tools", sk3Desc: "Visual courseware built with LaTeX, GeoGebra and web tools.",
    sk4Title: "Curriculum Design", sk4Desc: "Tiered school-based courses and micro-lecture systems.",

    achPageTitle: "Achievements · Demo User",
    achDesc: "Demo achievements section.",
    achTitle: "Achievements",
    ach1: "Class average ranked top of grade for two consecutive years.",
    ach2: "Developed 30+ school-based micro-lectures covering core topics.",
    ach3: "Mentored students to multiple subject competition awards.",

    contactPageTitle: "Contact · Demo User",
    contactDesc: "Contact demo user.",
    contactTitle: "Contact",
    contactLede: "Feel free to reach out for teaching, research, or course inquiries.",
    cEmail: "Email", cWechat: "WeChat", cGithub: "GitHub",

    footerName: "Demo User", footerSite: "Personal Site",
    footerNote: "Deployed on GitHub Pages · Static site"
  },
  zh: {
    brandName: "示例用户",
    brandSub: "· 示例",
    navAbout: "关于", navExp: "经历", navSkills: "专长",
    navAch: "成果", navContact: "联系",

    homeTitle: "示例用户 | 个人主页",
    homeDesc: "示例个人主页：涵盖经历、专长与成果。",
    heroName: "示例用户",
    heroRole: "你的头衔 · 你的方向",
    heroTag: "在这里填写你的标语。",
    formulaTitle: "最喜欢的公式：欧拉恒等式",
    btnContact: "联系我", btnLearn: "了解更多",
    exploreTitle: "浏览",
    exAboutT: "关于", exAboutD: "关于我",
    exExpT: "经历", exExpD: "示例经历",
    exSkillsT: "专长", exSkillsD: "专长领域",
    exAchT: "成果", exAchD: "教学成果",
    exContactT: "联系", exContactD: "联系方式",

    aboutPageTitle: "关于 · 示例用户",
    aboutDesc: "示例用户的简介。",
    aboutTitle: "关于我",
    aboutPlaceholder: "内容整理中。",

    expPageTitle: "经历 · 示例用户",
    expDesc: "示例经历板块。",
    expTitle: "教学经历",
    exp1Title: "XX 中学 · 示例岗位 / 负责人",
    exp1Time: "2021 — 至今",
    exp1Desc: "负责高一、高二数学教学，牵头校本课程开发与青年教师带教。",
    exp2Title: "XX 机构 · 示例研究员",
    exp2Time: "2018 — 2021",
    exp2Desc: "参与教材配套练习与真题解析编写，搭建在线答疑体系。",

    skillsPageTitle: "专长 · 示例用户",
    skillsDesc: "示例专长板块。",
    skillsTitle: "专长领域",
    sk1Title: "代数与几何教学", sk1Desc: "函数、数列、解析几何的系统化讲解与题型归纳。",
    sk2Title: "真题与备考", sk2Desc: "A Level / 高考真题整理、考点拆解与冲刺策略。",
    sk3Title: "教研工具", sk3Desc: "用 LaTeX、GeoGebra、网页工具制作可视化课件。",
    sk4Title: "课程设计", sk4Desc: "面向不同层级的校本课程与微课体系搭建。",

    achPageTitle: "成果 · 示例用户",
    achDesc: "示例成果板块。",
    achTitle: "教学成果",
    ach1: "所带班级数学平均分连续两年位列年级前列。",
    ach2: "开发校本微课 30+ 节，覆盖核心考点。",
    ach3: "指导学生多人次在学科竞赛中获奖。",

    contactPageTitle: "联系 · 示例用户",
    contactDesc: "联系示例用户。",
    contactTitle: "联系方式",
    contactLede: "欢迎就教学、教研合作或课程咨询与我联系。",
    cEmail: "邮箱", cWechat: "微信", cGithub: "GitHub",

    footerName: "示例用户", footerSite: "个人主页",
    footerNote: "基于 GitHub Pages 部署 · 纯静态站点"
  }
};

const langBtn = document.getElementById('langBtn');
function setLang(lang) {
  const dict = i18n[lang] || i18n.en;
  document.documentElement.lang = (lang === 'zh') ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    const k = el.getAttribute('data-i18n');
    if (dict[k] != null) el.textContent = dict[k];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
    const k = el.getAttribute('data-i18n-title');
    if (dict[k] != null) el.setAttribute('title', dict[k]);
  });
  document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
    const parts = el.getAttribute('data-i18n-attr').split(':'); // attr:key
    if (dict[parts[1]] != null) el.setAttribute(parts[0], dict[parts[1]]);
  });
  if (langBtn) langBtn.textContent = (lang === 'zh') ? 'EN' : '中文';
  try { localStorage.setItem('lang', lang); } catch (e) {}
}

let current = 'en';
try { current = localStorage.getItem('lang') || 'en'; } catch (e) {}
setLang(current);

if (langBtn) {
  langBtn.addEventListener('click', function () {
    current = (current === 'zh') ? 'en' : 'zh';
    setLang(current);
  });
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
