// 图解地理 · 静态服务器（免依赖）
// 端口 8947；监听 0.0.0.0，手机与电脑同一 WiFi 即可拍照上传
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const root = __dirname, port = process.env.PORT || 8947;
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.bat': 'text/plain; charset=utf-8'
};
http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { p = '/'; }
  if (p === '/' || p === '') p = '/index.html';
  const f = path.normalize(path.join(root, p));
  if (f !== root && f.indexOf(root + path.sep) !== 0) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 禁止访问');
  }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 找不到页面：' + p); }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(f).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(b);
  });
}).listen(port, '0.0.0.0', () => {
  console.log('');
  console.log('  图解地理 · AI 地理图表精读 已启动');
  console.log('  电脑访问：  http://localhost:' + port);
  const seen = {};
  for (const k in os.networkInterfaces()) {
    for (const it of os.networkInterfaces()[k]) {
      if (it.family === 'IPv4' && !it.internal && !seen[it.address]) {
        seen[it.address] = 1;
        console.log('  手机访问：  http://' + it.address + ':' + port + '   （需同一 WiFi，可拍照上传课本图）');
      }
    }
  }
  console.log('');
  console.log('  提示：AI 密钥只保存在浏览器本地，首次使用请点右上角「AI 设置」。');
  console.log('  未配置密钥时可先用内置示例图体验完整精读流程（明确标注演示数据）。');
  console.log('');
});
