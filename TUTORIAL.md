# 图解地理 · 项目精讲教程（TUTORIAL.md）

> 读者画像：三个月后的你自己 + 复试老师/面试官。
> 配套交互教学网页：[tutorial/index.html](tutorial/index.html)（可玩组件直接复用本项目源码模块）。
> 每个数字可回查：断言数 285（test/test.js）、bug 编号 #1~#8（report/质检报告.md）、端口 8947。

---

## 1. 这个项目是什么

**一句话**：把中学地理课本里任意一张图表（等高线图/气候直方图/洋流图/统计图）拍照上传，多模态大模型按教材与课标输出五段式教研报告，配套变式题自测、错题本、举一反三与分享卡。

**成品三看**：
- 看线上：https://dingdjfjs-star.github.io/tujie-dili/ （演示模式开箱即用，AI 密钥自带自存）
- 看数据：`node test\test.js` → **285 项断言全绿**（含真实 spawn 服务器冒烟与目录穿越拒绝）
- 看最惊艳的一个点：**AI 输出的自由 Markdown，被 `engine.js` 切成"壹贰叁肆"分章卡 + 可作答的选择题**——自由文本到结构化交互的转换，是全项目的枢纽。

**30 秒电梯陈述**：地理考试的拉分点在"读图"，但学生缺一个随时可问的教研员。图解地理用多模态大模型（GLM-4V）把任意地理图表转成五段式精读报告：要素识别→规律原理→考点易错→三道变式题。报告不是"看完就走"的文本——它被引擎切成分章卡片、章节导览和可作答的自测题，答错自动进错题本，错题还能"举一反三"再生成同类题。全程纯前端零依赖，AI 密钥只存本机；演示模式下用内置的 3 张手绘图 + 18 题题池，零网络也能跑通全流程，285 项自动化断言把关。

## 2. 设计逻辑

### 2.1 模块划分（为什么每个文件独立存在）

| 模块 | 职责 | 为什么独立存在 |
|---|---|---|
| `prompt.js` | 提示词模板 + 组装多模态请求 | 提示词是本项目的"教材映射层"，单独成文件便于测试其完整性（断言逐句检查五段结构） |
| `md.js` | 极简 Markdown 渲染 | AI 输出是自由 Markdown，**必须先转义再拼装**；第三方库要么太重要么默认信任 HTML |
| `engine.js` | 报告拆解（分节/分章/拆题）+ 自判 | 全项目枢纽：把自由文本变成可交互结构；纯逻辑所以 Node 可直接测 |
| `store.js` | 解析记录/错题本/设置 | 存储后端可注入（mock 测试）、配额降级策略集中一处 |
| `samples.js` | 内置示例 + 演示报告 + 锦囊 | 演示模式的数据源，**同时是自动化质检的基准样本**（报告与图内数据严格自洽） |
| `drill.js` | 举一反三题池 + 种子抽题 | 演示模式无 AI 也能出同类题；种子确定性让"同一错题同一天生成同一组"可复现可质检 |
| `ai.js` | OpenAI 兼容客户端 | 只做一件事：发请求 + 把 HTTP 状态翻译成中文排查提示 |
| `share.js` | 分享卡 Canvas 绘制 | Canvas 代码脏且长，隔离在 UI 侧 |
| `ui.js` | 界面壳 | 所有 DOM 操作集中此处，其余模块零 DOM |

### 2.2 数据流

```
用户上传图片 → 压缩(canvas, ≤1280px)
    ↓
prompt.buildMessages(图, 年级, 教材, 类型提示)
    ↓
ai.callVision ── 有 Key → 多模态 API → Markdown 报告
    │                              │
    └─ 无 Key/失败 → samples.js    │
         （内置示例，明确标注演示）  ↓
                              engine.parseReport
                                    ↓
        ┌───────────────────────────┼──────────────────────┐
   splitSections 分章          parseQuiz 拆题        parseModule 提标签
        ↓                           ↓                      ↓
   分章卡+导览芯片            自测题(判分/入错题本)      彩色模块筛选
                                    ↓ 答错
                              store.addWrong → 错题本 → drill 举一反三
                                                        (AI仿题 / 题池种子抽题)
```

### 2.3 五个关键决策点（为什么不选另一个方案）

1. **为什么演示模式不回落到示例？——上传图解析失败时**
   用户上传的是自己的图，API 失败后若展示"固定示例报告"，内容与图片对不上，等于教学生看假报告。所以报错给排查提示，演示体验走独立的示例入口。（决策依据见质检报告「设计决策留痕」）

2. **为什么自研 Markdown 渲染器而不用 marked.js？**
   报告内容要进 `innerHTML`。marked 这类库默认信任 HTML，AI 输出又不可信（可能带注入），要补一层净化；自研 130 行"**先全量转义、再拼装标签**"的渲染器天然免疫，还能按项目排版定制（分章、朱砂节标）。不这样做的后果：要么引依赖破坏离线单文件，要么留 XSS 面（测试有专门断言：`<img onerror>` 必须被转义为 `&lt;img`）。

3. **为什么题池抽题用种子 PRNG（mulberry32）？**
   "同一道错题、同一天 → 同一组同类题"。好处：老师检查学生训练记录时可复现；自动化测试可断言"同种子同结果"。用 `Math.random()` 的后果：每次生成不同题，质检无法断言，学生复习也对不上。

4. **为什么 localStorage 配额降级是"先弃图片、再弃旧记录"？**
   解析文本和错题记录是学习资产本体，图片缩略图只是装饰。5MB 配额下图片是第一个挤爆存储的东西。降级链：①丢所有图（保全部文字）→ ②丢最旧非收藏 → ③从最旧丢到只剩当前一条。（bug #5 的教训：顺序反了会只保住最新一条文本）

5. **为什么提示词固定"五段结构 + 1200 字上限"并写进测试？**
   五段结构是下游解析器（splitSections/parseQuiz）的契约——AI 少写一节，分章就少一张卡。把结构逐句写进断言，改提示词时测试会立刻报警，契约就不会被无意破坏。

## 3. 代码骨架

```
图解地理/
├─ index.html        全部视图容器 + 纸墨风 CSS（上传/报告/图册/设置/弹窗）
├─ server.js         零依赖静态服务器：no-cache 头、路径穿越拒绝、0.0.0.0
├─ photos/           6 张实景照（Wikimedia Commons CC/PD）
├─ js/               ↑表格中的 9 个模块（纯逻辑层 + ui 薄壳）
├─ tools/            fetch-photos.js（联网抓图）/ import-photos.js（本地复用导入）
├─ test/test.js      285 项断言（10 组）
└─ report/质检报告.md 两轮浏览器冒烟 8 个 bug 全留痕
```

核心数据结构——一条解析记录（`store.js`，字段注释即设计说明）：

```js
var r = {
  id: genId(), ts: Date.now(), fav: false,
  source: rec.source || 'api',   // 'api' | 'demo'（演示/题池）
  model: rec.model || '',
  grade: rec.grade || '', textbook: rec.textbook || '', chartType: rec.chartType || '',
  module: rec.module || '',      // 知识模块（彩色标签按它散列取色）
  sampleId: rec.sampleId || null,// 指向内置示例；null=用户上传
  image: rec.image || null,      // 压缩后 dataURL；配额吃紧时第一个被牺牲
  reportText: rec.reportText || '', // AI 报告原文（Markdown，五段结构）
  quizState: {}                  // { "题号": { user, ok, revealed } } 自测作答状态
};
```

错题条目 `{ rid, q, ts }`：`rid` 指向记录、`q` 是题号——错题本不复制题目内容，删记录时连带清错题，永不悬空。

## 4. 核心代码逐段精讲

### 4.1 `splitReport` + `splitSections`：把自由文本切成可交互结构

**问题**：AI 输出的是一整块 Markdown，页面却要分章卡片、章节导览、可作答题——怎么把"文章"变"结构"？
**思路**：不要求 AI 输出 JSON（小模型格式漂移严重），而是约定**五段标题契约**（`## 一、…`~`## 五、…`），用正则按锚点切片；正文段落再按 `## 数字、` 切成章。解析失败就整体降级为原文渲染，绝不白屏。
**伪代码**：
```
找到 "## 五、…变式" 的位置 → 前面是正文，后面是题段
正文按 /^##\s*[一二三…]\s*[、.．]?/ 切成 sections[]（每节 {no, title, body}）
preamble 里去掉 "# 图表AI精读报告" 总标题行（页面自绘大标题）
题段按 "**题N" 或 "题N" 切开 → parseQuestion 抽题干/选项/答案/解析
```
**真实代码**（`js/engine.js:6`、`js/engine.js:102`）：

```js
function splitReport(md) {
  var text = String(md || '').replace(/\r\n/g, '\n');
  var m = text.match(/^##\s*[五伍5]\s*[、.．:：]?\s*变式/m);
  if (m && typeof m.index === 'number') {
    return { main: text.slice(0, m.index).trim(), quizText: text.slice(m.index).trim() };
  }
  return { main: text.trim(), quizText: '' };
}

function splitSections(mainMd) {
  var text = String(mainMd || '').replace(/\r\n/g, '\n');
  var re = /^##\s*([一二三四五六七八九十\d]+)\s*[、.．:：]?\s*([^\n]*)/gm;
  var heads = [], m;
  while ((m = re.exec(text))) heads.push({ no: m[1], title: m[2].trim(), start: m.index, end: re.lastIndex });
  var sections = [];
  for (var i = 0; i < heads.length; i++) {
    var end = i + 1 < heads.length ? heads[i + 1].start : text.length;
    sections.push({ no: heads[i].no, title: heads[i].title, body: text.slice(heads[i].end, end).trim() });
  }
  var preamble = heads.length ? text.slice(0, heads[0].start) : text;
  preamble = preamble.replace(/^#\s+.*$/m, '').trim(); // 总标题行由页面自绘
  return { preamble: preamble, sections: sections };
}
```
**坑**：返回的是**对象** `{preamble, sections}` 不是数组——v1.1 曾把它当数组 `.map` 直接 TypeError 白屏（踩坑 #5）。这正是"解析器 100% 有测试断言、UI 层也要 reload 截图验收"两道关都要存在的原因。

### 4.2 `md.js`：转义优先的 Markdown 渲染器

**问题**：AI 文本要渲染进页面，但绝不能让 `<img onerror=…>` 之类的注入活下来。
**思路**：所有文本先过 `escapeHtml`（`& < > "` 全转义），**之后**才做 Markdown 语法替换——生成的 `<strong>` 等标签是渲染器自己的，文本里的任何标签都已是实体。
**真实代码**（`js/md.js:5`、`js/md.js:28` 节选）：

```js
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(s) {
  s = escapeHtml(s);                       // 先转义
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}
```
**坑**：中文有序列表 `1、` 与数值 `1.5米` 会撞——解法是标记后加负向断言 `(?!\d)`（`/^\d+[.、)](?!\d)\s*/`），"1、甲"成列表而"1.5米"不误伤。

### 4.3 `store.js` 的 `persist`：配额降级链

**问题**：localStorage 5MB，每条记录带 200~300KB 图片，十几条就爆；爆了怎么办？
**思路**：写不进去时的降级顺序 = 资产价值排序：文字 > 旧记录 > 图片 > 当前记录。
**真实代码**（`js/store.js:34` 节选）：

```js
function persist() {
  try {
    storage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    // 配额超限兜底：①丢所有图片（优先保全部文字）→ ②丢最旧非收藏 → ③从最旧丢到只剩当前一条
    var saved = false;
    db.records.forEach(function (r) { r.image = null; });
    try { storage.setItem(KEY, JSON.stringify(db)); saved = true; } catch (e2) {}
    while (!saved && db.records.length > 1) { /* 丢最旧非收藏，逐条重试 */ }
    while (!saved && db.records.length > 1) { db.records.pop(); /* 最后兜底 */ }
  }
}
```
**坑**：第一版顺序是"先丢旧记录、后丢图片"，极限测试里 3 条记录只剩 1 条——文字资产反而先没了（测试直接抓出来，见踩坑 #6 相关节）。

### 4.4 `drill.js` 的种子抽题：确定性的"举一反三"

**问题**：无 AI 时也要给每道错题生成 3 道同类题，且"同一天同一错题 → 同一组"，否则质检无法断言。
**思路**：`day(日期) + 错题特征` 哈希成种子 → mulberry32 洗牌题池索引 → 取前 3。
**真实代码**（`js/drill.js:135`、`js/drill.js:146`、`js/drill.js:174`）：

```js
function rng(seed) {                       // mulberry32：32 位种子 PRNG
  var t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    var r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(poolName, n, seed) {         // Fisher-Yates 洗牌后取前 n，不重复
  var pool = POOLS[poolName] || [];
  var idxs = []; for (var i = 0; i < pool.length; i++) idxs.push(i);
  var rand = rng(seed || 1);
  for (var j = idxs.length - 1; j > 0; j--) {
    var k = Math.floor(rand() * (j + 1));
    var tmp = idxs[j]; idxs[j] = idxs[k]; idxs[k] = tmp;
  }
  return idxs.slice(0, Math.min(n, idxs.length)).map(function (ix) { /* 包装成题 */ });
}
function drillFor(moduleName, wrongKey, n) { // day*131 + 错题特征 → 种子
  var day = Math.floor(Date.now() / 86400000);
  var seed = day * 131 + String(wrongKey).length * 17 + (String(wrongKey).charCodeAt(0) || 3);
  var pool = poolMatch(moduleName);          // 模块名关键词 → contour/climate/currents/mix
  var qs = pool === 'mix' ? pickMix(n || 3, seed) : pick(pool, n || 3, seed);
  return { pool: pool, questions: qs };
}
```
**坑**：模块匹配用关键词（'等高线'→contour），未知模块落 `mix`（三池各取 1）而不是报错——AI 报告的模块名千变万化，解析器必须永远有产出。

### 4.5 `share.js` 的 `drawCover` + 污染降级

**问题**：分享卡要把照片按"cover"方式裁进固定框（照片比例各异）；且 `file://` 直开时 drawImage 本地文件会污染 canvas，`toDataURL` 直接抛错。
**思路**：cover = 取宽高比较大者缩放后居中绘制；`toDataURL` 包 try/catch，污染时**重画一张无图版**照样导出并提示。
**真实代码**（`js/share.js:42`、`js/share.js:153` 节选）：

```js
function drawCover(ctx, img, x, y, w, h) {
  var k = Math.max(w / img.width, h / img.height);   // 取较大缩放比 → 填满
  var dw = img.width * k, dh = img.height * k;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); // 居中裁剪
}
// toPng 内：
try {
  canvas = build(rec, parsed, entry, img);
  var url = canvas.toDataURL('image/png');
  return { ok: true, url: url, tainted: false };
} catch (e) {
  canvas = build(rec, parsed, null, null);           // 无图降级版
  try { return { ok: true, url: canvas.toDataURL('image/png'), tainted: true }; }
  catch (e2) { return { ok: false, error: '生成失败：' + e.message }; }
}
```
**坑**：部署到 http(s) 后同域照片不再污染 canvas——本地 file:// 直开的降级只是体验折损，不是功能缺失。

## 5. 从零复刻路线（里程碑）

| 里程碑 | 做什么 | 怎么验证 |
|---|---|---|
| M1 骨架 | index.html 三视图 + server.js + `启动.bat` | `node server.js` → 8947 返回 200；`/%2e%2e/` 被拒 |
| M2 渲染层 | md.js（转义优先） | 手喂 `<img onerror>`，输出必须是实体 |
| M3 存储层 | store.js + 注入式后端 | Node mock 后端跑 CRUD/配额/往返 |
| M4 AI 接入 | prompt.js + ai.js | 无 Key 走演示；有 Key 真解析一张图 |
| M5 报告页 | engine 拆解 + 分章卡 + 自测 | 对示例报告切出 4 节 3 题；答错入错题本 |
| M6 三个功能 | drill/share/自查清单 | 同种子同题组；分享卡 file:// 降级可用 |
| 收尾 | test 全绿 + 浏览器逐页截图 | 285 项断言 + 三页目检 |

## 6. 踩坑实录（编号与质检报告一致）

- **#1 遮罩击穿**：`.modal-mask` 的 `display:flex` 覆盖 `hidden` 属性 UA 样式 → 透明遮罩盖住整页。修复：全局 `[hidden]{display:none !important}`。
- **#2 徽标不刷新**：错题本「已掌握」后 tab 徽标是旧数字。修复：计数挪进每次渲染的 `renderLibTab()`。
- **#3 SVG 文字溢出**：洋流图说明文字起点 x=150 无居中，超出 360 视窗被裁。修复：`text-anchor="middle"` 居中 + 精简文案。
- **#5 对象当数组**：`splitSections` 返回 `{preamble, sections}`，UI 层 `.map` → TypeError 报告页白屏。修复：`secs.sections.map`；教训是"纯逻辑有测试 ≠ UI 接线没写反，必须 reload 截图验收"。
- **#6 降级顺序反了**：配额兜底先丢旧记录，极限测试只剩 1 条文字。修复：先弃图片。
- **#7 smooth 滚动节流**：`scrollIntoView({behavior:'smooth'})` 在后台/无头渲染环境不滚动（rAF 被停）。修复：即时定位 + `scroll-margin-top` 防 sticky 遮挡。
- **#8 测试口径**：data URI 内联 SVG 的 `xmlns='http://…'` 被离线断言误报外链。修复：断言剔除 xmlns 再查。
- **#9（v1.2 补）幽灵函数**：`drill-note` 调了从未定义的 `hasKey()` → ReferenceError 让错题本分支渲染中断且被事件处理器静默吞掉（表现为"点了没反应"）。修复：改用 `getSettings().apiKey`；教训：UI 层报错被吞时要在页面里注入 `window.onerror` 抓栈。

## 7. 扩展练习（由易到难）

1. **加一条读图锦囊**：`js/samples.js` 的 `TIPS` 数组加一句 → 刷新首页确认出现 → `node test\test.js`（锦囊数在页面右下角显示"共 N 条"）。
2. **加一个内置示例图**：`js/samples.js` 的 `SAMPLES` 加一条（手绘 SVG + 五段结构报告，注意与图内数据自洽）→ `node test\test.js`（自动断言 4 节 3 题、字数区间、数据口径）。
3. **加一个题池模块**：`js/drill.js` 的 `POOLS` 加池并在 `poolMatch` 加关键词分支 → test 会检查每题四选项/答案合法/种子确定性；再在错题本里对相应模块记录点"生成 3 题"实测。

## 8. 面试 / 复试话术

**30 秒版**：做一个把 AI"看图"变成"教学"的工具——多模态模型按五段教研结构解析任意地理图表，我再写一层解析引擎把自由文本切成分章卡、导览和可作答的选择题，答错进错题本、错题一键同类变式。全流程 285 项自动化断言把关，纯前端零依赖部署在 GitHub Pages。

**3 分钟版骨架**：痛点（读图拉分、缺随时可问的教研员）→ 方案（多模态 + 提示词契约 + 解析引擎）→ 三个工程亮点（①转义优先渲染器防注入 ②种子确定性抽题可复现可质检 ③配额降级保学习资产）→ 双模式设计（演示模式让产品在无网络无密钥时依然完整可用，也是质检基准）→ 结果（285 断言、两轮浏览器冒烟 8 个 bug 全留痕、线上可访问）。

**追问 QA（5 条）**：

1. **Q：AI 输出格式漂移怎么办？** A：三层兜底——提示词五段契约（进测试断言）；解析器正则宽容（兼容 `**题1`/`题1`、`1.`/`1、` 等）；解析失败整体降级为原文渲染，绝不白屏。
2. **Q：为什么不用现成 Markdown 库？** A：内容要进 innerHTML 且来源不可信，自研 130 行"先转义后拼装"天然免疫注入，还顺带定制了排版；断言里有专门的 XSS 用例。
3. **Q：AI 密钥安全？** A：只存本机 localStorage，仅随请求发往用户自填的 OpenAI 兼容端点；导出 JSON 的函数里没有 settings 字段，测试断言导出文件不含密钥。
4. **Q：演示模式的意义？** A：三个——无网络/无密钥完整体验；示例报告是解析器的固定基准（数据与图内信息自洽，可写死断言）；面试时离线可演示。
5. **Q：怎么保证教程和代码一致？** A：纪律两条——教程代码块从源文件按 `文件:行号` 摘录不重写；所有数字（285 断言、8 个 bug、6 张照片）写完逐一回查质检报告与测试输出。
