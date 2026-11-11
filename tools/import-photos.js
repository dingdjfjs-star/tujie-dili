/* 从 姊妹项目《地貌猜地点》复用已抓好的 Wikimedia 自由版权照片（该机 Wikimedia 直连不稳，本地已有存货）。
 * 用法：node tools/import-photos.js
 * 产物：photos/<id>.jpg + js/photos.js（署名清单，注明 Commons 来源页与许可）
 * 如需更换某张图：网络可用时跑 node tools/fetch-photos.js --redo=<id>（同套署名管线）。 */
'use strict';
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var srcDir = path.join(root, '..', '地貌猜地点', 'wiki-imgs');
var srcMeta = path.join(root, '..', '地貌猜地点', 'js', 'wiki-photos.js');
var imgDir = path.join(root, 'photos');

// 图解地理用途 → 地貌猜地点题号（署名随清单走）
var MAP = {
  hero: { q: 'Q01', use: '首页主图：漓江喀斯特河流，桂林（中国南方喀斯特）' },
  pcontour: { q: 'Q23', use: '等高线示例卡实景：黄土高原沟壑——大自然画的等高线' },
  pclimate: { q: 'Q49', use: '气候示例卡实景：大棱镜温泉的彩色环带——自然的分层设色图' },
  pcurrents: { q: 'Q33', use: '洋流示例卡实景：松恩峡湾——北大西洋暖流增温增湿的活教材' },
  pdelta: { q: 'Q45', use: '装饰/教学联想：密西西比河三角洲入海口沙嘴航拍' },
  pdesert: { q: 'Q29', use: '装饰/气候对照：Sossusvlei 沙丘（极端干旱区的名片）' }
};

var src = require(srcMeta);
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

var out = {};
Object.keys(MAP).forEach(function (id) {
  var spec = MAP[id];
  var meta = src[spec.q];
  var srcFile = path.join(srcDir, spec.q + '.jpg');
  if (!meta || !fs.existsSync(srcFile)) {
    console.warn('[warn] ' + id + '（' + spec.q + '）源缺失，跳过');
    return;
  }
  fs.copyFileSync(srcFile, path.join(imgDir, id + '.jpg'));
  out[id] = {
    title: meta.title,
    author: meta.author,
    license: meta.license,
    pageUrl: meta.pageUrl || '',
    use: spec.use
  };
  console.log('[ok] ' + id + ' ← ' + spec.q + ' ' + meta.title.slice(0, 40) + '（' + meta.license + '）');
});

var entries = Object.keys(out).sort().map(function (id) {
  return '  ' + JSON.stringify(id) + ': ' + JSON.stringify(out[id]);
});
var js = '/* 实景照署名清单 —— 由 node tools/import-photos.js 生成（源：Wikimedia Commons，经姊妹项目《地貌猜地点》管线抓取），勿手改\n' +
  ' * 图片在 photos/<id>.jpg；均为自由版权（CC/公有领域），署名如下（页脚与分享卡引用，照片不用于商业用途） */\n' +
  "'use strict';\n" +
  '(function (root) {\n' +
  '  root.TuJiePhotos = {\n' + entries.join(',\n') + '\n  };\n' +
  "  if (typeof module !== 'undefined' && module.exports) module.exports = root.TuJiePhotos;\n" +
  "})(typeof window !== 'undefined' ? window : globalThis);\n";
fs.writeFileSync(path.join(root, 'js', 'photos.js'), js, 'utf8');
console.log('[done] 收图 ' + Object.keys(out).length + '/' + Object.keys(MAP).length + '，清单 → js/photos.js');
