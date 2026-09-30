(function () {
  'use strict';
  var el = document.getElementById('stfu-count');
  var base = window.STFU_COUNTER_URL;
  if (!el) return;
  if (!base) {
    var key = 'stfu.local-clicks.v1', count = 0, localClicked = false, persistent = true;
    function readCount() {
      try {
        var value = Number(localStorage.getItem(key) || 0);
        return Number.isSafeInteger(value) && value >= 0 ? value : 0;
      } catch (_) { persistent = false; return count; }
    }
    var taunts = ['Very constructive.', 'Reviewer 2 would be proud.',
      'Peer review has become personal.', 'The button has filed a complaint.',
      'Your restraint remains theoretical.', 'A compelling rebuttal. Again.'];
    function showLocal() {
      var scope = persistent ? 'this browser' : 'this page';
      el.textContent = count === 0 ? '0 STFU clicks · ' + scope + '. Suspiciously polite.' :
        count.toLocaleString('en') + ' STFU ' + (count === 1 ? 'click' : 'clicks') +
        ' · ' + scope + '. ' + taunts[(count - 1) % taunts.length];
      el.title = persistent ? 'Clicks stored only in this browser. Not a global total or an IP count. Clearing browser data resets it.' :
        'Browser storage is unavailable. This count lasts only for this page.';
    }
    count = readCount(); showLocal();
    window.recordStfu = function () {
      if (localClicked) return;
      localClicked = true;
      count = Math.min(Number.MAX_SAFE_INTEGER, readCount() + 1);
      try { localStorage.setItem(key, String(count)); } catch (_) { persistent = false; }
      showLocal();
    };
    window.addEventListener('storage', function (event) {
      if (event.key === key || event.key === null) { count = readCount(); showLocal(); }
    });
    return;
  }
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
    el.textContent = highest.toLocaleString('en') + ' unique IPs told me to STFU. Very constructive.';
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
      if (highest < 0) el.textContent = 'The STFU tally is taking a vow of silence.';
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

