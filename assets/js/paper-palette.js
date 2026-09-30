(function () {
  'use strict';
  var key = 'paper.palette.v1';
  var choices = ['original', 'sage', 'blue', 'rose', 'sand'];
  var root = document.documentElement;
  function apply(value) {
    if (choices.indexOf(value) < 0) value = 'original';
    root.setAttribute('data-paper', value);
    toneRelief();
    document.querySelectorAll('.paper-picker button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-paper') === value));
    });
  }
  function toneRelief() {
    var rgb = getComputedStyle(root).getPropertyValue('--bg').trim();
    // Resolve the selected CSS variable through an element, including system dark mode.
    var probe = document.createElement('span'); probe.style.color = rgb;
    root.appendChild(probe);
    var channels = getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number);
    probe.remove();
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var source = dark ? [37, 40, 36] : [246, 245, 238];
    var neutral = (source[0] * 0.2126 + source[1] * 0.7152 + source[2] * 0.0722) / 255;
    ['r', 'g', 'b'].forEach(function (channel, i) {
      var fn = document.getElementById('relief-tone-' + channel);
      if (fn) fn.setAttribute('intercept', String(channels[i] / 255 - neutral));
    });
  }
  var saved;
  try { saved = localStorage.getItem(key); } catch (_) {}
  apply(saved);
  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-paper'));
    document.querySelectorAll('.paper-picker button').forEach(function (button) {
      button.addEventListener('click', function () {
        var value = button.getAttribute('data-paper');
        apply(value);
        try { localStorage.setItem(key, value); } catch (_) {}
      });
    });
  }, { once: true });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', toneRelief);
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) apply(event.newValue);
  });
})();

