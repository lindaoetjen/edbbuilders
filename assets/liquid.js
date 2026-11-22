/*
 * Liquid glass option rows, adapted for EDB from the "Waterline" liquid navbar
 * (Nimbus UI, by guglielmogiannattasio.it). Plain JS port, works on wrapping rows,
 * follows the pointer on hover, settles on the selected option, warm palette.
 * WebGL water inside the pill; CSS drop fallback without WebGL.
 */
(function () {
  var PAD = 14;
  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;uniform float uPR;',
    'uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uDark;uniform float uAmb;',
    'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}',
    'float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}',
    'float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}',
    'float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}',
    'float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,uPR);}',
    'float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}',
    'float waves(vec2 p){float w=0.;',
    ' for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}',
    ' vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);',
    ' w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);return w;}',
    'float H(vec2 p){float dp=pillD(p);return lens(dp,min(uPR*.72,18.))*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}',
    'float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}',
    'void main(){',
    ' vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;',
    ' float dp=pillD(p);float dd=dropD(p);',
    ' float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));',
    ' vec3 V=vec3(0.,0.,1.);',
    ' float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);',
    ' float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;',
    ' float fres=clamp((1.-n.z)*4.,0.,1.);',
    ' vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035));',
    ' irid=mix(vec3(1.,.96,.9),irid,.35);',
    ' float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);',
    ' float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*(.10+.07*uDark);',
    ' vec3 c=vec3(.20,.14,.08)*sh;float a=sh;',
    ' float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);',
    ' c=mix(vec3(1.),irid,.4*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);',
    ' float th=lens(dd,11.);',
    ' float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);',
    ' vec3 tint=mix(vec3(1.,.98,.95),vec3(.96,.92,.86),uDark);',
    ' float rim=dm*(1.-smoothstep(0.,8.,-dd));',
    ' float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);',
    ' float body=.5+.5*clamp(-n.y*3.,-1.,1.);',
    ' float da=dm*(.42+.16*body)*(1.-.62*uDark);vec3 dc=mix(tint,vec3(1.),body*.6);',
    ' float la=rim*.2;vec3 lc=mix(vec3(.55,.45,.34),vec3(.85,.78,.68),uDark);dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);',
    ' la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);',
    ' la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);',
    ' la=dm*smoothstep(-2.,0.,dd)*.4;dc=mix(vec3(1.),irid,.3)*la+dc*(1.-la);da=la+da*(1.-la);',
    ' c=dc+c*(1.-da);a=da+a*(1.-da);',
    ' gl_FragColor=vec4(c,a);',
    '}'
  ].join('\n');

  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function initGL(cv) {
    var gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    gl.useProgram(p);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ['uRes', 'uDpr', 'uTime', 'uPill', 'uPR', 'uBlob', 'uSy', 'uRip', 'uMouse', 'uDark', 'uAmb'].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return { gl: gl, u: u };
  }

  function Liquid(nav) {
    var items = [].slice.call(nav.querySelectorAll('.chip'));
    if (!items.length) return;
    nav.classList.add('lq');
    var dark = nav.closest('.contact-photo, .photo-head, .glass-sec') ? 1 : 0;
    nav.setAttribute('data-tone', dark ? 'dark' : 'light');
    var cv = document.createElement('canvas'); cv.className = 'lq-water'; cv.setAttribute('aria-hidden', 'true');
    var drop = document.createElement('span'); drop.className = 'lq-drop'; drop.setAttribute('aria-hidden', 'true');
    nav.insertBefore(drop, nav.firstChild); nav.insertBefore(cv, nav.firstChild);

    var s = {
      a: { x: 0, y: 0, vx: 0, vy: 0 }, b: { x: 0, y: 0, vx: 0, vy: 0 }, sy: { s: 1, v: 0 }, lead: 0, lagFrom: 0,
      sats: [], rips: [], t: { x: 0, y: 0, q: 0, r: 21 }, q: 0, mouse: { x: 0, y: 0, s: 0, on: false },
      moving: false, split: false, ready: false, w: 0, h: 0, pr: 26, visible: true, raf: 0, last: 0, time: 0, hover: false,
      glc: initGL(cv), target: null
    };
    if (!s.glc) nav.setAttribute('data-gl', 'off');
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); s.glc = null; nav.setAttribute('data-gl', 'off'); });

    function active() { return nav.querySelector('.chip.on') || items[0]; }

    function draw() {
      var T = s.t, dx = s.a.x - s.b.x, dy = s.a.y - s.b.y, sep = Math.sqrt(dx * dx + dy * dy);
      var thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1), r = T.r * (1 - 0.3 * thin);
      if (s.glc) {
        var g = s.glc.gl, u = s.glc.u, dpr = Math.min(window.devicePixelRatio || 1, 2);
        g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
        g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2); g.uniform1f(u.uDpr, dpr); g.uniform1f(u.uTime, s.time);
        g.uniform4f(u.uPill, PAD, PAD, s.w, s.h); g.uniform1f(u.uPR, s.pr);
        var blobs = new Float32Array(24), sy = new Float32Array(6).fill(1);
        var head = s.lead === 0 ? s.a : s.b, tail = s.lead === 0 ? s.b : s.a;
        blobs.set([head.x, head.y, s.q * (1 - 0.25 * thin), T.r * (1 - 0.12 * thin), tail.x, tail.y, s.q * (1 - 0.8 * thin), T.r * (1 - 0.5 * thin)], 0);
        sy[0] = sy[1] = s.sy.s;
        s.sats.slice(0, 4).forEach(function (d, i) { blobs.set([d.x, d.y, 0, d.r], 8 + i * 4); });
        g.uniform4fv(u.uBlob, blobs); g.uniform1fv(u.uSy, sy);
        var rips = new Float32Array(24);
        s.rips.slice(-6).forEach(function (p, i) { rips.set([p.x, p.y, p.age, p.amp], i * 4); });
        g.uniform4fv(u.uRip, rips);
        g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s);
        g.uniform1f(u.uDark, dark); g.uniform1f(u.uAmb, reduce ? 0 : (s.hover ? 1 : 0.35));
        g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT); g.drawArrays(g.TRIANGLES, 0, 3);
      } else {
        var L = s.lead === 0 ? s.a : s.b;
        drop.style.width = (Math.abs(dx) + 2 * (s.q + r)) + 'px';
        drop.style.height = (2 * T.r) + 'px';
        drop.style.transform = 'translate(' + (Math.min(s.a.x, s.b.x) - s.q - r - PAD) + 'px,' + (L.y - T.r - PAD) + 'px) scaleY(' + s.sy.s + ')';
      }
    }

    function step(dt, now) {
      var T = s.t; s.time += dt;
      s.q += (T.q - s.q) * Math.min(1, dt * 12);
      var bodies = [s.a, s.b], still = true;
      if (reduce) {
        s.a.x = s.b.x = T.x; s.a.y = s.b.y = T.y; s.a.vx = s.b.vx = s.a.vy = s.b.vy = 0; s.sy.s = 1; s.sats = [];
      } else {
        bodies.forEach(function (B, i) {
          var lead = i === s.lead, k = lead ? 210 : 72, c = lead ? 25 : 13, f = !lead && now < s.lagFrom ? 0.08 : 1;
          B.vx += (k * (T.x - B.x) - c * B.vx) * dt * f; B.x += B.vx * dt;
          B.vy += (k * (T.y - B.y) - c * B.vy) * dt * f; B.y += B.vy * dt;
          var lo = PAD + 6 + s.q + T.r - 3, hi = PAD + s.w - 6 - s.q - T.r + 3;
          if (B.x < lo || B.x > hi) { s.sy.v -= Math.min(Math.abs(B.vx), 900) * 0.0016; B.x = Math.max(lo, Math.min(hi, B.x)); B.vx *= -0.25; }
          if (Math.abs(T.x - B.x) > 0.3 || Math.abs(T.y - B.y) > 0.3 || Math.abs(B.vx) > 3 || Math.abs(B.vy) > 3) still = false;
        });
        var Ld = bodies[s.lead], syT = 1 - 0.2 * Math.min(Math.abs(Ld.vx) / 1500, 1);
        s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt; s.sy.s += s.sy.v * dt;
        if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false;
        var ddx = s.a.x - s.b.x, ddy = s.a.y - s.b.y, sep = Math.sqrt(ddx * ddx + ddy * ddy);
        var r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1));
        if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) {
          s.split = true;
          var lo2 = bodies[1 - s.lead], hi2 = bodies[s.lead];
          [0.3, 0.5, 0.72].forEach(function (t, j) {
            s.sats.push({ x: lo2.x + (hi2.x - lo2.x) * t + (Math.random() - 0.5) * 6, y: lo2.y + (hi2.y - lo2.y) * t + (Math.random() - 0.5) * 10,
              vx: (lo2.vx + hi2.vx) * 0.45, vy: (lo2.vy + hi2.vy) * 0.45 + (Math.random() - 0.5) * 60, r: 5 + Math.random() * 3 - j * 0.5, k: 70 + Math.random() * 90 });
          });
        }
        s.sats = s.sats.filter(function (d) {
          d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt; d.vy += (d.k * 0.9 * (T.y - d.y) - 7 * d.vy) * dt;
          d.x += d.vx * dt; d.y += d.vy * dt;
          d.x = Math.max(PAD + 8 + d.r, Math.min(PAD + s.w - 8 - d.r, d.x));
          d.y = Math.max(PAD + 6 + d.r, Math.min(PAD + s.h - 6 - d.r, d.y));
          if (Math.abs(T.x - d.x) < T.q + T.r * 0.5 && Math.abs(T.y - d.y) < T.r) d.r -= dt * 26;
          return d.r > 0.6;
        });
        if (s.sats.length) still = false;
      }
      if (s.moving && still) { s.moving = false; if (!reduce) s.rips.push({ x: T.x, y: T.y, age: 0, amp: s.split ? 1.2 : 0.7 }); }
      s.rips.forEach(function (p) { p.age += dt; });
      s.rips = s.rips.filter(function (p) { return p.age < 2.4; });
      s.mouse.s += ((s.mouse.on ? 1 : 0) - s.mouse.s) * Math.min(1, dt * 7);
    }

    function loop() {
      if (s.raf) return;
      s.last = performance.now();
      function tick(now) {
        var dt = Math.min((now - s.last) / 1000, 1 / 30); s.last = now;
        step(dt, now); draw();
        var busy = s.moving || s.rips.length || s.sats.length || s.mouse.s > 0.01 || s.hover;
        if (s.visible && busy && !(reduce && !s.moving)) s.raf = requestAnimationFrame(tick); else s.raf = 0;
      }
      s.raf = requestAnimationFrame(tick);
    }

    function go(el, instant) {
      if (!el) return;
      s.w = nav.offsetWidth; s.h = nav.offsetHeight;
      var T = s.t;
      T.r = el.offsetHeight / 2; T.q = Math.max(0, el.offsetWidth / 2 - T.r);
      var nx = PAD + el.offsetLeft + el.offsetWidth / 2, ny = PAD + el.offsetTop + el.offsetHeight / 2;
      s.pr = Math.min(s.h / 2, s.h > T.r * 3 ? 26 : 999);
      nav.style.borderRadius = s.pr + 'px';
      if (!s.ready || instant) {
        s.a.x = s.b.x = nx; s.a.y = s.b.y = ny; s.a.vx = s.a.vy = s.b.vx = s.b.vy = 0; s.q = T.q; s.ready = true; s.sats = [];
      } else if (Math.abs(nx - T.x) > 0.5 || Math.abs(ny - T.y) > 0.5) {
        var da = Math.hypot(nx - s.a.x, ny - s.a.y), db = Math.hypot(nx - s.b.x, ny - s.b.y);
        s.lead = da <= db ? 0 : 1; s.lagFrom = performance.now() + 70; s.moving = true; s.split = false;
      }
      T.x = nx; T.y = ny;
      var dpr = Math.min(window.devicePixelRatio || 1, 2), W = s.w + PAD * 2, Hh = s.h + PAD * 2;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) {
        cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
      }
      loop();
    }

    function local(x, y) { var r = nav.getBoundingClientRect(); return { x: x - r.left + PAD, y: y - r.top + PAD }; }

    nav.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var b = e.target.closest('.chip'); if (b && b !== s.target) { s.target = b; go(b); }
    });
    nav.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var p = local(e.clientX, e.clientY); s.mouse.x = p.x; s.mouse.y = p.y; s.mouse.on = true; s.hover = true; loop();
    });
    nav.addEventListener('pointerleave', function () { s.mouse.on = false; s.hover = false; s.target = null; go(active()); });
    nav.addEventListener('pointerdown', function (e) {
      if (reduce) return; var p = local(e.clientX, e.clientY); s.rips.push({ x: p.x, y: p.y, age: 0, amp: 0.8 }); loop();
    });
    nav.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) setTimeout(function () { s.target = b; go(b); }, 0); });
    nav.addEventListener('focusin', function (e) { var b = e.target.closest('.chip'); if (b) go(b); });
    nav.addEventListener('focusout', function () { setTimeout(function () { if (!nav.contains(document.activeElement)) go(active()); }, 0); });

    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { s.visible = en[0].isIntersecting; if (s.visible) go(active(), !s.ready); }).observe(nav);
    var lastW = -1;
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (nav.offsetWidth !== lastW) { lastW = nav.offsetWidth; go(s.target || active(), true); } }).observe(nav);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { go(active(), true); });
    go(active(), true);
  }

  function boot() { document.querySelectorAll('[data-chips], [data-cats]').forEach(Liquid); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
