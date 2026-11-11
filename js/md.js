/* 图解地理 · 极简 Markdown 渲染器（先转义再拼装，防注入；纯逻辑，Node 可测试） */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inline(s) {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return s;
  }

  function isBlockQuote(t) { return /^>\s?/.test(t); }
  function isUl(t) { return /^[-*]\s+/.test(t); }
  // 「1.」「1、」「1)」均可；标记后不能紧跟数字（防误伤 1.5米、3.14 这类数值）
  function isOl(t) { return /^\d+[.、)](?!\d)\s*/.test(t); }
  function isHead(t) { return /^#{1,4}\s+/.test(t); }
  function isHr(t) { return /^(-{3,}|\*{3,})$/.test(t); }
  function isTableRow(t) { return /^\|.*\|$/.test(t); }

  function render(md) {
    var lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var listStack = [];
    var i = 0;

    function closeLists() {
      while (listStack.length) html.push('</' + listStack.pop() + '>');
    }

    while (i < lines.length) {
      var trimmed = lines[i].trim();
      if (!trimmed) { closeLists(); i++; continue; }

      // 标题（# → h2，## → h3，以此类推，页面自身标题为 h1）
      if (isHead(trimmed)) {
        closeLists();
        var m1 = trimmed.match(/^(#{1,4})\s+(.*)$/);
        var level = Math.min(m1[1].length + 1, 6);
        html.push('<h' + level + '>' + inline(m1[2]) + '</h' + level + '>');
        i++; continue;
      }
      // 分隔线
      if (isHr(trimmed)) { closeLists(); html.push('<hr>'); i++; continue; }
      // 引用
      if (isBlockQuote(trimmed)) {
        closeLists();
        html.push('<blockquote>' + inline(trimmed.replace(/^>\s?/, '')) + '</blockquote>');
        i++; continue;
      }
      // 表格（| a | b | 下一行 |---|---|）
      if (isTableRow(trimmed) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
        closeLists();
        var header = trimmed.slice(1, -1).split('|').map(function (c) { return c.trim(); });
        i += 2;
        var rows = [];
        while (i < lines.length && isTableRow(lines[i].trim())) {
          rows.push(lines[i].trim().slice(1, -1).split('|').map(function (c) { return c.trim(); }));
          i++;
        }
        html.push('<table><thead><tr>' + header.map(function (h) { return '<th>' + inline(h) + '</th>'; }).join('') + '</tr></thead><tbody>'
          + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('')
          + '</tbody></table>');
        continue;
      }
      // 无序列表
      if (isUl(trimmed)) {
        if (listStack[listStack.length - 1] !== 'ul') { closeLists(); html.push('<ul>'); listStack.push('ul'); }
        html.push('<li>' + inline(trimmed.replace(/^[-*]\s+/, '')) + '</li>');
        i++; continue;
      }
      // 有序列表
      if (isOl(trimmed)) {
        if (listStack[listStack.length - 1] !== 'ol') { closeLists(); html.push('<ol>'); listStack.push('ol'); }
        html.push('<li>' + inline(trimmed.replace(/^\d+[.、)](?!\d)\s*/, '')) + '</li>');
        i++; continue;
      }
      // 普通段落（连续非空行合并，段内 <br>）
      closeLists();
      var buf = [trimmed];
      i++;
      while (i < lines.length) {
        var t2 = lines[i].trim();
        if (!t2 || isHead(t2) || isUl(t2) || isOl(t2) || isHr(t2) || isBlockQuote(t2) || isTableRow(t2)) break;
        buf.push(t2);
        i++;
      }
      html.push('<p>' + buf.map(inline).join('<br>') + '</p>');
    }
    closeLists();
    return html.join('\n');
  }

  global.TuJieMd = { render: render, escapeHtml: escapeHtml, inline: inline };
})(typeof window !== 'undefined' ? window : globalThis);
