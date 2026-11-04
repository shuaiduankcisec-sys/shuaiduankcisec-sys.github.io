/*
 * bonus-export.js — 导出预览 + 打印（生成 PDF）
 *
 * 提供 window.bonusExport.open(source)，source 为 'library' 或 project id。
 * 流程：收集题目 -> 设置对话框 -> 独立预览窗口（浏览器打印 -> 另存 PDF）
 *
 * 设置项：
 *   - 标题 / 封面标题 / 封面副标题 / 作者 / 机构
 *   - 内容：仅题目 / 题目+答案 / 仅答案（答案单独成册）
 *   - 是否标注题目来源
 *   - 版权信息（copyright）
 *   - 页眉 / 页脚文字
 *   - 目录按考试局（source）专题分类
 */
(function (global) {
  'use strict';

  var STR = {
    en: {
      exportSettings: 'Export settings',
      bookTitle: 'Book title', coverTitle: 'Cover title', coverSubtitle: 'Cover subtitle',
      author: 'Author', org: 'Institution / School',
      content: 'Content',
      contentQuestionsOnly: 'Questions only',
      contentQuestionsAnswers: 'Questions + answers',
      contentAnswersOnly: 'Answers only (separate)',
      showSource: 'Show question source',
      copyright: 'Copyright / footer note',
      headerText: 'Header text (left)',
      footerText: 'Footer text (right)',
      tocByBoard: 'Group table of contents by exam board',
      includeCover: 'Include cover page',
      includeToc: 'Include table of contents',
      pageNumbers: 'Page numbers',
      cancel: 'Cancel', preview: 'Preview', exportPdf: 'Export PDF',
      noExport: 'Nothing to export. Add questions to your library or project first.',
      solution: 'Solution', answers: 'Answers', tableOfContents: 'Table of Contents',
      cover: 'Cover', coverBg: 'Cover background', headerDefault: '', footerDefault: ''
    },
    zh: {
      exportSettings: '导出设置',
      bookTitle: '书名', coverTitle: '封面标题', coverSubtitle: '封面副标题',
      author: '作者', org: '机构 / 学校',
      content: '导出内容',
      contentQuestionsOnly: '仅题目',
      contentQuestionsAnswers: '题目 + 答案',
      contentAnswersOnly: '仅答案（单独成册）',
      showSource: '标注题目来源',
      copyright: '版权信息 / 页脚备注',
      headerText: '页眉文字（左）',
      footerText: '页脚文字（右）',
      tocByBoard: '目录按考试局分类',
      includeCover: '包含封面页',
      includeToc: '包含目录',
      pageNumbers: '页码',
      cancel: '取消', preview: '预览', exportPdf: '导出 PDF',
      noExport: '没有可导出的题目。请先在收藏或项目中添加题目。',
      solution: '解答', answers: '答案', tableOfContents: '目录',
      cover: '封面', coverBg: '封面背景', headerDefault: '', footerDefault: ''
    }
  };
  function s(key) {
    var lang = (global.getCurrentLang && global.getCurrentLang() === 'zh') ? 'zh' : 'en';
    return (STR[lang] && STR[lang][key]) || STR.en[key] || key;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function esc(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function sourceLabel(q) {
    if (q.source === 'Original') return 'Original';
    return q.source + (q.paper ? ' ' + q.paper : '');
  }
  function sourceClass(q) {
    var s = String(q.source || '').toLowerCase();
    if (s === 'step') return 'src-step';
    if (s === 'tmua') return 'src-tmua';
    if (s === 'mat') return 'src-mat';
    if (s === 'esat') return 'src-esat';
    return 'src-other';
  }
  function starsHTML(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += (i <= n) ? '★' : '☆';
    return s;
  }
  function chapterName(chapterId) {
    var app = global.bonusApp;
    if (app && app.getChapters) {
      var chs = app.getChapters();
      var found = chs.find(function (c) { return String(c.id) === String(chapterId); });
      if (found) return found.title;
    }
    return 'Chapter ' + chapterId;
  }

  function open(source) {
    var col = global.bonusCollection;
    var questions = col.resolveQuestions(source);
    if (!questions.length) {
      alert(s('noExport'));
      return;
    }
    var app = global.bonusApp;
    // load full questions and merge back the metadata (preview lives in index.json only)
    var loads = questions.map(function (q) { return app.loadQuestion(q.id); });
    Promise.all(loads).then(function (fullQuestions) {
      fullQuestions.forEach(function (full, i) {
        if (!full) return;
        // carry over metadata fields that only exist in index.json
        var meta = questions[i];
        if (!full.preview && meta && meta.preview) full.preview = meta.preview;
        if (!full.difficulty && meta) full.difficulty = meta.difficulty;
        if (meta) full._chapterTitle = chapterName(meta.chapter);
      });
      showSettings(source, fullQuestions);
    });
  }

  // cover background presets
  var COVER_BG = [
    { id: 'plain', label: { en: 'Plain white', zh: '纯白' }, css: 'background:#fff;color:#1a1a1a;' },
    { id: 'navy', label: { en: 'Deep blue', zh: '深蓝' }, css: 'background:linear-gradient(160deg,#1e3a5f,#2c5f8a);color:#fff;' },
    { id: 'purple', label: { en: 'Purple', zh: '紫色' }, css: 'background:linear-gradient(160deg,#4a2d7a,#7b4fb0);color:#fff;' },
    { id: 'green', label: { en: 'Green', zh: '绿色' }, css: 'background:linear-gradient(160deg,#0f4c3a,#1d9e75);color:#fff;' },
    { id: 'ink', label: { en: 'Charcoal', zh: '墨黑' }, css: 'background:linear-gradient(160deg,#1a1a1a,#3a3a3a);color:#fff;' },
    { id: 'warm', label: { en: 'Warm sand', zh: '暖沙' }, css: 'background:linear-gradient(160deg,#f7f3ec,#e8dcc8);color:#5a4632;' }
  ];

  function coverBgCss(id) {
    var found = COVER_BG.find(function (b) { return b.id === id; });
    return found ? found.css : COVER_BG[0].css;
  }
  function coverBgLabel(id) {
    var lang = (global.getCurrentLang && global.getCurrentLang() === 'zh') ? 'zh' : 'en';
    var found = COVER_BG.find(function (b) { return b.id === id; });
    return found ? found.label[lang] : id;
  }

  function showSettings(source, questions) {
    var isProject = source !== 'library';
    var project = isProject ? global.bonusCollection.findProject(source) : null;

    var overlay = document.createElement('div');
    overlay.className = 'bq-export-overlay';

    // ---- left: settings panel ----
    var panel = el('div', 'bq-export-panel');
    panel.appendChild(el('h3', null, s('exportSettings')));

    var defaults = isProject
      ? {
          title: project ? (project.title || 'Untitled book') : 'Untitled book',
          author: project ? project.author : '',
          org: project ? project.org : '',
          coverTitle: project ? (project.coverTitle || project.title || '') : '',
          coverSubtitle: project ? project.coverSubtitle : '',
          copyright: project ? (project.copyright || '') : '',
          coverBg: project && project.coverBg ? project.coverBg : 'navy'
        }
      : {
          title: 'Bonus Questions', author: '', org: '',
          coverTitle: 'Bonus Questions', coverSubtitle: 'Selected Practice Problems',
          copyright: '', coverBg: 'navy'
        };

    var settings = {
      title: defaults.title, author: defaults.author, org: defaults.org,
      coverTitle: defaults.coverTitle, coverSubtitle: defaults.coverSubtitle,
      copyright: defaults.copyright, coverBg: defaults.coverBg,
      content: 'qa', includeCover: true, includeToc: true, tocByBoard: true,
      showSource: true, pageNumbers: true, headerText: '', footerText: ''
    };

    function field(label, key) {
      var wrap = el('div', 'bq-field');
      wrap.appendChild(el('label', 'bq-field-label', label));
      var input = el('input');
      input.type = 'text';
      input.value = settings[key] || '';
      input.addEventListener('input', function () {
        settings[key] = input.value;
        rerender();
      });
      wrap.appendChild(input);
      return wrap;
    }
    function checkbox(label, key) {
      var wrap = el('label', 'bq-field bq-field-check');
      var input = el('input');
      input.type = 'checkbox';
      input.checked = !!settings[key];
      input.addEventListener('change', function () {
        settings[key] = input.checked;
        rerender();
      });
      wrap.appendChild(input);
      wrap.appendChild(el('span', null, label));
      return wrap;
    }
    function selectField(label, key, options, val) {
      var wrap = el('div', 'bq-field');
      wrap.appendChild(el('label', 'bq-field-label', label));
      var sel = el('select');
      options.forEach(function (o) {
        var op = el('option', null, o.label);
        op.value = o.v;
        sel.appendChild(op);
      });
      sel.value = val || options[0].v;
      sel.addEventListener('change', function () {
        settings[key] = sel.value;
        rerender();
      });
      wrap.appendChild(sel);
      return wrap;
    }

    // 1. book info
    panel.appendChild(el('div', 'bq-export-sec', s('bookTitle')));
    panel.appendChild(field(s('bookTitle'), 'title'));
    panel.appendChild(field(s('author'), 'author'));
    panel.appendChild(field(s('org'), 'org'));

    // 2. cover (only for projects, but harmless for library)
    panel.appendChild(el('div', 'bq-export-sec', s('cover')));
    panel.appendChild(field(s('coverTitle'), 'coverTitle'));
    panel.appendChild(field(s('coverSubtitle'), 'coverSubtitle'));
    // cover background swatches
    var bgWrap = el('div', 'bq-field');
    bgWrap.appendChild(el('label', 'bq-field-label', s('coverBg')));
    var swatches = el('div', 'bq-cover-swatches');
    COVER_BG.forEach(function (bg) {
      var sw = el('button', 'bq-cover-swatch' + (settings.coverBg === bg.id ? ' active' : ''));
      sw.type = 'button';
      sw.title = coverBgLabel(bg.id);
      sw.setAttribute('style', bg.css);
      sw.addEventListener('click', function () {
        settings.coverBg = bg.id;
        swatches.querySelectorAll('.bq-cover-swatch').forEach(function (x) { x.classList.remove('active'); });
        sw.classList.add('active');
        rerender();
      });
      swatches.appendChild(sw);
    });
    bgWrap.appendChild(swatches);
    panel.appendChild(bgWrap);
    panel.appendChild(checkbox(s('includeCover'), 'includeCover'));

    // 3. content
    panel.appendChild(el('div', 'bq-export-sec', s('content')));
    panel.appendChild(selectField(s('content'), 'content', [
      { v: 'qa', label: s('contentQuestionsAnswers') },
      { v: 'q', label: s('contentQuestionsOnly') },
      { v: 'a', label: s('contentAnswersOnly') }
    ], 'qa'));

    // 4. TOC
    panel.appendChild(el('div', 'bq-export-sec', s('tableOfContents')));
    panel.appendChild(checkbox(s('includeToc'), 'includeToc'));
    panel.appendChild(checkbox(s('tocByBoard'), 'tocByBoard'));
    panel.appendChild(checkbox(s('showSource'), 'showSource'));
    panel.appendChild(checkbox(s('pageNumbers'), 'pageNumbers'));

    // 5. header / footer
    panel.appendChild(el('div', 'bq-export-sec', s('headerText')));
    panel.appendChild(field(s('headerText'), 'headerText'));
    panel.appendChild(field(s('footerText'), 'footerText'));
    panel.appendChild(field(s('copyright'), 'copyright'));

    // actions
    var btns = el('div', 'bq-modal-actions');
    var close = el('button', 'bq-btn', s('cancel'));
    close.type = 'button';
    close.addEventListener('click', function () { overlay.remove(); });
    var print = el('button', 'bq-btn bq-btn-primary', s('exportPdf'));
    print.type = 'button';
    print.addEventListener('click', function () { doPrint(); });
    btns.appendChild(close);
    btns.appendChild(print);
    panel.appendChild(btns);

    // ---- right: live preview ----
    var previewWrap = el('div', 'bq-export-preview');
    var frame = document.createElement('iframe');
    frame.className = 'bq-export-frame';
    frame.setAttribute('title', s('preview'));
    previewWrap.appendChild(frame);

    overlay.appendChild(panel);
    overlay.appendChild(previewWrap);
    document.body.appendChild(overlay);

    // render preview (debounced)
    var renderTimer = null;
    function rerender() {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(renderPreview, 250);
    }
    function renderPreview() {
      var built = buildDoc(questions, settings);
      var html = '<!DOCTYPE html>\n' + built.doc.documentElement.outerHTML;
      frame.contentDocument.open();
      frame.contentDocument.write(html);
      frame.contentDocument.close();
      renderMathInFrame(frame);
    }
    function renderMathInFrame(f) {
      try {
        var fd = f.contentDocument;
        var w = f.contentWindow;
        if (w && w.renderMathInElement) {
          w.renderMathInElement(fd.body, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false
          });
          return;
        }
        // KaTeX not in frame yet — inject scripts
        var katexJs = document.querySelector('script[src*="katex.min.js"]');
        var autoRender = document.querySelector('script[src*="auto-render.min.js"]');
        if (katexJs && !fd.querySelector('script[src*="katex.min.js"]')) {
          var sc1 = fd.createElement('script');
          sc1.src = katexJs.src;
          fd.head.appendChild(sc1);
          if (autoRender) {
            var sc2 = fd.createElement('script');
            sc2.src = autoRender.src;
            sc2.onload = function () {
              if (w.renderMathInElement) w.renderMathInElement(fd.body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
            };
            fd.head.appendChild(sc2);
          }
        }
      } catch (e) { /* ignore */ }
    }
    function doPrint() {
      // print from the preview iframe
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) {
        // fallback: open in a new window
        var built = buildDoc(questions, settings);
        var w = global.open('', '_blank');
        if (w) {
          w.document.write('<!DOCTYPE html>\n' + built.doc.documentElement.outerHTML);
          w.document.close();
        }
      }
    }

    // initial render
    renderPreview();
  }

  // ---------- build the exported document ----------
  function buildDoc(questions, settings) {
    var doc = document.implementation.createHTMLDocument('book');
    doc.head.innerHTML = '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">';

    // KaTeX CSS
    var katexCss = document.querySelector('link[href*="katex.min.css"]');
    if (katexCss) {
      var link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = katexCss.href;
      doc.head.appendChild(link);
    }
    // KaTeX script (for rendering in the new window)
    var katexJs = document.querySelector('script[src*="katex.min.js"]');
    var autoRender = document.querySelector('script[src*="auto-render.min.js"]');

    var style = doc.createElement('style');
    style.textContent = EXPORT_CSS;
    doc.head.appendChild(style);

    var body = doc.body;
    var content = settings.content || 'qa'; // qa | q | a

    // ---- cover ----
    if (settings.includeCover) {
      var cover = doc.createElement('section');
      cover.className = 'cover';
      cover.setAttribute('style', coverBgCss(settings.coverBg || 'plain'));
      var isDark = (settings.coverBg || 'plain') !== 'plain' && (settings.coverBg || 'plain') !== 'warm';
      cover.innerHTML =
        '<div class="cover-inner">' +
        '<div class="cover-org">' + esc(settings.org || '') + '</div>' +
        '<h1 class="cover-title">' + esc(settings.coverTitle || settings.title || '') + '</h1>' +
        '<div class="cover-subtitle">' + esc(settings.coverSubtitle || '') + '</div>' +
        '<div class="cover-author">' + esc(settings.author || '') + '</div>' +
        (settings.copyright ? '<div class="cover-copy">' + esc(settings.copyright) + '</div>' : '') +
        '</div>';
      body.appendChild(cover);
    }

    // ---- TOC ----
    if (settings.includeToc) {
      var toc = doc.createElement('section');
      toc.className = 'toc';
      toc.innerHTML = '<h1>' + s('tableOfContents') + '</h1>';
      var tocList = doc.createElement('ol');
      tocList.className = 'toc-list';

      // make a readable title for a question: chapter title + statement snippet
      function tocTitle(q, i) {
        var snippet = q.preview || q.statement || '';
        // strip LaTeX dollars for the TOC (keep it readable, no math)
        var plain = String(snippet).replace(/\$\$?/g, '').replace(/\s+/g, ' ').trim();
        if (plain.length > 70) plain = plain.slice(0, 70) + '…';
        var chap = q._chapterTitle || chapterName(q.chapter) || '';
        if (chap) return chap + (plain ? ' — ' + plain : '');
        return plain || ('Question ' + (i + 1));
      }

      if (settings.tocByBoard) {
        // group by exam board (source)
        var groups = {};
        questions.forEach(function (q, i) {
          var key = q.source || 'Other';
          if (!groups[key]) groups[key] = [];
          groups[key].push({ q: q, i: i });
        });
        Object.keys(groups).forEach(function (key) {
          var gh = doc.createElement('li');
          gh.className = 'toc-group';
          gh.innerHTML = '<span class="toc-group-name">' + esc(key) + '</span>';
          tocList.appendChild(gh);
          groups[key].forEach(function (item) {
            var li = doc.createElement('li');
            li.innerHTML = '<span class="toc-num">' + (item.i + 1) + '</span>' +
              '<span class="toc-title">' + esc(tocTitle(item.q, item.i)) + '</span>' +
              '<span class="toc-dots"></span>';
            tocList.appendChild(li);
          });
        });
      } else {
        questions.forEach(function (q, i) {
          var li = doc.createElement('li');
          li.innerHTML = '<span class="toc-num">' + (i + 1) + '</span>' +
            '<span class="toc-title">' + esc(tocTitle(q, i)) + '</span>' +
            '<span class="toc-dots"></span>';
          tocList.appendChild(li);
        });
      }
      toc.appendChild(tocList);
      body.appendChild(toc);
    }

    // ---- questions ----
    questions.forEach(function (q, i) {
      var sec = doc.createElement('section');
      sec.className = 'question-page';
      sec.setAttribute('data-qid', q.id);

      var h = doc.createElement('div');
      h.className = 'q-head';
      var headHtml = '<span class="q-no">' + (i + 1) + '</span>';
      if (settings.showSource) {
        headHtml += '<span class="q-src ' + sourceClass(q) + '">' + esc(sourceLabel(q)) + (q.year ? ' ' + q.year : '') + '</span>';
      }
      headHtml += '<span class="q-stars">' + starsHTML(q.difficulty) + '</span>';
      h.innerHTML = headHtml;
      sec.appendChild(h);

      if (content === 'qa' || content === 'q') {
        var stmt = doc.createElement('div');
        stmt.className = 'q-statement';
        stmt.textContent = q.statement || '';
        sec.appendChild(stmt);

        if (q.options && q.options.length) {
          var opts = doc.createElement('div');
          opts.className = 'q-options';
          var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          q.options.forEach(function (opt, k) {
            var row = doc.createElement('div');
            row.className = 'q-option';
            row.innerHTML = '<span class="q-opt-label">' + letters[k] + '</span><span>' + esc(opt) + '</span>';
            opts.appendChild(row);
          });
          sec.appendChild(opts);
        }
      }

      if (content === 'qa' || content === 'a') {
        if (q.solution) {
          var sol = doc.createElement('div');
          sol.className = 'q-solution';
          sol.innerHTML = '<div class="q-sol-title">' + s('solution') + '</div>';
          var solBody = doc.createElement('div');
          solBody.textContent = q.solution || '';
          sol.appendChild(solBody);
          sec.appendChild(sol);
        }
      }
      body.appendChild(sec);
    });

    // footer copyright (also on last page)
    if (settings.copyright) {
      var foot = doc.createElement('div');
      foot.className = 'doc-copyright';
      foot.textContent = settings.copyright;
      body.appendChild(foot);
    }

    return { doc: doc, headerText: settings.headerText || '', footerText: settings.footerText || '' };
  }

  // ---------- open preview in a new window ----------
  var EXPORT_CSS = [
    '@page { size: A4; margin: 18mm 16mm; }',
    '@page { @top-left { content: string(header); font-size: 9pt; color: #666; } }',
    '@page { @top-right { content: string(pagetitle); font-size: 9pt; color: #666; } }',
    '@page { @bottom-center { content: counter(page); font-size: 9pt; color: #666; } }',
    'body { font-family: "Segoe UI", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1a1a1a; margin: 0; font-size: 13px; }',
    'section { page-break-after: always; }',
    'section:last-of-type { page-break-after: auto; }',
    '.cover { height: 92vh; display: flex; align-items: center; justify-content: center; text-align: center; page-break-after: always; }',
    '.cover-inner { padding: 40px; }',
    '.cover-org { font-size: 14px; letter-spacing: 3px; color: inherit; opacity: 0.75; margin-bottom: 40px; text-transform: uppercase; }',
    '.cover-title { font-size: 38px; font-weight: 700; margin: 0 0 16px; line-height: 1.25; color: inherit; }',
    '.cover-subtitle { font-size: 17px; color: inherit; opacity: 0.85; margin-bottom: 48px; }',
    '.cover-author { font-size: 15px; color: inherit; opacity: 0.9; }',
    '.cover-copy { margin-top: 60px; font-size: 11px; color: inherit; opacity: 0.6; }',
    '.toc h1 { font-size: 22px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }',
    '.toc-list { list-style: none; padding: 0; }',
    '.toc-list li { display: flex; align-items: baseline; padding: 6px 0; font-size: 13px; }',
    '.toc-group { font-weight: 700; color: #185FA5; padding: 12px 0 4px; border-bottom: 1px solid #eee; margin-top: 8px; }',
    '.toc-num { color: #999; width: 32px; flex-shrink: 0; }',
    '.toc-title { flex: 1; }',
    '.toc-dots { flex: 1; border-bottom: 1px dotted #bbb; margin: 0 8px; }',
    '.question-page { padding: 10px 0; }',
    '.q-head { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 14px; }',
    '.q-no { font-weight: 700; font-size: 17px; color: #333; }',
    '.q-src { color: #fff; font-size: 11px; padding: 2px 10px; border-radius: 999px; font-weight: 600; }',
    '.q-src.src-step { background: #7F77DD; }',
    '.q-src.src-tmua { background: #378ADD; }',
    '.q-src.src-mat { background: #1D9E75; }',
    '.q-src.src-esat { background: #BA7517; }',
    '.q-src.src-other { background: #888780; }',
    '.q-stars { margin-left: auto; color: #e0a800; font-size: 13px; }',
    '.q-statement { font-size: 13px; line-height: 1.7; }',
    '.q-statement p { margin: 0 0 10px; }',
    '.q-options { margin-top: 10px; }',
    '.q-option { display: flex; gap: 10px; padding: 3px 0; font-size: 13px; }',
    '.q-opt-label { font-weight: 600; color: #666; width: 20px; }',
    '.q-solution { margin-top: 18px; border-top: 1px solid #eee; padding-top: 12px; }',
    '.q-sol-title { font-weight: 700; color: #333; margin-bottom: 8px; }',
    '.q-solution { font-size: 13px; line-height: 1.7; color: #333; }',
    '.doc-copyright { text-align: center; font-size: 10px; color: #999; padding: 20px 0; }',
    '.katex-display { overflow-x: auto; overflow-y: hidden; }'
  ].join('\n');

  global.bonusExport = { open: open };
})(window);
