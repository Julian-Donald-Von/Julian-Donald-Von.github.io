(function () {
  'use strict';
  var el = document.getElementById('stfu-count');
  var base = window.STFU_COUNTER_URL;
  if (!el || !base) return;
  try {
    var url = new URL(base);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return;
    base = url.origin;
  } catch (_) { return; }
  var highest = -1, clicked = false;
  function update(count) {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid count');
    // A slower initial GET must not overwrite the POST result.
    highest = Math.max(highest, count);
    el.textContent = highest.toLocaleString('en') + ' unique IPs told me to STFU';
  }
  async function request(path, method) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 4000);
    try {
      var response = await fetch(base + path, {
        method: method, mode: 'cors', credentials: 'omit', cache: 'no-store',
        signal: controller.signal, keepalive: method === 'POST'
      });
      if (!response.ok) throw new Error('Counter unavailable');
      update((await response.json()).count);
    } catch (_) {
      if (highest < 0) el.textContent = 'STFU consensus: unavailable';
    } finally { clearTimeout(timer); }
  }
  window.recordStfu = function () {
    if (clicked) return;
    clicked = true;
    // Network completion never delays dismissal. Deduplication lives on the server.
    void request('/stfu', 'POST');
  };
  void request('/count', 'GET');
})();
