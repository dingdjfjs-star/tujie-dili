/* 图解地理 · 解析引擎（纯逻辑：报告结构化、变式题拆题、选择题自判、安全图片校验） */
(function (global) {
  'use strict';

  // 把报告切成「一~四节正文」与「第五节变式题」两段
  function splitReport(md) {
    var text = String(md || '').replace(/\r\n/g, '\n');
    var m = text.match(/^##\s*[五伍5]\s*[、.．:：]?\s*变式/m);
    if (m && typeof m.index === 'number') {
      return { main: text.slice(0, m.index).trim(), quizText: text.slice(m.index).trim() };
    }
    return { main: text.trim(), quizText: '' };
  }

  function parseModule(text) {
    var m = String(text || '').match(/所属(?:知识)?模块\s*[:：]\s*([^\n；;。]+)/);
    return m ? m[1].replace(/^[-*\s]+/, '').trim() : '';
  }

  function parseChartType(text) {
    var m = String(text || '').match(/图表类型\s*[:：]\s*([^\n；;。]+)/);
    return m ? m[1].replace(/^[-*\s]+/, '').trim() : '';
  }

  // 单题解析：题干 / 选项 / 答案 / 解析
  function parseQuestion(block) {
    var q = { raw: block.trim(), head: '', stem: '', options: [], answer: '', analysis: '', kind: 'text' };
    var stemLines = [];
    String(block).replace(/\r\n/g, '\n').split('\n').forEach(function (ln) {
      var t = ln.trim();
      if (!t) return;
      var m;
      if (/^(?:\*\*)?\s*题\s*\d/.test(t)) {
        var mm = t.match(/\*\*(.+?)\*\*/);
        if (mm) {
          q.head = mm[1];
          var rest = t.replace(/\*\*.+?\*\*/, '').trim();
          if (rest) stemLines.push(rest.replace(/\*\*/g, ''));
        } else {
          q.head = t.replace(/\*\*/g, '');
          var rest2 = t.replace(/^题\s*\d/, '').replace(/^[（(][^）)]*[)）]/, '').replace(/\*\*/g, '').trim();
          if (rest2) stemLines.push(rest2);
        }
        return;
      }
      if ((m = t.match(/^([A-Da-d])\s*[.、．]\s*(.+)$/))) {
        q.options.push({ label: m[1].toUpperCase(), text: m[2].replace(/\*\*/g, '').trim() });
        return;
      }
      if ((m = t.match(/^(?:标准)?答案\s*[:：]?\s*(.+)$/))) { q.answer = m[1].trim(); return; }
      if ((m = t.match(/^解析\s*[:：]?\s*(.+)$/))) { q.analysis = m[1].trim(); return; }
      stemLines.push(t.replace(/\*\*/g, ''));
    });
    q.stem = stemLines.join(' ').trim();
    if (q.options.length >= 2) q.kind = 'choice';
    else if (q.analysis) q.kind = 'subjective';
    return q;
  }

  // 从「## 五、变式训练题」段落拆出题目数组
  function parseQuiz(quizText) {
    var parts = String(quizText || '').replace(/\r\n/g, '\n').split(/\n(?=(?:\*\*)?\s*题\s*\d)/);
    var qs = [];
    parts.forEach(function (p) {
      if (/^\s*(?:\*\*)?\s*题\s*\d/.test(p.trim())) qs.push(parseQuestion(p));
    });
    return qs;
  }

  function parseReport(md) {
    var sp = splitReport(md);
    var titleM = String(md || '').match(/^#\s+(.+)$/m);
    return {
      title: titleM ? titleM[1].trim() : '',
      module: parseModule(md),
      chartType: parseChartType(md),
      main: sp.main,
      quizText: sp.quizText,
      questions: parseQuiz(sp.quizText)
    };
  }

  // 选择题自判：容忍「B」「B.」「b」等写法，只比首字母
  function normLetter(s) {
    var m = String(s || '').trim().match(/^([A-Da-d])/);
    return m ? m[1].toUpperCase() : String(s || '').trim();
  }
  function checkChoice(user, answer) {
    var u = normLetter(user), a = normLetter(answer);
    return !!u && !!a && u === a;
  }

  // 汉字计数（质检报告字数区间用）
  function countHan(s) {
    return (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
  }

  // —— 分章引擎：把「一~四节正文」切成独立章节卡（章号转大写数字） ——
  var CN_NO = { '一': '壹', '二': '贰', '三': '叁', '四': '肆', '五': '伍', '六': '陆', '七': '柒', '八': '捌', '九': '玖', '十': '拾' };
  function cnNo(n) { return CN_NO[String(n)] || String(n); }

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

  // 图片字段安全校验：只放行 data:image/*（防导入文件借 image 字段注入属性）
  function safeImage(u) {
    u = String(u || '');
    return /^data:image\//.test(u) ? u : '';
  }

  global.TuJieEngine = {
    splitReport: splitReport, parseModule: parseModule, parseChartType: parseChartType,
    parseQuestion: parseQuestion, parseQuiz: parseQuiz, parseReport: parseReport,
    normLetter: normLetter, checkChoice: checkChoice, countHan: countHan, safeImage: safeImage,
    cnNo: cnNo, splitSections: splitSections
  };
})(typeof window !== 'undefined' ? window : globalThis);
