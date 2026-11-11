/* 图解地理 · 首页/示例卡/分享卡 实景照片抓取：Wikimedia Commons API（自由版权）
 * 用法：node tools/fetch-photos.js [--redo=id1,id2] [--only=id1,id2]
 * 产物：photos/<id>.jpg + js/photos.js（署名清单）+ tools/_raw/photo-meta.json
 * 约定：只取 CC/公有领域横图；署名（作者+许可+来源页）随 js/photos.js 进分享卡与页脚。
 *       已缓存自动跳过（离线可复跑生成清单）；失败/无合适图不出现在清单中。
 *       改造自 玩/地貌猜地点/tools/fetch-wiki.js（同套限流/重试/署名管线）。 */
'use strict';
var fs = require('fs');
var path = require('path');
var https = require('https');

var root = path.join(__dirname, '..');
var imgDir = path.join(root, 'photos');
var OUT_JS = path.join(root, 'js', 'photos.js');

// 6 张的 Commons 检索词（人工选定；命中不理想时改词/skip 或用 --redo 重抓）
var QUERIES = {
  // 首页 hero：漓江喀斯特河流——通用中国地理航拍大图
  hero: 'Li River Guilin karst',
  // 等高线示例卡实景：龙脊梯田＝大地等高线
  pcontour: 'Longsheng rice terraces',
  // 气候示例卡实景：元阳哈尼梯田云海（亚热带季风水田农业）
  pclimate: { q: 'Yuanyang Hani terraces', skip: 1 },
  // 洋流示例卡实景：挪威峡湾（北大西洋暖流增温增湿的活教材，与报告互证）
  pcurrents: 'Sognefjorden',
  // 装饰/自查清单：黄河三角洲（入海口沙嘴航拍）
  pdelta: 'Yellow River Delta satellite',
  // 装饰：Sossusvlei 沙丘（气候对比/统计图联想）
  pdesert: 'Sossusvlei dunes'
};

var redo = {}, only = null;
process.argv.slice(2).forEach(function (a) {
  var m = a.match(/^--redo=(.+)$/);
  if (m) m[1].split(',').forEach(function (id) { redo[id.trim()] = 1; });
  var o = a.match(/^--only=(.+)$/);
  if (o) only = o[1].split(',').map(function (s) { return s.trim(); });
});

function get(url, cb) {
  https.get(url, { headers: { 'User-Agent': 'TujieDili/1.0 (local educational tool; contact: local-user)' } }, function (res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(res.headers.location, cb);
    if (res.statusCode !== 200) return cb(new Error('HTTP ' + res.statusCode));
    var chunks = [];
    res.on('data', function (c) { chunks.push(c); });
    res.on('end', function () { cb(null, Buffer.concat(chunks)); });
  }).on('error', cb);
}
function stripTags(s) { return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
function okLicense(name) {
  var n = String(name || '');
  return n.indexOf('CC') === 0 || n.indexOf('Public domain') === 0 || n === 'PD' || n.indexOf('CC0') === 0;
}

if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
var manifest = {};
var idx = 0;
var DELAY = 1400; // 限流保护
try {
  var prev = JSON.parse(fs.readFileSync(path.join(__dirname, '_raw', 'photo-meta.json'), 'utf8'));
  Object.keys(prev).forEach(function (k) { manifest[k] = prev[k]; });
} catch (e) { /* 首跑无清单 */ }
var ids = Object.keys(QUERIES).filter(function (id) { return !only || only.indexOf(id) >= 0; });

function getRetry(url, attempt, cb) {
  attempt = attempt || 1;
  get(url, function (err, buf) {
    var retryable = err && (err.message.indexOf('429') >= 0 || err.message.indexOf('ECONNRESET') >= 0 || err.message.indexOf('ETIMEDOUT') >= 0);
    if (retryable && attempt <= 4) {
      var wait = 3000 * attempt;
      console.warn('  ..retry ' + attempt + ' after ' + wait + 'ms（' + err.message + '）');
      return setTimeout(function () { getRetry(url, attempt + 1, cb); }, wait);
    }
    cb(err, buf);
  });
}

function next() {
  if (idx >= ids.length) return finish();
  var id = ids[idx++];
  var jpg = path.join(imgDir, id + '.jpg');
  if (fs.existsSync(jpg) && !redo[id]) {
    var cached = {};
    try { cached = JSON.parse(fs.readFileSync(path.join(__dirname, '_raw', 'photo-meta.json'), 'utf8')); } catch (e) { }
    if (cached[id]) { manifest[id] = cached[id]; console.log('[skip] ' + id); return setTimeout(next, 0); }
  }
  var q = QUERIES[id];
  var qspec = typeof q === 'string' ? { q: q, skip: 0 } : q;
  var api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    '&generator=search&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + qspec.q) +
    '&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1100';
  getRetry(api, 1, function (err, buf) {
    if (err) { console.warn('[warn] ' + id + ' 检索失败: ' + err.message); return setTimeout(next, DELAY); }
    var data;
    try { data = JSON.parse(buf.toString('utf8')); } catch (e) { return setTimeout(next, DELAY); }
    var pages = data.query && data.query.pages ? Object.keys(data.query.pages).map(function (k) { return data.query.pages[k]; }) : [];
    pages.sort(function (a, b) { return (a.index || 99) - (b.index || 99); });
    var picked = null, passed = 0;
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      var ii = p.imageinfo && p.imageinfo[0];
      if (!ii) continue;
      if (ii.width < 800 || ii.height < 500) continue;
      if (ii.width / ii.height < 1.15) continue; // 横构图
      var em = ii.extmetadata || {};
      var lic = stripTags((em.LicenseShortName || {}).value || '');
      if (!okLicense(lic)) continue;
      if (passed < (qspec.skip || 0)) { passed++; continue; }
      picked = { p: p, ii: ii, lic: lic };
      break;
    }
    if (!picked) { console.warn('[none] ' + id + '（' + qspec.q + '）无合规横图'); return setTimeout(next, DELAY); }
    var thumb = picked.ii.thumburl || picked.ii.url;
    getRetry(thumb, 1, function (e2, img) {
      if (e2) { console.warn('[warn] ' + id + ' 下载失败: ' + e2.message); return setTimeout(next, DELAY); }
      fs.writeFileSync(jpg, img);
      var em = picked.ii.extmetadata || {};
      manifest[id] = {
        title: stripTags(picked.p.title || '').replace(/^File:/, ''),
        author: stripTags((em.Artist || {}).value || '佚名').slice(0, 60) || '佚名',
        license: picked.lic,
        pageUrl: picked.ii.descriptionurl || ''
      };
      console.log('[ok] ' + id + ' ← ' + manifest[id].title.slice(0, 40) + '（' + manifest[id].license + '）');
      setTimeout(next, DELAY);
    });
  });
}

function finish() {
  var entries = Object.keys(manifest).sort().map(function (id) {
    return '  ' + JSON.stringify(id) + ': ' + JSON.stringify(manifest[id]);
  });
  var js = '/* 实景照署名清单 —— 由 node tools/fetch-photos.js 生成，勿手改\n' +
    ' * 图片在 photos/<id>.jpg；均为 Wikimedia Commons 自由版权（CC/PD），署名如下（分享卡与页脚引用） */\n' +
    "'use strict';\n" +
    '(function (root) {\n' +
    '  root.TuJiePhotos = {\n' + entries.join(',\n') + '\n  };\n' +
    "  if (typeof module !== 'undefined' && module.exports) module.exports = root.TuJiePhotos;\n" +
    "})(typeof window !== 'undefined' ? window : globalThis);\n";
  fs.writeFileSync(OUT_JS, js, 'utf8');
  var metaDir = path.join(__dirname, '_raw');
  if (!fs.existsSync(metaDir)) fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(path.join(metaDir, 'photo-meta.json'), JSON.stringify(manifest, null, 1), 'utf8');
  console.log('[done] 收图 ' + Object.keys(manifest).length + '/' + ids.length + '，清单 → js/photos.js');
}
next();
