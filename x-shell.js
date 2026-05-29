/* <x-shell> — drop-in animated terminal walkthroughs. Zero config.
 * Write a session in plain text, get a p10k-style zsh render, animated,
 * self-isolated in Shadow DOM. Not an emulator — you can't type in it.
 *
 * A standards custom-element name must contain a hyphen, so the tag is
 * <x-shell>. Register a different alias with XShell.register('your-name').
 *
 * Grammar (hybrid keyword verbs, implicit output):
 *   cmd:  <command>                 user types a command
 *   root: <command>                 command needing root — rendered as `sudo <command>`
 *   type: <text>                    user types a response to a prompt
 *   key:  <name>                    a keypress glyph (^C, enter, tab…)
 *   <bare line>                     stdout of the command above
 *   warning: / error: / success: / info:   semantic output flavors
 *   note: <text>                    author's aside, rendered as a shell comment: # text
 *   delay[800]:                     pause, nothing rendered
 *   spinner[2s]: label => done      spinner, then ✓ done. styles: dots|line|bar|arc|circle
 *   progress[3s]: label             progress 0→100%. styles: block|pip|wget|curl|arrow
 *   (the bracket holds a duration and/or a style, any order: progress[3s pip])
 *   clear:                          clear the screen
 *   prompt: user=… host=… dir=… branch=… git=true   change context
 *   # …                             source comment, never rendered
 *
 * Attributes: os, mode=dark|light, plugins, user, host, dir, branch, title,
 *   speed (ms/char), gap (ms the prompt blinks before typing), bar (default
 *   progress style), loop, loop-delay, controls.
 *
 * Only the reserved words above (lowercase, followed by ':') are verbs.
 * Any other `word:` is plain output. cd / git are auto-tracked in the prompt.
 */
(function () {
  'use strict';

  var RESERVED = ['cmd', 'root', 'type', 'key', 'warning', 'error', 'success',
    'info', 'note', 'delay', 'spinner', 'progress', 'clear', 'prompt'];
  var VERB_RE = new RegExp('^(' + RESERVED.join('|') + ')(?:\\[([^\\]]+)\\])?:\\s?([\\s\\S]*)$');

  var OS = {
    ubuntu: { name: 'Ubuntu', icon: '🐧', bg: '#E95420', fg: '#fff' },
    debian: { name: 'Debian', icon: '🌀', bg: '#A80030', fg: '#fff' },
    macos:  { name: 'macOS',  icon: '🍎', bg: '#5b6066', fg: '#fff' },
    arch:   { name: 'Arch',   icon: '🐧', bg: '#1793D1', fg: '#04212e' },
    fedora: { name: 'Fedora', icon: '🎩', bg: '#3C6EB4', fg: '#fff' },
    alpine: { name: 'Alpine', icon: '🏔', bg: '#0D597F', fg: '#fff' }
  };

  var PLUGINS = {
    node:   { icon: '⬡',  txt: 'v18.17.0', bg: '#3c873a', fg: '#eafff0' },
    python: { icon: '🐍', txt: 'venv',      bg: '#FFD343', fg: '#34302a' },
    docker: { icon: '🐳', txt: '24.0',      bg: '#2496ED', fg: '#fff' },
    rust:   { icon: '🦀', txt: '1.74',      bg: '#DEA584', fg: '#2b1a12' },
    go:     { icon: '🐹', txt: '1.21',      bg: '#00ADD8', fg: '#04222a' }
  };

  var COPY_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="9" y="9" width="11" height="11" rx="2"/>' +
    '<path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" ' +
    'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 6 9 17l-5-5"/></svg>';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function dur(d) {
    if (!d) return 0;
    d = String(d).trim();
    if (/ms$/.test(d)) return parseFloat(d);
    if (/s$/.test(d)) return parseFloat(d) * 1000;
    return parseFloat(d) || 0;
  }
  function isDur(tok) { return /^\d+(\.\d+)?(ms|s)?$/.test(tok); }
  function rep(ch, n) { return n > 0 ? ch.repeat(n) : ''; }
  function pct100(p) { return Math.round(p * 100); }

  var SPINS = {
    dots: '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏',
    line: '|/-\\',
    bar: '▁▃▄▅▆▇█▇▆▅▄▃',
    arc: '◜◠◝◞◡◟',
    circle: '◐◓◑◒'
  };

  // Each returns inner HTML for a progress line at fraction `pct` (0..1).
  // Styles mirror real CLI tools; the line is white-space:pre so columns align.
  var BARS = {
    block: function (pct, label) {        // tqdm / pip-modern: ' 45%|████▌     |'
      var W = 24, sub = ' ▏▎▍▌▋▊▉', cells = pct * W, fn = Math.floor(cells);
      var bar = rep('█', fn);
      if (fn < W) bar += (sub[Math.round((cells - fn) * 7)] || ' ');
      bar = (bar + rep(' ', W)).slice(0, W);
      return (label ? esc(label) + ' ' : '') +
        String(pct100(pct)).padStart(3) + '%|<span class="fc">' + bar + '</span>|';
    },
    pip: function (pct, label) {           // pip (rich): '━━━━━╸━━━━ 45%'
      var W = 26, done = Math.round(pct * W), head = (done > 0 && done < W) ? '╸' : '';
      return (label ? esc(label) + ' ' : '') +
        '<span class="fc">' + rep('━', head ? done - 1 : done) + head + '</span>' +
        '<span class="rc">' + rep('━', W - done) + '</span> ' +
        '<span class="fc">' + pct100(pct) + '%</span>';
    },
    wget: function (pct, label) {          // wget: ' 45% [=========>      ]'
      var W = 30, done = Math.round(pct * W);
      var bar = rep('=', Math.max(0, done - 1)) +
        (done > 0 ? (done < W ? '>' : '=') : '') + rep(' ', W - done);
      return String(pct100(pct)).padStart(3) + '% [' + bar.slice(0, W) + ']' +
        (label ? '  ' + esc(label) : '');
    },
    curl: function (pct, label) {          // curl: '######          45.0%'
      var W = 40, done = Math.round(pct * W);
      return rep('#', done) + rep(' ', W - done) + ' ' + (pct * 100).toFixed(1) + '%';
    },
    arrow: function (pct, label) {         // cargo / generic: '[====>     ] 45%'
      var W = 24, done = Math.round(pct * W);
      var bar = rep('=', Math.max(0, done - 1)) +
        (done > 0 ? (done < W ? '>' : '=') : '') + rep(' ', W - done);
      return (label ? esc(label) + ' ' : '') + '[' + bar.slice(0, W) + '] ' + pct100(pct) + '%';
    }
  };

  // ---- parsing -------------------------------------------------------------

  function dedent(raw) {
    var lines = raw.replace(/\t/g, '  ').replace(/\r/g, '').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var indents = lines.filter(function (l) { return l.trim(); })
      .map(function (l) { return l.match(/^ */)[0].length; });
    var min = indents.length ? Math.min.apply(null, indents) : 0;
    return lines.map(function (l) { return l.slice(min); });
  }

  function classify(line) {
    if (/^#(\s|$)/.test(line)) return null;            // source comment
    var m = line.match(VERB_RE);
    if (!m) return { verb: 'out', text: line };
    var item = { verb: m[1], dur: null, style: null, text: m[3] };
    if (m[2]) {
      m[2].split(/[\s,]+/).forEach(function (tok) {
        if (!tok) return;
        if (isDur(tok)) item.dur = tok; else item.style = tok;
      });
    }
    if (item.verb === 'spinner') {
      var i = item.text.indexOf('=>');
      if (i >= 0) {
        item.done = item.text.slice(i + 2).trim();
        item.text = item.text.slice(0, i).trim();
      }
    }
    return item;
  }

  // ---- element -------------------------------------------------------------

  class Term extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      var raw = this.textContent || '';
      this.items = dedent(raw).map(classify).filter(Boolean);

      this.reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._fast = this.reduced;
      this.speed = dur(this.getAttribute('speed')) || 34;   // ms per char (avg)
      this.gap = this.hasAttribute('gap') ? dur(this.getAttribute('gap')) : 900;
      this.barStyle = this.getAttribute('bar') || 'block';
      this.heightAttr = this.getAttribute('height');
      this.rowsAttr = this.getAttribute('rows');
      this.loopOn = this.hasAttribute('loop');
      this.loopDelay = dur(this.getAttribute('loop-delay')) || 1400;
      this.controlsOn = this.hasAttribute('controls');

      this.idx = 0;
      this.playing = false;
      this.state = 'idle';
      this._kill = null;
      this._run = 0;
      this.ctx = this.makeCtx();

      this.build();
      this.observe();
    }

    makeCtx() {
      var a = this.getAttribute.bind(this);
      return {
        user: a('user') || 'you',
        host: a('host') || 'localhost',
        dir: a('dir') || '~',
        branch: a('branch') || 'main',
        git: false,
        venv: null,
        os: (a('os') || 'ubuntu').toLowerCase(),
        plugins: (a('plugins') || '').split(',').map(function (s) { return s.trim(); })
          .filter(Boolean)
      };
    }

    allCommands() {
      return this.items.filter(function (it) {
        return it.verb === 'cmd' || it.verb === 'root';
      }).map(function (it) {
        var t = it.text;
        if (it.verb === 'root' && !/^\s*sudo\b/.test(t)) t = 'sudo ' + t;
        return t;
      }).join('\n');
    }

    build() {
      var sh = this.attachShadow({ mode: 'open' });
      var title = this.getAttribute('title') ||
        (this.ctx.user + '@' + this.ctx.host + ': ' + this.ctx.dir);
      var light = (this.getAttribute('mode') || 'dark') === 'light';

      sh.innerHTML =
        '<style>' + Term.css + '</style>' +
        '<div class="win' + (light ? ' light' : '') + '" part="window">' +
          '<div class="bar"><span class="dot r"></span><span class="dot y"></span>' +
            '<span class="dot g"></span><span class="title">' + esc(title) + '</span>' +
            '<button class="copy-all" title="Copy all commands">' + COPY_SVG + '</button></div>' +
          '<div class="screen" part="screen"></div>' +
          (this.controlsOn ?
            '<div class="ctl" part="controls">' +
              '<button class="c-prev" title="Step back">⏮</button>' +
              '<button class="c-play" title="Play">▶</button>' +
              '<button class="c-next" title="Step forward">⏭</button>' +
              '<button class="c-replay" title="Replay">↻</button>' +
              '<span class="c-status"></span>' +
            '</div>' : '') +
        '</div>';
      this.screen = sh.querySelector('.screen');

      // Fixed size: the screen keeps its height and scrolls internally (with
      // auto-scroll to the latest line), so growing content never reflows the
      // page. `rows` wins over `height`; height accepts a bare px number or any
      // CSS length.
      if (this.rowsAttr) {
        this.screen.style.height = (parseFloat(this.rowsAttr) * 1.55).toFixed(3) + 'em';
        this.screen.style.maxHeight = 'none';
      } else if (this.heightAttr) {
        this.screen.style.height =
          /^\d+(\.\d+)?$/.test(this.heightAttr) ? this.heightAttr + 'px' : this.heightAttr;
        this.screen.style.maxHeight = 'none';
      }

      var self = this;
      var ca = sh.querySelector('.copy-all');
      ca.onmousedown = function (e) { e.preventDefault(); };
      ca.onclick = function () {
        if (navigator.clipboard) navigator.clipboard.writeText(self.allCommands());
        ca.innerHTML = CHECK_SVG;
        ca.classList.add('copied');
        setTimeout(function () { ca.innerHTML = COPY_SVG; ca.classList.remove('copied'); }, 1200);
      };

      if (this.controlsOn) {
        this.$prev = sh.querySelector('.c-prev');
        this.$play = sh.querySelector('.c-play');
        this.$next = sh.querySelector('.c-next');
        this.$status = sh.querySelector('.c-status');
        this.$prev.onclick = function () { self.stepBack(); };
        this.$next.onclick = function () { self.stepForward(); };
        this.$play.onclick = function () { self.playing ? self.pause() : self.play(); };
        sh.querySelector('.c-replay').onclick = function () { self.replay(); };
        this.updateControls();
      }
    }

    observe() {
      var self = this;
      if (!('IntersectionObserver' in window)) { this.play(); return; }
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (e.isIntersecting) { io.disconnect(); self.play(); }
        });
      }, { threshold: 0.25 });
      io.observe(this);
    }

    // ---- transport ---------------------------------------------------------

    // Any transport action bumps _run, invalidating in-flight chains so two
    // loops can never advance at once (killing an effect resolves its promise,
    // which would otherwise resume a superseded chain).
    play() {
      clearTimeout(this._loopTimer);
      if (this._kill) this._kill();
      if (this.idx >= this.items.length) return this.replay();
      this.playing = true;
      this.state = 'playing';
      this.updateControls();
      this.loopStep(++this._run);
    }

    pause() {
      this.playing = false;
      this.state = 'paused';
      this._run++;
      if (this._kill) this._kill();
      this.updateControls();
    }

    replay() {
      clearTimeout(this._loopTimer);
      if (this._kill) this._kill();
      this.screen.innerHTML = '';
      this.ctx = this.makeCtx();
      this.idx = 0;
      this.playing = true;
      this.state = 'playing';
      this.updateControls();
      this.loopStep(++this._run);
    }

    stepForward() {
      clearTimeout(this._loopTimer);
      this.playing = false;
      this._run++;
      if (this._kill) this._kill();
      if (this.idx < this.items.length) this.renderItem(this.items[this.idx++], true);
      this.state = this.idx >= this.items.length ? 'done' : 'paused';
      this.updateControls();
    }

    stepBack() {
      clearTimeout(this._loopTimer);
      this.playing = false;
      this._run++;
      if (this._kill) this._kill();
      this.idx = Math.max(0, this.idx - 1);
      this.rebuild(this.idx);
      this.state = this.idx === 0 ? 'idle' : 'paused';
      this.updateControls();
    }

    rebuild(n) {
      this.screen.innerHTML = '';
      this.ctx = this.makeCtx();
      for (var i = 0; i < n; i++) this.renderItem(this.items[i], true);
    }

    loopStep(run) {
      var self = this;
      if (run !== this._run || !this.playing) return;
      if (this.idx >= this.items.length) return this.onEnd();
      var it = this.items[this.idx++];
      this.updateControls();
      Promise.resolve(this.renderItem(it, false)).then(function () {
        if (run !== self._run) return;
        if (self.playing) self.loopStep(run); else self.updateControls();
      });
    }

    onEnd() {
      this.playing = false;
      this.state = 'done';
      if (this.loopOn) {
        var self = this;
        this.updateControls();
        this._loopTimer = setTimeout(function () { self.replay(); }, this.loopDelay);
      } else {
        this.finishIdle();
        this.updateControls();
      }
    }

    finishIdle() {
      var typed = this.promptBlock(false);
      typed.parentNode.querySelector('.cursor').classList.add('idle');
    }

    updateControls() {
      if (!this.controlsOn) return;
      this.$play.textContent = this.playing ? '⏸' : '▶';
      this.$play.title = this.playing ? 'Pause' : (this.state === 'done' ? 'Replay' : 'Play');
      this.$prev.disabled = this.idx <= 0;
      this.$next.disabled = this.idx >= this.items.length;
      this.$status.textContent = Math.min(this.idx, this.items.length) + ' / ' + this.items.length;
    }

    // ---- cancelable timing -------------------------------------------------

    wait(ms) {
      if (this._fast || ms <= 0) return Promise.resolve();
      var self = this, timer;
      return new Promise(function (resolve) {
        function finish() { clearTimeout(timer); self._kill = null; resolve(); }
        self._kill = finish;
        timer = setTimeout(finish, ms);
      });
    }

    // ---- prompt rendering --------------------------------------------------

    segments() {
      var c = this.ctx, os = OS[c.os] || OS.ubuntu, segs = [];
      segs.push({ html: os.icon + ' ' + os.name, bg: os.bg, fg: os.fg });
      segs.push({ html: '📁 ' + esc(c.dir), bg: '#2a6df4', fg: '#fff' });
      if (c.git) segs.push({ html: '⎇ ' + esc(c.branch), bg: '#3fb950', fg: '#04210d' });
      c.plugins.forEach(function (p) {
        var d = PLUGINS[p];
        if (!d) return;
        if (p === 'python') {                 // only shown once a venv is activated
          if (c.venv) segs.push({ html: d.icon + ' ' + esc(c.venv), bg: d.bg, fg: d.fg });
        } else {
          segs.push({ html: d.icon + ' ' + d.txt, bg: d.bg, fg: d.fg });
        }
      });
      return segs;
    }

    promptBar() {
      var segs = this.segments(), out = '';
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        out += '<span class="seg" style="background:' + s.bg + ';color:' + s.fg + '">' +
          s.html + '</span>';
        var next = segs[i + 1] ? segs[i + 1].bg : 'transparent';
        out += '<span class="sep" style="--prev:' + s.bg + ';--next:' + next + '"></span>';
      }
      return '<div class="pbar">' + out + '</div>';
    }

    promptBlock() {
      var block = document.createElement('div');
      block.className = 'block';
      block.innerHTML = this.promptBar() +
        '<div class="pline"><span class="pchar">❯</span>' +
        '<span class="typed"></span><span class="cursor"></span></div>';
      this.screen.appendChild(block);
      this.scroll();
      return block.querySelector('.typed');
    }

    addCopy(typed, text) {
      var btn = document.createElement('button');
      btn.className = 'copy';
      btn.type = 'button';
      btn.title = 'Copy command';
      btn.innerHTML = COPY_SVG;
      btn.onmousedown = function (e) { e.preventDefault(); };
      btn.onclick = function () {
        if (navigator.clipboard) navigator.clipboard.writeText(text);
        btn.innerHTML = CHECK_SVG;
        btn.classList.add('copied');
        setTimeout(function () { btn.innerHTML = COPY_SVG; btn.classList.remove('copied'); }, 1200);
      };
      typed.parentNode.appendChild(btn);
    }

    // ---- effects -----------------------------------------------------------

    line(text, cls) {
      var el = document.createElement('div');
      el.className = 'out ' + (cls || '');
      el.textContent = text;
      this.screen.appendChild(el);
      this.scroll();
      return el;
    }

    note(text) {                              // rendered as a shell comment: # text
      var el = document.createElement('div');
      el.className = 'out comment';
      el.textContent = '# ' + text;
      this.screen.appendChild(el);
      this.scroll();
    }

    keycap(text) {
      var map = { enter: '⏎', tab: '⇥', esc: '⎋', space: '␣', up: '↑', down: '↓' };
      var label = map[text.toLowerCase()] || text;
      var el = document.createElement('div');
      el.className = 'out keys';
      el.innerHTML = '<span class="keycap">' + esc(label) + '</span>';
      this.screen.appendChild(el);
      this.scroll();
    }

    typeInto(el, text) {
      var self = this;
      if (this._fast) { el.textContent = text; return Promise.resolve(); }
      var chars = Array.from(text), i = 0, timer;
      return new Promise(function (resolve) {
        function finish() { clearTimeout(timer); el.textContent = text; self._kill = null; resolve(); }
        self._kill = finish;
        (function step() {
          if (i >= chars.length) { self._kill = null; return resolve(); }
          el.textContent += chars[i++];
          self.scroll();
          timer = setTimeout(step, self.speed * (0.6 + Math.random() * 0.8));
        })();
      });
    }

    command(text, root) {
      if (root && !/^\s*sudo\b/.test(text)) text = 'sudo ' + text;
      var self = this;
      if (this._fast) {
        var ftyped = this.promptBlock();
        this.addCopy(ftyped, text);
        ftyped.textContent = text;
        var c = ftyped.parentNode.querySelector('.cursor');
        if (c) c.remove();
        this.track(text);
        return Promise.resolve();
      }
      // Show the prompt with a blinking cursor first and dwell so it blinks at
      // least once, THEN start typing — reads as human, not robotic.
      var typed = this.promptBlock();
      this.addCopy(typed, text);
      var cursor = typed.parentNode.querySelector('.cursor');
      this.scroll();
      return this.wait(this.gap).then(function () {
        return self.typeInto(typed, text);
      }).then(function () {
        if (cursor) cursor.remove();
        self.track(text);
        return self.wait(260);
      });
    }

    response(text) {
      var last = this.screen.lastElementChild;
      var inline = last && last.classList.contains('out') &&
        !last.classList.contains('keys') && !last.classList.contains('spin') &&
        !last.classList.contains('prog');
      var host;
      if (inline) {
        host = last;
        if (host.textContent && !/\s$/.test(host.textContent))
          host.appendChild(document.createTextNode(' '));
      } else {
        host = document.createElement('div');
        host.className = 'out resp';
        this.screen.appendChild(host);
      }
      var typed = document.createElement('span');
      host.appendChild(typed);
      if (this._fast) { typed.textContent = text; this.scroll(); return Promise.resolve(); }
      var cursor = document.createElement('span');
      cursor.className = 'cursor';
      host.appendChild(cursor);
      this.scroll();
      var self = this;
      return this.typeInto(typed, text).then(function () {
        cursor.remove(); return self.wait(160);
      });
    }

    spinner(label, ms, done, style) {
      var frames = SPINS[style] || SPINS.dots, el = this.line('', 'spin'), self = this;
      var finalHTML = '<span class="tick">✓</span> ' + esc(done || label);
      if (this._fast || ms <= 0) { el.innerHTML = finalHTML; return Promise.resolve(); }
      return new Promise(function (resolve) {
        var start = performance.now(), fi = 0, timer;
        function finish() { clearInterval(timer); el.innerHTML = finalHTML; self._kill = null; resolve(); }
        self._kill = finish;
        timer = setInterval(function () {
          if (performance.now() - start >= ms) return finish();
          el.innerHTML = '<span class="glyph">' + frames[fi++ % frames.length] +
            '</span> ' + esc(label);
          self.scroll();
        }, 80);
      });
    }

    progress(label, ms, style) {
      style = (style && BARS[style]) ? style : (BARS[this.barStyle] ? this.barStyle : 'block');
      var draw = BARS[style], el = this.line('', 'prog prog-' + style), self = this;
      function render(pct) { el.innerHTML = draw(pct, label); }
      if (this._fast || ms <= 0) { render(1); return Promise.resolve(); }
      render(0);
      return new Promise(function (resolve) {
        var start = performance.now(), timer;
        function finish() { clearInterval(timer); render(1); self._kill = null; resolve(); }
        self._kill = finish;
        timer = setInterval(function () {
          var pct = Math.min(1, (performance.now() - start) / ms);
          if (pct >= 1) return finish();
          render(pct); self.scroll();
        }, 60);
      });
    }

    // ---- context tracking --------------------------------------------------

    track(cmd) {
      var self = this;
      cmd.split(/&&|\|\||;/).forEach(function (part) {
        var cd = part.match(/^\s*cd\s+(.+?)\s*$/);
        if (cd) self.applyCd(cd[1].replace(/['"]/g, ''));
      });
      if (/\bgit\s+(init|clone)\b/.test(cmd)) {
        this.ctx.git = true;
        if (!this.ctx.branch) this.ctx.branch = 'main';
      }
      var co = cmd.match(/\bgit\s+(?:checkout\s+-b|switch\s+-c|checkout|switch)\s+([^\s]+)/);
      if (co) { this.ctx.git = true; this.ctx.branch = co[1]; }

      // python virtualenv — only show the segment once activated
      var act = cmd.match(/(?:source|\.)\s+(\S+?)\/bin\/activate/);
      if (act) this.ctx.venv = act[1].split('/').pop();
      var conda = cmd.match(/\b(?:conda|mamba)\s+activate\s+(\S+)/);
      if (conda) this.ctx.venv = conda[1];
      var workon = cmd.match(/\bworkon\s+(\S+)/);
      if (workon) this.ctx.venv = workon[1];
      if (/\bdeactivate\b/.test(cmd)) this.ctx.venv = null;
    }

    applyCd(arg) {
      if (!arg || arg === '~' || arg === '$HOME') { this.ctx.dir = '~'; return; }
      if (arg === '-') return;
      if (arg === '..') {
        var parts = this.ctx.dir.split('/');
        if (parts.length > 1) parts.pop();
        this.ctx.dir = parts.join('/') || '/';
        return;
      }
      if (arg.charAt(0) === '/' || arg.indexOf('~/') === 0) { this.ctx.dir = arg; return; }
      this.ctx.dir = (this.ctx.dir === '~' ? '~' : this.ctx.dir.replace(/\/$/, '')) +
        '/' + arg;
    }

    applyPrompt(text) {
      var c = this.ctx;
      text.split(/\s+/).forEach(function (tok) {
        var kv = tok.split('=');
        if (kv.length !== 2) return;
        var k = kv[0], v = kv[1];
        if (k === 'git') c.git = v !== 'false';
        else if (['user', 'host', 'dir', 'branch'].indexOf(k) >= 0) c[k] = v;
      });
    }

    scroll() { this.screen.scrollTop = this.screen.scrollHeight; }

    // ---- render one item ---------------------------------------------------

    renderItem(it, instant) {
      this._fast = this.reduced || instant;
      var stream = this._fast ? 0 : 90;
      switch (it.verb) {
        case 'cmd': return this.command(it.text, false);
        case 'root': return this.command(it.text, true);
        case 'type': return this.response(it.text);
        case 'key': this.keycap(it.text); return this.wait(stream);
        case 'out': this.line(it.text, 'stdout'); return this.wait(stream);
        case 'warning': this.line(it.text, 'warn'); return this.wait(stream);
        case 'error': this.line(it.text, 'err'); return this.wait(stream);
        case 'success': this.line(it.text, 'ok'); return this.wait(stream);
        case 'info': this.line(it.text, 'info'); return this.wait(stream);
        case 'note': this.note(it.text); return this.wait(this._fast ? 0 : 200);
        case 'delay': return this.wait(dur(it.dur));
        case 'spinner': return this.spinner(it.text, dur(it.dur), it.done, it.style);
        case 'progress': return this.progress(it.text, dur(it.dur), it.style);
        case 'clear': this.screen.innerHTML = ''; return Promise.resolve();
        case 'prompt': this.applyPrompt(it.text); return Promise.resolve();
      }
      return Promise.resolve();
    }
  }

  Term.css = [
    ':host{display:block;margin:1.2em 0;--bg:#1a1b26;--fg:#c0caf5;--muted:#565f89;',
    '--font:"SFMono-Regular",ui-monospace,"Cascadia Code","JetBrains Mono",Menlo,Consolas,monospace;',
    'font-family:var(--font);}',
    '.win{background:var(--bg);border-radius:10px;overflow:hidden;',
    'box-shadow:0 18px 50px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.3);font-size:13.5px;line-height:1.55;}',
    '.win.light{--bg:#fafafa;--fg:#2b2b3a;--muted:#9aa0b4;}',
    '.bar{display:flex;align-items:center;gap:7px;padding:9px 13px;position:relative;',
    'background:linear-gradient(#2a2c3f,#23243456);border-bottom:1px solid rgba(255,255,255,.05);}',
    '.win.light .bar{background:linear-gradient(#ededed,#e2e2e2);border-bottom:1px solid rgba(0,0,0,.07);}',
    '.dot{width:12px;height:12px;border-radius:50%;display:inline-block;}',
    '.dot.r{background:#ff5f57}.dot.y{background:#febc2e}.dot.g{background:#28c840}',
    '.title{flex:1;text-align:center;color:var(--muted);font-size:12px;',
    'margin-right:36px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.screen{padding:14px 16px 18px;max-height:520px;overflow:auto;color:var(--fg);',
    'box-sizing:border-box;white-space:pre-wrap;word-break:break-word;}',
    '.block{margin:.15em 0 .1em;}',
    '.pbar{display:flex;align-items:stretch;line-height:1.7;width:max-content;max-width:100%;',
    'font-size:12.5px;border-radius:3px;overflow:hidden;}',
    '.seg{display:flex;align-items:center;padding:0 .7em;font-weight:600;white-space:nowrap;}',
    '.sep{width:.62em;align-self:stretch;background:var(--next);position:relative;flex:0 0 auto;}',
    '.sep::before{content:"";position:absolute;inset:0;background:var(--prev);',
    'clip-path:polygon(0 0,0 100%,100% 50%);}',
    '.pline{display:flex;align-items:baseline;flex-wrap:wrap;position:relative;padding-right:34px;}',
    '.pchar{color:#9ece6a;font-weight:700;margin-right:.55em;}',
    '.typed{white-space:pre-wrap;}',
    '.copy-all{position:absolute;right:9px;top:50%;transform:translateY(-50%);',
    'display:inline-flex;align-items:center;justify-content:center;width:26px;height:22px;',
    'padding:0;border-radius:6px;cursor:pointer;color:var(--fg);background:rgba(127,127,127,.16);',
    'border:1px solid rgba(127,127,127,.28);opacity:0;transition:opacity .12s;}',
    '.win:hover .copy-all{opacity:.6;}',
    '.copy-all:hover{opacity:1;background:rgba(127,127,127,.3);}',
    '.copy-all.copied{color:#9ece6a;opacity:1;}',
    '.copy{position:absolute;right:0;top:-1px;display:inline-flex;align-items:center;',
    'justify-content:center;width:24px;height:21px;padding:0;border-radius:5px;cursor:pointer;',
    'color:var(--fg);background:rgba(127,127,127,.16);border:1px solid rgba(127,127,127,.28);',
    'opacity:0;transition:opacity .12s;}',
    '.block:hover .copy{opacity:.7;}',
    '.copy:hover{opacity:1;background:rgba(127,127,127,.3);}',
    '.copy.copied{color:#9ece6a;opacity:1;}',
    '.cursor{display:inline-block;width:.55em;height:1.05em;background:var(--fg);',
    'margin-left:1px;transform:translateY(.18em);animation:blink 1.05s steps(1) infinite;}',
    '.cursor.idle{opacity:.8;}',
    '@keyframes blink{50%{opacity:0;}}',
    '.out{white-space:pre-wrap;animation:fadein .18s ease both;}',
    '@keyframes fadein{from{opacity:0;transform:translateY(2px);}to{opacity:1;transform:none;}}',
    '.out.warn{color:#e0af68;}',
    '.out.err{color:#f7768e;}',
    '.out.ok{color:#9ece6a;}',
    '.out.info{color:#7dcfff;}',
    '.out.resp{color:var(--fg);}',
    '.spin .glyph{color:#7aa2f7;}',
    '.spin .tick,.out.ok .tick{color:#9ece6a;font-weight:700;}',
    '.out.prog{white-space:pre;}',
    '.prog .fc{color:#7aa2f7;}',
    '.prog .rc{color:#414868;}',
    '.win.light .prog .rc{color:#c4c8d4;}',
    '.prog-pip .fc{color:#9ece6a;}',
    '.out.comment{color:#6a9955;}',
    '.win.light .out.comment{color:#5a8a3a;}',
    '.keys .keycap{display:inline-block;padding:.05em .5em;border-radius:4px;',
    'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);',
    'box-shadow:0 1px 0 rgba(255,255,255,.1) inset,0 1px 2px rgba(0,0,0,.4);',
    'font-size:.85em;color:var(--fg);}',
    '.ctl{display:flex;align-items:center;gap:3px;padding:6px 10px;',
    'background:rgba(0,0,0,.28);border-top:1px solid rgba(255,255,255,.06);}',
    '.win.light .ctl{background:rgba(0,0,0,.05);border-top:1px solid rgba(0,0,0,.08);}',
    '.ctl button{background:transparent;border:0;color:var(--fg);font-size:13px;cursor:pointer;',
    'padding:3px 8px;border-radius:5px;line-height:1;opacity:.75;transition:opacity .1s,background .1s;}',
    '.ctl button:hover{background:rgba(127,127,127,.18);opacity:1;}',
    '.ctl button:disabled{opacity:.28;cursor:default;background:transparent;}',
    '.ctl .c-status{margin-left:auto;color:var(--muted);font-size:11px;',
    'font-variant-numeric:tabular-nums;}',
    '.screen::-webkit-scrollbar{width:9px;height:9px;}',
    '.screen::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:9px;}'
  ].join('');

  // Theme registry hook (for later): Term.theme('name', { bg, fg, muted, ... })
  Term.themes = {};
  Term.theme = function (name, vars) { Term.themes[name] = vars; };
  Term.register = function (tag) {
    if (!customElements.get(tag)) customElements.define(tag, Term);
  };

  Term.register('x-shell');
  window.XShell = Term;
})();
