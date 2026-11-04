/*
 * bonus-collection.js — Library (收藏) + Project (书籍项目) + 导出预览
 *
 * 数据存储于 localStorage（键 bq.collection），结构：
 *   {
 *     library: [ { id, addedAt } ],              // 收藏的题
 *     projects: [ { id, title, author, org, coverTitle, coverSubtitle,
 *                   createdAt, updatedAt, questions: [qid, ...] } ],
 *     dav: { url, user, pass, dir, deviceId, autoSync }   // 坚果云同步配置
 *   }
 *
 * 依赖：window.bonusApp（由 bonus-app.js 暴露的查询接口）提供
 *   getQuestion(id) -> 完整题目对象（含 statement/solution）
 *   getIndex() -> 题目元数据
 *   onCollectionChange() -> 数据变化回调
 */
(function (global) {
  'use strict';

  var LS_KEY = 'bq.collection';

  // ---------- storage ----------
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return { library: [], projects: [], dav: {} };
      var d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return { library: [], projects: [], dav: {} };
      d.library = Array.isArray(d.library) ? d.library : [];
      d.projects = Array.isArray(d.projects) ? d.projects : [];
      d.dav = d.dav || {};
      return d;
    } catch (e) {
      return { library: [], projects: [], dav: {} };
    }
  }
  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(col));
    } catch (e) { /* quota / private mode */ }
  }

  var col = load();

  function uid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function now() { return new Date().toISOString(); }

  // ---------- Library ----------
  function hasInLibrary(qid) {
    return col.library.some(function (x) { return x.id === qid; });
  }
  function toggleLibrary(qid) {
    if (hasInLibrary(qid)) {
      col.library = col.library.filter(function (x) { return x.id !== qid; });
    } else {
      col.library.unshift({ id: qid, addedAt: now() });
    }
    persist();
    return hasInLibrary(qid);
  }
  function libraryItems() {
    return col.library.slice();
  }

  // ---------- Projects ----------
  function createProject(meta) {
    var p = {
      id: uid(),
      title: (meta && meta.title) || 'Untitled book',
      author: (meta && meta.author) || '',
      org: (meta && meta.org) || '',
      coverTitle: (meta && meta.coverTitle) || '',
      coverSubtitle: (meta && meta.coverSubtitle) || '',
      createdAt: now(),
      updatedAt: now(),
      questions: []
    };
    col.projects.unshift(p);
    persist();
    return p;
  }
  function updateProject(id, patch) {
    var p = findProject(id);
    if (!p) return null;
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) p[k] = patch[k];
    p.updatedAt = now();
    persist();
    return p;
  }
  function deleteProject(id) {
    col.projects = col.projects.filter(function (p) { return p.id !== id; });
    persist();
  }
  function findProject(id) {
    return col.projects.find(function (p) { return p.id === id; }) || null;
  }
  function addToProject(pid, qid) {
    var p = findProject(pid);
    if (!p) return false;
    if (p.questions.indexOf(qid) === -1) {
      p.questions.push(qid);
      p.updatedAt = now();
      persist();
      return true;
    }
    return false;
  }
  function removeFromProject(pid, qid) {
    var p = findProject(pid);
    if (!p) return false;
    p.questions = p.questions.filter(function (x) { return x !== qid; });
    p.updatedAt = now();
    persist();
    return true;
  }
  function moveInProject(pid, qid, delta) {
    var p = findProject(pid);
    if (!p) return;
    var i = p.questions.indexOf(qid);
    var j = i + delta;
    if (i === -1 || j < 0 || j >= p.questions.length) return;
    var tmp = p.questions[i];
    p.questions[i] = p.questions[j];
    p.questions[j] = tmp;
    p.updatedAt = now();
    persist();
  }

  // ---------- dav config ----------
  function getDav() { return col.dav || {}; }
  function setDav(patch) {
    col.dav = col.dav || {};
    for (var k in patch) col.dav[k] = patch[k];
    persist();
  }

  // ---------- export payload (for the print view) ----------
  // Returns a list of full question objects in order, given a source
  // ('library' or a project id) plus optional settings.
  function resolveQuestions(source) {
    var app = global.bonusApp;
    if (!app) return [];
    var ids;
    if (source === 'library') ids = col.library.map(function (x) { return x.id; });
    else { var p = findProject(source); ids = p ? p.questions : []; }
    return ids.map(function (id) { return app.getQuestion(id); }).filter(Boolean);
  }

  global.bonusCollection = {
    hasInLibrary: hasInLibrary,
    toggleLibrary: toggleLibrary,
    libraryItems: libraryItems,
    createProject: createProject,
    updateProject: updateProject,
    deleteProject: deleteProject,
    findProject: findProject,
    addToProject: addToProject,
    removeFromProject: removeFromProject,
    moveInProject: moveInProject,
    getDav: getDav,
    setDav: setDav,
    resolveQuestions: resolveQuestions,
    listProjects: function () { return col.projects.slice(); },
    _col: function () { return col; }
  };
})(window);
