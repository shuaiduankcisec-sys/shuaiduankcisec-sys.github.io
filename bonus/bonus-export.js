/*
 * bonus-export.js — 导出预览 + 浏览器打印（生成 PDF）
 *
 * 提供 window.bonusExport.open(source)，source 为 'library' 或 project id。
 * 流程：收集题目 -> 设置对话框(封面/标题/作者/机构) -> 打印视图(封面+目录+题目+页码) -> window.print()
 */
(function (global) {
  'use strict';

  // 打印时使用一个隐藏的 iframe，避免干扰主页面
  var printFrame = null;

  function getPrintFrame() {
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.setAttribute('aria-hidden', 'true');
      printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
      document.body.appendChild(printFrame);
    }
    return printFrame;
  }

  function open(source) {
    var col = global.bonusCollection;
    var questions = col.resolveQuestions(source);
    if (!questions.length) {
      var lang0 = (global.getCurrentLang && global.getCurrentLang() === 'zh') ? 'zh' : 'en';
      alert(lang0 === 'zh' ? '没有可导出的题目。请先在收藏或项目中添加题目。' : 'Nothing to export. Add questions to your library or project first.');
      return;
    }
    // 预取完整题目（含 statement/solution）
    var app = global.bonusApp;
    var loads = questions.map(function (q) { return app.loadQuestion(q.id); });
    Promise.all(loads).then(function (fullQuestions) {
      showSettings(source, fullQuestions);
    });
  }

  function showSettings(source, questions) {
    var overlay = document.createElement('div');
    overlay.className = 'bq-overlay';

    var box = document.createElement('div');
    box.className = 'bq-modal bq-modal-wide';
    box.appendChild(el('h3', null, s('exportSettings')));

    var defaults = source === 'library'
      ? { title: 'Bonus Questions', author: '', org: '', coverTitle: 'Bonus Questions', coverSubtitle: 'Selected Practice Problems' }
      : (function () {
          var p = global.bonusCollection.findProject(source);
          return {
            title: p ? (p.title || 'Untitled book') : 'Untitled book',
            author: p ? p.author : '',
            org: p ? p.org : '',
            coverTitle: p ? (p.coverTitle || p.title || '') : '',
            coverSubtitle: p ? p.coverSubtitle : ''
          };
        })();

    function field(label, key, val) {
      var wrap = el('div', 'bq-field');
      wrap.appendChild(el('label', 'bq-field-label', label));
      var input = el('input');
      input.type = 'text';
      input.value = val || '';
      input.setAttribute('data-key', key);
      wrap.appendChild(input);
      return wrap;
    }
    box.appendChild(field(s('bookTitle'), 'title', defaults.title));
    box.appendChild(field(s('coverTitle'), 'coverTitle', defaults.coverTitle));
    box.appendChild(field(s('coverSubtitle'), 'coverSubtitle', defaults.coverSubtitle));
    box.appendChild(field(s('author'), 'author', defaults.author));
    box.appendChild(field(s('org'), 'org', defaults.org));

    var btns = el('div', 'bq-modal-actions');
    var cancel = el('button', 'bq-btn', s('cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', function () { overlay.remove(); });
    var preview = el('button', 'bq-btn', s('preview'));
    preview.type = 'button';
    preview.addEventListener('click', function () {
      var settings = readSettings(box);
      overlay.remove();
      showPreview(source, questions, settings, false);
    });
    var print = el('button', 'bq-btn bq-btn-primary', s('exportPdf'));
    print.type = 'button';
    print.addEventListener('click', function () {
      var settings = readSettings(box);
      overlay.remove();
      showPreview(source, questions, settings, true);
    });
    btns.appendChild(cancel);
    btns.appendChild(preview);
    btns.appendChild(print);
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  }

  function readSettings(box) {
    var s = {};
    box.querySelectorAll('input').forEach(function (inp) {
      s[inp.getAttribute('data-key')] = inp.value;
    });
    return s;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // bilingual labels for the export dialog
  var STR = {
    en: { exportSettings: 'Export settings', bookTitle: 'Book title (TOC)', coverTitle: 'Cover title', coverSubtitle: 'Cover subtitle', author: 'Author', org: 'Institution / School', cancel: 'Cancel', preview: 'Preview', exportPdf: 'Export PDF (print)', noExport: 'Nothing to export. Add questions to your library or project first.', solution: 'Solution' },
    zh: { exportSettings: '导出设置', bookTitle: '书名（目录标题）', coverTitle: '封面标题', coverSubtitle: '封面副标题', author: '作者', org: '机构 / 学校', cancel: '取消', preview: '预览', exportPdf: '导出 PDF（打印）', noExport: '没有可导出的题目。请先在收藏或项目中添加题目。', solution: '解答' }
  };
  function s(key) {
    var lang = (global.getCurrentLang && global.getCurrentLang() === 'zh') ? 'zh' : 'en';
    return (STR[lang] && STR[lang][key]) || STR.en[key] || key;
  }

  // 章节标题（从题目 chapter 反查）
  function chapterName(chapterId) {
    var app = global.bonusApp;
    if (app && app.getChapters) {
      var chs = app.getChapters();
      var found = chs.find(function (c) { return String(c.id) === String(chapterId); });
      if (found) return found.title;
    }
    return 'Chapter ' + chapterId;
  }

  function buildDoc(source, questions, settings) {
    var doc = document.implementation.createHTMLDocument('book');
    doc.head.innerHTML = '<meta charset="UTF-8">';
    // 复用主站的 KaTeX 样式 + 打印样式
    var katexCss = document.querySelector('link[href*="katex.min.css"]');
    if (katexCss) {
      var link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = katexCss.href;
      doc.head.appendChild(link);
    }
    var style = doc.createElement('style');
    style.textContent = EXPORT_CSS;
    doc.head.appendChild(style);

    var body = doc.body;

    // ---- cover page ----
    var cover = doc.createElement('section');
    cover.className = 'cover';
    cover.innerHTML =
      '<div class="cover-inner">' +
      '<div class="cover-org">' + esc(settings.org || '') + '</div>' +
      '<h1 class="cover-title">' + esc(settings.coverTitle || settings.title || '') + '</h1>' +
      '<div class="cover-subtitle">' + esc(settings.coverSubtitle || '') + '</div>' +
      '<div class="cover-author">' + esc(settings.author || '') + '</div>' +
      '<div class="cover-foot">' + esc(settings.title || '') + '</div>' +
      '</div>';
    body.appendChild(cover);

    // ---- table of contents ----
    var toc = doc.createElement('section');
    toc.className = 'toc';
    toc.innerHTML = '<h1>目录</h1>';
    var tocList = doc.createElement('ol');
    tocList.className = 'toc-list';
    // group by chapter for a nicer TOC
    questions.forEach(function (q, i) {
      var li = doc.createElement('li');
      var name = chapterName(q.chapter);
      li.innerHTML = '<span class="toc-num">' + (i + 1) + '</span>' +
        '<span class="toc-title">' + esc(q.preview || ('Question ' + (i + 1))) + '</span>' +
        '<span class="toc-dots"></span>' +
        '<span class="toc-page"></span>';
      li.setAttribute('data-target', q.id);
      tocList.appendChild(li);
    });
    toc.appendChild(tocList);
    body.appendChild(toc);

    // ---- questions ----
    questions.forEach(function (q, i) {
      var sec = doc.createElement('section');
      sec.className = 'question-page';
      sec.setAttribute('data-qid', q.id);
      var h = doc.createElement('div');
      h.className = 'q-head';
      h.innerHTML = '<span class="q-no">' + (i + 1) + '</span>' +
        '<span class="q-src">' + esc(sourceLabel(q)) + (q.year ? ' ' + q.year : '') + '</span>' +
        '<span class="q-stars">' + starsHTML(q.difficulty) + '</span>';
      sec.appendChild(h);

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

      if (q.solution) {
        var sol = doc.createElement('div');
        sol.className = 'q-solution';
        sol.innerHTML = '<div class="q-sol-title">' + s('solution') + '</div>';
        var solBody = doc.createElement('div');
        solBody.textContent = q.solution || '';
        sol.appendChild(solBody);
        sec.appendChild(sol);
      }
      body.appendChild(sec);
    });

    return doc;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function sourceLabel(q) {
    if (q.source === 'Original') return 'Original';
    return q.source + (q.paper ? ' ' + q.paper : '');
  }
  function starsHTML(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += (i <= n) ? '★' : '☆';
    return s;
  }

  function showPreview(source, questions, settings, doPrint) {
    var doc = buildDoc(source, questions, settings);
    var frame = getPrintFrame();
    frame.contentDocument.open();
    frame.contentDocument.write('<!DOCTYPE html>' + doc.documentElement.outerHTML);
    frame.contentDocument.close();

    // 在 iframe 里渲染 KaTeX
    frame.onload = function () {
      try {
        var fd = frame.contentDocument;
        if (fd && global.renderMathInElement) {
          global.renderMathInElement(fd.body, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ]
          });
        }
        if (doPrint) {
          setTimeout(function () { frame.contentWindow.focus(); frame.contentWindow.print(); }, 200);
        } else {
          // 预览：打开一个新窗口（更直观）
          var w = window.open('', '_blank');
          if (w) {
            w.document.write('<!DOCTYPE html>' + doc.documentElement.outerHTML);
            w.document.close();
          }
        }
      } catch (e) { /* cross-origin/race */ }
    };
  }

  var EXPORT_CSS = [
    '@page { size: A4; margin: 18mm 16mm; @bottom-center { content: counter(page); font-size: 9pt; color: #666; } }',
    'body { font-family: "Segoe UI", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1a1a1a; margin: 0; }',
    'section { page-break-after: always; }',
    'section:last-child { page-break-after: auto; }',
    '.cover { height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; page-break-after: always; }',
    '.cover-inner { padding: 40px; }',
    '.cover-org { font-size: 14px; letter-spacing: 2px; color: #888; margin-bottom: 40px; text-transform: uppercase; }',
    '.cover-title { font-size: 40px; font-weight: 700; margin: 0 0 16px; line-height: 1.2; }',
    '.cover-subtitle { font-size: 18px; color: #555; margin-bottom: 48px; }',
    '.cover-author { font-size: 16px; color: #333; }',
    '.cover-foot { position: absolute; bottom: 40px; left: 0; right: 0; font-size: 12px; color: #999; }',
    '.toc h1 { font-size: 24px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }',
    '.toc-list { list-style: none; padding: 0; }',
    '.toc-list li { display: flex; align-items: baseline; padding: 6px 0; font-size: 14px; }',
    '.toc-num { color: #999; width: 32px; flex-shrink: 0; }',
    '.toc-title { flex: 1; }',
    '.toc-dots { flex: 1; border-bottom: 1px dotted #bbb; margin: 0 8px; }',
    '.toc-page { color: #666; }',
    '.question-page { padding: 10px 0; }',
    '.q-head { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 14px; }',
    '.q-no { font-weight: 700; font-size: 18px; color: #333; }',
    '.q-src { color: #888; font-size: 12px; }',
    '.q-stars { margin-left: auto; color: #e0a800; font-size: 13px; }',
    '.q-statement { font-size: 14px; line-height: 1.7; }',
    '.q-options { margin-top: 10px; }',
    '.q-option { display: flex; gap: 10px; padding: 4px 0; font-size: 14px; }',
    '.q-opt-label { font-weight: 600; color: #666; width: 20px; }',
    '.q-solution { margin-top: 18px; border-top: 1px solid #eee; padding-top: 12px; }',
    '.q-sol-title { font-weight: 700; color: #333; margin-bottom: 8px; }',
    '.q-solution { font-size: 14px; line-height: 1.7; color: #333; }',
    '.bq-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 9999; }',
    '.bq-modal { background: #fff; border-radius: 14px; padding: 24px; width: 420px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }',
    '.bq-modal-wide { width: 520px; }',
    '.bq-modal h3 { margin: 0 0 16px; font-size: 18px; }',
    '.bq-field { margin-bottom: 12px; }',
    '.bq-field-label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }',
    '.bq-field input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 14px; font-family: inherit; }',
    '.bq-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }',
    '.bq-btn { padding: 8px 16px; border: 1px solid #ccc; border-radius: 8px; background: #fff; font-size: 14px; cursor: pointer; font-family: inherit; }',
    '.bq-btn:hover { background: #f5f5f5; }',
    '.bq-btn-primary { background: #185FA5; border-color: #185FA5; color: #fff; }',
    '.bq-btn-primary:hover { background: #0c447c; }'
  ].join('\n');

  global.bonusExport = { open: open };
})(window);
