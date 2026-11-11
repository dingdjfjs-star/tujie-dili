/* 图解地理 · 自动化质检
 * 覆盖：工程结构 / 提示词完整性 / Markdown 渲染与防注入 / 报告解析引擎 /
 *       内置示例数据自洽 / 存储与配额降级 / AI 客户端 / 服务器冒烟（含目录穿越）
 * 运行：node test/test.js
 */
'use strict';
var path = require('path');
var fs = require('fs');
var http = require('http');
var child_process = require('child_process');

var ROOT = path.join(__dirname, '..');
var passed = 0, failed = 0, failures = [];

function ok(cond, name) {
  if (cond) { passed++; }
  else { failed++; failures.push(name); console.log('  [FAIL] ' + name); }
}
function eq(a, b, name) {
  ok(a === b, name + '（期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a) + '）');
}
function section(name) { console.log('—— ' + name); }

// 加载纯逻辑模块（UMD 挂到 globalThis）
require(path.join(ROOT, 'js', 'prompt.js'));
require(path.join(ROOT, 'js', 'md.js'));
require(path.join(ROOT, 'js', 'store.js'));
require(path.join(ROOT, 'js', 'engine.js'));
require(path.join(ROOT, 'js', 'samples.js'));
require(path.join(ROOT, 'js', 'ai.js'));
require(path.join(ROOT, 'js', 'photos.js'));
require(path.join(ROOT, 'js', 'drill.js'));
var P = globalThis.TuJiePrompt, Md = globalThis.TuJieMd, Store = globalThis.TuJieStore;
var E = globalThis.TuJieEngine, S = globalThis.TuJieSamples, AI = globalThis.TuJieAI;
var PH = globalThis.TuJiePhotos, DR = globalThis.TuJieDrill;

// ———— 1. 工程结构与文件 ————
section('工程结构与文件');
[
  'index.html', 'server.js', 'package.json', 'README.md',
  'js/prompt.js', 'js/md.js', 'js/store.js', 'js/engine.js', 'js/ai.js', 'js/ui.js', 'js/samples.js',
  'js/photos.js', 'js/drill.js', 'js/share.js', 'tools/fetch-photos.js', 'tools/import-photos.js'
].forEach(function (f) { ok(fs.existsSync(path.join(ROOT, f)), '存在 ' + f); });
['photos/hero.jpg', 'photos/pcontour.jpg', 'photos/pclimate.jpg', 'photos/pcurrents.jpg', 'photos/pdelta.jpg', 'photos/pdesert.jpg'].forEach(function (f) {
  ok(fs.existsSync(path.join(ROOT, f)), '存在 ' + f);
});

var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
['viewUpload', 'viewReport', 'viewLib', 'dropZone', 'fileInput', 'dzEmpty', 'dzPreview', 'previewImg',
  'selGrade', 'selTextbook', 'selChartType', 'btnAnalyze', 'analyzeHint', 'sampleGrid', 'aiStatusCard',
  'toast', 'modalMask', 'settingsModal', 'btnSettings'].forEach(function (id) {
    ok(html.indexOf('id="' + id + '"') >= 0, 'index.html 含元素 #' + id);
  });
['js/samples.js', 'js/photos.js', 'js/prompt.js', 'js/md.js', 'js/store.js', 'js/engine.js', 'js/drill.js', 'js/ai.js', 'js/share.js', 'js/ui.js'].forEach(function (s) {
  ok(html.indexOf('src="' + s + '"') >= 0, 'index.html 引入 ' + s);
});
ok(html.indexOf('photos/hero.jpg') >= 0, 'index.html 引 hero 实景照');
ok(html.indexOf('id="checkList"') >= 0 && html.indexOf('id="checkStamp"') >= 0, 'index.html 含读图自查卡');
ok(html.indexOf('photos/pcontour.jpg') >= 0, '上传区实景贴');
ok(html.replace(/xmlns=['"]http:\/\/www\.w3\.org\/2000\/svg['"]/g, '').indexOf('http://') < 0 && html.indexOf('https://') < 0, 'index.html 无外链（离线可用；data URI 内的 xmlns 命名空间除外）');
ok(html.indexOf('viewport') >= 0, '移动端 viewport');

var jsAll = ['prompt', 'md', 'store', 'engine', 'ai', 'ui', 'samples', 'photos', 'drill', 'share']
  .map(function (n) { return fs.readFileSync(path.join(ROOT, 'js', n + '.js'), 'utf8'); })
  .join('\n');
ok(!/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u.test(jsAll.replace(/[☆★✓✗]/g, '')), 'JS 无 emoji（★☆✓✗ 白名单除外）');
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(html), 'index.html 无 emoji');

// ———— 2. 精读提示词完整性 ————
section('精读提示词完整性');
[
  '你是资深中学地理教研专家', '{{年级}}', '{{教材版本}}',
  '## 一、图表基本信息', '## 二、核心地理要素识别', '## 三、地理规律与原理讲解',
  '## 四、考点与易错点分析', '## 五、变式训练题',
  '1道选择题、1道填空题、1道读图综合题', '1200字以内', '禁止出现任何与解析无关的客套话'
].forEach(function (s) { ok(P.PROMPT_TEMPLATE.indexOf(s) >= 0, '提示词含「' + s.slice(0, 18) + '…」'); });

var fp = P.fillTemplate('高一', '人教版');
ok(fp.indexOf('{{') < 0, '占位符替换干净');
ok(fp.indexOf('高一') >= 0 && fp.indexOf('人教版') >= 0, '年级与教材进入提示词');
ok(P.buildPrompt('高一', '人教版', '自动识别').indexOf('图表类型提示') < 0, '自动识别时不加类型提示');
ok(P.buildPrompt('高一', '人教版', '洋流图').indexOf('「洋流图」') >= 0, '指定类型时加提示');

var msgs = P.buildMessages('data:image/jpeg;base64,XXXTEST', '七年级', '湘教版', '气候图表');
eq(msgs.length, 1, 'buildMessages 单条 user 消息');
eq(msgs[0].role, 'user', '角色为 user');
eq(msgs[0].content[0].type, 'image_url', '首段为图像');
ok(msgs[0].content[0].image_url.url.indexOf('XXXTEST') > 0, '图像 dataURL 进入请求');
eq(msgs[0].content[1].type, 'text', '次段为文本');
ok(msgs[0].content[1].text.indexOf('七年级') >= 0 && msgs[0].content[1].text.indexOf('湘教版') >= 0, '请求文本含年级与教材');
ok(msgs[0].content[1].text.indexOf('气候图表') >= 0, '请求文本含类型提示');

eq(P.GRADES.length, 5, '年级选项 5 个');
ok(P.TEXTBOOKS.length >= 4, '教材版本不少于 4 个');
eq(P.CHART_TYPES[0], '自动识别', '图表类型默认项');

// ———— 3. Markdown 渲染与防注入 ————
section('Markdown 渲染与防注入');
var out = Md.render('# 标题\n## 二节\n段落**加粗**与`code`。\n\n- 甲\n- 乙\n\n1. 一\n2. 二\n\n| A | B |\n|---|---|\n| 1 | 2 |\n> 引用\n\n---');
ok(out.indexOf('<h2>标题</h2>') >= 0, '# 渲染为 h2');
ok(out.indexOf('<h3>二节</h3>') >= 0, '## 渲染为 h3');
ok(out.indexOf('<strong>加粗</strong>') >= 0, '**加粗**');
ok(out.indexOf('<code>code</code>') >= 0, '`行内代码`');
ok(out.indexOf('<ul>') >= 0 && out.indexOf('<li>甲</li>') >= 0, '无序列表');
ok(out.indexOf('<ol>') >= 0 && out.indexOf('<li>一</li>') >= 0, '有序列表（1. 与 1、）');
ok(Md.render('1、甲').indexOf('<ol>') >= 0, '中文顿号有序列表');
ok(out.indexOf('<table>') >= 0 && out.indexOf('<th>A</th>') >= 0 && out.indexOf('<td>1</td>') >= 0, '表格');
ok(out.indexOf('<blockquote>引用</blockquote>') >= 0, '引用块');
ok(out.indexOf('<hr>') >= 0, '分隔线');
ok(Md.render('a\nb').indexOf('a<br>b') >= 0, '段内换行合并');

var xss = Md.render('<img src=x onerror=alert(1)><script>alert(1)</script>"onload="');
ok(xss.indexOf('<img') < 0 && xss.indexOf('<script') < 0, 'HTML 全转义（无注入）');
ok(xss.indexOf('&lt;img') >= 0, '转义而非删除');

// ———— 4. 报告解析引擎 ————
section('报告解析引擎');
var r1 = E.parseReport(S.get('contour').report);
ok(r1.module.indexOf('等高线') >= 0, '模块提取（等高线）');
ok(r1.chartType.indexOf('等高线') >= 0, '图表类型提取');
ok(r1.title.indexOf('图表AI精读报告') >= 0, '标题提取');
eq(r1.questions.length, 3, '题量=3');
var q1 = r1.questions[0];
eq(q1.kind, 'choice', '题1为选择题');
eq(q1.options.length, 4, '题1四个选项');
eq(E.normLetter(q1.answer), 'C', '题1答案C');
ok(q1.stem.length > 5, '题1题干非空');
ok(q1.analysis.length > 5, '题1解析非空');
ok(r1.questions[1].kind !== 'choice', '题2为填空/主观');
ok(r1.questions[2].kind !== 'choice', '题3为综合/主观');

var r2 = E.parseReport(S.get('climate').report);
ok(r2.module.indexOf('气候') >= 0, '模块提取（气候）');
eq(r2.questions.length, 3, '气候示例题量=3');
eq(E.normLetter(r2.questions[0].answer), 'B', '气候示例题1答案B');

var r3 = E.parseReport(S.get('currents').report);
ok(r3.module.indexOf('洋流') >= 0, '模块提取（洋流）');
eq(r3.questions.length, 3, '洋流示例题量=3');
eq(E.normLetter(r3.questions[0].answer), 'C', '洋流示例题1答案C');

var sp = E.splitReport(S.get('climate').report);
ok(sp.main.indexOf('## 五') < 0, 'splitReport：正文不含第五节');
ok(sp.quizText.indexOf('变式训练题') >= 0, 'splitReport：题段含节标题');
ok(sp.main.indexOf('## 四') >= 0, 'splitReport：正文保留第四节');

var ss1 = E.splitSections(E.splitReport(S.get('contour').report).main);
eq(ss1.sections.length, 4, '分章引擎：示例正文切出 4 节');
eq(E.cnNo(ss1.sections[0].no), '壹', '章号转大写数字');
ok(ss1.sections[0].title.indexOf('图表基本信息') >= 0, '节标题提取');
ok(ss1.sections[0].body.indexOf('图表类型') >= 0 && ss1.sections[0].body.indexOf('所属知识模块') >= 0, '节体内容完整');
eq(ss1.sections[3].no, '四', '末节章号');
ok(ss1.sections[3].body.indexOf('核心考点') >= 0, '末节体内容');
eq(ss1.preamble, '', '分章后 preamble 仅剩总标题行（页面自绘）');
S.SAMPLES.forEach(function (s) {
  var ss = E.splitSections(E.splitReport(s.report).main);
  eq(ss.sections.length, 4, '分章 4 节 ' + s.id);
});

ok(E.checkChoice('B.', 'B') && E.checkChoice('b', 'B') && E.checkChoice('B', 'B．'), '选择题自判（容错写法）');
ok(!E.checkChoice('C', 'B') && !E.checkChoice('', 'B') && !E.checkChoice('B', ''), '选择题自判（错误/空值）');
eq(E.parseModule('- 所属知识模块：海水的性质与运动 / 洋流的分布规律'), '海水的性质与运动 / 洋流的分布规律', '模块提取逐字');
eq(E.safeImage('"><svg onload=alert(1>'), '', 'safeImage 拒绝非 data 图');
ok(E.safeImage('data:image/jpeg;base64,xx').length > 0, 'safeImage 放行合法 dataURL');

// ———— 5. 内置示例数据自洽 ————
section('内置示例数据（演示模式基准）');
eq(S.SAMPLES.length, 3, '示例=3 张');
S.SAMPLES.forEach(function (s) {
  ok(s.id && s.name && s.type && s.svg && s.report, '字段完整 ' + s.id);
  ok(s.svg.indexOf('<svg') === 0, 'SVG 以 <svg 开头 ' + s.id);
  ok(s.svg.replace(/xmlns="[^"]*"/g, '').indexOf('http') < 0, 'SVG 无外链（xmlns 命名空间除外）' + s.id);
  ok(s.report.indexOf('# 图表AI精读报告') === 0, '报告以规定标题开头 ' + s.id);
  ['## 一、', '## 二、', '## 三、', '## 四、', '## 五、'].forEach(function (h) {
    ok(s.report.indexOf(h) >= 0, '含章节 ' + h.trim() + ' ' + s.id);
  });
  var han = E.countHan(s.report);
  ok(han >= 700 && han <= 1600, '报告字数区间（' + han + ' 汉字）' + s.id);
});
var c1 = S.get('contour').report;
ok(c1.indexOf('等高距') >= 0 && (c1.indexOf('100米') >= 0 || c1.indexOf('100 米') >= 0), '等高距 100 米口径');
ok(c1.indexOf('200米≤H＜400') >= 0 || c1.indexOf('200≤H＜400') >= 0, '陡崖区间 200≤H<400（n=3,d=100 自洽）');
ok(c1.indexOf('(n-1)') >= 0 && c1.indexOf('(n+1)') >= 0, '陡崖公式出现');
var c2 = S.get('climate').report;
ok(c2.indexOf('4℃') >= 0 && c2.indexOf('28℃') >= 0, '气温 1月4℃/7月28℃ 口径');
ok(c2.indexOf('雨热同期') >= 0 && c2.indexOf('亚热带季风') >= 0, '气候判定口径一致');
var c3 = S.get('currents').report;
ok(c3.indexOf('西风漂流') >= 0 && c3.indexOf('寒流') >= 0, '西风漂流·寒流口径');
ok(c3.indexOf('增温增湿') >= 0 && c3.indexOf('降温减湿') >= 0, '洋流气候影响口径');

// ———— 6. 存储与配额降级 ————
section('本地存储（注入后端）');
function mock() {
  var m = {};
  return {
    getItem: function (k) { return (k in m) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; }
  };
}
var st = Store.createStore(mock());
eq(st.listRecords().length, 0, '空库');
var r = st.addRecord({ source: 'demo', reportText: '# x', chartType: '洋流图', module: '洋流' });
ok(r.id && r.ts > 0, '自动生成 id/ts');
ok(st.getRecord(r.id).quizState && typeof st.getRecord(r.id).quizState === 'object', 'quizState 初始化');
st.toggleFav(r.id);
ok(st.getRecord(r.id).fav === true, '收藏切换');
st.addWrong(r.id, 0); st.addWrong(r.id, 0); st.addWrong(r.id, 1);
eq(st.listWrong().length, 2, '错题去重');
st.removeWrong(r.id, 0);
eq(st.listWrong().length, 1, '移出错题');
st.setQuizState(r.id, 0, { ok: false, user: 'A' });
eq(st.getRecord(r.id).quizState['0'].user, 'A', '作答状态持久化');
st.removeRecord(r.id);
eq(st.getRecord(r.id), null, '删除记录');
eq(st.listWrong().length, 0, '删除记录连带清错题');

for (var i = 0; i < 60; i++) st.addRecord({ source: 'demo', reportText: '报告' + i });
ok(st.listRecords().length <= Store.MAX_RECORDS, '容量上限生效（' + st.listRecords().length + '≤' + Store.MAX_RECORDS + '）');

var favRec = st.addRecord({ source: 'demo', reportText: '收藏我' });
st.toggleFav(favRec.id);
for (var j = 0; j < 10; j++) st.addRecord({ source: 'demo', reportText: '后续' + j });
ok(st.getRecord(favRec.id) && st.getRecord(favRec.id).fav, '收藏记录不被挤掉');

// 导入导出往返
var exported = st.exportJSON();
var st2 = Store.createStore(mock());
var n = st2.importJSON(exported);
eq(n, st2.listRecords().length, '导入计数=库内条数');
eq(st2.listRecords().length, st.listRecords().length, '往返记录数一致');
eq(st2.listWrong().length, st.listWrong().length, '往返错题数一致');
(function () {
  function byId(a, b) { return a.id < b.id ? -1 : 1; }
  var A = st.listRecords().slice().sort(byId).map(function (x) { return x.id + '|' + x.reportText + '|' + x.fav; }).join('#');
  var B = st2.listRecords().slice().sort(byId).map(function (x) { return x.id + '|' + x.reportText + '|' + x.fav; }).join('#');
  eq(A, B, '导出→导入逐条一致');
})();
var threw = false;
try { st2.importJSON('不是json'); } catch (e) { threw = true; }
ok(threw, '非法 JSON 抛错');
threw = false;
try { st2.importJSON('{"noRecords":1}'); } catch (e) { threw = true; }
ok(threw, '缺 records 数组抛错');
threw = false;
try { st2.importJSON('{"records":[]}'); } catch (e) { threw = true; }
ok(!threw, '空 records 可导入');
(function () { // 重复导入不重复入库
  var before = st2.listRecords().length;
  st2.importJSON(exported);
  eq(st2.listRecords().length, before, '重复导入去重');
})();

// 设置与隐私
st.setSettings({ apiBase: 'https://x/v4', apiKey: 'k-secret-123', model: 'glm-4v-flash' });
eq(st.getSettings().apiKey, 'k-secret-123', '设置读写');
eq(st.getSettings().model, 'glm-4v-flash', '模型读写');
ok(st.exportJSON().indexOf('k-secret-123') < 0, '导出文件不包含 API Key');
st.clearSettings();
eq(st.getSettings().apiKey, '', '清除设置');

// 配额超限降级
(function () {
  var m = {};
  var limited = {
    getItem: function (k) { return (k in m) ? m[k] : null; },
    setItem: function (k, v) {
      if (String(v).length > 4000) { var e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
      m[k] = String(v);
    },
    removeItem: function (k) { delete m[k]; }
  };
  var lst = Store.createStore(limited);
  for (var q = 0; q < 3; q++) {
    lst.addRecord({ source: 'api', reportText: '报告' + q, image: 'data:image/jpeg;base64,' + new Array(5001).join('A') });
  }
  ok(lst.listRecords().length === 3, '配额超限仍保住 3 条记录（实际 ' + lst.listRecords().length + '）');
  ok(lst.listRecords().every(function (x) { return !x.image; }), '配额超限降级为无图记录（文本保留）');
})();

// ———— 7. AI 客户端 ————
section('AI 客户端');
var aiSrc = fs.readFileSync(path.join(ROOT, 'js', 'ai.js'), 'utf8');
ok(aiSrc.indexOf('chat/completions') >= 0, '走 OpenAI 兼容 chat/completions');
ok(aiSrc.indexOf('Bearer') >= 0, 'Bearer 鉴权');
ok(aiSrc.indexOf("sk-") < 0, '无硬编码密钥');
ok(aiSrc.indexOf('glm-4v-flash') >= 0, '默认视觉模型 glm-4v-flash');
eq(AI.normalizeBase('https://x/v4/'), 'https://x/v4', 'baseURL 去尾斜杠');
var htmlKeys = html.match(/apiKey|api_key/gi) || [];
eq(htmlKeys.length, 0, 'index.html 不出现密钥字段名');

// ———— 7b. 照片与署名 ————
section('实景照片与署名清单');
eq(Object.keys(PH).length, 6, '照片清单 6 条');
Object.keys(PH).forEach(function (k) {
  ok(PH[k].author && PH[k].license && PH[k].pageUrl, '署名完整（作者/许可/来源页）' + k);
});
ok(PH.hero.license.indexOf('CC') === 0 || PH.hero.license.indexOf('Public domain') === 0, 'hero 许可为自由版权');
ok(fs.readFileSync(path.join(ROOT, 'js', 'share.js'), 'utf8').indexOf('Wikimedia Commons') >= 0, '分享卡内嵌照片署名');

// ———— 7c. 举一反三题池 ————
section('举一反三题池（演示模式）');
['contour', 'climate', 'currents'].forEach(function (k) {
  ok(DR.POOLS[k].length >= 6, '题池 ' + k + ' ≥6 题');
  DR.POOLS[k].forEach(function (q, i) {
    eq(q.options.length, 4, '池' + k + '题' + (i + 1) + '四选项');
    ok(/^[A-D]$/.test(q.answer), '池' + k + '题' + (i + 1) + '答案合法');
    ok(q.stem.length > 8 && q.analysis.length > 10, '池' + k + '题' + (i + 1) + '题干/解析非空');
  });
});
eq(DR.poolMatch('地图的阅读 / 等高线地形图的判读'), 'contour', '模块匹配→等高线池');
eq(DR.poolMatch('世界的气候 / 气候类型的判读'), 'climate', '模块匹配→气候池');
eq(DR.poolMatch('海水的性质与运动 / 洋流的分布规律'), 'currents', '模块匹配→洋流池');
eq(DR.poolMatch('随便写的'), 'mix', '未知模块→混合池');
var pick1 = DR.pick('contour', 3, 42), pick2 = DR.pick('contour', 3, 42);
eq(JSON.stringify(pick1), JSON.stringify(pick2), '同种子抽题确定性');
eq(DR.pick('contour', 3, 42).length, 3, '抽 3 题');
var stems = pick1.map(function (q) { return q.stem; });
ok(new Set(stems).size === 3, '抽题不重复');
var mixQs = DR.pickMix(3, 42);
eq(mixQs.length, 3, '混合池 3 题');
var drillMd = DR.buildDrillMarkdown(pick1);
ok(drillMd.indexOf('**题1（选择题）**') === 0 || drillMd.indexOf('## 五') === 0, '拼装为规范题段');
eq(E.parseQuiz(drillMd).length, 3, '拼装题可被 parseQuiz 拆成 3 题');
var promptDrill = DR.buildDrillPrompt('等高线', '原题干', '原解析', '高一', '人教版');
ok(promptDrill.indexOf('3 道全新的同类选择题') >= 0 && promptDrill.indexOf('高一') >= 0, 'API 仿题提示词完整');

// ———— 8. 服务器冒烟 ————
section('HTTP 服务器冒烟');
var serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
ok(serverSrc.indexOf('no-cache') >= 0, '响应带 no-cache');
ok(serverSrc.indexOf("'0.0.0.0'") >= 0, '监听 0.0.0.0（手机局域网可用）');

function get(port, p, cb) {
  var req = http.get({ host: '127.0.0.1', port: port, path: p, timeout: 3000 }, function (res) {
    var b = '';
    res.on('data', function (c) { b += c; });
    res.on('end', function () { cb(res, b); });
  });
  req.on('error', function () { cb(null, ''); });
}

var SMOKE_PORT = 8949;
(function () {
  var child = child_process.spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(SMOKE_PORT) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  var out = '';
  child.stdout.on('data', function (d) { out += d; });
  child.stderr.on('data', function (d) { out += d; });

  function finish() {
    try { child.kill(); } catch (e) {}
    // 汇总
    console.log('');
    console.log('——————————————————————————');
    console.log('质检完成：' + passed + ' 项通过，' + failed + ' 项失败');
    if (failed) {
      console.log('失败清单：');
      failures.forEach(function (f) { console.log('  - ' + f); });
      process.exit(1);
    }
    process.exit(0);
  }

  var tries = 0;
  function wait() {
    setTimeout(function () {
      get(SMOKE_PORT, '/', function (res, body) {
        if (!res && tries++ < 20) return wait();
        if (!res) {
          ok(false, '服务器未能启动：' + out.slice(0, 200));
          return finish();
        }
        eq(res.statusCode, 200, 'GET / → 200');
        ok(body.indexOf('图解地理') >= 0, '首页含标题');
        ok((res.headers['cache-control'] || '').indexOf('no-cache') >= 0, 'no-cache 响应头');
        get(SMOKE_PORT, '/js/engine.js', function (res2) {
          eq(res2 && res2.statusCode, 200, 'GET /js/engine.js → 200');
          get(SMOKE_PORT, '/%2e%2e/%2e%2e/AGENTS.md', function (res3) {
            ok(res3 && (res3.statusCode === 403 || res3.statusCode === 404), '目录穿越被拒绝');
            get(SMOKE_PORT, encodeURI('/不存在.js'), function (res4) {
              eq(res4 && res4.statusCode, 404, '404 兜底');
              finish();
            });
          });
        });
      });
    }, 400);
  }
  wait();
})();
