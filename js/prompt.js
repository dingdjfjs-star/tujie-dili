/* 图解地理 · 精读提示词与请求组装（纯逻辑，Node 可加载测试） */
(function (global) {
  'use strict';

  var GRADES = ['七年级', '八年级', '高一', '高二', '高三'];
  var TEXTBOOKS = ['人教版', '湘教版', '中图版', '鲁教版', '商务星球版', '晋教版'];
  var CHART_TYPES = ['自动识别', '等高线地形图', '气候图表', '洋流图', '统计图表', '区域地图', '原理示意图', '其他'];

  // 完整 AI 提示词（与《图解地理》立项书一致：五段结构 + 1200 字上限）
  var PROMPT_TEMPLATE = [
    '你是资深中学地理教研专家，精通各版本教材与课标，擅长地理图表深度解读与命题。',
    '请深度解析用户上传的这张地理图表，严格按照以下结构输出专业、精准的解析内容，适配{{年级}}学生水平，对应{{教材版本}}教材。',
    '',
    '输出结构与要求：',
    '# 图表AI精读报告',
    '## 一、图表基本信息',
    '说明图表类型、所属知识模块、对应教材章节、核心考察主题。',
    '',
    '## 二、核心地理要素识别',
    '逐条列出图中所有关键地理要素及其特征：',
    '- 自然要素：地形、气候、水文、植被等',
    '- 人文要素：城市、交通、农业、工业等',
    '- 数值要素：坐标、数值、比例、递变规律',
    '要求：准确识别图形符号与空间分布，不遗漏关键图例与注记。',
    '',
    '## 三、地理规律与原理讲解',
    '提炼图表反映的核心地理规律，讲解背后的成因与原理，语言通俗易懂，贴合课本知识点。',
    '',
    '## 四、考点与易错点分析',
    '1. 列出该图表的3个核心考点',
    '2. 指出2个最常见的读图易错点与避坑技巧',
    '',
    '## 五、变式训练题',
    '基于本图表出3道典型习题：1道选择题、1道填空题、1道读图综合题，难度匹配对应年级，附带标准答案与详细解析。',
    '',
    '输出要求：',
    '1. 所有内容严格基于图表本身，不编造图中没有的信息',
    '2. 专业术语准确，符合中学地理教学规范',
    '3. 结构清晰，分点明确，总字数控制在1200字以内',
    '4. 禁止出现任何与解析无关的客套话、引导语'
  ].join('\n');

  function fillTemplate(grade, textbook) {
    return PROMPT_TEMPLATE
      .replace(/{{年级}}/g, grade || '高中')
      .replace(/{{教材版本}}/g, textbook || '人教版');
  }

  function buildPrompt(grade, textbook, chartType) {
    var p = fillTemplate(grade, textbook);
    if (chartType && chartType !== '自动识别') {
      p = '【图表类型提示】这张图属于「' + chartType + '」。\n\n' + p;
    }
    return p;
  }

  function buildMessages(imageDataURL, grade, textbook, chartType) {
    return [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageDataURL } },
        { type: 'text', text: buildPrompt(grade, textbook, chartType) }
      ]
    }];
  }

  global.TuJiePrompt = {
    GRADES: GRADES, TEXTBOOKS: TEXTBOOKS, CHART_TYPES: CHART_TYPES,
    PROMPT_TEMPLATE: PROMPT_TEMPLATE,
    fillTemplate: fillTemplate, buildPrompt: buildPrompt, buildMessages: buildMessages
  };
})(typeof window !== 'undefined' ? window : globalThis);
