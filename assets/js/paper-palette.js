(function () {
  'use strict';
  var key = 'paper.palette.v1';
  var choices = ['original', 'sage', 'blue', 'rose', 'sand'];
  var root = document.documentElement;
  function apply(value) {
    if (choices.indexOf(value) < 0) value = 'original';
    root.setAttribute('data-paper', value);
    document.querySelectorAll('.paper-picker button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-paper') === value));
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
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) apply(event.newValue);
  });
})();
