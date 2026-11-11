/* 图解地理 · 多模态 AI 客户端（OpenAI 兼容 chat/completions，默认智谱 glm-4v-flash）
 * 密钥只从设置读入、随请求发往用户自填接口；失败抛出带原因的中文错误，由界面提示。
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    model: 'glm-4v-flash'
  };

  function normalizeBase(b) {
    return String(b || '').trim().replace(/\/+$/, '');
  }

  function callVision(settings, messages, opts) {
    var base = normalizeBase(settings.apiBase) || DEFAULTS.apiBase;
    var url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
    var timeoutMs = (opts && opts.timeoutMs) || 120000;
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs) : null;

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + String(settings.apiKey || '').trim()
      },
      body: JSON.stringify({
        model: settings.model || DEFAULTS.model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 4096,
        stream: false
      }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (resp) {
      if (timer) clearTimeout(timer);
      return resp.json().catch(function () { return null; }).then(function (data) {
        if (!resp.ok) {
          var msg = (data && ((data.error && data.error.message) || data.message)) ||
            (data ? JSON.stringify(data).slice(0, 200) : '');
          var hint = resp.status === 401 ? '——请检查 API Key'
            : resp.status === 400 ? '——请确认模型支持图像输入（如 glm-4v-flash / glm-4v-plus）'
            : resp.status === 429 ? '——请求过于频繁或额度不足，稍后再试'
            : resp.status === 404 ? '——接口地址不对，检查 API 地址（一般以 /v4 或 /v1 结尾）'
            : '';
          throw new Error('API 返回错误（HTTP ' + resp.status + '）' + (msg ? '：' + msg : '') + hint);
        }
        var content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content || typeof content !== 'string') throw new Error('API 返回内容为空，请重试。');
        return content;
      });
    }, function (e) {
      if (timer) clearTimeout(timer);
      var aborted = ctrl && e && e.name === 'AbortError';
      throw new Error(aborted ? '请求超时（超过 ' + Math.round(timeoutMs / 1000) + ' 秒），可换更小的图片或重试' : '网络请求失败：无法连接 ' + base + '，请检查网络与 API 地址');
    });
  }

  global.TuJieAI = { DEFAULTS: DEFAULTS, callVision: callVision, normalizeBase: normalizeBase };
})(typeof window !== 'undefined' ? window : globalThis);
