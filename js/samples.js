/* 图解地理 · 内置示例图（演示模式）
 * 每个示例 = 手绘 SVG 示例图 + 一份按提示词五段结构写死的精读报告
 * 报告内容与图内数据严格自洽（等高距/陡崖公式、气温降水数值、洋流规律），是自动化质检的基准样本
 */
(function (global) {
  'use strict';

  var SAMPLES = [
    {
      id: 'contour',
      name: '等高线地形图（局部）',
      type: '等高线地形图',
      svg: '<svg viewBox="0 0 360 252" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="等高线地形图示意">'
        + '<rect width="360" height="252" fill="#f9f4e8"/>'
        + '<rect x="8" y="8" width="344" height="196" fill="#f9f4e8" stroke="#4a4238" stroke-width="1.5"/>'
        + '<path d="M34,140 C28,96 78,58 142,52 C212,45 292,60 320,100 C342,130 330,166 298,186 C246,206 100,208 62,190 C42,180 38,162 34,140 Z" fill="none" stroke="#4a4238" stroke-width="1.1"/>'
        + '<text x="30" y="152" font-size="10" fill="#4a4238">300</text>'
        + '<path d="M58,136 C54,102 96,72 150,66 C214,59 296,74 308,106 C316,128 302,150 282,162 C258,174 228,166 204,156 C190,150 174,150 160,156 C136,166 106,168 86,158 C68,150 60,150 58,136 Z" fill="none" stroke="#4a4238" stroke-width="1.1"/>'
        + '<text x="52" y="126" font-size="10" fill="#4a4238">400</text>'
        + '<path d="M98,128 C96,106 116,90 140,88 C164,86 178,102 174,120 C170,138 150,146 130,143 C112,140 100,142 98,128 Z" fill="none" stroke="#4a4238" stroke-width="1.1"/>'
        + '<text x="100" y="106" font-size="10" fill="#4a4238">500</text>'
        + '<path d="M204,118 C204,96 228,78 256,78 C284,78 302,96 302,116 C302,136 284,148 258,148 C232,148 204,140 204,118 Z" fill="none" stroke="#4a4238" stroke-width="1.1"/>'
        + '<text x="290" y="120" font-size="10" fill="#4a4238">500</text>'
        + '<path d="M234,106 C240,96 260,94 270,102 C278,110 274,124 262,129 C248,134 236,126 234,106 Z" fill="none" stroke="#4a4238" stroke-width="1.1"/>'
        + '<text x="238" y="110" font-size="10" fill="#4a4238">600</text>'
        + '<path d="M262,78 C272,74 288,76 298,84" fill="none" stroke="#2f2a24" stroke-width="2"/>'
        + '<line x1="266" y1="79" x2="263" y2="86" stroke="#2f2a24" stroke-width="1"/>'
        + '<line x1="276" y1="77" x2="273" y2="84" stroke="#2f2a24" stroke-width="1"/>'
        + '<line x1="286" y1="77" x2="283" y2="84" stroke="#2f2a24" stroke-width="1"/>'
        + '<line x1="294" y1="80" x2="291" y2="87" stroke="#2f2a24" stroke-width="1"/>'
        + '<text x="268" y="68" font-size="11" fill="#a63a2b" font-family="KaiTi,STKaiti,serif">陡崖</text>'
        + '<text x="248" y="126" font-size="11" fill="#a63a2b" font-family="KaiTi,STKaiti,serif">&#9650;</text>'
        + '<text x="254" y="158" font-size="9" fill="#4a4238" font-family="KaiTi,STKaiti,serif">山顶&gt;600米</text>'
        + '<text x="128" y="118" font-size="11" fill="#a63a2b" font-family="KaiTi,STKaiti,serif">&#9650;</text>'
        + '<text x="112" y="160" font-size="9" fill="#4a4238" font-family="KaiTi,STKaiti,serif">山顶&gt;500米</text>'
        + '<text x="192" y="142" font-size="11" fill="#4a4238" font-family="KaiTi,STKaiti,serif">鞍部</text>'
        + '<path d="M186,146 C182,160 192,172 188,186 C186,193 184,197 184,202" fill="none" stroke="#4a7a8c" stroke-width="1.8"/>'
        + '<text x="170" y="178" font-size="11" fill="#4a7a8c" font-family="KaiTi,STKaiti,serif">河流</text>'
        + '<path d="M164,202 C168,186 174,164 180,150" fill="none" stroke="#a63a2b" stroke-width="1.4" stroke-dasharray="4 3"/>'
        + '<text x="154" y="198" font-size="11" fill="#a63a2b" font-family="KaiTi,STKaiti,serif">A</text>'
        + '<path d="M212,202 C258,196 296,168 288,132" fill="none" stroke="#3d6b4f" stroke-width="1.4" stroke-dasharray="4 3"/>'
        + '<text x="290" y="196" font-size="11" fill="#3d6b4f" font-family="KaiTi,STKaiti,serif">B</text>'
        + '<line x1="30" y1="34" x2="30" y2="18" stroke="#2f2a24" stroke-width="1.4"/>'
        + '<path d="M30,14 L26,24 L30,21 L34,24 Z" fill="#2f2a24"/>'
        + '<text x="25" y="13" font-size="11" fill="#2f2a24">N</text>'
        + '<line x1="24" y1="228" x2="120" y2="228" stroke="#2f2a24" stroke-width="1.2"/>'
        + '<line x1="24" y1="224" x2="24" y2="232" stroke="#2f2a24" stroke-width="1.2"/>'
        + '<line x1="72" y1="224" x2="72" y2="232" stroke="#2f2a24" stroke-width="1.2"/>'
        + '<line x1="120" y1="224" x2="120" y2="232" stroke="#2f2a24" stroke-width="1.2"/>'
        + '<text x="20" y="244" font-size="10" fill="#2f2a24">0</text>'
        + '<text x="62" y="244" font-size="10" fill="#2f2a24">250</text>'
        + '<text x="110" y="244" font-size="10" fill="#2f2a24">500米</text>'
        + '<text x="150" y="238" font-size="11" fill="#4a4238" font-family="KaiTi,STKaiti,serif">某地等高线地形图（示意）· 等高距100米</text>'
        + '<text x="180" y="250" font-size="10" fill="#4a4238" font-family="KaiTi,STKaiti,serif">比例尺 1:50000</text>'
        + '</svg>',
      report: [
        '# 图表AI精读报告',
        '',
        '## 一、图表基本信息',
        '- 图表类型：等高线地形图（局部区域，含双峰、鞍部与陡崖）',
        '- 所属知识模块：地图的阅读 / 等高线地形图的判读',
        '- 对应教材章节：初中地理七年级上册第二章「地图」；高中地理必修第一册「地貌」可衔接',
        '- 核心考察主题：等高线数值判读、地形部位识别、陡崖高度估算与线路选择',
        '',
        '## 二、核心地理要素识别',
        '- 数值要素：比例尺1:50000，等高距为100米，图示范围海拔约300～600米以上；东部山顶高于600米，西部山顶高于500米。',
        '- 自然要素：',
        '  - 两座山峰：东部（600米闭合等高线内）与西部（500米闭合等高线内），判据是「中高周低」的闭合曲线；',
        '  - 鞍部：两山顶之间的低洼过渡部位；',
        '  - 山脊与山谷：等高线凸向低处为山脊（分水线），凸向高处为山谷（集水线），图中鞍部以南谷地发育一条河流；',
        '  - 陡崖：东部山顶北侧，400、500、600米三条等高线重叠处，绘有崖壁符号。',
        '- 人文要素：A、B两条登山线路，A线沿谷地直上，B线绕行东南侧等高线稀疏地带。',
        '',
        '## 三、地理规律与原理讲解',
        '等高线的疏密直接反映坡度陡缓：密集处坡陡、稀疏处坡缓。B线经过的区域等高线明显稀疏，坡度缓、行走省力但绕路；A线沿谷地直上，距离短但坡陡，且山谷是集水线，暴雨时易发山洪。河流只能发育在山谷中，水往低处流。陡崖高度用公式 (n-1)·d ≤ H < (n+1)·d 估算（n为重叠等高线条数，d为等高距）：本图 n=3、d=100米，故崖高在200米至400米之间（不含400米）；崖顶海拔约600米，崖底约400米。',
        '',
        '## 四、考点与易错点分析',
        '1. 核心考点：',
        '  - 五种地形部位的判读：山顶、盆地、山脊、山谷、鞍部（陡崖为特殊部位）；',
        '  - 陡崖相对高度与崖顶、崖底海拔的推算；',
        '  - 线路选址与等高线疏密、安全隐患（谷地山洪、崖下坠石）的结合应用。',
        '2. 常见易错点：',
        '  - 只看等高线弯曲方向、不比数值高低：先读数值再定凸向，凸低为脊、凸高为谷；',
        '  - 认为「有河流的地方是山脊」：河流必在山谷（集水线）；',
        '  - 把崖高当成「崖顶减崖底」的定值：它是一个由重叠条数决定的区间。',
        '',
        '## 五、变式训练题',
        '**题1（选择题）** 对图中地理事物的判断，正确的是',
        'A. 河流发育在山脊部位',
        'B. 陡崖的相对高度恰为200米',
        'C. 鞍部位于两山顶之间',
        'D. B线路坡陡且路程短',
        '答案：C',
        '解析：河流只能发育在山谷（集水线），A错；由n=3、d=100米得200米≤H＜400米，是区间不是定值，B错；B线处等高线稀疏、坡缓绕远，D错；两山顶之间的过渡部位即鞍部，C正确。',
        '',
        '**题2（填空题）** 图中等高距为____米；东部陡崖由400、500、600米三条等高线重叠形成，其相对高度H的取值范围是________米。',
        '答案：100；200≤H＜400',
        '解析：相邻等高线数值相减得等高距；代入陡崖公式(n-1)d≤H＜(n+1)d，n=3、d=100，得200米≤H＜400米。',
        '',
        '**题3（读图综合题）** 某中学在此开展研学活动：①登顶观景；②考察谷地河流；③为体弱学生选择省力安全的登山线。请说明：a.推断东部山顶与西部山顶的海拔范围；b.河流的流向与地势的关系；c.在A、B两线中作出选择并简述理由。',
        '答案：a.东部山顶高于600米、西部山顶高于500米（均低于700米）；b.河流自鞍部流向图幅南缘（自北向南），水往低处流，说明鞍部以南地势逐渐降低；c.选B线：该线等高线稀疏、坡度缓，省力，且避开易发山洪的谷地与陡崖下方，更安全。',
        '解析：山顶海拔由最内闭合等高线数值推断；流向结合指向标与「水往低处流」判断；选线看疏密与安全。'
      ].join('\n')
    },
    {
      id: 'climate',
      name: '气温曲线与降水量柱状图',
      type: '气候图表',
      svg: '<svg viewBox="0 0 360 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="气温曲线与降水量柱状图示意">'
        + '<rect width="360" height="250" fill="#f9f4e8"/>'
        + '<text x="96" y="18" font-size="12" fill="#2f2a24" font-family="KaiTi,STKaiti,serif">某城市气温曲线与降水量柱状图</text>'
        + '<line x1="45" y1="30" x2="45" y2="190" stroke="#2f2a24" stroke-width="1.2"/>'
        + '<line x1="45" y1="190" x2="322" y2="190" stroke="#2f2a24" stroke-width="1.2"/>'
        + '<line x1="322" y1="30" x2="322" y2="190" stroke="#2f2a24" stroke-width="1"/>'
        + '<text x="40" y="194" font-size="9" fill="#4a4238" text-anchor="end">0</text>'
        + '<text x="40" y="144" font-size="9" fill="#4a4238" text-anchor="end">10</text>'
        + '<text x="40" y="94" font-size="9" fill="#4a4238" text-anchor="end">20</text>'
        + '<text x="40" y="44" font-size="9" fill="#4a4238" text-anchor="end">30</text>'
        + '<text x="40" y="30" font-size="9" fill="#a63a2b" text-anchor="end">&#8451;</text>'
        + '<text x="326" y="194" font-size="9" fill="#4a4238">0</text>'
        + '<text x="324" y="164" font-size="9" fill="#4a4238">50</text>'
        + '<text x="321" y="134" font-size="9" fill="#4a4238">100</text>'
        + '<text x="321" y="104" font-size="9" fill="#4a4238">150</text>'
        + '<text x="321" y="74" font-size="9" fill="#4a4238">200</text>'
        + '<text x="321" y="44" font-size="9" fill="#4a4238">250</text>'
        + '<text x="326" y="30" font-size="9" fill="#4a7a8c">mm</text>'
        + '<rect x="48" y="169" width="17" height="21" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="71" y="160" width="17" height="30" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="94" y="142" width="17" height="48" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="117" y="124" width="17" height="66" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="140" y="100" width="17" height="90" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="163" y="70" width="17" height="120" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="186" y="94" width="17" height="96" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="209" y="118" width="17" height="72" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="232" y="139" width="17" height="51" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="255" y="157" width="17" height="33" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="278" y="166" width="17" height="24" fill="#4a7a8c" opacity="0.75"/>'
        + '<rect x="301" y="172" width="17" height="18" fill="#4a7a8c" opacity="0.75"/>'
        + '<polyline points="56,170 79,165 102,140 125,110 148,85 171,65 194,50 217,50 240,70 263,100 286,130 309,160" fill="none" stroke="#a63a2b" stroke-width="2"/>'
        + '<text x="56" y="202" font-size="9" fill="#4a4238" text-anchor="middle">1</text>'
        + '<text x="79" y="202" font-size="9" fill="#4a4238" text-anchor="middle">2</text>'
        + '<text x="102" y="202" font-size="9" fill="#4a4238" text-anchor="middle">3</text>'
        + '<text x="125" y="202" font-size="9" fill="#4a4238" text-anchor="middle">4</text>'
        + '<text x="148" y="202" font-size="9" fill="#4a4238" text-anchor="middle">5</text>'
        + '<text x="171" y="202" font-size="9" fill="#4a4238" text-anchor="middle">6</text>'
        + '<text x="194" y="202" font-size="9" fill="#4a4238" text-anchor="middle">7</text>'
        + '<text x="217" y="202" font-size="9" fill="#4a4238" text-anchor="middle">8</text>'
        + '<text x="240" y="202" font-size="9" fill="#4a4238" text-anchor="middle">9</text>'
        + '<text x="263" y="202" font-size="9" fill="#4a4238" text-anchor="middle">10</text>'
        + '<text x="286" y="202" font-size="9" fill="#4a4238" text-anchor="middle">11</text>'
        + '<text x="309" y="202" font-size="9" fill="#4a4238" text-anchor="middle">12</text>'
        + '<text x="186" y="216" font-size="9" fill="#4a4238" text-anchor="middle">月份</text>'
        + '<line x1="56" y1="226" x2="76" y2="226" stroke="#a63a2b" stroke-width="2"/>'
        + '<text x="82" y="230" font-size="10" fill="#a63a2b">气温（℃，左轴）</text>'
        + '<rect x="180" y="220" width="10" height="7" fill="#4a7a8c" opacity="0.75"/>'
        + '<text x="196" y="230" font-size="10" fill="#4a7a8c">降水量（mm，右轴）</text>'
        + '</svg>',
      report: [
        '# 图表AI精读报告',
        '',
        '## 一、图表基本信息',
        '- 图表类型：气温曲线与降水量柱状图（气候直方图）',
        '- 所属知识模块：世界的气候 / 气候类型的判读',
        '- 对应教材章节：初中地理七年级上册第三章「天气与气候」；高中地理必修第一册「地球上的大气」可衔接',
        '- 核心考察主题：以温定带、以水定型，判断气候类型并描述特征与成因',
        '',
        '## 二、核心地理要素识别',
        '- 气温要素：1月均温约4℃（高于0℃），7月均温约28℃；气温年较差约24℃；夏季高温、冬季温和。',
        '- 降水要素：年降水量约1100毫米；降水集中在4～9月，其中6月前后最多（约200毫米），冬季各月偏少但仍有30毫米上下。',
        '- 组合特征：高温期与多雨期一致，雨热同期。',
        '',
        '## 三、地理规律与原理讲解',
        '判读分三步：第一步以温定带——最冷月均温在0℃～15℃之间，属亚热带或温带海洋性气候；第二步以水定型——降水夏季多、冬季少，属夏雨型；第三步排除——温带海洋性气候全年温和湿润、降水均匀，与此图不符。故该图为亚热带季风气候。其成因是海陆热力性质差异：夏季陆地增温快形成低气压，风从海洋吹向陆地，带来丰沛降水；冬季陆地降温快形成高气压，风从陆地吹向海洋，降水较少。该气候主要分布在我国秦岭—淮河以南地区，雨热同期非常有利于水稻等农作物生长。',
        '',
        '## 四、考点与易错点分析',
        '1. 核心考点：气候类型判读三步法；气温年较差与降水季节变化的计算与描述；季风气候的成因、特征及其对农业的影响。',
        '2. 常见易错点：',
        '  - 只描述「夏季高温多雨」而漏掉最冷月气温这一关键判据：0℃是亚热带季风与温带季风的分界，最冷月4℃必须点出；',
        '  - 南半球图表月份对应反季节：1月应是夏季，须先看气温曲线再对月份，不能死记「7月最热」；',
        '  - 把「年降水量大」当成季风气候唯一依据：还要看降水的季节分配是否集中于夏季。',
        '',
        '## 五、变式训练题',
        '**题1（选择题）** 该气候类型最可能分布的地区是',
        'A. 地中海沿岸',
        'B. 我国秦岭—淮河以南',
        'C. 撒哈拉沙漠',
        'D. 西欧平原',
        '答案：B',
        '解析：最冷月约4℃（0℃～15℃之间）且夏雨型、雨热同期，为亚热带季风气候，对应秦岭—淮河以南；地中海沿岸为地中海气候（冬雨型），撒哈拉为热带沙漠气候（全年少雨），西欧为温带海洋性气候（全年湿润），均不符。',
        '',
        '**题2（填空题）** 该地气温年较差约____℃；气候类型为________气候；判断的关键依据是最冷月均温在________（填数值范围）之间，且降水集中于____季。',
        '答案：24；亚热带季风；0℃～15℃；夏',
        '解析：28℃-4℃=24℃；按「以温定带、以水定型」三步法即可判定。',
        '',
        '**题3（读图综合题）** 简述该气候的主要特征，并从海陆位置角度说明其成因，再指出该气候区发展种植业的有利条件。',
        '答案：特征：夏季高温多雨，冬季温和少雨，雨热同期。成因：位于亚欧大陆东岸，海陆热力性质差异显著，夏季风从海洋吹向陆地带来丰沛降水，冬季风从内陆吹向海洋、降水少但受削弱后冬季仍温和。有利条件：雨热同期、水热配合好，适宜水稻、油菜等作物生长。',
        '解析：特征描述须「气温+降水」两要素齐全；成因紧扣海陆热力差异；农业条件与雨热同期挂钩。'
      ].join('\n')
    },
    {
      id: 'currents',
      name: '世界洋流模式图（理想化）',
      type: '洋流图',
      svg: '<svg viewBox="0 0 360 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="世界洋流模式图（理想化示意）">'
        + '<defs>'
        + '<marker id="aw" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#a63a2b"/></marker>'
        + '<marker id="ac" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#4a7a8c"/></marker>'
        + '</defs>'
        + '<rect width="360" height="250" fill="#f9f4e8"/>'
        + '<text x="98" y="20" font-size="12" fill="#2f2a24" font-family="KaiTi,STKaiti,serif">世界洋流模式图（理想化示意）</text>'
        + '<rect x="8" y="26" width="344" height="18" fill="#dcd2b8" stroke="#4a4238" stroke-width="1"/>'
        + '<text x="172" y="39" font-size="10" fill="#4a4238" text-anchor="middle" font-family="KaiTi,STKaiti,serif">大 陆</text>'
        + '<rect x="8" y="214" width="344" height="18" fill="#dcd2b8" stroke="#4a4238" stroke-width="1"/>'
        + '<text x="172" y="227" font-size="10" fill="#4a4238" text-anchor="middle" font-family="KaiTi,STKaiti,serif">大 陆</text>'
        + '<rect x="8" y="44" width="344" height="170" fill="#eee7d4" stroke="#4a4238" stroke-width="1"/>'
        + '<text x="12" y="58" font-size="9" fill="#4a4238">60°N</text>'
        + '<text x="12" y="82" font-size="9" fill="#4a4238">40°N</text>'
        + '<text x="12" y="98" font-size="9" fill="#4a4238">30°N</text>'
        + '<text x="12" y="131" font-size="9" fill="#a63a2b">赤道</text>'
        + '<text x="12" y="163" font-size="9" fill="#4a4238">30°S</text>'
        + '<text x="12" y="207" font-size="9" fill="#4a4238">60°S</text>'
        + '<line x1="40" y1="128" x2="348" y2="128" stroke="#a63a2b" stroke-width="0.8" stroke-dasharray="5 4"/>'
        + '<text x="180" y="53" font-size="10" fill="#4a4238" text-anchor="middle" font-family="KaiTi,STKaiti,serif">北半球中高纬（逆时针·西岸寒流）</text>'
        + '<line x1="68" y1="38" x2="68" y2="52" stroke="#4a7a8c" stroke-width="1.6" marker-end="url(#ac)"/>'
        + '<text x="74" y="46" font-size="9" fill="#4a7a8c">寒流</text>'
        + '<line x1="68" y1="64" x2="292" y2="64" stroke="#a63a2b" stroke-width="1.6" marker-end="url(#aw)"/>'
        + '<text x="180" y="78" font-size="9" fill="#a63a2b" text-anchor="middle">西风漂流（北半球·暖流性质）</text>'
        + '<text x="180" y="102" font-size="10" fill="#4a4238" text-anchor="middle" font-family="KaiTi,STKaiti,serif">北半球副热带环流（顺时针）</text>'
        + '<line x1="295" y1="118" x2="65" y2="118" stroke="#a63a2b" stroke-width="1.6" marker-end="url(#aw)"/>'
        + '<text x="180" y="114" font-size="9" fill="#a63a2b" text-anchor="middle">北赤道暖流</text>'
        + '<line x1="68" y1="114" x2="68" y2="88" stroke="#a63a2b" stroke-width="1.6" marker-end="url(#aw)"/>'
        + '<text x="74" y="104" font-size="9" fill="#a63a2b">暖</text>'
        + '<line x1="292" y1="88" x2="292" y2="114" stroke="#4a7a8c" stroke-width="1.6" marker-end="url(#ac)"/>'
        + '<text x="262" y="104" font-size="9" fill="#4a7a8c">寒</text>'
        + '<text x="180" y="156" font-size="10" fill="#4a4238" text-anchor="middle" font-family="KaiTi,STKaiti,serif">南半球副热带环流（逆时针）</text>'
        + '<line x1="295" y1="140" x2="65" y2="140" stroke="#a63a2b" stroke-width="1.6" marker-end="url(#aw)"/>'
        + '<text x="180" y="136" font-size="9" fill="#a63a2b" text-anchor="middle">南赤道暖流</text>'
        + '<line x1="68" y1="144" x2="68" y2="176" stroke="#a63a2b" stroke-width="1.6" marker-end="url(#aw)"/>'
        + '<text x="74" y="164" font-size="9" fill="#a63a2b">暖</text>'
        + '<line x1="292" y1="176" x2="292" y2="144" stroke="#4a7a8c" stroke-width="1.6" marker-end="url(#ac)"/>'
        + '<text x="262" y="164" font-size="9" fill="#4a7a8c">寒</text>'
        + '<line x1="68" y1="196" x2="292" y2="196" stroke="#4a7a8c" stroke-width="1.6" marker-end="url(#ac)"/>'
        + '<text x="180" y="210" font-size="9" fill="#4a7a8c" text-anchor="middle">西风漂流（南半球·环球·寒流）</text>'
        + '<line x1="300" y1="222" x2="320" y2="222" stroke="#a63a2b" stroke-width="2"/>'
        + '<text x="324" y="226" font-size="9" fill="#a63a2b">暖流</text>'
        + '<line x1="244" y1="222" x2="264" y2="222" stroke="#4a7a8c" stroke-width="2"/>'
        + '<text x="268" y="226" font-size="9" fill="#4a7a8c">寒流</text>'
        + '</svg>',
      report: [
        '# 图表AI精读报告',
        '',
        '## 一、图表基本信息',
        '- 图表类型：世界洋流模式图（理想化示意图）',
        '- 所属知识模块：海水的性质与运动 / 洋流的分布规律',
        '- 对应教材章节：高中地理选择性必修1「水的运动」；初中地理海洋部分可衔接',
        '- 核心考察主题：世界洋流分布规律、寒暖流判读、洋流对地理环境的影响',
        '',
        '## 二、核心地理要素识别',
        '- 环流要素：中低纬海区以副热带为中心的大洋环流，北半球呈顺时针、南半球呈逆时针；北半球中高纬以副极地为中心呈逆时针环流。',
        '- 性质要素：副热带环流的大洋西岸（大陆东岸）为暖流、东岸（大陆西岸）为寒流；北半球中高纬环流的大洋西岸为寒流、东岸为暖流；南半球40°S～60°S海域为环球性的西风漂流，性质为寒流。',
        '- 方向要素：信风驱动海水自东向西流动，形成南北赤道暖流；副热带环流南北两侧分别与西风漂流、赤道暖流衔接。',
        '- 图例要素：朱色箭头为暖流，青色箭头为寒流。',
        '',
        '## 三、地理规律与原理讲解',
        '洋流分布规律可概括为：中低纬海区「北顺南逆」，且环流东岸寒流、西岸暖流；北半球中高纬海区呈逆时针，大洋西岸为寒流、东岸为暖流；南半球中高纬没有闭合环流，被环球的西风漂流（寒流）取代。寒暖流的判读看流向与水温的相对关系：由低纬流向高纬（比流经海区水温高）为暖流，反之为寒流。其形成以盛行风为主要动力——信风吹拂形成赤道暖流、西风吹拂形成西风漂流，再叠加海陆轮廓与地转偏向力，形成相对稳定的环流格局。',
        '',
        '## 四、考点与易错点分析',
        '1. 核心考点：把模式图规律迁移到具体大洋（太平洋、大西洋、印度洋）；寒暖流对沿岸气候的影响（暖流增温增湿、寒流降温减湿）；渔场成因（寒暖流交汇或上升补偿流）。',
        '2. 常见易错点：',
        '  - 误以为南半球中高纬也有类似北半球的逆时针闭合环流：实际被环球西风漂流（寒流）取代；',
        '  - 把西风漂流一概当暖流：北半球西风漂流（如北大西洋暖流）为暖流，南半球西风漂流因受南极冷水和浮冰影响为寒流；',
        '  - 寒暖流判读只记流向不看纬度：同一支洋流性质取决于它与流经海区水温的相对高低。',
        '',
        '## 五、变式训练题',
        '**题1（选择题）** 关于世界洋流分布规律的叙述，正确的是',
        'A. 中低纬大洋环流北半球呈逆时针',
        'B. 副热带环流大洋东岸均为暖流',
        'C. 南半球西风漂流为寒流',
        'D. 北半球中高纬环流呈顺时针',
        '答案：C',
        '解析：中低纬「北顺南逆」，A错；副热带环流东岸（大陆西岸）为寒流，B错；北半球中高纬呈逆时针，D错；南半球西风漂流受南极冷水影响，性质为寒流，C正确。',
        '',
        '**题2（填空题）** 暖流对沿岸气候的影响是________；阿塔卡马沙漠直逼海岸，与秘鲁沿岸________（填洋流性质）的降温减湿作用有关。',
        '答案：增温增湿；寒流',
        '解析：暖流上空暖湿气流旺盛，起增温增湿作用；寒流使下层大气降温、层结稳定，沿海也可形成荒漠。',
        '',
        '**题3（读图综合题）** 纽芬兰渔场、北海道渔场均位于寒暖流交汇处。结合模式图说明寒暖流交汇形成大渔场的原因，并各举一组具体洋流。',
        '答案：寒暖流交汇处海水受扰动，下层营养盐类上泛，浮游生物大量繁殖，饵料丰富，鱼类在此聚集；同时两股水流交汇形成「水障」，阻碍鱼群游动，使鱼群集中，形成大渔场。举例：拉布拉多寒流与墨西哥湾暖流交汇形成纽芬兰渔场；千岛寒流与日本暖流交汇形成北海道渔场。',
        '解析：答题链为「交汇—海水扰动—营养盐上泛—饵料丰富—鱼群聚集」，再落到具体洋流组合。'
      ].join('\n')
    }
  ];

  // 读图锦囊：首页每日轮换一条（按日期取，零接口零存储）
  var TIPS = [
    '等高线「凸低为脊、凸高为谷」；河流只会出现在山谷（集水线）里。',
    '陡崖相对高度用 (n−1)·d ≤ H ＜ (n+1)·d 估算：n 为重叠条数，d 为等高距。',
    '气候判读先「以温定带」，再「以水定型」；最冷月 0℃ 是亚热带与温带季风的分界。',
    '气温年较差＝最热月均温 − 最冷月均温；年较差大，是大陆性气候的名片。',
    '中低纬大洋环流「北顺南逆」：大洋西岸是暖流，东岸是寒流。',
    '南半球西风漂流性质为寒流；北大西洋暖流则让西欧冬季远比同纬度温暖。',
    '寒暖流交汇处多成大渔场：海水受扰、营养盐上泛、饵料丰富、鱼群聚集。',
    '等压线越密风越大，等温线越密温差越大——「密陡疏缓」是等值线通则。',
    '坡度看疏密：等高线密集坡陡、稀疏坡缓；公路翻山多呈「之」字形。',
    '聚落多依河谷、平原与河口三角洲而生：地形平坦、水源充足、交通便利。'
  ];

  global.TuJieSamples = {
    SAMPLES: SAMPLES,
    TIPS: TIPS,
    get: function (id) {
      for (var i = 0; i < SAMPLES.length; i++) if (SAMPLES[i].id === id) return SAMPLES[i];
      return null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
