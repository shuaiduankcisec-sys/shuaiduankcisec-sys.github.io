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
      headerDefault: '', footerDefault: ''
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
      headerDefault: '', footerDefault: ''
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
      ? { title: 'Bonus Questions', author: '', org: '', coverTitle: 'Bonus Questions', coverSubtitle: 'Selected Practice Problems', copyright: '' }
      : (function () {
          var p = global.bonusCollection.findProject(source);
          return {
            title: p ? (p.title || 'Untitled book') : 'Untitled book',
            author: p ? p.author : '',
            org: p ? p.org : '',
            coverTitle: p ? (p.coverTitle || p.title || '') : '',
            coverSubtitle: p ? p.coverSubtitle : '',
            copyright: p ? (p.copyright || '') : ''
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
    function checkbox(label, key, checked) {
      var wrap = el('label', 'bq-field bq-field-check');
      var input = el('input');
      input.type = 'checkbox';
      input.checked = !!checked;
      input.setAttribute('data-key', key);
      wrap.appendChild(input);
      wrap.appendChild(el('span', null, label));
      return wrap;
    }
    function selectField(label, key, options, val) {
      var wrap = el('div', 'bq-field');
      wrap.appendChild(el('label', 'bq-field-label', label));
      var sel = el('select');
      sel.setAttribute('data-key', key);
      options.forEach(function (o) {
        var op = el('option', null, o.label);
        op.value = o.v;
        sel.appendChild(op);
      });
      sel.value = val || options[0].v;
      wrap.appendChild(sel);
      return wrap;
    }

    box.appendChild(field(s('bookTitle'), 'title', defaults.title));
    box.appendChild(field(s('coverTitle'), 'coverTitle', defaults.coverTitle));
    box.appendChild(field(s('coverSubtitle'), 'coverSubtitle', defaults.coverSubtitle));
    box.appendChild(field(s('author'), 'author', defaults.author));
    box.appendChild(field(s('org'), 'org', defaults.org));

    box.appendChild(el('div', 'bq-export-sec', s('content')));
    box.appendChild(selectField(s('content'), 'content', [
      { v: 'qa', label: s('contentQuestionsAnswers') },
      { v: 'q', label: s('contentQuestionsOnly') },
      { v: 'a', label: s('contentAnswersOnly') }
    ], 'qa'));

    box.appendChild(el('div', 'bq-export-sec', s('tableOfContents')));
    box.appendChild(checkbox(s('includeCover'), 'includeCover', true));
    box.appendChild(checkbox(s('includeToc'), 'includeToc', true));
    box.appendChild(checkbox(s('tocByBoard'), 'tocByBoard', true));
    box.appendChild(checkbox(s('showSource'), 'showSource', true));
    box.appendChild(checkbox(s('pageNumbers'), 'pageNumbers', true));

    box.appendChild(el('div', 'bq-export-sec', s('headerText')));
    box.appendChild(field(s('headerText'), 'headerText', s('headerDefault')));
    box.appendChild(field(s('footerText'), 'footerText', s('footerDefault')));
    box.appendChild(field(s('copyright'), 'copyright', defaults.copyright));

    var btns = el('div', 'bq-modal-actions');
    var cancel = el('button', 'bq-btn', s('cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', function () { overlay.remove(); });
    var preview = el('button', 'bq-btn', s('preview'));
    preview.type = 'button';
    preview.addEventListener('click', function () {
      var settings = readSettings(box);
      overlay.remove();
      openPreview(questions, settings);
    });
    var print = el('button', 'bq-btn bq-btn-primary', s('exportPdf'));
    print.type = 'button';
    print.addEventListener('click', function () {
      var settings = readSettings(box);
      overlay.remove();
      openPreview(questions, settings, true);
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
    box.querySelectorAll('input[data-key],select[data-key]').forEach(function (inp) {
      if (inp.type === 'checkbox') s[inp.getAttribute('data-key')] = inp.checked;
      else s[inp.getAttribute('data-key')] = inp.value;
    });
    return s;
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
              '<span class="toc-title">' + esc(item.q.preview || ('Question ' + (item.i + 1))) + '</span>' +
              '<span class="toc-dots"></span>';
            tocList.appendChild(li);
          });
        });
      } else {
        questions.forEach(function (q, i) {
          var li = doc.createElement('li');
          li.innerHTML = '<span class="toc-num">' + (i + 1) + '</span>' +
            '<span class="toc-title">' + esc(q.preview || ('Question ' + (i + 1))) + '</span>' +
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
  function openPreview(questions, settings, doPrint) {
    var built = buildDoc(questions, settings);
    var doc = built.doc;
    var html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

    var w = global.open('', '_blank', 'width=900,height=1000,resizable=yes,scrollbars=yes');
    if (!w) { alert('Popup blocked. Please allow popups for this site.'); return; }

    w.document.open();
    w.document.write(html);
    w.document.close();

    // render KaTeX + trigger print after resources load
    var katexJs = document.querySelector('script[src*="katex.min.js"]');
    var autoRender = document.querySelector('script[src*="auto-render.min.js"]');
    var setup = function () {
      var wd = w.document;
      // load KaTeX scripts into the new window
      var loadScripts = function (cb) {
        var srcs = [];
        if (katexJs) srcs.push(katexJs.src);
        if (autoRender) srcs.push(autoRender.src);
        var loaded = 0;
        if (!srcs.length) return cb();
        srcs.forEach(function (src) {
          var sc = wd.createElement('script');
          sc.src = src;
          sc.onload = function () { loaded++; if (loaded === srcs.length) cb(); };
          sc.onerror = function () { loaded++; if (loaded === srcs.length) cb(); };
          wd.head.appendChild(sc);
        });
      };
      loadScripts(function () {
        try {
          if (w.renderMathInElement) {
            w.renderMathInElement(wd.body, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
              ],
              throwOnError: false
            });
          }
        } catch (e) { /* ignore */ }
        if (doPrint) {
          setTimeout(function () { w.focus(); w.print(); }, 300);
        }
      });
    };

    // wait for the new window to load the KaTeX CSS
    setTimeout(setup, 400);
  }

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
    '.cover-org { font-size: 14px; letter-spacing: 3px; color: #888; margin-bottom: 40px; text-transform: uppercase; }',
    '.cover-title { font-size: 38px; font-weight: 700; margin: 0 0 16px; line-height: 1.25; }',
    '.cover-subtitle { font-size: 17px; color: #555; margin-bottom: 48px; }',
    '.cover-author { font-size: 15px; color: #333; }',
    '.cover-copy { margin-top: 60px; font-size: 11px; color: #999; }',
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
