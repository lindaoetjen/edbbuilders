(function () {
  // ---------- FAQ search and categories ----------
  var q = document.getElementById('q');
  var groups = [].slice.call(document.querySelectorAll('.faq-group'));
  var empty = document.querySelector('.faq-empty');
  var cat = 'all';
  function filter() {
    var term = (q.value || '').trim().toLowerCase();
    var shown = 0;
    groups.forEach(function (g) {
      var inCat = cat === 'all' || g.getAttribute('data-group') === cat;
      var any = 0;
      g.querySelectorAll('details').forEach(function (d) {
        var hit = inCat && (!term || d.getAttribute('data-q').indexOf(term) > -1);
        d.hidden = !hit; if (hit) any++;
        if (term && hit) d.open = true; else if (!term) d.open = false;
      });
      g.hidden = !any; shown += any;
      if (any) g.classList.add('revealed');
    });
    empty.hidden = shown > 0;
  }
  q.addEventListener('input', filter);
  document.querySelector('[data-cats]').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    cat = b.getAttribute('data-c');
    this.querySelectorAll('.chip').forEach(function (c) { var on = c === b; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    filter();
  });

  // ---------- assistant ----------
  var KB = document.getElementById('kb').textContent;
  var log = document.getElementById('log');
  var form = document.getElementById('ask');
  var input = document.getElementById('msg');
  var sendBtn = form.querySelector('button');
  var history = [];
  var busy = false;
  var samplePromise = (window.claude && window.claude.use) ? window.claude.use('sample') : Promise.resolve(null);

  var RULES = [
    'You are the friendly website assistant for EDB Builders and Consulting, a general contractor based in Sacramento serving the greater part of Northern California.',
    'Write like a helpful person from the EDB office: warm, natural and complete. Usually 3 to 6 sentences in plain text, no markdown. Answer the actual question first, then add the most useful related detail from the facts, then a short friendly next step.',
    'For anything about EDB (services, prices, process, models, finishes, licensing, contact), use ONLY the facts below. Never invent prices, measurements, square footage, timelines, warranties, guarantees, discounts, staff names, certifications or services that are not listed.',
    'Never answer with a bare "I cannot answer that" or "I do not know". If the facts do not fully cover the question, say kindly that you looked into it and are not certain, share whatever related facts you do have, explain that you would rather not guess about their project, and warmly suggest talking to a real person at EDB: call or text (916) 360-0445, Monday to Friday 9 am to 5 pm, or send a message through the Contact page.',
    'You may explain general building, ADU, remodeling, pool or concrete concepts in plain language, but say when something is general information rather than EDB-specific, and suggest confirming the details for their own lot with EDB.',
    'When the visitor sounds ready to start, invite them to book a free consultation through the Contact page or by phone.',
    'Reply in the language the visitor writes in.'
  ].join('\n');

  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function bubble(cls, text) {
    var d = document.createElement('div'); d.className = 'msg ' + cls; d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function setBusy(v) { busy = v; sendBtn.disabled = v; input.disabled = v; }

  // offline fallback: closest FAQ answer by word overlap
  var faqs = [].slice.call(document.querySelectorAll('#faq details')).map(function (d) {
    return { q: d.querySelector('summary').childNodes[0].textContent, a: d.querySelector('p').textContent };
  });
  var STOP = ['the','and','for','you','your','does','what','how','can','are','with','that','this','have','who','why','which','about','there','any','its','our'];
  var SYN = { much: 'cost', price: 'cost', prices: 'cost', pricing: 'cost', expensive: 'cost', costs: 'cost', budget: 'cost', loan: 'financing', finance: 'financing', permit: 'permits', permitting: 'permits', deck: 'deck', decks: 'deck', area: 'where', areas: 'where', located: 'where', office: 'office' };
  function toks(t) { return (t.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(function (w) { return STOP.indexOf(w) < 0; }).map(function (w) { return SYN[w] || w.replace(/s$/, ''); }); }
  var GEN = ['build','builder','adu','edb','house','home','project','my','lot','want','need','offer','get','like','would','could','will','tell','know','possible','help','please','yard','property'];
  function ranked(text) {
    var words = toks(text);
    return faqs.map(function (f) {
      var tq = toks(f.q), ta = toks(f.a), s = 0;
      words.forEach(function (w) { if (tq.indexOf(w) > -1) s += 3; if (ta.indexOf(w) > -1) s += 1; });
      var key = words.filter(function (w) { return GEN.indexOf(w) < 0; });
      var hit = key.filter(function (w) { return tq.indexOf(w) > -1 || ta.indexOf(w) > -1; }).length;
      return { f: f, s: s, cov: key.length ? hit / key.length : 1 };
    }).filter(function (x) { return x.s > 1; }).sort(function (a, b) { return b.s - a.s; });
  }
  function closest(text) { var r = ranked(text); return r.length ? r[0].f : null; }
  var CALL = 'call or text (916) 360-0445, Monday to Friday from 9 am to 5 pm, or send a few lines through the Contact page';
  function offline(text) {
    var t = text.toLowerCase().trim();
    if (/^(hi|hey|hello|hola|hallo|good (morning|afternoon|evening))\b/.test(t) && t.length < 30)
      return 'Hi, and welcome! I can help with questions about EDB\'s ADU models, custom homes, remodels, pools and concrete, as well as financing, permits and how a build is managed from start to finish. What are you thinking of building?';
    if (/(thank|thanks|gracias|danke)/.test(t) && t.length < 40)
      return 'You are very welcome. If anything else comes up, just ask here. And whenever you would like to talk your project through with the team, you can ' + CALL + '.';
    var r = ranked(text);
    if (r.length && r[0].cov < 0.6) {
      return 'I looked into this and I am not completely sure I can answer it properly, so I do not want to guess. The closest thing I have is this: ' + r[0].f.a + '\n\nFor your exact question it is best to speak with a real person at EDB, who can tell you what is possible for your lot. You can ' + CALL + '.';
    }
    if (r.length) {
      var out = 'Good question. ' + r[0].f.a;
      if (r[1] && r[1].cov >= 0.6 && r[1].s >= Math.max(4, r[0].s * 0.8)) out += '\n\nIt may also help to know: ' + r[1].f.a;
      out += '\n\nEvery lot and project is a little different, so if you would like this looked at for your own property, the team is happy to help. You can ' + CALL + '.';
      return out;
    }
    return 'I had a look through everything I know about EDB, and I am honestly not certain about this one. I would rather not guess and give you something that does not fit your project.\n\nThis is a great question for a real person on the team, who can look at your lot and your plans and give you a proper answer. You can ' + CALL + ', and they will get back to you.\n\nIn the meantime, I am happy to help with things like the ten ADU models, financing options, the permit process or how EDB manages a build.';
  }
  function ask(text) {
    if (busy || !text.trim()) return;
    document.getElementById('sugg').hidden = true;
    bubble('me', text);
    history.push({ role: 'user', content: text });
    setBusy(true);
    var out = bubble('ai', '…');
    samplePromise.then(function (sample) {
      if (!sample) {
        var reply = offline(text);
        out.textContent = reply; history.push({ role: 'assistant', content: reply }); setBusy(false); return;
      }
      var msgs = history.map(function (m, i) {
        return i === 0 ? { role: 'user', content: RULES + '\n\n' + KB + '\n\nVisitor: ' + m.content } : m;
      });
      sample(msgs, { cache: false, modelTier: 'default', onText: function (e) { out.textContent = e.text; log.scrollTop = log.scrollHeight; } })
        .then(function (r) { out.textContent = r.text; history.push({ role: 'assistant', content: r.text }); })
        .catch(function (err) {
          var reply = (err && err.code === 'rate_limited') ? 'I am getting a lot of questions at the moment, so let me give you what I have. ' + offline(text) : offline(text);
          out.textContent = reply; history.push({ role: 'assistant', content: reply });
        })
        .then(function () { setBusy(false); input.focus(); });
    });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); var t = input.value; input.value = ''; ask(t); });
  document.getElementById('sugg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ask(b.textContent); });
})();
