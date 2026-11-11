/* 图解地理 · 浏览器界面壳（上传 / 报告 / 图册与错题本 / 设置；所有 DOM 操作集中在此） */
(function () {
  'use strict';
  var Md = globalThis.TuJieMd, Prompt = globalThis.TuJiePrompt, Store = globalThis.TuJieStore;
  var Engine = globalThis.TuJieEngine, AI = globalThis.TuJieAI, Samples = globalThis.TuJieSamples;
  var Drill = globalThis.TuJieDrill, Share = globalThis.TuJieShare, Photos = globalThis.TuJiePhotos;
  var $ = function (id) { return document.getElementById(id); };
  var db = Store.createStore(window.localStorage);
  var state = { image: null, tab: 'records', libFilter: { module: '', favOnly: false } };

  // —— 小工具 ——
  function esc(s) { return Md.escapeHtml(String(s == null ? '' : s)); }
  function fmtTime(ts) {
    var d = new Date(ts);
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 3200);
  }
  function sleep(n) { return new Promise(function (r) { setTimeout(r, n); }); }
  function imgThumb(rec) {
    var img = Engine.safeImage(rec.image);
    if (img) return '<img src="' + esc(img) + '" alt="">';
    var s = rec.sampleId && Samples.get(rec.sampleId);
    return s ? s.svg : '无图';
  }

  // —— 知识模块彩色标签（按模块名散列到固定色票） ——
  var MOD_COLORS = [
    ['a83f2c', 'f7ece5'], ['48707f', 'ebf1f2'], ['8a6d3b', 'f5efe0'],
    ['47694f', 'edf2ea'], ['6b5b7a', 'f0edf4'], ['4a5a75', 'eaeff5']
  ];
  function hex2rgb(h) {
    return parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16);
  }
  function modColor(m) {
    m = String(m || '未标注模块');
    var h = 0;
    for (var i = 0; i < m.length; i++) h = (h * 31 + m.charCodeAt(i)) >>> 0;
    return MOD_COLORS[h % MOD_COLORS.length];
  }
  function modBadge(m) {
    var c = modColor(m);
    return '<span class="badge" style="color:#' + c[0] + ';border-color:rgba(' + hex2rgb(c[0]) + ',.45);background:#' + c[1] + '">' + esc(m) + '</span>';
  }

  // —— 视图切换 ——
  function show(view) {
    ['viewUpload', 'viewReport', 'viewLib'].forEach(function (v) { $(v).hidden = (v !== view); });
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var on = view === 'viewLib' ? a.getAttribute('href') === '#/lib'
        : view === 'viewUpload' ? a.getAttribute('href') === '#/'
        : false; // 报告页不高亮任何导航
      a.classList.toggle('active', on);
    });
  }
  function route() {
    var h = location.hash || '#/';
    if (h.indexOf('#/r/') === 0) showReport(decodeURIComponent(h.slice(4)));
    else if (h.indexOf('#/lib') === 0) showLib();
    else { show('viewUpload'); renderAiStatus(); renderTips(); }
  }
  window.addEventListener('hashchange', route);

  // —— AI 设置 ——
  function getSettings() {
    var s = db.getSettings();
    return {
      apiBase: s.apiBase || AI.DEFAULTS.apiBase,
      apiKey: s.apiKey,
      model: s.model || AI.DEFAULTS.model
    };
  }
  function renderAiStatus() {
    var s = getSettings(), el = $('aiStatusCard');
    if (s.apiKey) {
      el.innerHTML = '<span class="badge api">AI 已就绪</span> 模型 <b>' + esc(s.model) + '</b> · 接口 ' + esc(s.apiBase)
        + '。上传图片即可开始精读。<button class="ghost small" id="btnGoSet" style="margin-left:8px">修改设置</button>';
    } else {
      el.innerHTML = '<span class="badge demo">演示模式</span> 尚未配置多模态模型：可先用内置示例体验完整流程；'
        + '点右上角「AI 设置」填入 API Key（默认智谱 glm-4v-flash，免费视觉模型）后，即可解析任意上传图表。'
        + '<button class="ghost small" id="btnGoSet" style="margin-left:8px">去设置</button>';
    }
    $('btnGoSet').onclick = function () { openSettings(); };
  }
  function openSettings(notice) {
    var s = getSettings();
    $('modalMask').hidden = false;
    $('settingsModal').innerHTML = [
      '<h3>AI 设置<span style="font-size:13px;color:var(--ink2);font-weight:normal">（密钥只存本机浏览器）</span></h3>',
      notice ? '<p class="hint kai" style="margin:0 0 8px">' + esc(notice) + '</p>' : '',
      '<div class="fld">API 地址（OpenAI 兼容，默认智谱）<input id="setBase" value="' + esc(s.apiBase) + '" placeholder="https://open.bigmodel.cn/api/paas/v4"></div>',
      '<div class="fld">API Key<input id="setKey" type="password" value="' + esc(s.apiKey) + '" placeholder="粘贴你的 Key，仅保存在本地"></div>',
      '<div class="fld">模型（须支持图像输入）<input id="setModel" value="' + esc(s.model) + '" placeholder="glm-4v-flash / glm-4v-plus / 其他兼容视觉模型"></div>',
      '<p class="hint kai">建议智谱 glm-4v-flash（免费视觉模型）。密钥仅保存在浏览器 localStorage，只随解析请求发往你填写的接口，此外不向任何一方发送。</p>',
      '<details style="margin:10px 0"><summary class="kai" style="cursor:pointer">查看内置精读提示词（可复制）</summary>',
      '<pre class="prompt-pre" id="promptPre"></pre>',
      '<div class="row" style="margin-top:4px"><button class="ghost small" id="btnCopyPrompt">复制提示词</button></div></details>',
      '<div class="row"><button class="ghost" id="setCancel">取消</button>',
      '<button class="ghost danger" id="setClear">清除密钥</button>',
      '<button class="primary" id="setSave" style="letter-spacing:2px">保存</button></div>'
    ].join('');
    $('promptPre').textContent = Prompt.PROMPT_TEMPLATE;
    $('btnCopyPrompt').onclick = function () { copyText(Prompt.PROMPT_TEMPLATE); };
    $('setCancel').onclick = closeSettings;
    $('setClear').onclick = function () {
      db.clearSettings();
      closeSettings();
      renderAiStatus();
      toast('已清除密钥，回到演示模式');
    };
    $('setSave').onclick = function () {
      db.setSettings({ apiBase: $('setBase').value.trim(), apiKey: $('setKey').value.trim(), model: $('setModel').value.trim() });
      closeSettings();
      renderAiStatus();
      toast('AI 设置已保存');
    };
  }
  function closeSettings() { $('modalMask').hidden = true; }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { toast('已复制'); }, function () { fallbackCopy(t); });
    } else fallbackCopy(t);
  }
  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制'); } catch (e) { toast('复制失败，请手动选择文本'); }
    document.body.removeChild(ta);
  }

  // —— 上传 ——
  function fillSelect(sel, arr, def) {
    sel.innerHTML = arr.map(function (x) { return '<option' + (x === def ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  }
  function initUpload() {
    fillSelect($('selGrade'), Prompt.GRADES, '高一');
    fillSelect($('selTextbook'), Prompt.TEXTBOOKS, '人教版');
    fillSelect($('selChartType'), Prompt.CHART_TYPES, '自动识别');
    var dz = $('dropZone'), fi = $('fileInput');
    dz.addEventListener('click', function (e) { if (e.target.id !== 'btnClearImg') fi.click(); });
    fi.addEventListener('change', function () { if (fi.files && fi.files[0]) takeFile(fi.files[0]); fi.value = ''; });
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('drag'); });
    dz.addEventListener('drop', function (e) {
      e.preventDefault();
      dz.classList.remove('drag');
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) takeFile(f);
    });
    document.addEventListener('paste', function (e) {
      if ($('viewUpload').hidden) return;
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) { takeFile(items[i].getAsFile()); e.preventDefault(); break; }
      }
    });
    $('btnClearImg').addEventListener('click', function (e) { e.stopPropagation(); clearImage(); });
    $('btnAnalyze').addEventListener('click', analyzeUpload);
    renderSamples();
  }
  function takeFile(file) {
    if (!file || file.type.indexOf('image/') !== 0) { toast('请选择图片文件（JPG / PNG 等）'); return; }
    compressImage(file).then(function (info) {
      state.image = info;
      $('dzEmpty').hidden = true;
      $('dzPreview').hidden = false;
      $('previewImg').src = info.dataURL;
      $('previewMeta').textContent = '已压缩：' + info.w + '×' + info.h + '，约 ' + info.sizeKB + ' KB（原图 ' + Math.round(file.size / 1024) + ' KB）';
    }).catch(function () { toast('图片读取失败，请换一张试试'); });
  }
  function clearImage() {
    state.image = null;
    $('dzEmpty').hidden = false;
    $('dzPreview').hidden = true;
    $('previewImg').src = '';
  }
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        try {
          var maxSide = 1280;
          var w = img.naturalWidth, h = img.naturalHeight;
          var k = Math.min(1, maxSide / Math.max(w, h));
          w = Math.max(1, Math.round(w * k));
          h = Math.max(1, Math.round(h * k));
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          var ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          var dataURL = cv.toDataURL('image/jpeg', 0.82);
          URL.revokeObjectURL(url);
          resolve({ dataURL: dataURL, w: w, h: h, sizeKB: Math.round(dataURL.length * 3 / 4 / 1024) });
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
      img.src = url;
    });
  }

  // —— 解析 ——
  function setBusy(b, msg) {
    $('btnAnalyze').disabled = b;
    $('analyzeHint').textContent = b ? (msg || '解析中…') : '';
  }
  function analyzeUpload() {
    if (!state.image) { toast('请先上传或粘贴一张地理图表'); return; }
    var grade = $('selGrade').value, tb = $('selTextbook').value, ct = $('selChartType').value;
    var s = getSettings();
    if (!s.apiKey) {
      openSettings('尚未配置多模态模型。填入 API Key 后可解析任意图表；也可以先用下方内置示例体验。');
      return;
    }
    setBusy(true, '多模态模型读图中，约需 10～30 秒…');
    var messages = Prompt.buildMessages(state.image.dataURL, grade, tb, ct);
    AI.callVision(s, messages).then(function (md) {
      var rec = db.addRecord({
        source: 'api', model: s.model, grade: grade, textbook: tb, chartType: ct,
        image: state.image.dataURL, reportText: md,
        module: Engine.parseModule(md)
      });
      clearImage();
      setBusy(false);
      location.hash = '#/r/' + rec.id;
    }, function (e) {
      setBusy(false);
      toast('解析失败：' + e.message, 9000);
    });
  }
  function analyzeSample(id) {
    var s = Samples.get(id);
    if (!s) return;
    setBusy(true, '示例演示解析中…');
    sleep(450).then(function () {
      var rec = db.addRecord({
        source: 'demo', model: '内置示例', grade: $('selGrade').value, textbook: $('selTextbook').value,
        chartType: s.type, sampleId: s.id, image: null, reportText: s.report,
        module: Engine.parseModule(s.report)
      });
      setBusy(false);
      location.hash = '#/r/' + rec.id;
    });
  }
  // —— 示例卡（真实实景照封面 + 手绘 SVG 图表） ——
  var SAMPLE_PHOTO = { contour: 'pcontour', climate: 'pclimate', currents: 'pcurrents' };
  var SAMPLE_TAG = { contour: '黄土高原 · 大地的等高线', climate: '大棱镜泉 · 自然的分层设色', currents: '松恩峡湾 · 暖流的馈赠' };
  function renderSamples() {
    $('sampleGrid').innerHTML = Samples.SAMPLES.map(function (s) {
      var pid = SAMPLE_PHOTO[s.id];
      var meta = pid && Photos && Photos[pid];
      var photo = meta
        ? '<div class="sc-photo"><img src="photos/' + pid + '.jpg" alt="' + esc(meta.use || s.name) + '" onerror="this.parentElement.style.display=\'none\'">'
          + '<span class="sc-tag">' + esc(SAMPLE_TAG[s.id] || '实景联想') + '</span></div>'
        : '';
      return '<div class="sample-card" data-id="' + s.id + '" title="点击用这张示例图体验精读">' + photo + s.svg
        + '<div class="sc-name kai">' + esc(s.name) + '</div></div>';
    }).join('');
    document.querySelectorAll('.sample-card').forEach(function (c) {
      c.addEventListener('click', function () { analyzeSample(c.getAttribute('data-id')); });
    });
  }

  // —— 上传前读图自查（五看，纯本地） ——
  var CHECK_ITEMS = [
    ['一看图名', '标题 / 主题是什么？——先知道「这是张什么图」，答案线索常在图名里'],
    ['二看比例尺与指向标', '有无比例尺、指向标、经纬网？——定方位、定范围、定距离'],
    ['三看图例', '图例是图的「字典」，符号不认识先回图例查'],
    ['四看数值注记', '等高距、气温、降水、纬度……数值定规律，单位别漏看'],
    ['五看设问', '要解决什么问题？带着问题回图上找证据，效率翻倍']
  ];
  function renderChecks() {
    var box = $('checkList');
    if (!box) return;
    box.innerHTML = CHECK_ITEMS.map(function (c, i) {
      return '<label class="check-item"><input type="checkbox" data-ck="' + i + '">'
        + '<span class="ck-name kai">' + esc(c[0]) + '</span>'
        + '<span class="ck-desc">' + esc(c[1]) + '</span></label>';
    }).join('');
    box.querySelectorAll('input[data-ck]').forEach(function (ck) {
      ck.addEventListener('change', updateChecks);
    });
    updateChecks();
  }
  function updateChecks() {
    var all = document.querySelectorAll('#checkList input[data-ck]');
    var done = 0;
    all.forEach(function (ck) { if (ck.checked) done++; });
    var cnt = $('checkCount'), stamp = $('checkStamp');
    if (cnt) cnt.textContent = '已查 ' + done + ' / ' + all.length;
    if (stamp) {
      if (all.length && done === all.length) { stamp.textContent = '✓ 可以上传了'; stamp.classList.add('done'); }
      else { stamp.textContent = '未完成'; stamp.classList.remove('done'); }
    }
  }

  // —— 报告页（档案卡 + 章节导览 + 分章卡 + 阅读进度条 + 自测计分） ——
  function showReport(id) {
    var rec = db.getRecord(id);
    if (!rec) { toast('记录不存在或已删除'); location.hash = '#/'; return; }
    show('viewReport');
    var parsed = Engine.parseReport(rec.reportText);
    var moduleName = rec.module || parsed.module || '未标注模块';
    var isDemo = rec.source === 'demo';
    var isDrill = isDemo && !rec.sampleId && rec.chartType.indexOf('举一反三') === 0;
    var srcBadge = isDemo ? '<span class="badge demo">' + (isDrill ? '题池模式 · 内置题池' : '演示数据 · 内置示例') + '</span>'
      : '<span class="badge api">AI 解析 · ' + esc(rec.model || '') + '</span>';
    var sp = Engine.splitReport(rec.reportText);
    var secs = Engine.splitSections(sp.main);

    var tocHtml = secs.sections.map(function (s, i) {
      return '<button class="toc-chip" data-t="sec-' + i + '"><span class="tc-no kai">' + Engine.cnNo(s.no) + '</span>' + esc(s.title) + '</button>';
    }).join('') + '<button class="toc-chip" data-t="quizArea"><span class="tc-no kai">测</span>变式自测</button>';

    var secsHtml = secs.sections.map(function (s, i) {
      return '<section class="sec" id="sec-' + i + '">'
        + '<div class="sec-h"><span class="sec-no kai">' + Engine.cnNo(s.no) + '</span><h3 class="sec-t">' + esc(s.title) + '</h3></div>'
        + '<div class="sec-b md">' + Md.render(s.body) + '</div>'
        + '</section>';
    }).join('');

    var v = $('viewReport');
    v.innerHTML = [
      '<div class="readbar-wrap no-print"><div id="readbar"></div></div>',
      '<div class="toc no-print">' + tocHtml + '</div>',
      '<div class="report-head">',
      '<div class="report-thumb">' + imgThumb(rec) + '</div>',
      '<div class="report-meta">',
      '<p class="t">' + esc(rec.chartType || parsed.chartType || '地理图表') + '</p>',
      '<div>' + modBadge(moduleName),
      '<span class="badge">' + esc(rec.grade) + ' · ' + esc(rec.textbook) + '</span>',
      '<span class="badge">' + fmtTime(rec.ts) + '</span>' + srcBadge + '</div>',
      '<p class="no-cn">档案编号 No.' + esc(rec.id)
      + (secs.sections.length ? ' · 共 ' + secs.sections.length + ' 节' : '')
      + ' · ' + parsed.questions.length + ' 题</p>',
      '</div>',
      '<div class="report-actions no-print">',
      '<button class="ghost small" id="rFav">' + (rec.fav ? '★ 已收藏' : '☆ 收藏') + '</button>',
      '<button class="ghost small" id="rShare">分享卡</button>',
      '<button class="ghost small" id="rPrint">打印</button>',
      '<button class="ghost small" id="rCopy">复制全文</button>',
      '<button class="ghost small" id="rMd">下载 .md</button>',
      '<button class="ghost small danger" id="rDel">删除</button>',
      '<a class="ghost small" href="#/">＋ 新精读</a>',
      '</div>',
      '</div>',
      isDrill
        ? '<div class="banner kai">题池模式说明：本组同类题由内置题池按「日种子」确定性抽取（同一天对同一道错题生成同一组，可复现、可质检）；配置 AI 后可改为模型仿题。</div>'
        : (isDemo ? '<div class="banner kai">演示模式说明：本报告为内置的固定示例解析，用于体验完整流程；接入多模态模型后，上传任意课本图表即可获得针对该图的实时精读。</div>' : ''),
      '<div class="doc-title"><span class="dt-line"></span><span class="dt-text kai">' + esc(parsed.title || '图表AI精读报告') + '</span><span class="dt-line"></span></div>',
      secsHtml,
      '<div class="quiz-selftest" id="quizArea"></div>'
    ].join('');
    v.querySelectorAll('.toc-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = document.getElementById(b.getAttribute('data-t'));
        // 即时定位：smooth 在后台/无头渲染环境会被节流不滚动
        if (t) t.scrollIntoView({ block: 'start' });
      });
    });
    $('rFav').onclick = function () {
      var f = db.toggleFav(rec.id);
      $('rFav').textContent = f ? '★ 已收藏' : '☆ 收藏';
    };
    $('rPrint').onclick = function () { window.print(); };
    $('rShare').onclick = function () {
      $('rShare').disabled = true;
      Share.toPng(rec).then(function (res) {
        $('rShare').disabled = false;
        if (!res || !res.ok) { toast((res && res.error) || '生成失败', 5000); return; }
        var a = document.createElement('a');
        a.href = res.url;
        a.download = '图解地理-分享卡-' + (rec.chartType || '图表') + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast(res.tainted ? '分享卡已导出（file:// 模式未嵌照片，经 localhost 可带图）' : '分享卡已生成，已开始下载');
      });
    };
    $('rCopy').onclick = function () { copyText(rec.reportText); };
    $('rMd').onclick = function () { downloadMd(rec); };
    $('rDel').onclick = function () {
      if (!window.confirm('删除这条解析记录？（相关错题也将一并移除）')) return;
      db.removeRecord(rec.id);
      toast('已删除');
      location.hash = '#/lib';
    };
    renderQuiz(rec, sp.quizText);
    window.scrollTo(0, 0);
    updateReadbar();
  }
  function downloadMd(rec) {
    var blob = new Blob([rec.reportText], { type: 'text/markdown;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '图解地理-' + (rec.chartType || '图表') + '-' + new Date(rec.ts).toISOString().slice(0, 10) + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  // —— 变式题自测 ——
  function resultTag(st) {
    if (st && st.ok === true) return '<span class="result-tag ok">✓ 答对</span>';
    if (st && st.ok === false) return '<span class="result-tag ng">✗ 答错 · 已入错题本</span>';
    return '';
  }
  function answerHtml(q, withSelf) {
    var h = '<div class="quiz-ans"><p class="a" style="margin:0 0 4px"><b>答案：</b>' + esc(q.answer) + '</p>'
      + '<p class="ana" style="margin:0"><b>解析：</b>' + esc(q.analysis) + '</p>';
    if (withSelf && q.kind !== 'choice') {
      h += '<div class="selfbtns no-print"><button class="ghost small" data-act="ok">我答对了</button>'
        + '<button class="ghost small danger" data-act="ng">没答上，记入错题本</button></div>';
    }
    h += '</div>';
    return h;
  }
  function renderQuiz(rec, quizText) {
    var area = $('quizArea');
    var qs = Engine.parseQuiz(quizText);
    if (!qs.length) { area.innerHTML = ''; return; }
    rec.quizState = rec.quizState || {};
    var h = '<div class="quiz-head-row"><h2 class="card-title">变式训练 · 自测</h2><div class="score-strip" id="scoreStrip"></div></div>';
    h += '<p class="hint" style="margin:0 0 8px">答错的题会自动进入错题本；主观题先自己作答再对答案自判。</p>';
    h += qs.map(function (q, i) {
      var st = rec.quizState[String(i)];
      var b = ['<div class="quiz-block" data-qi="' + i + '">',
        '<p class="q-head"><span class="q-no kai">' + (i + 1) + '</span>' + esc(q.head || ('第' + (i + 1) + '题')) + (st ? resultTag(st) : '') + '</p>',
        '<p style="margin:4px 0">' + esc(q.stem) + '</p>'];
      if (q.kind === 'choice') {
        b.push(q.options.map(function (o) {
          var cls = 'opt';
          if (st) {
            if (o.label === Engine.normLetter(q.answer)) cls += ' correct';
            else if (st.user === o.label) cls += ' wrong';
          }
          return '<button class="' + cls + '" data-label="' + o.label + '"' + (st ? ' disabled' : '') + '>'
            + o.label + '. ' + esc(o.text) + '</button>';
        }).join(''));
      }
      if (st && st.revealed) b.push(answerHtml(q, q.kind !== 'choice'));
      else b.push('<div class="selfbtns no-print"><button class="ghost small" data-act="reveal">查看答案与解析</button></div>');
      b.push('</div>');
      return b.join('');
    }).join('');
    area.innerHTML = h;
    refreshScore(rec);
    qs.forEach(function (q, i) { wireQuiz(rec, q, i); });
  }
  function refreshScore(rec) {
    var el = document.getElementById('scoreStrip');
    if (!el) return;
    var qs = Engine.parseQuiz(Engine.splitReport(rec.reportText).quizText);
    var done = 0, okc = 0;
    qs.forEach(function (q, i) {
      var st = (rec.quizState || {})[String(i)];
      if (st && typeof st.ok === 'boolean') { done++; if (st.ok) okc++; }
    });
    el.innerHTML = '<span class="ss-item">共 <b>' + qs.length + '</b> 题</span>'
      + '<span class="ss-item">已答 <b>' + done + '</b></span>'
      + '<span class="ss-item s-ok">答对 <b>' + okc + '</b></span>'
      + '<span class="ss-item s-ng">答错 <b>' + (done - okc) + '</b></span>';
  }
  function updateReadbar() {
    var bar = document.getElementById('readbar');
    if (!bar || $('viewReport').hidden) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.round(window.scrollY / max * 100)) : 0;
    bar.style.width = pct + '%';
  }
  function wireQuiz(rec, q, i) {
    var block = document.querySelector('.quiz-block[data-qi="' + i + '"]');
    if (!block) return;
    if (q.kind === 'choice') {
      block.querySelectorAll('.opt').forEach(function (b) {
        b.addEventListener('click', function () {
          if (rec.quizState[String(i)]) return;
          var user = b.getAttribute('data-label');
          var ok = Engine.checkChoice(user, q.answer);
          var st = { user: user, ok: ok, revealed: true, ts: Date.now() };
          rec.quizState[String(i)] = st;
          db.setQuizState(rec.id, i, st);
          if (!ok) db.addWrong(rec.id, i);
          block.querySelectorAll('.opt').forEach(function (x) {
            x.disabled = true;
            var lb = x.getAttribute('data-label');
            if (lb === Engine.normLetter(q.answer)) x.classList.add('correct');
            else if (lb === user) x.classList.add('wrong');
          });
          block.querySelector('.q-head').insertAdjacentHTML('beforeend', resultTag(st));
          var reveal = block.querySelector('[data-act="reveal"]');
          if (reveal) reveal.parentElement.remove();
          block.insertAdjacentHTML('beforeend', '<div class="quiz-ans"><p class="a" style="margin:0 0 4px"><b>答案：</b>' + esc(q.answer) + '</p><p class="ana" style="margin:0"><b>解析：</b>' + esc(q.analysis) + '</p></div>');
          if (!ok) toast('答错了，已记入错题本');
          else toast('答对了，继续保持');
          refreshScore(rec);
        });
      });
    }
    var revealBtn = block.querySelector('[data-act="reveal"]');
    if (revealBtn) {
      revealBtn.addEventListener('click', function () {
        block.insertAdjacentHTML('beforeend', answerHtml(q, true));
        revealBtn.parentElement.remove();
        wireSelf(rec, q, i, block);
      });
    } else if (rec.quizState[String(i)] && rec.quizState[String(i)].revealed) {
      wireSelf(rec, q, i, block);
    }
  }
  function wireSelf(rec, q, i, block) {
    if (q.kind === 'choice') return;
    var okB = block.querySelector('[data-act="ok"]');
    var ngB = block.querySelector('[data-act="ng"]');
    if (!okB || !ngB) return;
    okB.addEventListener('click', function () {
      markSelf(rec, i, block, true);
      toast('很好，继续保持');
    });
    ngB.addEventListener('click', function () {
      markSelf(rec, i, block, false);
      toast('已记入错题本');
    });
  }
  function markSelf(rec, i, block, ok) {
    var st = { ok: ok, revealed: true, ts: Date.now() };
    rec.quizState[String(i)] = st;
    db.setQuizState(rec.id, i, st);
    if (ok) db.removeWrong(rec.id, i);
    else db.addWrong(rec.id, i);
    var head = block.querySelector('.q-head');
    var old = head.querySelector('.result-tag');
    if (old) old.remove();
    head.insertAdjacentHTML('beforeend', resultTag(st));
    block.querySelectorAll('.selfbtns').forEach(function (x) { x.remove(); });
    refreshScore(rec);
  }

  // —— 图册与错题本 ——
  function collectModules() {
    var seen = [];
    db.listRecords().forEach(function (r) {
      var m = r.module || Engine.parseModule(r.reportText) || '未标注模块';
      if (seen.indexOf(m) < 0) seen.push(m);
    });
    return seen;
  }
  function showLib() {
    show('viewLib');
    var v = $('viewLib');
    v.innerHTML = [
      '<div class="tabs no-print">',
      '<button id="tabRecords">解析记录（' + db.listRecords().length + '）</button>',
      '<button id="tabWrong">错题本（' + db.listWrong().length + '）</button>',
      '</div>',
      '<div id="libBody"></div>'
    ].join('');
    $('tabRecords').onclick = function () { state.tab = 'records'; renderLibTab(); };
    $('tabWrong').onclick = function () { state.tab = 'wrong'; renderLibTab(); };
    renderLibTab();
  }
  function recItemHtml(r) {
    var m = r.module || Engine.parseModule(r.reportText) || '未标注模块';
    var mc = modColor(m);
    var sub = [r.grade, r.textbook, fmtTime(r.ts), r.source === 'demo' ? '演示数据' : ('AI · ' + (r.model || ''))]
      .filter(Boolean).join(' · ');
    return '<li class="rec-item" data-id="' + esc(r.id) + '">'
      + '<div class="rec-thumb">' + imgThumb(r) + '</div>'
      + '<div class="rec-main"><p class="rec-title">' + esc(r.chartType || '地理图表') + '</p>'
      + '<p class="rec-sub"><span class="moddot" style="background:#' + mc[0] + '"></span>' + esc(m) + '</p>'
      + '<p class="rec-sub">' + esc(sub) + '</p></div>'
      + '<button class="fav-btn' + (r.fav ? ' on' : '') + '" data-id="' + esc(r.id) + '" title="收藏">' + (r.fav ? '★' : '☆') + '</button>'
      + '</li>';
  }
  function renderLibTab() {
    $('tabRecords').textContent = '解析记录（' + db.listRecords().length + '）';
    $('tabWrong').textContent = '错题本（' + db.listWrong().length + '）';
    $('tabRecords').classList.toggle('active', state.tab === 'records');
    $('tabWrong').classList.toggle('active', state.tab === 'wrong');
    var body = $('libBody');
    if (state.tab === 'records') {
      var mods = collectModules();
      var favCount = db.listRecords().filter(function (r) { return r.fav; }).length;
      var list = db.listRecords().filter(function (r) {
        var m = r.module || Engine.parseModule(r.reportText) || '未标注模块';
        if (state.libFilter.module && m !== state.libFilter.module) return false;
        if (state.libFilter.favOnly && !r.fav) return false;
        return true;
      });
      body.innerHTML = [
        '<div class="stat-strip"><span class="st">解析 <b>' + db.listRecords().length + '</b> 份</span>'
        + '<span class="st">收藏 <b>' + favCount + '</b></span>'
        + '<span class="st">知识模块 <b>' + mods.length + '</b> 类</span>'
        + '<span class="st">错题待消灭 <b>' + db.listWrong().length + '</b></span></div>',
        '<div class="lib-toolbar no-print">按知识模块筛选',
        '<select id="libMod"><option value="">全部</option>'
        + mods.map(function (m) { return '<option' + (m === state.libFilter.module ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('')
        + '</select>',
        '<label style="display:flex;align-items:center;gap:4px"><input type="checkbox" id="libFav"' + (state.libFilter.favOnly ? ' checked' : '') + '> 只看收藏</label>',
        '<span style="flex:1"></span>',
        '<button class="ghost small" id="libExport">导出 JSON</button>',
        '<button class="ghost small" id="libImport">导入 JSON</button>',
        '<button class="ghost small danger" id="libClear">清空全部</button>',
        '</div>',
        list.length
          ? '<ul class="rec-list">' + list.map(recItemHtml).join('') + '</ul>'
          : '<p class="empty">还没有解析记录 —— 回首页上传一张地理图表，或用内置示例体验。</p>'
      ].join('');
      $('libMod').onchange = function () { state.libFilter.module = this.value; renderLibTab(); };
      $('libFav').onchange = function () { state.libFilter.favOnly = this.checked; renderLibTab(); };
      $('libExport').onclick = exportAll;
      $('libImport').onclick = importAll;
      $('libClear').onclick = function () {
        if (window.confirm('确定清空全部解析记录与错题本？此操作不可恢复。')) {
          db.clearAll();
          toast('已清空');
          showLib();
        }
      };
      body.querySelectorAll('.rec-item').forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.closest('.fav-btn')) return;
          location.hash = '#/r/' + el.getAttribute('data-id');
        });
      });
      body.querySelectorAll('.fav-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          var f = db.toggleFav(b.getAttribute('data-id'));
          b.textContent = f ? '★' : '☆';
          b.classList.toggle('on', f);
        });
      });
    } else {
      var wrong = db.listWrong();
      var drillHtml = '';
      if (wrong.length) {
        drillHtml = '<div class="drill-card"><b class="kai" style="color:var(--seal);font-size:15px">举一反三 · 同类变式训练</b>'
          + '<p class="drill-note">挑一道错题，紧扣它的知识点再生成 3 道同类选择题；答错继续进错题本。'
          + (getSettings().apiKey ? '当前已配置 AI，走模型仿题。' : '当前未配置 AI，走内置题池（按日种子确定性抽题）。') + '</p>'
          + '<div class="drill-row"><select id="drillPick">'
          + wrong.map(function (w, i) {
            var rec0 = db.getRecord(w.rid);
            if (!rec0) return '';
            var qs0 = Engine.parseQuiz(Engine.splitReport(rec0.reportText).quizText);
            var q0 = qs0[w.q];
            if (!q0) return '';
            return '<option value="' + i + '">' + esc((rec0.chartType || '图表') + ' · ' + (q0.stem || '').slice(0, 26)) + '</option>';
          }).join('')
          + '</select><button class="primary kai" id="btnDrill" style="letter-spacing:2px;padding:8px 20px">生成 3 题</button></div></div>';
      }
      var items = wrong.map(function (w) {
        var rec = db.getRecord(w.rid);
        if (!rec) return '';
        var qs = Engine.parseQuiz(Engine.splitReport(rec.reportText).quizText);
        var q = qs[w.q];
        if (!q) return '';
        return '<li class="rec-item" data-id="' + esc(rec.id) + '" data-q="' + w.q + '" style="cursor:default">'
          + '<div class="rec-main"><p class="rec-title">' + esc((rec.chartType || '图表') + ' · ' + (q.head || '')) + '</p>'
          + '<p class="rec-sub">' + esc((q.stem || '').slice(0, 48)) + '…</p>'
          + '<p class="rec-sub">' + esc([rec.grade, rec.textbook].filter(Boolean).join(' · ')) + ' · ' + fmtTime(w.ts) + '</p></div>'
          + '<button class="ghost small" data-act="go">去重做</button>'
          + '<button class="ghost small" data-act="master">已掌握</button>'
          + '</li>';
      }).filter(Boolean);
      body.innerHTML = drillHtml
        + '<p class="hint" style="margin-bottom:8px">错题来自变式训练的自测作答；「已掌握」会将其移出错题本，重做答对同样自动移出。</p>'
        + (items.length ? '<ul class="rec-list">' + items.join('') + '</ul>'
          : '<p class="empty">错题本是空的 —— 到任一解析报告底部完成「变式训练 · 自测」，答错的题会自动收进来。</p>');
      if (wrong.length) {
        $('btnDrill').onclick = function () { runDrill(Number($('drillPick').value || 0), wrong); };
      }
      body.querySelectorAll('.rec-item').forEach(function (el) {
        var rid = el.getAttribute('data-id');
        var q = Number(el.getAttribute('data-q'));
        el.querySelector('[data-act="go"]').addEventListener('click', function () {
          location.hash = '#/r/' + rid;
        });
        el.querySelector('[data-act="master"]').addEventListener('click', function () {
          db.removeWrong(rid, q);
          toast('已移出错题本');
          renderLibTab();
        });
      });
    }
  }

  // —— 举一反三：AI 仿题 / 内置题池 → 落一条轻记录进报告页自测 ——
  function runDrill(wrongIndex, wrong) {
    var w = wrong[wrongIndex];
    if (!w) { toast('先挑一道错题'); return; }
    var rec0 = db.getRecord(w.rid);
    if (!rec0) return;
    var qs0 = Engine.parseQuiz(Engine.splitReport(rec0.reportText).quizText);
    var q0 = qs0[w.q];
    if (!q0) { toast('原题已不可用'); return; }
    var moduleName = rec0.module || Engine.parseModule(rec0.reportText) || '';
    var btn = $('btnDrill');
    if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
    var s = getSettings();
    if (s.apiKey) {
      var messages = [{ role: 'user', content: [{ type: 'text', text: Drill.buildDrillPrompt(moduleName, q0.stem, q0.analysis, rec0.grade, rec0.textbook) }] }];
      AI.callVision(s, messages).then(function (md) {
        finishDrill(md, s.model, 'api', rec0, moduleName, btn);
      }, function (e) {
        if (btn) { btn.disabled = false; btn.textContent = '生成 3 题'; }
        toast('AI 仿题失败：' + String(e.message).slice(0, 70) + '… 已改用内置题池', 7000);
        demoDrill(rec0, moduleName, w, btn);
      });
    } else demoDrill(rec0, moduleName, w, btn);
  }
  function demoDrill(rec0, moduleName, w, btn) {
    var out = Drill.drillFor(moduleName, w.rid + ':' + w.q, 3);
    finishDrill(Drill.buildDrillMarkdown(out.questions), '内置题池 · ' + out.pool, 'demo', rec0, moduleName, btn);
  }
  function finishDrill(md, model, source, rec0, moduleName, btn) {
    if (btn) { btn.disabled = false; btn.textContent = '生成 3 题'; }
    var bodyMd = String(md).replace(/^\s*##\s*五[^\n]*\n?/m, '').trim();
    var full = '# 图表AI精读报告\n\n## 五、变式训练题\n\n' + bodyMd;
    var shortModule = String(moduleName || '综合').split('/')[0].trim().slice(0, 10) || '综合';
    var rec = db.addRecord({
      source: source, model: model,
      grade: rec0.grade, textbook: rec0.textbook,
      chartType: '举一反三 · ' + shortModule,
      module: moduleName, image: null, reportText: full
    });
    toast('同类题已生成，开始训练');
    location.hash = '#/r/' + rec.id;
  }
  function exportAll() {
    var blob = new Blob([db.exportJSON()], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '图解地理-备份-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function importAll() {
    var fi = document.createElement('input');
    fi.type = 'file';
    fi.accept = 'application/json,.json';
    fi.onchange = function () {
      var f = fi.files && fi.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var n = db.importJSON(String(rd.result));
          toast('导入成功，新增 ' + n + ' 条记录');
          showLib();
        } catch (e) { toast('导入失败：' + e.message, 6000); }
      };
      rd.readAsText(f, 'utf-8');
    };
    fi.click();
  }

  // —— 读图锦囊（首页每日一条） ——
  function renderTips() {
    var tips = Samples.TIPS || [];
    var el = $('tipsStrip');
    if (!el) return;
    if (!tips.length) { el.hidden = true; return; }
    var day = Math.floor(Date.now() / 86400000);
    var t = tips[day % tips.length];
    el.hidden = false;
    el.innerHTML = '<span class="ts-tag kai">读图锦囊</span><span class="ts-text kai">' + esc(t) + '</span><span class="ts-sub">每日轮换 · 共 ' + tips.length + ' 条</span>';
  }

  // —— 启动 ——
  function init() {
    $('btnSettings').addEventListener('click', function () { openSettings(); });
    $('modalMask').addEventListener('click', function (e) { if (e.target === $('modalMask')) closeSettings(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSettings(); });
    window.addEventListener('scroll', updateReadbar, { passive: true });
    initUpload();
    renderChecks();
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
