/* 图解地理 · 举一反三（错题同类变式）内置题池
 * 纯逻辑，Node 可测试。演示模式下无 API 也能从错题一键生成 3 道同类题；
 * API 模式下走多模态模型仿题（见 ui.js buildDrillPrompt），本题池作为离线回落。
 * 抽题带种子：同一道错题在同一天生成同一组（day 种子），可复现、可质检。 */
(function (global) {
  'use strict';

  var POOLS = {
    contour: [
      {
        stem: '等高线地形图上，一处等高线向海拔高处凸出，该地形部位是',
        options: ['山脊', '山谷', '鞍部', '陡崖'],
        answer: 'A',
        analysis: '等高线凸高为谷、凸低为脊：向高处（数值大）凸出的是山脊，为分水线；向低处凸出的才是山谷。'
      },
      {
        stem: '某等高线地形图等高距为100米，陡崖处有两条等高线重叠，则崖顶与崖底的相对高度H可能是',
        options: ['50米', '95米', '150米', '310米'],
        answer: 'C',
        analysis: '代入公式(n-1)·d≤H＜(n+1)·d：n=2、d=100米，得100米≤H＜300米，四个选项中只有150米符合。'
      },
      {
        stem: '在等高线地形图上规划水库坝址，最合理的位置是',
        options: ['盆地出口的峡谷处（口小肚大）', '山脊线上', '陡崖下方', '两条河流的源头处'],
        answer: 'A',
        analysis: '"口小肚大"：坝址选在盆地（集水区）出口的狭窄峡谷，工程量小、蓄水量大；山脊是分水线不能建坝，陡崖下有坠石风险。'
      },
      {
        stem: '登山比赛中希望「省力但路程稍长」的路线，应选择等高线地形图上',
        options: ['等高线最密集的路线', '沿山脊直上的路线', '穿过陡崖的路线', '等高线稀疏、呈「之」字形的路线'],
        answer: 'D',
        analysis: '等高线稀疏处坡缓、省力；「之」字形线路进一步减缓坡度。密集处坡陡，陡崖不可攀爬。'
      },
      {
        stem: '某地区海拔多在500米以上，地面起伏大、坡度陡峻，其地形类型是',
        options: ['平原', '山地', '丘陵', '高原'],
        answer: 'B',
        analysis: '山地：海拔＞500米、起伏大、坡度陡；高原：海拔高但地面开阔起伏小；丘陵：海拔＜500米起伏和缓；平原：＜200米平坦。'
      },
      {
        stem: '从河流高处向低处的村庄引水，为使水自流且线路尽量短，引水线路应',
        options: ['翻越山脊直线前进', '沿等高线绕行至高处再下引', '大致沿等高线从高处延展到村庄', '沿等高线最密处直下'],
        answer: 'C',
        analysis: '水自流向低处：引水渠起点须高于村庄，并大致沿等高线延展，避免翻山与穿越山脊；等高线密集处工程难度大。'
      }
    ],
    climate: [
      {
        stem: '某地最冷月均温为-5℃，夏季高温多雨、冬季寒冷干燥，该气候类型是',
        options: ['亚热带季风气候', '温带季风气候', '温带海洋性气候', '地中海气候'],
        answer: 'B',
        analysis: '最冷月＜0℃排除亚热带季风（0℃~15℃）；夏雨型且冬冷夏热为温带季风；温带海洋性全年温和湿润，地中海为冬雨型。'
      },
      {
        stem: '「夏季炎热干燥、冬季温和多雨」的气候分布在',
        options: ['赤道附近', '大陆东岸', '南北纬30°~40°的大陆西岸', '极地地区'],
        answer: 'C',
        analysis: '这是地中海气候的典型特征与分布规律：南北纬30°~40°大陆西岸，受副热带高气压带与西风带交替控制。'
      },
      {
        stem: '某城市1月均温为-4℃，7月均温为26℃，其气温年较差是',
        options: ['30℃', '22℃', '-30℃', '26℃'],
        answer: 'A',
        analysis: '气温年较差＝最热月均温−最冷月均温＝26℃−(−4℃)＝30℃；注意减去负数要变加法。'
      },
      {
        stem: '与热带季风气候相比，热带草原气候的突出特点是',
        options: ['全年多雨', '年降水量更少且干季更长', '全年炎热干燥', '最冷月低于0℃'],
        answer: 'B',
        analysis: '两者均为夏雨型、全年高温；热带草原年降水明显偏少（一般不足1000毫米）、干季更长，热带季风雨季更猛更长。'
      },
      {
        stem: '温带海洋性气候终年温和湿润的成因是',
        options: ['终年受西风带控制', '海陆热力性质差异', '副热带高压控制', '极地东风控制'],
        answer: 'A',
        analysis: '南北纬40°~60°大陆西岸终年盛行西风，从海洋带来湿润气流，故全年温和湿润；海陆热力差异是季风气候的成因。'
      },
      {
        stem: '季风气候区发展种植业最有利的条件是',
        options: ['昼夜温差小', '雨热同期', '全年降水均匀', '冬季严寒冻死害虫'],
        answer: 'B',
        analysis: '季风气候高温期与多雨期一致（雨热同期），水热配合好，利于水稻等喜温喜湿作物生长。'
      }
    ],
    currents: [
      {
        stem: '北太平洋副热带环流的大洋西岸（大陆东岸）洋流的性质与流向是',
        options: ['暖流，自南向北流', '寒流，自北向南流', '暖流，自北向南流', '寒流，自南向北流'],
        answer: 'A',
        analysis: '中低纬环流「北顺南逆」：北半球副热带环流西岸（如日本暖流）由低纬流向高纬，为暖流。'
      },
      {
        stem: '判断寒流、暖流的主要依据是',
        options: ['洋流所在海区的绝对水温', '洋流流速的快慢', '洋流水温与所经海区水温的相对高低', '洋流的深度'],
        answer: 'C',
        analysis: '寒暖流是相对概念：比流经海区水温高为暖流（多由低纬流向高纬），反之为寒流；不能只看流向或绝对水温。'
      },
      {
        stem: '秘鲁渔场的形成原因是',
        options: ['寒暖流交汇', '河流带来丰富饵料', '上升补偿流将深层营养盐带至表层', '水温全年最高'],
        answer: 'C',
        analysis: '秘鲁沿岸受离岸风影响形成上升补偿流（上升流），深层营养盐上泛、浮游生物繁盛、饵料丰富，属上升流渔场。'
      },
      {
        stem: '海上漏油事故发生后，洋流对污染的影响是',
        options: ['只加快净化速度', '只扩大污染范围', '加快净化速度，同时扩大污染范围', '没有影响'],
        answer: 'C',
        analysis: '洋流带动海水交换，加快漏油区净化；但污染物随洋流扩散，会波及其他海域——两面性都要答。'
      },
      {
        stem: '北印度洋海区洋流流向的季节规律是',
        options: ['全年向东流', '夏季顺时针、冬季逆时针', '夏季逆时针、冬季顺时针', '全年向西流'],
        answer: 'B',
        analysis: '北印度洋为季风洋流：夏季西南季风驱动呈顺时针，冬季东北季风驱动呈逆时针，规律「夏顺冬逆」。'
      },
      {
        stem: '纳米布沙漠直逼大西洋海岸，与其形成相关的洋流是',
        options: ['本格拉寒流（降温减湿）', '巴西暖流（增温增湿）', '几内亚暖流', '西风漂流（暖流）'],
        answer: 'A',
        analysis: '非洲西南岸的本格拉寒流使下层大气降温、层结稳定，水汽难以成云致雨，荒漠可直逼海岸。'
      }
    ]
  };

  // 模块名 → 题池（与报告「所属知识模块」的写法做关键词匹配）
  function poolMatch(moduleName) {
    var m = String(moduleName || '');
    if (m.indexOf('等高线') >= 0 || m.indexOf('地形') >= 0 || m.indexOf('地图') >= 0) return 'contour';
    if (m.indexOf('气候') >= 0 || m.indexOf('大气') >= 0 || m.indexOf('天气') >= 0) return 'climate';
    if (m.indexOf('洋流') >= 0 || m.indexOf('海水') >= 0 || m.indexOf('水') >= 0) return 'currents';
    return 'mix';
  }

  // mulberry32 种子随机（同种子同序列，可复现）
  function rng(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 从池中确定性抽 n 题（不重复）
  function pick(poolName, n, seed) {
    var pool = POOLS[poolName] || [];
    var idxs = [];
    for (var i = 0; i < pool.length; i++) idxs.push(i);
    var rand = rng(seed || 1);
    for (var j = idxs.length - 1; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var tmp = idxs[j]; idxs[j] = idxs[k]; idxs[k] = tmp;
    }
    return idxs.slice(0, Math.min(n, idxs.length)).map(function (ix) {
      var q = pool[ix];
      return { head: '同类题（选择题）', stem: q.stem, options: q.options, answer: q.answer, analysis: q.analysis };
    });
  }

  // 混合池：三池各取1题
  function pickMix(n, seed) {
    var rand = rng((seed || 1) + 7);
    var keys = ['contour', 'climate', 'currents'];
    var out = [];
    var per = Math.ceil(n / keys.length);
    keys.forEach(function (k, i) {
      out = out.concat(pick(k, per, Math.floor((seed || 1) * (i + 3) + rand() * 1000)));
    });
    return out.slice(0, n);
  }

  // 按错题模块抽 3 题（day 种子：同一天同题同组）
  function drillFor(moduleName, wrongKey, n) {
    var day = Math.floor(Date.now() / 86400000);
    var seed = day * 131 + String(wrongKey).length * 17 + (String(wrongKey).charCodeAt(0) || 3);
    var pool = poolMatch(moduleName);
    var qs = pool === 'mix' ? pickMix(n || 3, seed) : pick(pool, n || 3, seed);
    return { pool: pool, questions: qs };
  }

  // 把抽出的题拼成与提示词规范一致的「第五节」markdown（parseQuiz 可直接解析）
  function buildDrillMarkdown(qs) {
    var lines = ['## 五、变式训练题', ''];
    qs.forEach(function (q, i) {
      lines.push('**题' + (i + 1) + '（选择题）** ' + q.stem);
      q.options.forEach(function (o, j) {
        lines.push(String.fromCharCode(65 + j) + '. ' + o);
      });
      lines.push('答案：' + q.answer);
      lines.push('解析：' + q.analysis);
      lines.push('');
    });
    return lines.join('\n');
  }

  // API 仿题提示词（有密钥时走模型；输出格式与内置题池一致，parseQuiz 兼容）
  function buildDrillPrompt(moduleName, wrongStem, wrongAnalysis, grade, textbook) {
    return [
      '你是中学地理命题专家，对应' + (grade || '高中') + '、' + (textbook || '人教版') + '教材。',
      '下面是一道学生做错的地理选择题，请紧扣同一知识点与同等难度，仿出 3 道全新的同类选择题（题干情境不与原题重复）。',
      '',
      '原错题所属模块：' + (moduleName || '未标注'),
      '原错题：' + wrongStem,
      '原题解析：' + (wrongAnalysis || '略'),
      '',
      '输出格式（严格遵守，不要输出任何其他内容）：',
      '**题1（选择题）** 题干',
      'A. 选项',
      'B. 选项',
      'C. 选项',
      'D. 选项',
      '答案：X',
      '解析：……',
      '（共 3 题，编号题1、题2、题3）'
    ].join('\n');
  }

  global.TuJieDrill = {
    POOLS: POOLS, poolMatch: poolMatch, pick: pick, pickMix: pickMix,
    drillFor: drillFor, buildDrillMarkdown: buildDrillMarkdown, buildDrillPrompt: buildDrillPrompt
  };
})(typeof window !== 'undefined' ? window : globalThis);
