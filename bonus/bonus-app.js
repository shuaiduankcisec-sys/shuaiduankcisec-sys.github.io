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
    chapter: null,   // null = all chapters
    chapters: [],    // full chapter list
    index: [],       // question metadata
    activeId: null
  };

  var appEl = document.getElementById('bq-app');
  if (!appEl) return;

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

    sidebar.appendChild(el('div', 'bq-sidebar-label', 'Chapters'));
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
    head.appendChild(el('h2', null, 'Questions'));
    var count = el('span', 'bq-count', '');
    head.appendChild(count);
    appEl._count = count;
    return head;
  }

  function chaptersForLevel() {
    return state.chapters.filter(function (c) { return c.level === state.level; });
  }

  function questionsForChapter() {
    return state.index.filter(function (q) {
      return q.level === state.level && (state.chapter == null || q.chapter === state.chapter);
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
    allBtn.appendChild(el('span', null, 'All chapters'));
    allBtn.addEventListener('click', function () {
      state.chapter = null;
      state.activeId = null;
      renderSidebar();
      renderList();
    });
    wrap.appendChild(allBtn);

    chs.forEach(function (c) {
      var cnt = questionsForChapter().filter(function (q) { return q.chapter === c.id; }).length;
      var btn = el('button', 'bq-chapter' + (state.chapter === c.id ? ' active' : ''));
      btn.type = 'button';
      btn.appendChild(el('span', 'num', String(c.id)));
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
      item.appendChild(el('div', 'bq-q-title', q.title));
      var meta = el('div', 'bq-q-meta');
      meta.appendChild(el('span', 'bq-badge src', q.source + (q.paper ? ' ' + q.paper : '')));
      if (q.year) meta.appendChild(el('span', 'bq-badge', String(q.year)));
      if (q.level === 'A2-extension') meta.appendChild(el('span', 'bq-badge a2', 'A2 stretch'));
      meta.appendChild(el('span', 'bq-badge diff', 'Difficulty ' + q.difficulty + '/5'));
      if (q.solutionStatus === 'full') meta.appendChild(el('span', 'bq-badge has-sol', '✓ Solution'));
      item.appendChild(meta);
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
    back.textContent = '← Back to questions';
    back.addEventListener('click', function () {
      state.activeId = null;
      renderList();
    });
    detail.appendChild(back);

    detail.appendChild(el('h2', null, q.title));

    var meta = el('div', 'bq-q-meta');
    meta.appendChild(el('span', 'bq-badge src', q.source + (q.paper ? ' ' + q.paper : '')));
    if (q.year) meta.appendChild(el('span', 'bq-badge', String(q.year)));
    if (q.level === 'A2-extension') meta.appendChild(el('span', 'bq-badge a2', 'A2 stretch'));
    meta.appendChild(el('span', 'bq-badge diff', 'Difficulty ' + q.difficulty + '/5'));
    detail.appendChild(meta);

    var stmt = el('div', 'bq-statement');
    renderContent(stmt, q.statement || '');
    detail.appendChild(stmt);

    if (q.solution) {
      detail.appendChild(el('div', 'bq-divider'));

      var solHead = el('div', 'bq-sol-head');
      var toggle = el('button', 'bq-sol-toggle');
      toggle.type = 'button';
      toggle.textContent = 'Show solution';
      var sol = el('div', 'bq-solution');
      sol.style.display = 'none';
      var shown = false;
      toggle.addEventListener('click', function () {
        shown = !shown;
        sol.style.display = shown ? '' : 'none';
        toggle.textContent = shown ? 'Hide solution' : 'Show solution';
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
      detail.appendChild(el('p', 'bq-empty', 'No solution available yet.'));
    }

    if (q.sourceUrl) {
      var link = el('a', 'bq-source-link', 'View original source →');
      link.href = q.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      detail.appendChild(link);
    }
  }

  // ---------- init ----------
  Promise.all([
    fetchJSON(BASE + '/chapters.json'),
    fetchJSON(BASE + '/index.json')
  ]).then(function (res) {
    state.chapters = res[0];
    state.index = res[1];
    buildShell();
    renderSidebar();
    renderList();
  }).catch(function (err) {
    appEl.innerHTML = '';
    var empty = el('div', 'bq-empty');
    empty.appendChild(el('h3', null, 'Unable to load questions'));
    empty.appendChild(el('p', null, String(err && err.message ? err.message : err)));
    appEl.appendChild(empty);
  });
})();
