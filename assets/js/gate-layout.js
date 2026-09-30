(function () {
  'use strict';
  // Keep original character offsets. Line breaks are presentation, never text edits.
  function plan(text, measure, width) {
    var ends = [], start = 0;
    while (start < text.length) {
      var rest = text.slice(start), candidates = [], match, re = /\s+/g;
      while ((match = re.exec(rest))) candidates.push(start + match.index + match[0].length);
      candidates.push(text.length);
      var fit = candidates.filter(function (end) { return measure(text.slice(start, end).trim()) <= width; });
      var end = fit.length ? fit[fit.length - 1] : candidates[0];
      if (end < text.length) {
        var punctuation = fit.filter(function (cut) {
          var chunk = text.slice(start, cut).trim();
          return /[.,;:!?—–][”’"')]*$/.test(chunk) && measure(chunk) >= width * 0.45;
        });
        if (punctuation.length) end = punctuation[punctuation.length - 1];
      }
      ends.push(end); start = end;
    }
    return ends.length ? ends : [0];
  }
  window.GateLinePlan = plan;
  window.createGateLayout = function (node, target) {
    var displayed = '', adjustment = null, rows = [], cuts = [];
    function layout() {
      var style = getComputedStyle(node), canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      ctx.font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
      var width = Math.min(innerWidth * 2 / 3, node.clientWidth) - 10;
      cuts = plan(target, function (s) { return ctx.measureText(s).width; }, Math.max(80, width));
      node.replaceChildren();
      rows = cuts.map(function () { var row = document.createElement('span'); row.className = 'gate-row'; node.appendChild(row); return row; });
      node.classList.add('gate-planned');
      paint();
    }
    function paint() {
      var start = 0, active = 0;
      rows.forEach(function (row, index) {
        var end = cuts[index];
        if (adjustment && end > adjustment.at && end >= adjustment.end) end += adjustment.delta;
        // Last row includes the transient aside. It never changes earlier line breaks.
        if (index === rows.length - 1) end = Math.max(end, displayed.length);
        row.textContent = displayed.slice(start, end);
        if (displayed.length > start) active = index;
        start = end;
      });
      rows.forEach(function (row, index) { row.classList.toggle('gate-row-active', index === active); });
    }
    var resizeTimer;
    function resize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 100); }
    window.addEventListener('resize', resize);
    layout();
    return {
      classList: node.classList,
      get textContent() { return displayed; },
      set textContent(value) { displayed = value; if (value === target) adjustment = null; paint(); },
      replaceAt: function (at, end, delta) { adjustment = {at: at, end: end, delta: delta}; },
      clearReplacement: function () { adjustment = null; },
      destroy: function () { clearTimeout(resizeTimer); window.removeEventListener('resize', resize); node.classList.remove('gate-planned'); }
    };
  };
})();
