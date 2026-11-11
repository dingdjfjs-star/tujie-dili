/* 图解地理 · 精读分享卡（Canvas 长图生成，可下载 PNG 分享）
 * 布局：实景照片头 + 朱砂章 + 图表类型大字 + 元信息 + 核心规律摘句 + 三题摘要 + 署名页脚。
 * 照片：示例记录用内置实景照；上传记录用用户图。file:// 下 canvas 可能被污染，降级为无图版并提示。 */
(function (global) {
  'use strict';

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function cleanMd(s) {
    return String(s || '').replace(/[#*>`|]/g, '').replace(/\s+/g, ' ').trim();
  }

  // 逐词换行绘制（中文按字符断行）
  function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
    var chars = String(text || '').split('');
    var line = '', lines = [];
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = chars[i];
        if (lines.length >= maxLines) break;
      } else line = test;
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length >= maxLines && i < chars.length) {
      var last = lines[maxLines - 1];
      lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + '…';
    }
    lines.forEach(function (ln, k) { ctx.fillText(ln, x, y + k * lineH); });
    return y + lines.length * lineH;
  }

  // 照片 cover 裁剪绘制
  function drawCover(ctx, img, x, y, w, h) {
    var k = Math.max(w / img.width, h / img.height);
    var dw = img.width * k, dh = img.height * k;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function build(rec, parsed, photoEntry, photoSrc) {
    var W = 800, H = 1120;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    var PAPER = '#f7f2e4', PAPER2 = '#fcf8ee', INK = '#28241d', MUTED = '#7d7362',
      LINE = '#c2b18c', SEAL = '#a83f2c', HAIR = '#e8dfc8';

    // 纸底 + 双线框
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
    ctx.strokeRect(12.5, 12.5, W - 25, H - 25);
    ctx.strokeStyle = 'rgba(170,150,100,.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(19.5, 19.5, W - 39, H - 39);

    // 照片头（cover）
    var photoY = 40, photoH = 210;
    ctx.fillStyle = PAPER2;
    ctx.fillRect(34, photoY - 6, W - 68, photoH + 12);
    if (photoSrc) {
      try {
        if (photoSrc.complete && photoSrc.naturalWidth) drawCover(ctx, photoSrc, 40, photoY, W - 80, photoH);
        ctx.strokeStyle = 'rgba(120,100,60,.4)'; ctx.strokeRect(40.5, photoY + .5, W - 81, photoH - 1);
      } catch (e) { photoSrc = null; }
    }
    if (!photoSrc) {
      ctx.fillStyle = '#e9e0c9'; ctx.fillRect(40, photoY, W - 80, photoH);
      ctx.fillStyle = MUTED; ctx.font = '16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('（本机 file:// 限制，分享卡未嵌照片）', W / 2, photoY + photoH / 2);
      ctx.textAlign = 'left';
    }

    // 朱砂章
    ctx.fillStyle = SEAL;
    ctx.fillRect(40, photoY + photoH + 26, 190, 36);
    ctx.strokeStyle = 'rgba(250,242,224,.55)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(44.5, photoY + photoH + 30.5, 181, 27);
    ctx.fillStyle = '#f9f2df'; ctx.font = '17px "KaiTi","STKaiti",serif';
    ctx.fillText('图解地理 · 精读卡', 52, photoY + photoH + 51);

    // 日期（右上）
    ctx.fillStyle = MUTED; ctx.font = '13px Georgia, serif'; ctx.textAlign = 'right';
    var d = new Date(rec.ts || Date.now());
    ctx.fillText(d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(), W - 44, photoY + photoH + 50);
    ctx.textAlign = 'left';

    // 图表类型大字
    var title = String(rec.chartType || parsed.chartType || '地理图表').slice(0, 16);
    ctx.fillStyle = INK; ctx.font = 'bold 34px Georgia,"STSong","SimSun",serif';
    ctx.fillText(title, 40, photoY + photoH + 106);

    // 元信息
    ctx.fillStyle = MUTED; ctx.font = '15px Georgia,"STSong",serif';
    var metaLine = [parsed.module || rec.module || '', rec.grade, rec.textbook].filter(Boolean).join(' · ').slice(0, 46);
    ctx.fillText(metaLine, 40, photoY + photoH + 138);

    // 分隔线
    ctx.strokeStyle = LINE;
    ctx.beginPath(); ctx.moveTo(40, photoY + photoH + 160); ctx.lineTo(W - 40, photoY + photoH + 160); ctx.stroke();

    var y = photoY + photoH + 196;
    var secList = (parsed.sections && parsed.sections.length ? parsed.sections : []);

    // 核心规律摘句
    var lawSec = secList.filter(function (s) { return s.title.indexOf('规律') >= 0; })[0];
    ctx.fillStyle = SEAL; ctx.font = '16px "KaiTi","STKaiti",serif';
    ctx.fillText('◆ 核心规律', 40, y);
    ctx.fillStyle = INK; ctx.font = '15px Georgia,"STSong",serif';
    var lawText = lawSec ? cleanMd(lawSec.body) : cleanMd(rec.reportText).slice(0, 160);
    y = wrapText(ctx, lawText, 40, y + 28, W - 80, 26, 5);
    y += 10;

    // 考点摘句
    var keySec = secList.filter(function (s) { return s.title.indexOf('考点') >= 0; })[0];
    ctx.fillStyle = SEAL; ctx.font = '16px "KaiTi","STKaiti",serif';
    ctx.fillText('◆ 考点提醒', 40, y + 6);
    ctx.fillStyle = INK; ctx.font = '15px Georgia,"STSong",serif';
    var keyText = keySec ? cleanMd(keySec.body).slice(0, 150) : '';
    y = wrapText(ctx, keyText, 40, y + 34, W - 80, 26, 4);
    y += 12;

    // 三题摘要
    ctx.strokeStyle = HAIR;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();
    ctx.fillStyle = SEAL; ctx.font = '16px "KaiTi","STKaiti",serif';
    ctx.fillText('◆ 变式训练（3 题）', 40, y + 30);
    ctx.fillStyle = INK; ctx.font = '14px Georgia,"STSong",serif';
    parsed.questions.slice(0, 3).forEach(function (q, i) {
      var one = (i + 1) + '. ' + cleanMd(q.stem).slice(0, 38);
      ctx.fillText(one, 40, y + 60 + i * 26);
    });

    // 页脚
    ctx.fillStyle = MUTED; ctx.font = '12px Georgia, serif';
    var credit = photoEntry
      ? '照片：' + (photoEntry.title || '').slice(0, 30) + ' · ' + photoEntry.author + ' · ' + photoEntry.license + ' · Wikimedia Commons'
      : '图解地理 · AI 地理图表精读';
    ctx.fillText(credit, 40, H - 52);
    ctx.fillText('由 图解地理 生成（AI 精读 + 教研提示词）', 40, H - 32);

    return canvas;
  }

  function toPng(rec) {
    var Engine = global.TuJieEngine;
    var parsed = Engine.parseReport(rec.reportText);
    var Photos = global.TuJiePhotos || {};
    // 选照片：示例记录按示例卡映射；上传记录用用户图；否则用装饰照
    var pid = null, src = null, entry = null;
    if (rec.sampleId === 'contour') pid = 'pcontour';
    else if (rec.sampleId === 'climate') pid = 'pclimate';
    else if (rec.sampleId === 'currents') pid = 'pcurrents';
    else {
      var safeImg = Engine.safeImage(rec.image);
      if (safeImg) { src = safeImg; }
      else pid = 'pdelta';
    }
    if (pid && Photos[pid]) { entry = Photos[pid]; src = 'photos/' + pid + '.jpg'; }
    else if (!src) { entry = Photos.pdelta || null; src = entry ? 'photos/pdelta.jpg' : null; }
    else { entry = null; }

    return loadImage(src).then(function (img) {
      var canvas;
      try {
        canvas = build(rec, parsed, entry, img);
        var url = canvas.toDataURL('image/png'); // file:// 下若被污染会抛错
        return { ok: true, url: url, tainted: false };
      } catch (e) {
        canvas = build(rec, parsed, null, null); // 无图降级版
        try { return { ok: true, url: canvas.toDataURL('image/png'), tainted: true }; }
        catch (e2) { return { ok: false, error: '生成失败：' + e.message }; }
      }
    });
  }

  global.TuJieShare = { toPng: toPng };
})(typeof window !== 'undefined' ? window : globalThis);
