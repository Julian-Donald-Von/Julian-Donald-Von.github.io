/* Site script: scroll reveal only. No dependencies, no tracking, no language toggle. */
(function () {
  'use strict';

  /* Reveal: 7px lift and a 720ms fade. Deliberately nothing bouncier. */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.03 });

  targets.forEach(function (el, i) {
    el.style.transitionDelay = (i === 0 ? 0 : Math.min(i, 4) * 60) + 'ms';
    io.observe(el);
  });
})();
