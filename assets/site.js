(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var doc = document.documentElement;

  // hero title: letters rise in one by one
  var title = document.querySelector('.hero-title');
  if (title && !reduce) {
    var txt = title.textContent; title.setAttribute('aria-label', txt); title.textContent = '';
    txt.split('').forEach(function (c, i) {
      var o = document.createElement('span'); o.className = 'ch'; o.setAttribute('aria-hidden', 'true');
      var s = document.createElement('span'); s.textContent = c; s.style.transitionDelay = (0.2 + i * 0.12) + 's';
      o.appendChild(s); title.appendChild(o);
    });
  }
  function ready() { requestAnimationFrame(function () { doc.classList.add('loaded'); }); }
  if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
  setTimeout(function () { doc.classList.add('loaded'); }, 1800);

  // header: hides going down, returns going up; white over the hero, dark on the page
  var header = document.querySelector('.site-header');
  var hero = document.querySelector('.hero, .photo-head');
  var heroImg = hero && hero.querySelector('.bg');
  var heroCenter = hero && hero.querySelector('.hero-center');
  var bands = [].slice.call(document.querySelectorAll('[data-par]'));
  var last = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    var heroH = hero ? hero.offsetHeight : 0;
    header.classList.toggle('solid', !hero || y > heroH - 80);
    if (y > last && y > 160 && !document.body.classList.contains('menu-open')) header.classList.add('hide');
    else if (y < last - 2 || y < 160) header.classList.remove('hide');
    last = y;
    if (reduce) return;
    if (hero && y < heroH) {
      if (heroImg) heroImg.style.transform = 'translate3d(0,' + (y * 0.3).toFixed(1) + 'px,0)';
      if (heroCenter) { heroCenter.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0)'; heroCenter.style.opacity = Math.max(0, 1 - y / (heroH * 0.7)).toFixed(3); }
    }
    bands.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        var p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        img.style.transform = 'translate3d(0,' + (p * -60).toFixed(1) + 'px,0)';
      }
    });
  }
  window.addEventListener('scroll', function () { requestAnimationFrame(onScroll); }, { passive: true });
  onScroll();

  // full-screen menu
  var menu = document.querySelector('.menu');
  document.querySelectorAll('[data-menu]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      document.querySelectorAll('[data-menu]').forEach(function (x) { x.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      if (open) menu.querySelector('[data-menu]').focus();
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) menu.querySelector('[data-menu]').click(); });

  // reveal on scroll
  var els = document.querySelectorAll('.rv,.rv-clip,.line-mask,.step,.plan');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('revealed'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add('revealed'); });

  // chips
  document.querySelectorAll('[data-chips]').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      g.querySelectorAll('.chip').forEach(function (c) { var on = c === b; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var k = g.getAttribute('data-chips');
      if (k === 'finish') document.querySelectorAll('[data-finish]').forEach(function (s) { s.textContent = b.textContent; });
      if (k === 'filter') {
        var f = b.getAttribute('data-f');
        document.querySelectorAll('[data-cat]').forEach(function (c) { c.hidden = !(f === 'all' || c.getAttribute('data-cat').split(' ').indexOf(f) > -1); });
      }
    });
  });

  // before / after
  document.querySelectorAll('.ba').forEach(function (ba) {
    var r = ba.querySelector('input'), b = ba.querySelector('.before'), h = ba.querySelector('.handle');
    function set(v) { b.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)'; h.style.left = v + '%'; }
    r.addEventListener('input', function () { set(r.value); }); set(r.value);
  });

  // prefill from ?model=
  var m = new URLSearchParams(location.search).get('model');
  var ta = document.querySelector('.form textarea');
  if (m && ta) ta.value = 'I am interested in ADU Model ' + m + '.';
  document.querySelectorAll('form').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); f.querySelector('[type=submit]').textContent = 'Request sent, thank you'; });
  });

})();
/* build time-lapse: plays once when it comes into view, rests on the finished house, replays when seen again */
(function () {
  var v = document.querySelector('.buildvid'); if (!v) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { v.poster = v.getAttribute('data-end'); v.removeAttribute('src'); v.load(); return; }
  var ended = false;
  v.addEventListener('ended', function () { ended = true; });
  function play() { try { v.currentTime = 0; } catch (e) {} var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  if ('IntersectionObserver' in window) {
    var seen = false;
    new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.5) { if (!seen || ended) { seen = true; ended = false; play(); } }
      });
    }, { threshold: [0, 0.5, 1] }).observe(v);
  } else { play(); }
})();
