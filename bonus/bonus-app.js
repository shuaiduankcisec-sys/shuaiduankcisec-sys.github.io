/* Bonus Questions app — UI logic
 * Renders into the element with id="bq-app" in bonus-questions.html.
 * Loads chapters.json + index.json, and per-question files from data/questions/.
 * Features: level dropdown (AS/A2), chapter sidebar, question list, detail view,
 *           show/hide solution, KaTeX rendering.
 */
(function () {
  'use strict';

  var BASE = 'bonus/data';
  var state = {
    level: 'AS',
    board: 'all',    // exam board filter
    chapter: null,   // null = all chapters
    chapters: [],    // full chapter list
    index: [],       // question metadata
    boards: [],      // exam boards config
    boardRules: {},  // board id -> rules
    activeId: null,
    view: 'questions',  // 'questions' | 'library' | 'projects'
    fullCache: {}    // id -> full question object (loaded on demand)
  };

  var appEl = document.getElementById('bq-app');
  if (!appEl) return;

  // ---------- i18n for dynamic UI ----------
  var BQ_STRINGS = {
    en: {
      tabQuestions: 'Questions', tabLibrary: 'Library', tabProjects: 'Projects',
      libraryTitle: 'Library', libraryEmpty: 'Your library is empty', libraryHint: 'Tap the bookmark icon on any question to save it here.',
      projectsTitle: 'Projects', projectsEmpty: 'No projects yet', projectsHint: 'Create a book project to organise questions into an exportable book.',
      newBook: 'New book', edit: 'Edit', export: 'Export / Print', backToProjects: '← Projects',
      addToProject: 'Project', addToProjectTitle: 'Add to project', noProjects: 'No projects yet. Create one from the Projects tab.',
      newProject: 'New project', cancel: 'Cancel', save: 'Save',
      bookTitle: 'Book title', coverTitle: 'Cover title', coverSubtitle: 'Cover subtitle', author: 'Author', org: 'Institution / School',
      editProject: 'Edit project', newProjectTitle: 'New book project',
      remove: 'Remove', moveUp: '↑', moveDown: '↓', bookEmpty: 'This book is empty', bookHint: 'Go back to Questions and use "Add to project" to add questions.',
      chapters: 'Chapters', allChapters: 'All chapters', saveToLibrary: 'Save to Library', saved: 'Saved',
      libraryLabel: 'Library', projectsLabel: 'Projects', questions: 'questions',
      showSolution: 'Show solution', hideSolution: 'Hide solution', noSolution: 'No solution available yet.',
      back: 'Back to questions', source: 'Source', difficulty: 'Difficulty', exportSettings: 'Export settings', bookNameToc: 'Book title (TOC)',
      preview: 'Preview', exportPdf: 'Export PDF (print)', noExport: 'Nothing to export. Add questions to your library or project first.',
      comingSoon: 'Coming soon', noQuestions: 'No questions yet', preparing: 'Questions for this chapter are being prepared.'
    },
    zh: {
      tabQuestions: '题库', tabLibrary: '收藏', tabProjects: '项目',
      libraryTitle: '收藏', libraryEmpty: '收藏夹为空', libraryHint: '在题库中点击书签图标即可收藏题目。',
      projectsTitle: '项目', projectsEmpty: '还没有项目', projectsHint: '创建一个书籍项目，把题目组织成一本可导出的书。',
      newBook: '新建书籍', edit: '编辑', export: '导出 / 打印', backToProjects: '← 项目',
      addToProject: '项目', addToProjectTitle: '加入项目', noProjects: '还没有项目。请先到「项目」页新建一本书。',
      newProject: '新建项目', cancel: '取消', save: '保存',
      bookTitle: '书名', coverTitle: '封面标题', coverSubtitle: '封面副标题', author: '作者', org: '机构 / 学校',
      editProject: '编辑项目', newProjectTitle: '新建书籍项目',
      remove: '移除', moveUp: '↑', moveDown: '↓', bookEmpty: '书还是空的', bookHint: '回到题库，用「加入项目」把题目加进这本书。',
      chapters: '章节', allChapters: '全部章节', saveToLibrary: '收藏到 Library', saved: '已收藏',
      libraryLabel: '收藏', projectsLabel: '项目', questions: '道题',
      showSolution: '显示解答', hideSolution: '隐藏解答', noSolution: '暂无解答。',
      back: '返回题目列表', source: '来源', difficulty: '难度', exportSettings: '导出设置', bookNameToc: '书名（目录标题）',
      preview: '预览', exportPdf: '导出 PDF（打印）', noExport: '没有可导出的题目。请先在收藏或项目中添加题目。',
      comingSoon: '敬请期待', noQuestions: '暂无题目', preparing: '本章题目正在准备中。'
    }
  };
  function bqLang() {
    return (window.getCurrentLang && window.getCurrentLang() === 'zh') ? 'zh' : 'en';
  }
  function t(key) {
    var d = BQ_STRINGS[bqLang()] || BQ_STRINGS.en;
    return d[key] != null ? d[key] : (BQ_STRINGS.en[key] || key);
  }

  // ---------- small DOM helpers ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- fetch helpers ----------
  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
      return r.json();
    });
  }

  // ---------- rich text + KaTeX render ----------
  // Convert plain text with \n\n paragraphs and **bold** into HTML,
  // then render math with KaTeX across the container.
  function renderContent(container, text) {
    if (!text) return;
    // split into paragraphs by blank lines
    var paragraphs = text.split(/\n\s*\n/);
    var html = '';
    paragraphs.forEach(function (p) {
      var t = p.trim();
      if (!t) return;
      // escape HTML but preserve math delimiters ($ and $$)
      var esc = t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // convert **bold** to <strong>
      esc = esc.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // convert single newlines within a paragraph to <br>
      esc = esc.replace(/\n/g, '<br>');
      html += '<p>' + esc + '</p>';
    });
    container.innerHTML = html;
    renderMath(container);
  }

  function renderMath(container) {
    if (window.renderMathInElement) {
      try {
        renderMathInElement(container, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (e) {
        /* leave raw text if render fails */
      }
    }
  }

  // ---------- build the app shell ----------
  function buildShell() {
    appEl.innerHTML = '';
    appEl.className = 'bq-app';

    var sidebar = el('div', 'bq-sidebar');
    var main = el('div', 'bq-main');
    appEl.appendChild(sidebar);
    appEl.appendChild(main);

    // view tabs: Questions / Library / Projects
    var tabs = el('div', 'bq-tabs');
    var tabDefs = [
      { v: 'questions', label: t('tabQuestions') },
      { v: 'library', label: t('tabLibrary') },
      { v: 'projects', label: t('tabProjects') }
    ];
    tabDefs.forEach(function (t) {
      var b = el('button', 'bq-tab' + (state.view === t.v ? ' active' : ''));
      b.type = 'button';
      b.textContent = t.label;
      b.addEventListener('click', function () {
        setView(t.v);
      });
      tabs.appendChild(b);
    });
    sidebar.appendChild(tabs);

    // level selector
    var levelWrap = el('div', 'bq-level-select');
    var sel = el('select');
    sel.setAttribute('aria-label', 'Select level');
    var levels = [
      { v: 'AS', label: 'AS Level' },
      { v: 'A2', label: 'A2 Level' }
    ];
    levels.forEach(function (l) {
      var o = el('option', null, l.label);
      o.value = l.v;
      sel.appendChild(o);
    });
    sel.value = state.level;
    sel.addEventListener('change', function () {
      state.level = sel.value;
      state.chapter = null;
      state.activeId = null;
      renderSidebar();
      renderList();
    });
    levelWrap.appendChild(sel);
    sidebar.appendChild(levelWrap);

    sidebar.appendChild(el('div', 'bq-sidebar-label', t('chapters')));
    var chaptersWrap = el('div', 'bq-chapters');
    sidebar.appendChild(chaptersWrap);

    main.appendChild(buildMainHead());
    var listWrap = el('div', 'bq-list');
    main.appendChild(listWrap);
    var detailWrap = el('div', 'bq-detail');
    detailWrap.style.display = 'none';
    main.appendChild(detailWrap);

    appEl._chaptersWrap = chaptersWrap;
    appEl._listWrap = listWrap;
    appEl._detailWrap = detailWrap;
  }

  function buildMainHead() {
    var head = el('div', 'bq-main-head');
    // exam board filter dropdown
    var boardWrap = el('div', 'bq-board-select');
    var bsel = el('select');
    bsel.setAttribute('aria-label', 'Filter by exam board');
    state.boards.forEach(function (b) {
      var o = el('option', null, b.name);
      o.value = b.id;
      bsel.appendChild(o);
    });
    bsel.value = state.board;
    bsel.addEventListener('change', function () {
      state.board = bsel.value;
      state.activeId = null;
      renderList();
    });
    boardWrap.appendChild(bsel);
    head.appendChild(boardWrap);
    var count = el('span', 'bq-count', '');
    head.appendChild(count);
    appEl._count = count;
    return head;
  }

  function chaptersForLevel() {
    return state.chapters.filter(function (c) { return c.level === state.level; });
  }

  // returns true if a question is within the selected board's syllabus
  function inBoard(q) {
    if (state.board === 'all') return true;
    var boardRule = state.boardRules[state.board];
    if (!boardRule) return true;
    // rules are per-level (AS / A2); fall back to the question's own level
    var rule = boardRule[state.level] || boardRule[q.level];
    if (!rule || !rule.excludeMethods || rule.excludeMethods.length === 0) return true;
    var methods = (q.methods || []).map(function (m) { return m.toLowerCase(); });
    for (var i = 0; i < rule.excludeMethods.length; i++) {
      if (methods.indexOf(rule.excludeMethods[i].toLowerCase()) !== -1) return false;
    }
    return true;
  }

  function questionsForChapter() {
    return state.index.filter(function (q) {
      return q.level === state.level
        && (state.chapter == null || q.chapter === state.chapter)
        && inBoard(q);
    });
  }

  // ---------- sidebar ----------
  function renderSidebar() {
    var wrap = appEl._chaptersWrap;
    wrap.innerHTML = '';

    var chs = chaptersForLevel();

    // "All chapters" option
    var allBtn = el('button', 'bq-chapter' + (state.chapter == null ? ' active' : ''));
    allBtn.type = 'button';
    allBtn.appendChild(el('span', 'num', '★'));
    allBtn.appendChild(el('span', null, t('allChapters')));
    allBtn.addEventListener('click', function () {
      state.chapter = null;
      state.activeId = null;
      renderSidebar();
      renderList();
    });
    wrap.appendChild(allBtn);

    chs.forEach(function (c) {
      // count questions in this chapter by level + board only (NOT by the selected chapter)
      var cnt = state.index.filter(function (q) {
        return q.level === state.level && q.chapter === c.id && inBoard(q);
      }).length;
      var btn = el('button', 'bq-chapter' + (state.chapter === c.id ? ' active' : ''));
      btn.type = 'button';
      // numeric AS chapters show their number; A2 chapters show the numeric part of "A2-0N"
      var numLabel = (typeof c.id === 'number') ? String(c.id) : String(c.id).replace('A2-', '');
      btn.appendChild(el('span', 'num', numLabel));
      btn.appendChild(el('span', null, c.title));
      btn.appendChild(el('span', 'cnt', String(cnt)));
      btn.addEventListener('click', function () {
        state.chapter = c.id;
        state.activeId = null;
        renderSidebar();
        renderList();
      });
      wrap.appendChild(btn);
    });
  }

  // ---------- shared badge helpers ----------
  function sourceLabel(q) {
    if (q.source === 'Original') return 'Original';
    return q.source + (q.paper ? ' ' + q.paper : '');
  }
  // colour class per exam source
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
    for (var i = 1; i <= 5; i++) {
      s += '<svg viewBox="0 0 24 24" width="14" height="14" fill="' + (i <= n ? 'currentColor' : 'none') + '" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    }
    return s;
  }

  // ---------- list ----------
  function renderList() {
    var wrap = appEl._listWrap;
    var detail = appEl._detailWrap;
    detail.style.display = 'none';
    wrap.style.display = '';
    wrap.innerHTML = '';

    var qs = questionsForChapter();
    appEl._count.textContent = qs.length + (qs.length === 1 ? ' question' : ' questions');

    if (qs.length === 0) {
      var empty = el('div', 'bq-empty');
      empty.appendChild(el('h3', null, state.level === 'A2' ? 'Coming soon' : 'No questions yet'));
      empty.appendChild(el('p', null, state.level === 'A2'
        ? 'A2 questions will be added here in a future update.'
        : 'Questions for this chapter are being prepared.'));
      wrap.appendChild(empty);
      return;
    }

    qs.forEach(function (q) {
      var item = el('div', 'bq-q-item' + (state.activeId === q.id ? ' active' : ''));

      var body = el('div', 'bq-q-body');
      // show the question content directly (no descriptive title)
      if (q.preview) {
        var prev = el('div', 'bq-q-preview');
        prev.textContent = q.preview;
        body.appendChild(prev);
        renderMath(prev);
      }
      // source tag + method tags (source first, in the same pill style)
      var mWrap = el('div', 'bq-methods');
      mWrap.appendChild(el('span', 'bq-method src ' + sourceClass(q), sourceLabel(q) + (q.year ? ' ' + q.year : '')));
      if (q.level === 'A2-extension') mWrap.appendChild(el('span', 'bq-method a2', 'A2 stretch'));
      if (q.methods && q.methods.length) {
        q.methods.forEach(function (m) {
          mWrap.appendChild(el('span', 'bq-method', m));
        });
      }
      body.appendChild(mWrap);
      item.appendChild(body);

      // difficulty stars + bookmark button on the right
      var right = el('div', 'bq-q-right');
      var diff = el('div', 'bq-q-stars');
      diff.title = 'Difficulty ' + q.difficulty + '/5';
      diff.setAttribute('aria-label', 'Difficulty ' + q.difficulty + ' out of 5');
      diff.innerHTML = starsHTML(q.difficulty);
      right.appendChild(diff);
      var bm = el('button', 'bq-bookmark' + (window.bonusCollection.hasInLibrary(q.id) ? ' on' : ''));
      bm.type = 'button';
      bm.title = t('saveToLibrary');
      bm.setAttribute('aria-label', t('saveToLibrary'));
      bm.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
      bm.addEventListener('click', function (e) {
        e.stopPropagation();
        var on = window.bonusCollection.toggleLibrary(q.id);
        bm.classList.toggle('on', on);
      });
      right.appendChild(bm);
      item.appendChild(right);

      item.addEventListener('click', function () { openDetail(q); });
      wrap.appendChild(item);
    });
  }

  // ---------- detail ----------
  function openDetail(q) {
    state.activeId = q.id;
    var listWrap = appEl._listWrap;
    var detail = appEl._detailWrap;
    listWrap.style.display = 'none';
    detail.style.display = '';

    fetchJSON(BASE + '/questions/' + q.id + '.json').then(function (full) {
      state.fullCache[q.id] = full;
      renderDetail(full);
    }).catch(function () {
      renderDetail(q); // fall back to metadata only
    });
  }

  function renderDetail(q) {
    var detail = appEl._detailWrap;
    detail.innerHTML = '';

    var back = el('button', 'bq-back');
    back.type = 'button';
    back.setAttribute('aria-label', t('back'));
    back.title = t('back');
    back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    back.addEventListener('click', function () {
      state.activeId = null;
      renderList();
    });
    detail.appendChild(back);

    // source + difficulty stars header (no descriptive title)
    var head = el('div', 'bq-detail-head');
    var srcText = sourceLabel(q) + (q.year ? ' ' + q.year : '');
    if (q.level === 'A2-extension') srcText += ' · A2 stretch';
    head.appendChild(el('span', 'bq-detail-src ' + sourceClass(q), srcText));
    var stars = el('span', 'bq-detail-stars');
    stars.title = 'Difficulty ' + q.difficulty + '/5';
    stars.setAttribute('aria-label', 'Difficulty ' + q.difficulty + ' out of 5');
    stars.innerHTML = starsHTML(q.difficulty);
    head.appendChild(stars);
    var bmDetail = el('button', 'bq-bookmark bq-bookmark-detail' + (window.bonusCollection.hasInLibrary(q.id) ? ' on' : ''));
    bmDetail.type = 'button';
    bmDetail.title = t('saveToLibrary');
    bmDetail.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span>' + t('libraryTitle') + '</span>';
    bmDetail.addEventListener('click', function () {
      var on = window.bonusCollection.toggleLibrary(q.id);
      bmDetail.classList.toggle('on', on);
      bmDetail.querySelector('span').textContent = on ? t('saved') : t('libraryTitle');
    });
    head.appendChild(bmDetail);
    var addProj = el('button', 'bq-bookmark bq-bookmark-detail');
    addProj.type = 'button';
    addProj.title = t('addToProjectTitle');
    addProj.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>' + t('addToProject') + '</span>';
    addProj.addEventListener('click', function () { openAddToProject(q.id); });
    head.appendChild(addProj);
    detail.appendChild(head);

    var stmt = el('div', 'bq-statement');
    renderContent(stmt, q.statement || '');
    detail.appendChild(stmt);

    // multiple-choice options (no pre-highlighted answer)
    if (q.options && q.options.length) {
      var optWrap = el('div', 'bq-options');
      var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      q.options.forEach(function (opt, idx) {
        var optRow = el('div', 'bq-option');
        var optLabel = el('span', 'bq-option-label', letters[idx]);
        optRow.appendChild(optLabel);
        var optText = el('span', 'bq-option-text');
        renderContent(optText, opt);
        optRow.appendChild(optText);
        optWrap.appendChild(optRow);
      });
      detail.appendChild(optWrap);
    }

    if (q.methods && q.methods.length) {
      var mWrap = el('div', 'bq-methods');
      q.methods.forEach(function (m) {
        mWrap.appendChild(el('span', 'bq-method', m));
      });
      detail.appendChild(mWrap);
    }

    if (q.solution) {
      detail.appendChild(el('div', 'bq-divider'));

      var solHead = el('div', 'bq-sol-head');
      var toggle = el('button', 'bq-sol-toggle');
      toggle.type = 'button';
      toggle.textContent = t('showSolution');
      var sol = el('div', 'bq-solution');
      sol.style.display = 'none';
      var shown = false;
      toggle.addEventListener('click', function () {
        shown = !shown;
        sol.style.display = shown ? '' : 'none';
        toggle.textContent = shown ? t('hideSolution') : t('showSolution');
        if (shown && !sol._rendered) {
          renderContent(sol, q.solution);
          sol._rendered = true;
        }
      });
      solHead.appendChild(toggle);
      detail.appendChild(solHead);
      detail.appendChild(sol);
    } else if (q.solutionStatus === 'none') {
      detail.appendChild(el('div', 'bq-divider'));
      detail.appendChild(el('p', 'bq-empty', t('noSolution')));
    }

    if (q.sourceUrl) {
      var link = el('a', 'bq-source-link');
      link.innerHTML = 'Source<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true"><path d="M14 4h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      link.href = q.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      detail.appendChild(link);
    }
  }

  // ---------- view tabs ----------
  function renderTabs() {
    var tabs = appEl.querySelectorAll('.bq-tab');
    tabs.forEach(function (b, i) {
      var vals = ['questions', 'library', 'projects'];
      b.classList.toggle('active', state.view === vals[i]);
    });
  }

  function setView(v) {
    state.view = v;
    if (v === 'questions') {
      // rebuild the shell because library/projects views destroy the main content
      buildShell();
      renderSidebar();
      renderList();
    }
    else if (v === 'library') renderLibrary();
    else renderProjects();
  }

  // ---------- Library view ----------
  function renderLibrary() {
    var sidebar = appEl.querySelector('.bq-sidebar');
    var main = appEl.querySelector('.bq-main');
    // hide chapter sidebar content, show a simple label
    sidebar.querySelector('.bq-chapters').innerHTML = '';
    sidebar.querySelector('.bq-sidebar-label').textContent = t('libraryLabel');
    main.innerHTML = '';

    var head = el('div', 'bq-main-head');
    head.appendChild(el('span', 'bq-head-title', t('libraryTitle')));
    var actions = el('div', 'bq-head-actions');
    var exportBtn = el('button', 'bq-btn bq-btn-primary', t('export'));
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', function () { openExport('library'); });
    actions.appendChild(exportBtn);
    head.appendChild(actions);
    main.appendChild(head);

    var wrap = el('div', 'bq-list');
    var items = window.bonusCollection.libraryItems();
    if (!items.length) {
      var empty = el('div', 'bq-empty');
      empty.appendChild(el('h3', null, t('libraryEmpty')));
      empty.appendChild(el('p', null, t('libraryHint')));
      wrap.appendChild(empty);
      main.appendChild(wrap);
      return;
    }
    items.forEach(function (it) {
      var q = window.bonusApp.getQuestion(it.id);
      if (!q) return;
      var item = el('div', 'bq-q-item');
      var body = el('div', 'bq-q-body');
      body.appendChild(el('div', 'bq-q-preview', q.preview || ''));
      var mWrap = el('div', 'bq-methods');
      mWrap.appendChild(el('span', 'bq-method src ' + sourceClass(q), sourceLabel(q) + (q.year ? ' ' + q.year : '')));
      if (q.methods) q.methods.forEach(function (m) { mWrap.appendChild(el('span', 'bq-method', m)); });
      body.appendChild(mWrap);
      item.appendChild(body);
      var right = el('div', 'bq-q-right');
      var rm = el('button', 'bq-bookmark on');
      rm.type = 'button';
      rm.title = '移除收藏';
      rm.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
      rm.addEventListener('click', function (e) {
        e.stopPropagation();
        window.bonusCollection.toggleLibrary(q.id);
        renderLibrary();
      });
      right.appendChild(rm);
      item.appendChild(right);
      item.addEventListener('click', function () { openDetail(q); });
      wrap.appendChild(item);
    });
    main.appendChild(wrap);
  }

  // ---------- Projects view ----------
  function renderProjects() {
    var sidebar = appEl.querySelector('.bq-sidebar');
    var main = appEl.querySelector('.bq-main');
    sidebar.querySelector('.bq-chapters').innerHTML = '';
    sidebar.querySelector('.bq-sidebar-label').textContent = t('projectsLabel');
    main.innerHTML = '';

    var head = el('div', 'bq-main-head');
    head.appendChild(el('span', 'bq-head-title', t('projectsTitle')));
    var actions = el('div', 'bq-head-actions');
    var newBtn = el('button', 'bq-btn bq-btn-primary', t('newBook'));
    newBtn.type = 'button';
    newBtn.addEventListener('click', function () { openProjectEditor(null); });
    actions.appendChild(newBtn);
    head.appendChild(actions);
    main.appendChild(head);

    var wrap = el('div', 'bq-list');
    var projects = window.bonusCollection.listProjects();
    if (!projects.length) {
      var empty = el('div', 'bq-empty');
      empty.appendChild(el('h3', null, t('projectsEmpty')));
      empty.appendChild(el('p', null, t('projectsHint')));
      wrap.appendChild(empty);
      main.appendChild(wrap);
      return;
    }
    projects.forEach(function (p) {
      var item = el('div', 'bq-q-item bq-proj-item');
      var body = el('div', 'bq-q-body');
      var titleEl = el('div', 'bq-proj-title', p.title || 'Untitled book');
      body.appendChild(titleEl);
      var meta = el('div', 'bq-proj-meta', (p.questions.length || 0) + ' ' + t('questions') + (p.author ? ' · ' + p.author : ''));
      body.appendChild(meta);
      item.appendChild(body);
      var right = el('div', 'bq-q-right');
      var editBtn = el('button', 'bq-icon-btn', t('edit'));
      editBtn.type = 'button';
      editBtn.addEventListener('click', function (e) { e.stopPropagation(); openProjectEditor(p.id); });
      right.appendChild(editBtn);
      item.appendChild(right);
      item.addEventListener('click', function () { openProject(p.id); });
      wrap.appendChild(item);
    });
    main.appendChild(wrap);
  }

  // ---------- project detail (question list inside a project) ----------
  function openProject(pid) {
    var p = window.bonusCollection.findProject(pid);
    if (!p) return;
    var sidebar = appEl.querySelector('.bq-sidebar');
    var main = appEl.querySelector('.bq-main');
    main.innerHTML = '';

    var head = el('div', 'bq-main-head');
    var back = el('button', 'bq-btn', t('backToProjects'));
    back.type = 'button';
    back.addEventListener('click', function () { renderProjects(); });
    head.appendChild(back);
    head.appendChild(el('span', 'bq-head-title', p.title || 'Untitled book'));
    var actions = el('div', 'bq-head-actions');
    var exp = el('button', 'bq-btn bq-btn-primary', t('export'));
    exp.type = 'button';
    exp.addEventListener('click', function () { openExport(pid); });
    actions.appendChild(exp);
    head.appendChild(actions);
    main.appendChild(head);

    var wrap = el('div', 'bq-list');
    if (!p.questions.length) {
      var empty = el('div', 'bq-empty');
      empty.appendChild(el('h3', null, t('bookEmpty')));
      empty.appendChild(el('p', null, t('bookHint')));
      wrap.appendChild(empty);
    } else {
      p.questions.forEach(function (qid, i) {
        var q = window.bonusApp.getQuestion(qid);
        if (!q) return;
        var item = el('div', 'bq-q-item');
        var body = el('div', 'bq-q-body');
        body.appendChild(el('div', 'bq-q-preview', q.preview || ''));
        var mWrap = el('div', 'bq-methods');
        mWrap.appendChild(el('span', 'bq-method src ' + sourceClass(q), sourceLabel(q) + (q.year ? ' ' + q.year : '')));
        body.appendChild(mWrap);
        item.appendChild(body);
        var right = el('div', 'bq-q-right');
        var up = el('button', 'bq-icon-btn', t('moveUp'));
        up.type = 'button';
        up.addEventListener('click', function (e) { e.stopPropagation(); window.bonusCollection.moveInProject(pid, qid, -1); openProject(pid); });
        var down = el('button', 'bq-icon-btn', t('moveDown'));
        down.type = 'button';
        down.addEventListener('click', function (e) { e.stopPropagation(); window.bonusCollection.moveInProject(pid, qid, 1); openProject(pid); });
        var rm = el('button', 'bq-icon-btn', t('remove'));
        rm.type = 'button';
        rm.addEventListener('click', function (e) { e.stopPropagation(); window.bonusCollection.removeFromProject(pid, qid); openProject(pid); });
        right.appendChild(up);
        right.appendChild(down);
        right.appendChild(rm);
        item.appendChild(right);
        item.addEventListener('click', function () { openDetail(q); });
        wrap.appendChild(item);
      });
    }
    main.appendChild(wrap);
  }

  // ---------- project editor ----------
  function openProjectEditor(pid) {
    var p = pid ? window.bonusCollection.findProject(pid) : null;
    var overlay = el('div', 'bq-overlay');
    var box = el('div', 'bq-modal');
    box.appendChild(el('h3', null, pid ? t('editProject') : t('newProjectTitle')));
    function field(label, key, val) {
      var lab = el('label', 'bq-field-label', label);
      var input = el('input');
      input.type = 'text';
      input.value = val || '';
      input.setAttribute('data-key', key);
      var wrap = el('div', 'bq-field');
      wrap.appendChild(lab);
      wrap.appendChild(input);
      return wrap;
    }
    box.appendChild(field(t('bookTitle'), 'title', p ? p.title : ''));
    box.appendChild(field(t('coverTitle'), 'coverTitle', p ? p.coverTitle : ''));
    box.appendChild(field(t('coverSubtitle'), 'coverSubtitle', p ? p.coverSubtitle : ''));
    box.appendChild(field(t('author'), 'author', p ? p.author : ''));
    box.appendChild(field(t('org'), 'org', p ? p.org : ''));
    var btns = el('div', 'bq-modal-actions');
    var cancel = el('button', 'bq-btn', t('cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', function () { overlay.remove(); });
    var save = el('button', 'bq-btn bq-btn-primary', t('save'));
    save.type = 'button';
    save.addEventListener('click', function () {
      var patch = {};
      box.querySelectorAll('input').forEach(function (inp) {
        patch[inp.getAttribute('data-key')] = inp.value;
      });
      if (pid) window.bonusCollection.updateProject(pid, patch);
      else window.bonusCollection.createProject(patch);
      overlay.remove();
      renderProjects();
    });
    btns.appendChild(cancel);
    btns.appendChild(save);
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  }

  // ---------- add question to project ----------
  function openAddToProject(qid) {
    var projects = window.bonusCollection.listProjects();
    var overlay = el('div', 'bq-overlay');
    var box = el('div', 'bq-modal');
    box.appendChild(el('h3', null, t('addToProjectTitle')));
    var list = el('div', 'bq-proj-picker');
    if (!projects.length) {
      box.appendChild(el('p', 'bq-empty', t('noProjects')));
    } else {
      projects.forEach(function (p) {
        var btn = el('button', 'bq-proj-pick');
        btn.type = 'button';
        btn.textContent = p.title || 'Untitled book';
        btn.addEventListener('click', function () {
          window.bonusCollection.addToProject(p.id, qid);
          overlay.remove();
        });
        list.appendChild(btn);
      });
      box.appendChild(list);
    }
    var btns = el('div', 'bq-modal-actions');
    var newBtn = el('button', 'bq-btn', t('newProject'));
    newBtn.type = 'button';
    newBtn.addEventListener('click', function () {
      overlay.remove();
      openProjectEditor(null);
    });
    var cancel = el('button', 'bq-btn', t('cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', function () { overlay.remove(); });
    btns.appendChild(newBtn);
    btns.appendChild(cancel);
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  }

  // ---------- export (delegated to bonus-export.js) ----------
  function openExport(source) {
    if (window.bonusExport && window.bonusExport.open) {
      window.bonusExport.open(source);
    }
  }

  // ---------- init ----------
  Promise.all([
    fetchJSON(BASE + '/chapters.json'),
    fetchJSON(BASE + '/index.json'),
    fetchJSON(BASE + '/exam-boards.json')
  ]).then(function (res) {
    state.chapters = res[0];
    state.index = res[1];
    state.boards = res[2].boards || [];
    state.boardRules = res[2].rules || {};
    // expose a minimal interface for the collection/export module
    window.bonusApp = {
      getIndex: function () { return state.index; },
      getChapters: function () { return state.chapters; },
      getQuestion: function (id) {
        if (state.fullCache[id]) return state.fullCache[id];
        var meta = state.index.find(function (q) { return q.id === id; });
        return meta || null;
      },
      loadQuestion: function (id) {
        if (state.fullCache[id]) return Promise.resolve(state.fullCache[id]);
        return fetchJSON(BASE + '/questions/' + id + '.json').then(function (full) {
          state.fullCache[id] = full;
          return full;
        });
      },
      switchView: setView,
      openProjectEditor: openProjectEditor
    };
    buildShell();
    renderSidebar();
    renderList();
    // re-render the current view when the site language changes
    if (window.onLangChange) {
      window.onLangChange(function () {
        buildShell();
        setView(state.view);
      });
    }
  }).catch(function (err) {
    appEl.innerHTML = '';
    var empty = el('div', 'bq-empty');
    empty.appendChild(el('h3', null, 'Unable to load questions'));
    empty.appendChild(el('p', null, String(err && err.message ? err.message : err)));
    appEl.appendChild(empty);
  });
})();
