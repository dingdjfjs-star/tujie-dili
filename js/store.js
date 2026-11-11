/* 图解地理 · 本地存储（解析记录 + 错题本 + AI 设置；存储后端可注入，Node 可测试）
 * 约定：
 * - 解析记录容量上限 MAX_RECORDS，超出挤掉最旧的非收藏记录
 * - localStorage 配额超限时自动降级：先丢最旧非收藏记录，再丢弃图片，保文本
 * - 导出 JSON 不包含 API Key（隐私）
 */
(function (global) {
  'use strict';
  var KEY = 'tujieDiliV1';
  var SET_KEY = KEY + '.set';
  var MAX_RECORDS = 50;

  function genId() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function createStore(storage) {
    if (!storage) throw new Error('无可用存储后端');
    var db = load();

    function load() {
      try {
        var raw = storage.getItem(KEY);
        if (raw) {
          var o = JSON.parse(raw);
          if (o && Array.isArray(o.records) && Array.isArray(o.wrong)) {
            return { records: o.records, wrong: o.wrong };
          }
        }
      } catch (e) { /* 存储损坏即重建 */ }
      return { records: [], wrong: [] };
    }

    function persist() {
      try {
        storage.setItem(KEY, JSON.stringify(db));
      } catch (e) {
        // 配额超限兜底：①丢所有图片（优先保全部文字）→ ②丢最旧非收藏 → ③从最旧丢到只剩当前一条
        var saved = false;
        db.records.forEach(function (r) { r.image = null; });
        try { storage.setItem(KEY, JSON.stringify(db)); saved = true; } catch (e2) {}
        while (!saved && db.records.length > 1) {
          var i = db.records.length - 1;
          while (i >= 0 && db.records[i].fav) i--;
          if (i <= 0) break; // i===0 是刚写入的当前记录，不动
          db.records.splice(i, 1);
          try { storage.setItem(KEY, JSON.stringify(db)); saved = true; } catch (e2) {}
        }
        while (!saved && db.records.length > 1) {
          db.records.pop();
          try { storage.setItem(KEY, JSON.stringify(db)); saved = true; } catch (e2) {}
        }
        if (!saved) { try { storage.setItem(KEY, JSON.stringify(db)); } catch (e3) {} }
      }
    }

    function trim() {
      while (db.records.length > MAX_RECORDS) {
        var i = db.records.length - 1;
        while (i >= 0 && db.records[i].fav) i--;
        if (i < 0) break;
        db.records.splice(i, 1);
      }
    }

    function addRecord(rec) {
      var r = {
        id: genId(), ts: Date.now(), fav: false,
        source: rec.source || 'api', model: rec.model || '',
        grade: rec.grade || '', textbook: rec.textbook || '', chartType: rec.chartType || '',
        module: rec.module || '', sampleId: rec.sampleId || null,
        image: rec.image || null, reportText: rec.reportText || '',
        quizState: {}
      };
      db.records.unshift(r);
      trim();
      persist();
      return JSON.parse(JSON.stringify(r));
    }

    function listRecords() { return db.records; }
    function getRecord(id) {
      for (var i = 0; i < db.records.length; i++) if (db.records[i].id === id) return db.records[i];
      return null;
    }
    function updateRecord(id, patch) {
      var r = getRecord(id);
      if (!r) return null;
      Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
      persist();
      return r;
    }
    function toggleFav(id) {
      var r = getRecord(id);
      if (!r) return false;
      r.fav = !r.fav;
      persist();
      return r.fav;
    }
    function removeRecord(id) {
      db.records = db.records.filter(function (r) { return r.id !== id; });
      db.wrong = db.wrong.filter(function (w) { return w.rid !== id; });
      persist();
    }
    function setQuizState(rid, qIndex, st) {
      var r = getRecord(rid);
      if (!r) return;
      r.quizState = r.quizState || {};
      r.quizState[String(qIndex)] = st;
      persist();
    }

    // —— 错题本 ——
    function addWrong(rid, qIndex) {
      var dup = db.wrong.some(function (w) { return w.rid === rid && w.q === qIndex; });
      if (!dup) {
        db.wrong.unshift({ rid: rid, q: qIndex, ts: Date.now() });
        persist();
      }
    }
    function removeWrong(rid, qIndex) {
      db.wrong = db.wrong.filter(function (w) { return !(w.rid === rid && w.q === qIndex); });
      persist();
    }
    function listWrong() { return db.wrong; }

    // —— AI 设置（独立键，只存本机） ——
    function getSettings() {
      try {
        var raw = storage.getItem(SET_KEY);
        if (raw) {
          var o = JSON.parse(raw);
          return { apiBase: o.apiBase || '', apiKey: o.apiKey || '', model: o.model || '' };
        }
      } catch (e) {}
      return { apiBase: '', apiKey: '', model: '' };
    }
    function setSettings(s) {
      storage.setItem(SET_KEY, JSON.stringify({ apiBase: s.apiBase || '', apiKey: s.apiKey || '', model: s.model || '' }));
    }
    function clearSettings() { storage.removeItem(SET_KEY); }

    // —— 导入导出（不含 API Key） ——
    function exportJSON() {
      return JSON.stringify({
        app: '图解地理', version: 1,
        exportedAt: new Date().toISOString(),
        records: db.records, wrong: db.wrong
      }, null, 2);
    }
    function importJSON(text) {
      var o = JSON.parse(text); // 非法 JSON 直接抛错
      if (!o || !Array.isArray(o.records)) throw new Error('格式不对：缺少 records 数组');
      var added = 0;
      o.records.forEach(function (r) {
        if (!r || typeof r.id !== 'string' || typeof r.reportText !== 'string') return;
        var dup = db.records.some(function (x) { return x.id === r.id; });
        if (!dup) {
          db.records.push(Object.assign({ fav: false, quizState: {} }, r));
          added++;
        }
      });
      if (Array.isArray(o.wrong)) {
        o.wrong.forEach(function (w) {
          if (w && typeof w.rid === 'string' && typeof w.q === 'number'
            && !db.wrong.some(function (x) { return x.rid === w.rid && x.q === w.q; })) {
            db.wrong.push(w);
          }
        });
      }
      trim();
      persist();
      return added;
    }
    function clearAll() { db.records = []; db.wrong = []; persist(); }

    return {
      addRecord: addRecord, listRecords: listRecords, getRecord: getRecord,
      updateRecord: updateRecord, toggleFav: toggleFav, removeRecord: removeRecord,
      setQuizState: setQuizState,
      addWrong: addWrong, removeWrong: removeWrong, listWrong: listWrong,
      getSettings: getSettings, setSettings: setSettings, clearSettings: clearSettings,
      exportJSON: exportJSON, importJSON: importJSON, clearAll: clearAll
    };
  }

  global.TuJieStore = { createStore: createStore, KEY: KEY, MAX_RECORDS: MAX_RECORDS };
})(typeof window !== 'undefined' ? window : globalThis);
