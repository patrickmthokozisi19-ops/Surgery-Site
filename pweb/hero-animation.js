
//===========pweb.htm
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function mk(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function mix(a, b, t) {
    var h = function (c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); };
    var x = h(a), y = h(b);
    return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')';
  }

  /* ---------- wordmark ---------- */
  var shape = $('#wmShape'), outlines = $('#wmOutlines'), stack = $('#wmStack');

  for (var k = 0; k < 10; k++) {
    var i = 10 - k;
    var layer = mk('g', { 'class': 'layer' });
    layer.style.color = mix('#2b374b', '#7f8ea6', k / 9);
    layer.style.setProperty('--dx', 1.4 * i + 'px');
    layer.style.setProperty('--dy', 1.9 * i + 'px');
    layer.style.setProperty('--t', 4.2 + k * 0.04 + 's');
    layer.appendChild(shape.cloneNode(true));
    stack.appendChild(layer);
  }

  [].forEach.call(shape.children, function (p) {
    p.setAttribute('class', 'fl');
    p.style.setProperty('--f', p.dataset.f + 's');
    (p.getAttribute('d').match(/M[^Z]*Z/g) || []).forEach(function (d) {
      var o = mk('path', { 'class': 'ol', d: d, pathLength: 1 });
      o.style.setProperty('--t', p.dataset.t + 's');
      o.style.setProperty('--s', p.dataset.s + 's');
      o.style.setProperty('--f', p.dataset.f + 's');
      outlines.appendChild(o);
    });
  });

  /* ---------- spider web ---------- */
  (function () {
    var art = $('#webArt');
    var lines = mk('g', { fill: 'none', stroke: '#a4b1c4', 'stroke-width': 1.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    var rings = mk('g', { 'stroke-width': 1.1, opacity: 0.9 });
    var eyes = mk('g', { fill: '#a4b1c4' });
    var pt = function (r, deg) {
      var a = deg * Math.PI / 180;
      return [200 + r * Math.cos(a), 110 + r * Math.sin(a)];
    };
    var f = function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); };
    var draw = function (parent, d, t, s) {
      var e = mk('path', { 'class': 'd', d: d, pathLength: 1 });
      e.style.setProperty('--t', t + 's');
      e.style.setProperty('--s', s + 's');
      parent.appendChild(e);
    };
    var eye = function (x, y, r, t) {
      var c = mk('circle', { 'class': 'eye', cx: x, cy: y, r: r });
      c.style.setProperty('--t', t + 's');
      eyes.appendChild(c);
    };

    for (var s = 0; s < 12; s++) {
      draw(lines, 'M200 110 L' + f(pt(100, -90 + 30 * s)), 6 + s * 0.07, 0.7);
    }
    for (var r = 0; r < 5; r++) {
      var rad = 20 + 18 * r, d = 'M' + f(pt(rad, -90));
      for (var j = 0; j < 12; j++) {
        d += ' Q' + f(pt(rad * 0.78, -90 + 30 * j + 15)) + ' ' + f(pt(rad, -90 + 30 * (j + 1)));
      }
      draw(rings, d, 6.8 + r * 0.18, 0.9);
    }
    draw(lines, 'M20 110 H84', 7.2, 0.8);
    draw(lines, 'M380 110 H316', 7.2, 0.8);
    eye(20, 110, 3.5, 7.6);
    eye(380, 110, 3.5, 7.6);
    for (var e = 0; e < 12; e++) {
      var p = pt(92, -90 + 30 * e);
      eye(p[0].toFixed(1), p[1].toFixed(1), 2.6, 7.8 + e * 0.04);
    }
    lines.appendChild(rings);
    art.appendChild(lines);
    art.appendChild(eyes);
  })();

  /* ---------- device slides ---------- */
  var devices = [].slice.call(document.querySelectorAll('.device'));

  devices.forEach(function (dev) {
    var sl = [].slice.call(dev.querySelectorAll('.slide')), n = sl.length;
    var screen = $('.screen', dev), bar = $('.bar', dev), dg = $('.dots', dev), scene = dev.closest('.scene');
    var W = +dg.getAttribute('data-w'), Y = +dg.getAttribute('data-y');
    var idx = 0, elapsed = 0, last = null, hold = false, down = false, sx = 0, swiped = false;

    var pw = (n - 1) * 20 + 30, x0 = W / 2 - (n - 1) * 10;
    dg.appendChild(mk('rect', { x: W / 2 - pw / 2, y: Y - 12, width: pw, height: 24, rx: 12, fill: 'rgba(14,31,43,.55)' }));
    var dots = sl.map(function (s, q) {
      var c = mk('circle', { cx: x0 + q * 20, cy: Y, r: 5, fill: s.getAttribute('data-color'), 'class': 'dot' });
      c.addEventListener('click', function (e) { e.stopPropagation(); go(q); });
      dg.appendChild(c);
      return c;
    });

    var dur = function () { return +sl[idx].getAttribute('data-duration') || 5000; };

    function go(q) {
      idx = ((q % n) + n) % n;
      elapsed = 0;
      sl.forEach(function (s, m) {
        var d = ((m - idx) % n + n) % n;
        if (d > n / 2) d -= n;
        s.style.transform = 'translateX(' + (d * W) + 'px)';
        s.style.opacity = Math.abs(d) > 1 ? 0 : 1;
        s.classList.toggle('active', d === 0);
        [].forEach.call(s.querySelectorAll('a'), function (a) { a.setAttribute('tabindex', d === 0 ? '0' : '-1'); });
      });
      dots.forEach(function (c, m) {
        c.setAttribute('r', m === idx ? 7 : 5);
        c.setAttribute('stroke', m === idx ? '#fff' : 'none');
        c.setAttribute('stroke-width', 2);
      });
    }

    function setHold(v) {
      hold = v;
      dev.classList.toggle('hold', v);
    }

    dev.addEventListener('mouseenter', function () { setHold(true); });
    dev.addEventListener('mouseleave', function () { if (!down) setHold(false); });
    dev.addEventListener('focusin', function () { setHold(true); });
    dev.addEventListener('focusout', function () { setHold(false); });
    dev.addEventListener('stage:on', function () { go(0); });

    screen.addEventListener('pointerdown', function (e) { down = true; sx = e.clientX; swiped = false; setHold(true); });
    window.addEventListener('pointerup', function (e) {
      if (!down) return;
      down = false;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 28) {
        swiped = true;
        go(idx + (dx < 0 ? 1 : -1));
        setTimeout(function () { swiped = false; }, 80);
      }
      if (!dev.matches(':hover')) setHold(false);
    });
    window.addEventListener('pointercancel', function () { down = false; });
    dev.addEventListener('click', function (e) { if (swiped) { e.preventDefault(); e.stopPropagation(); } }, true);
    dev.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
    });

    function tick(t) {
      var live = scene.classList.contains('is-on');
      if (last !== null && !hold && live && !reduce) elapsed += Math.min(t - last, 100);
      last = t;
      if (elapsed >= dur()) go(idx + 1);
      bar.setAttribute('width', W * Math.min(elapsed / dur(), 1));
      requestAnimationFrame(tick);
    }

    go(0);
    requestAnimationFrame(tick);
  });

  /* stack the devices on tablet and mobile */
  function layoutDevices() {
    var svg = $('.devices'), laptop = $('.laptop'), phone = $('.phone');
    if (window.innerWidth <= 900) {
      svg.setAttribute('viewBox', '0 0 700 880');
      laptop.setAttribute('transform', 'translate(0 -70)');
      phone.setAttribute('transform', 'translate(245 470) scale(0.9) translate(-720 -170)');
    } else {
      svg.setAttribute('viewBox', '0 0 1000 640');
      laptop.removeAttribute('transform');
      phone.removeAttribute('transform');
    }
  }
  layoutDevices();
  window.addEventListener('resize', layoutDevices);

  /* ---------- scene loop: wordmark → devices → wordmark … ---------- */
  var brand = $('#sceneBrand'), prod = $('#sceneProduct');
  var LEN = { brand: 10000, product: 31000 };
  var which = reduce ? 'product' : 'brand', t = 0, prev = null;

  function replay(el) {
    el.classList.remove('play');
    void el.getBoundingClientRect();
    el.classList.add('play');
  }

  function show(w) {
    which = w;
    t = 0;
    brand.classList.toggle('is-on', w === 'brand');
    prod.classList.toggle('is-on', w === 'product');
    prod.inert = w !== 'product';
    if (w === 'brand') replay(brand);
    else devices.forEach(function (d) { d.dispatchEvent(new Event('stage:on')); });
  }

  function frame(ts) {
    if (prev !== null) {
      var held = which === 'product' && $('.device.hold');
      if (!reduce && !held) t += Math.min(ts - prev, 100);
    }
    prev = ts;
    if (!reduce && t >= LEN[which]) show(which === 'brand' ? 'product' : 'brand');
    requestAnimationFrame(frame);
  }

  show(which);
  requestAnimationFrame(frame);
})();
