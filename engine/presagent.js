/*!
 * presagent 1.0.0
 * Copyright 2026 G-J van Rooyen
 * SPDX-License-Identifier: MIT
 *
 * Single-page deck engine. Themes own the markup and CSS; this file owns
 * the behaviour. Do not change keyboard handling, the hash, notes, the
 * presenter channel, the audio-output picker, or the fullscreen wake lock
 * to suit a theme. See SKILL.md.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Presagent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  var KEYS = [
    ['\u2190 / \u2192', 'Previous / next slide'],
    ['Space', 'Play or pause clip, or next slide'],
    ['PgUp / PgDn', 'Previous / next slide'],
    ['Home / End', 'First / last slide'],
    ['F', 'Fullscreen'],
    ['N', 'Speaker notes'],
    ['P', 'Presenter view'],
    ['S', 'Audio output'],
    ['?', 'This list (H also works)'],
    ['Esc', 'Close overlays']
  ];

  var MSG_STATE = 'presagent-presenter';
  var MSG_CMD = 'presagent-presenter-cmd';
  var MSG_READY = 'presagent-presenter-ready';

  var THEME_VARS = [
    '--pa-bg', '--pa-fg', '--pa-muted', '--pa-accent', '--pa-card', '--pa-card-fg',
    '--pa-line', '--pa-overlay', '--pa-font', '--pa-font-display', '--pa-radius', '--pa-danger'
  ];

  var active = null;

  function esc(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch];
    });
  }

  function plainTitle(slide, index) {
    var raw = (slide && (slide.title || slide.headline || slide.caption || slide.docSection)) || ('Slide ' + index);
    return String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function normalizeCue(entry) {
    if (entry == null) return null;
    if (typeof entry === 'string') {
      var mark = entry.match(/\*\*([^*]+)\*\*/);
      return { text: entry.replace(/\*\*/g, ''), bold: mark ? mark[1] : '' };
    }
    if (typeof entry === 'object') {
      return { text: String(entry.text || ''), bold: String(entry.bold || '') };
    }
    return null;
  }

  function cueList(slide) {
    var raw = slide && Array.isArray(slide.cueNotes) ? slide.cueNotes : [];
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var cue = normalizeCue(raw[i]);
      if (cue && cue.text) out.push(cue);
    }
    return out;
  }

  function notesHtml(slide) {
    var cues = cueList(slide);
    if (!cues.length) return '<p class="notes-empty">(No speaker notes for this slide.)</p>';
    var items = cues.map(function (cue) {
      var bold = cue.bold;
      var text = cue.text;
      var at = bold ? text.indexOf(bold) : -1;
      var inner = at >= 0
        ? esc(text.slice(0, at)) + '<strong>' + esc(bold) + '</strong>' + esc(text.slice(at + bold.length))
        : esc(text);
      return '<li>' + inner + '</li>';
    });
    return '<ul>' + items.join('') + '</ul>';
  }

  function youtubeIdOf(slide) {
    var raw = String((slide && (slide.youtubeId || slide.youtube)) || '');
    var match = raw.match(/(?:youtu\.be\/|embed\/|watch\?v=|shorts\/)([A-Za-z0-9_-]{6,})/);
    if (match) return match[1];
    var loose = raw.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    return loose ? loose[1] : raw;
  }

  function renderText(slide) {
    var eyebrow = slide.eyebrow ? '<p class="pa-eyebrow">' + slide.eyebrow + '</p>' : '';
    var title = slide.title ? '<h1 class="pa-title">' + slide.title + '</h1>' : '';
    var subtitle = slide.subtitle ? '<p class="pa-subtitle">' + slide.subtitle + '</p>' : '';
    var body = slide.body ? '<div class="pa-body">' + slide.body + '</div>' : '';
    var bullets = '';
    if (Array.isArray(slide.bullets) && slide.bullets.length) {
      bullets = '<ul class="pa-bullets">' + slide.bullets.map(function (item) {
        return '<li>' + item + '</li>';
      }).join('') + '</ul>';
    }
    return '<div class="pa-content">' + eyebrow + title + subtitle + body + bullets + '</div>';
  }

  function renderHtml(slide) {
    return slide.html || '';
  }

  function renderImage(slide) {
    var src = slide.src || slide.imageSrc || '';
    var alt = esc(slide.alt || slide.imageAlt || '');
    var caption = slide.caption || slide.imageCaption || '';
    var eyebrow = slide.eyebrow ? '<p class="pa-eyebrow">' + slide.eyebrow + '</p>' : '';
    var title = slide.title ? '<h1 class="pa-title">' + slide.title + '</h1>' : '';
    var fig = '<figure class="pa-figure"><img src="' + esc(src) + '" alt="' + alt + '">' +
      (caption ? '<figcaption>' + esc(caption) + '</figcaption>' : '') + '</figure>';
    return '<div class="pa-content">' + eyebrow + title + fig + '</div>';
  }

  function renderVideo(slide) {
    var vertical = slide.vertical ? ' vertical' : '';
    var poster = slide.poster ? ' poster="' + esc(slide.poster) + '"' : '';
    var eyebrow = slide.eyebrow ? '<p class="pa-eyebrow">' + slide.eyebrow + '</p>' : '';
    var title = slide.title ? '<h1 class="pa-title">' + slide.title + '</h1>' : '';
    var caption = slide.caption ? '<p class="pa-caption">' + esc(slide.caption) + '</p>' : '';
    return '<div class="pa-content pa-content-video">' + eyebrow + title +
      '<div class="pa-video' + vertical + '" data-video-stage>' +
        '<video src="' + esc(slide.src || '') + '"' + poster + ' controls playsinline preload="metadata"></video>' +
        '<div class="pa-video-hint video-hint">Space / click to play</div>' +
      '</div>' + caption + '</div>';
  }

  function renderYouTube(slide) {
    var id = youtubeIdOf(slide);
    var label = esc(slide.youtubeTitle || slide.title || 'YouTube video');
    var eyebrow = slide.eyebrow ? '<p class="pa-eyebrow">' + slide.eyebrow + '</p>' : '';
    var title = slide.title ? '<h1 class="pa-title">' + slide.title + '</h1>' : '';
    var caption = slide.caption ? '<p class="pa-caption">' + esc(slide.caption) + '</p>' : '';
    return '<div class="pa-content pa-content-video">' + eyebrow + title +
      '<div class="pa-youtube"><iframe src="https://www.youtube.com/embed/' + esc(id) + '" title="' + label + '" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
        'allowfullscreen></iframe></div>' + caption + '</div>';
  }

  var builtins = {
    text: renderText,
    title: renderText,
    section: renderText,
    html: renderHtml,
    image: renderImage,
    photo: renderImage,
    video: renderVideo,
    youtube: renderYouTube
  };

  function keymapHtml() {
    return KEYS.map(function (row) {
      return '<kbd>' + esc(row[0]) + '</kbd><span>' + esc(row[1]) + '</span>';
    }).join('');
  }

  function shellHtml() {
    return '' +
      '<div class="pa-frame">' +
        '<section id="slide" class="pa-slide"></section>' +
        '<div class="pa-progress" aria-hidden="true"><span id="progress"></span></div>' +
      '</div>' +
      '<p id="pa-status" class="pa-sr"></p>';
  }

  function overlayHtml() {
    return '' +
      '<div class="pa-help-hint">Press ? for controls</div>' +
      '<aside id="notes" class="pa-notes" hidden>' +
        '<div class="pa-notes-head"><span id="notes-title"></span><span>N to hide</span></div>' +
        '<div id="notes-body"></div>' +
      '</aside>' +
      '<div id="toast" class="pa-toast" hidden></div>' +
      '<div id="help-overlay" class="pa-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="help-title">' +
        '<div class="pa-overlay-card" data-overlay-card>' +
          '<h2 id="help-title">Controls</h2>' +
          '<div class="pa-keymap">' + keymapHtml() + '</div>' +
          '<p class="pa-overlay-hint">The screen stays awake while the deck is in fullscreen.</p>' +
          '<p class="pa-overlay-hint">Esc or ? to close</p>' +
        '</div>' +
      '</div>' +
      '<div id="sink-overlay" class="pa-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="sink-title">' +
        '<div class="pa-overlay-card" data-overlay-card>' +
          '<h2 id="sink-title">Audio output</h2>' +
          '<div id="sink-body"></div>' +
          '<div class="pa-overlay-actions" id="sink-actions" hidden>' +
            '<button type="button" id="sink-names">Allow access to list speakers</button>' +
            '<button type="button" id="sink-refresh">Refresh</button>' +
          '</div>' +
          '<p class="pa-overlay-msg" id="sink-error" hidden></p>' +
          '<p class="pa-overlay-hint" id="sink-hint">\u2191/\u2193 or click to choose \u00b7 Enter to apply \u00b7 A to list speakers \u00b7 Esc to close<br>Plug in HDMI first, then Refresh.</p>' +
        '</div>' +
      '</div>' +
      '<div class="pa-controls" aria-label="Slide controls">' +
        '<button id="prev" type="button">\u2190</button>' +
        '<button id="next" type="button">\u2192</button>' +
      '</div>';
  }

  function readThemeVars() {
    var style;
    try { style = getComputedStyle(document.documentElement); } catch (e) { return ''; }
    var decls = [];
    for (var i = 0; i < THEME_VARS.length; i++) {
      var name = THEME_VARS[i];
      var value = '';
      try { value = style.getPropertyValue(name); } catch (e2) { value = ''; }
      value = String(value || '').trim();
      if (!value || /[<>]/.test(value)) continue;
      decls.push(name + ':' + value);
    }
    return decls.join(';');
  }

  function presenterDocument(deckTitle, extraCSS) {
    var vars = readThemeVars();
    var keymap = KEYS.map(function (row) {
      return '<b>' + esc(row[0]) + '</b><span>' + esc(row[1]) + '</span>';
    }).join('');
    var extra = String(extraCSS || '').replace(/<\/style/gi, '');
    return '<!doctype html><html><head><meta charset="utf-8"><title>Presenter \u00b7 ' + esc(deckTitle) + '</title>' +
      '<style>' +
      ':root{' + vars + '}' +
      'body{margin:0;font-family:var(--pa-font,system-ui,sans-serif);background:var(--pa-bg,#0c0c0e);color:var(--pa-fg,#f4f4f6)}' +
      'header{display:flex;justify-content:space-between;gap:16px;padding:18px 22px;border-bottom:1px solid var(--pa-line,#2a2a2e);align-items:center}' +
      '.timer{font-size:42px;font-weight:800;letter-spacing:-.03em;color:var(--pa-accent,#7ec8ff);font-variant-numeric:tabular-nums}' +
      '.meta{font-size:14px;color:var(--pa-muted,#9aa0ab)}' +
      'main{display:grid;grid-template-rows:auto auto 1fr auto;gap:14px;padding:22px;height:calc(100vh - 78px);box-sizing:border-box}' +
      'h1{margin:0;font-family:var(--pa-font-display,Georgia,serif);font-size:28px;line-height:1.2;font-weight:650}' +
      '.nav{display:flex;gap:10px;align-items:flex-start}' +
      '.nav button{font:inherit;font-weight:700;padding:10px 16px;border-radius:10px;border:1px solid var(--pa-line,#2a2a2e);background:var(--pa-card,#1a1a20);color:var(--pa-card-fg,#f4f4f6);cursor:pointer}' +
      '.notes{font-size:18px;line-height:1.45;overflow:auto;padding:16px;border-radius:var(--pa-radius,14px);background:var(--pa-card,#16161a);border:1px solid var(--pa-line,#2a2a2e);color:var(--pa-card-fg,#f4f4f6)}' +
      '.notes ul{margin:0;padding-left:1.25em;display:grid;gap:10px}' +
      '.notes strong{color:var(--pa-accent,#7ec8ff);font-weight:700}' +
      '.next{padding:14px 16px;border-radius:var(--pa-radius,14px);background:var(--pa-card,#121218);border:1px solid var(--pa-line,#2a2a2e);color:var(--pa-card-fg,#f4f4f6)}' +
      '.next b{color:var(--pa-accent,#7ec8ff)}' +
      '.hint{font-size:12px;color:var(--pa-muted,#7a808c);line-height:1.5}' +
      '.keymap{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin-top:8px}' +
      '.keymap b{color:var(--pa-accent,#7ec8ff);font-weight:700}' +
      extra +
      '</style></head><body>' +
      '<header><div><div class="meta" id="sec"></div><div class="meta" id="count"></div></div><div class="timer" id="timer">00:00</div></header>' +
      '<main>' +
        '<h1 id="title"></h1>' +
        '<div class="nav"><button type="button" id="prevBtn">\u2190 Prev</button><button type="button" id="nextBtn">Next \u2192</button>' +
          '<span class="hint">Keys here drive the main deck<span class="keymap">' + keymap + '</span></span></div>' +
        '<div class="notes" id="notes"></div>' +
        '<div class="next"><b>Next</b><div id="next"></div></div>' +
      '</main>' +
      '<script>' +
      'function send(cmd, key){try{if(!window.opener||window.opener.closed)return;window.opener.postMessage({type:"' + MSG_CMD + '",cmd:cmd,key:key},"*");}catch(e){}}' +
      'document.getElementById("prevBtn").onclick=function(){send("prev");};' +
      'document.getElementById("nextBtn").onclick=function(){send("next");};' +
      'var FORWARD=["ArrowRight","ArrowLeft","ArrowUp","ArrowDown","PageDown","PageUp"," ","Home","End","Escape","Enter","?","h","H","s","S","n","N","p","P","f","F","a","A","r","R","0","1","2","3","4","5","6","7","8","9"];' +
      'document.addEventListener("keydown",function(event){if(FORWARD.indexOf(event.key)>=0){event.preventDefault();send("key",event.key);}});' +
      'window.addEventListener("message",function(ev){var d=ev.data;if(!d||d.type!=="' + MSG_STATE + '")return;' +
        'document.getElementById("sec").textContent=d.section||"";' +
        'document.getElementById("count").textContent=d.index+" / "+d.total;' +
        'document.getElementById("title").textContent=d.title||"";' +
        'document.getElementById("notes").innerHTML=d.notesHtml||"";' +
        'document.getElementById("next").textContent=(d.nextSection?d.nextSection+" \\u2014 ":"")+(d.nextTitle||"");' +
        'document.getElementById("timer").textContent=d.timer||"00:00";});' +
      'try{window.opener&&window.opener.postMessage({type:"' + MSG_READY + '"},"*");}catch(e){}' +
      'var tries=0;var readyPoll=setInterval(function(){tries+=1;try{window.opener&&window.opener.postMessage({type:"' + MSG_READY + '"},"*");}catch(e){}if(tries>20)clearInterval(readyPoll);},500);' +
      '<\/script></body></html>';
  }

  function init(options) {
    if (!options || !Array.isArray(options.slides) || !options.slides.length) {
      throw new Error('Presagent.init requires a non-empty slides array.');
    }

    var previous = active;
    var controller = new AbortController();
    active = controller;
    if (previous) previous.abort();
    var signal = controller.signal;

    var slides = options.slides;
    var stage = {
      w: Number(options.stage && options.stage.w) > 0 ? Number(options.stage.w) : 1600,
      h: Number(options.stage && options.stage.h) > 0 ? Number(options.stage.h) : 900
    };
    var deckTitle = options.title || 'Deck';
    var sinkKey = options.sinkStorageKey || 'presagent-audio-sink-id';
    var presenterName = options.presenterName || 'presagent-presenter';
    var renderers = Object.assign({}, builtins, options.renderers || {});

    var index = 1;
    var notesOpen = false;
    var helpOpen = false;
    var sinkOpen = false;
    var presenterWin = null;
    var timerStarted = null;
    var preferredSinkId = '';
    var sinkOptions = [];
    var sinkCursor = 0;
    var screenWakeLock = null;
    var screenWakeLockPending = false;
    var screenWakeLockToastShown = false;
    var toastTimer = 0;
    var preloadImage = new Image();
    try { preloadImage.fetchPriority = 'low'; } catch (e) {}

    try { preferredSinkId = localStorage.getItem(sinkKey) || ''; } catch (e) { preferredSinkId = ''; }

    document.documentElement.classList.add('pa-deck');
    document.body.classList.add('pa-deck');
    document.documentElement.style.setProperty('--pa-aspect', String(stage.w / stage.h));

    var app = document.querySelector(options.mount || '#app');
    if (!app) {
      app = document.createElement('main');
      app.id = 'app';
      document.body.appendChild(app);
    }
    app.classList.add('pa-app');
    app.setAttribute('aria-live', 'polite');
    if (!app.querySelector('.pa-frame')) app.innerHTML = shellHtml();

    if (!document.getElementById('help-overlay')) {
      var chrome = document.createElement('div');
      chrome.innerHTML = overlayHtml();
      while (chrome.firstChild) document.body.appendChild(chrome.firstChild);
    }

    var slideEl = document.getElementById('slide');
    var progressEl = document.getElementById('progress');
    var statusEl = document.getElementById('pa-status');

    function $(id) { return document.getElementById(id); }

    function toast(message) {
      var el = $('toast');
      if (!el) return;
      el.textContent = message;
      el.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { el.hidden = true; }, 1600);
    }

    function parseHash() {
      var next = Number.parseInt(String(location.hash || '').replace('#', ''), 10);
      if (!Number.isFinite(next) || next < 1 || next > slides.length) return null;
      return next;
    }

    function ctxFor(slide) {
      return {
        index: index,
        total: slides.length,
        slide: slide,
        slides: slides,
        esc: esc,
        type: (slide && slide.type) || 'text',
        deckTitle: deckTitle
      };
    }

    function slideMarkup(slide, ctx) {
      if (typeof options.renderSlide === 'function') {
        var custom = options.renderSlide(slide, ctx);
        if (custom != null) return custom;
      }
      var type = ctx.type;
      var renderer = renderers[type];
      if (typeof renderer === 'function') return renderer(slide, ctx);
      return '<div class="pa-unknown"><p>No renderer for slide type \u201c' + esc(type) + '\u201d.</p></div>';
    }

    function footerMarkup(slide, ctx) {
      if (typeof options.renderFooter === 'function') return options.renderFooter(slide, ctx) || '';
      if (options.footer === false) return '';
      var mark = options.mark ? '<span class="pa-footer-mark">' + esc(options.mark) + '</span>' : '<span></span>';
      return '<footer class="pa-footer">' + mark + '<span>' + ctx.index + ' / ' + ctx.total + '</span></footer>';
    }

    function slideClassName(slide, ctx) {
      var extra = '';
      if (typeof options.slideClass === 'function') extra = options.slideClass(slide, ctx) || '';
      else if (slide && slide.slideClass) extra = slide.slideClass;
      var theme = slide && slide.theme ? 'is-' + slide.theme : '';
      return ['pa-slide', 'type-' + (ctx.type || 'text'), theme, extra].filter(Boolean).join(' ');
    }

    function sinkSupported() {
      return typeof HTMLMediaElement !== 'undefined' && typeof HTMLMediaElement.prototype.setSinkId === 'function';
    }

    function applySinkTo(el) {
      if (!el || typeof el.setSinkId !== 'function') return Promise.resolve();
      var id = preferredSinkId || '';
      return el.setSinkId(id).catch(function () {
        preferredSinkId = '';
        try { localStorage.removeItem(sinkKey); } catch (e) {}
        return el.setSinkId('').catch(function () {});
      });
    }

    function applySinkToAllMedia() {
      return Promise.all(Array.prototype.map.call(document.querySelectorAll('video, audio'), applySinkTo));
    }

    function pauseAllVideos() {
      Array.prototype.forEach.call(document.querySelectorAll('video'), function (video) {
        try { video.pause(); } catch (e) {}
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-video-stage]'), function (el) {
        el.classList.remove('playing');
      });
    }

    function playOrPause(video) {
      if (!video) return;
      if (video.paused) {
        var pending = video.play();
        if (pending && typeof pending.catch === 'function') pending.catch(function () {});
      } else {
        video.pause();
      }
    }

    function wireVideo() {
      var stageEl = slideEl.querySelector('[data-video-stage]');
      if (!stageEl) return;
      var video = stageEl.querySelector('video');
      if (!video) return;
      applySinkTo(video);
      var mark = function () { stageEl.classList.toggle('playing', !video.paused && !video.ended); };
      video.addEventListener('play', mark);
      video.addEventListener('pause', mark);
      video.addEventListener('ended', mark);
      stageEl.addEventListener('click', function (event) {
        if (event.target === video || (event.target.closest && event.target.closest('video'))) return;
        playOrPause(video);
      });
    }

    function toggleCurrentVideo() {
      var video = slideEl.querySelector('video');
      if (!video) return false;
      playOrPause(video);
      return true;
    }

    function updateNotes() {
      var slide = slides[index - 1];
      var panel = $('notes');
      if (!panel || !slide) return;
      $('notes-title').textContent = slide.docSection || String(index);
      $('notes-body').innerHTML = notesHtml(slide);
      panel.hidden = !notesOpen;
    }

    function preloadAhead() {
      var pick = typeof options.preloadSrc === 'function'
        ? options.preloadSrc
        : function (slide) { return (slide && (slide.imageSrc || (slide.type === 'image' || slide.type === 'photo' ? slide.src : '') || slide.poster)) || ''; };
      var upcoming = null;
      for (var i = index; i < slides.length; i++) {
        if (pick(slides[i])) { upcoming = slides[i]; break; }
      }
      if (!upcoming) return;
      var src = pick(upcoming);
      if (src && preloadImage.getAttribute('src') !== src) preloadImage.src = src;
    }

    function fitSlide() {
      var frame = app.querySelector('.pa-frame');
      if (!frame || !slideEl) return;
      var rect = frame.getBoundingClientRect();
      var scale = Math.min(rect.width / stage.w, rect.height / stage.h);
      if (!isFinite(scale)) scale = 1;
      slideEl.style.transform = 'scale(' + scale + ')';
    }

    function render() {
      var slide = slides[index - 1];
      if (!slide) return;
      var ctx = ctxFor(slide);
      slideEl.className = slideClassName(slide, ctx);
      slideEl.style.width = stage.w + 'px';
      slideEl.style.height = stage.h + 'px';
      slideEl.dataset.index = String(index);
      slideEl.dataset.total = String(slides.length);
      slideEl.dataset.type = ctx.type;
      slideEl.setAttribute('aria-label', plainTitle(slide, index));
      slideEl.innerHTML = slideMarkup(slide, ctx) + footerMarkup(slide, ctx);
      if (progressEl) progressEl.style.width = ((index / slides.length) * 100) + '%';
      if (statusEl) statusEl.textContent = index + ' / ' + slides.length;
      if (typeof options.formatTitle === 'function') document.title = options.formatTitle(slide, ctx);
      else document.title = index + '/' + slides.length + ' \u00b7 ' + deckTitle;
      if (location.hash !== '#' + index) history.replaceState(null, '', '#' + index);
      fitSlide();
      pauseAllVideos();
      wireVideo();
      applySinkToAllMedia();
      updateNotes();
      syncPresenter();
      preloadAhead();
      if (typeof options.onRender === 'function') options.onRender(slide, ctx);
    }

    function show(n) {
      index = Math.max(1, Math.min(slides.length, n));
      render();
    }

    function go(delta) { show(index + delta); }

    function syncPresenter() {
      if (!presenterWin || presenterWin.closed) { presenterWin = null; return; }
      var slide = slides[index - 1];
      var next = slides[index] || null;
      var elapsed = timerStarted ? Math.floor((Date.now() - timerStarted) / 1000) : 0;
      var mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      var ss = String(elapsed % 60).padStart(2, '0');
      try {
        presenterWin.postMessage({
          type: MSG_STATE,
          index: index,
          total: slides.length,
          section: (slide && slide.docSection) || '',
          title: plainTitle(slide, index),
          notesHtml: notesHtml(slide),
          nextTitle: next ? plainTitle(next, index + 1) : '\u2014 end \u2014',
          nextSection: next ? (next.docSection || '') : '',
          timer: mm + ':' + ss
        }, '*');
      } catch (e) {}
    }

    function openPresenter() {
      if (presenterWin && !presenterWin.closed) { presenterWin.focus(); syncPresenter(); return; }
      if (!timerStarted) timerStarted = Date.now();
      presenterWin = window.open('', presenterName, 'width=920,height=780');
      if (!presenterWin) { toast('Pop-up blocked \u2014 allow pop-ups for presenter view'); return; }
      presenterWin.document.write(presenterDocument(deckTitle, options.presenterCSS || ''));
      presenterWin.document.close();
      setTimeout(syncPresenter, 120);
      toast('Presenter view opened');
    }

    function closeHelp() {
      helpOpen = false;
      var el = $('help-overlay');
      if (el) el.hidden = true;
    }

    function openHelp() {
      closeSink();
      helpOpen = true;
      var el = $('help-overlay');
      if (el) el.hidden = false;
    }

    function toggleHelp() { if (helpOpen) closeHelp(); else openHelp(); }

    function closeSink() {
      sinkOpen = false;
      var el = $('sink-overlay');
      if (el) el.hidden = true;
    }

    function toggleNotes() {
      notesOpen = !notesOpen;
      updateNotes();
      toast(notesOpen ? 'Notes on (N to hide)' : 'Notes hidden');
    }

    function deviceLabel(device, i) {
      var raw = device && device.label ? String(device.label).trim() : '';
      var id = (device && device.deviceId) || '';
      if (id === 'default') {
        if (!raw) return 'Default';
        if (/^default\b/i.test(raw)) return raw;
        return 'Default \u2014 ' + raw;
      }
      if (id === 'communications') {
        if (!raw) return 'Communications';
        if (/^communications\b/i.test(raw)) return raw;
        return 'Communications \u2014 ' + raw;
      }
      if (raw) return raw;
      return 'Audio output ' + (i + 1);
    }

    function micPermissionState() {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          return navigator.permissions.query({ name: 'microphone' }).then(function (status) {
            return (status && status.state) || 'unknown';
          }).catch(function () { return 'unknown'; });
        }
      } catch (e) {}
      return Promise.resolve('unknown');
    }

    function shouldShowAllowButton(perm, devices) {
      if (perm !== 'granted') return true;
      var real = (devices || []).filter(function (device) { return device && device.deviceId; });
      if (real.length <= 1) return true;
      if (real.some(function (device) { return !String(device.label || '').trim(); })) return true;
      return false;
    }

    function setSinkError(message) {
      var el = $('sink-error');
      if (!el) return;
      if (message) { el.textContent = message; el.hidden = false; }
      else { el.textContent = ''; el.hidden = true; }
    }

    function updateAllowButton(show, focusIt) {
      var button = $('sink-names');
      if (!button) return;
      button.hidden = !show;
      button.textContent = 'Allow access to list speakers';
      if (show && focusIt) {
        requestAnimationFrame(function () { try { button.focus(); } catch (e) {} });
      }
    }

    function enumerateOutputs() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return Promise.resolve([]);
      return navigator.mediaDevices.enumerateDevices().then(function (devices) {
        return devices.filter(function (device) { return device.kind === 'audiooutput'; });
      });
    }

    function preferredStillAvailable() {
      if (!preferredSinkId) return Promise.resolve(true);
      return enumerateOutputs().then(function (devices) {
        return devices.some(function (device) { return device.deviceId === preferredSinkId; });
      }).catch(function () { return true; });
    }

    function fallbackIfMissing() {
      return preferredStillAvailable().then(function (ok) {
        if (ok) return;
        preferredSinkId = '';
        try { localStorage.removeItem(sinkKey); } catch (e) {}
        return applySinkToAllMedia();
      });
    }

    function paintSinkSelection(focusItem) {
      var buttons = document.querySelectorAll('#sink-list .sink-item');
      Array.prototype.forEach.call(buttons, function (button, i) {
        var on = i === sinkCursor;
        button.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on && focusItem) button.focus();
      });
    }

    function renderSinkOptions(devices, showAllow) {
      var body = $('sink-body');
      var actions = $('sink-actions');
      var hint = $('sink-hint');
      if (!body) return;
      sinkOptions = [{ id: '', label: 'System default' }];
      var seen = { '': true };
      (devices || []).forEach(function (device, i) {
        if (!device || !device.deviceId || seen[device.deviceId]) return;
        seen[device.deviceId] = true;
        sinkOptions.push({ id: device.deviceId, label: deviceLabel(device, i) });
      });
      var current = preferredSinkId || '';
      var found = -1;
      for (var i = 0; i < sinkOptions.length; i++) if (sinkOptions[i].id === current) found = i;
      sinkCursor = found >= 0 ? found : 0;
      body.innerHTML = '<div class="sink-list" id="sink-list" role="listbox" aria-label="Audio outputs">' +
        sinkOptions.map(function (option, i) {
          var n = i + 1 <= 9 ? String(i + 1) : '';
          var selected = option.id === current;
          return '<button type="button" class="sink-item" role="option" data-sink-id="' + esc(option.id) + '" aria-selected="' + (selected ? 'true' : 'false') + '">' +
            (n ? '<span class="sink-num">' + n + '</span>' : '') +
            '<span>' + esc(option.label) + '</span>' +
            (selected ? '<span class="sink-check">\u2713</span>' : '') +
            '</button>';
        }).join('') + '</div>';
      if (actions) actions.hidden = false;
      if (hint) hint.hidden = false;
      updateAllowButton(!!showAllow, !!showAllow);
      Array.prototype.forEach.call(body.querySelectorAll('.sink-item'), function (button, i) {
        button.addEventListener('click', function () {
          sinkCursor = i;
          applySinkCursor();
        });
      });
      paintSinkSelection(false);
    }

    function refreshSinkList() {
      var body = $('sink-body');
      var actions = $('sink-actions');
      var hint = $('sink-hint');
      if (!body) return Promise.resolve();
      if (!sinkSupported()) {
        body.innerHTML = '<p class="pa-overlay-msg">This browser can\u2019t switch audio output \u2014 use Chrome/Edge, or change system output and reload (slide is kept in URL).</p>';
        if (actions) actions.hidden = true;
        if (hint) hint.hidden = true;
        updateAllowButton(false);
        return Promise.resolve();
      }
      if (!window.isSecureContext) {
        body.innerHTML = '<p class="pa-overlay-msg">This page isn\u2019t in a secure context, so the browser won\u2019t let us switch audio output. Run <code>serve.command</code> (Mac) or <code>serve.bat</code> (Windows), or <code>python3 -m http.server</code>, then open <code>http://127.0.0.1:8000/</code> \u2014 your slide number stays in the URL.</p>';
        if (actions) actions.hidden = true;
        if (hint) hint.hidden = true;
        updateAllowButton(false);
        return Promise.resolve();
      }
      return enumerateOutputs().then(function (devices) {
        return micPermissionState().then(function (perm) {
          renderSinkOptions(devices, shouldShowAllowButton(perm, devices));
        });
      }).catch(function () {
        body.innerHTML = '<p class="pa-overlay-msg">Couldn\u2019t list audio devices. Try Refresh, or allow access to list speakers.</p>';
        if (actions) actions.hidden = false;
        updateAllowButton(true, true);
      });
    }

    function setPreferredSink(id, label) {
      preferredSinkId = id || '';
      try {
        if (preferredSinkId) localStorage.setItem(sinkKey, preferredSinkId);
        else localStorage.removeItem(sinkKey);
      } catch (e) {}
      return applySinkToAllMedia().then(function () {
        toast('Audio \u2192 ' + (label || (preferredSinkId ? 'Selected device' : 'System default')));
        closeSink();
      });
    }

    function applySinkCursor() {
      var option = sinkOptions[sinkCursor];
      if (!option) return;
      setPreferredSink(option.id, option.label);
    }

    function moveSink(delta) {
      if (!sinkOptions.length) return;
      sinkCursor = (sinkCursor + delta + sinkOptions.length) % sinkOptions.length;
      paintSinkSelection();
    }

    function revealSinkLabels() {
      setSinkError('');
      var media = navigator.mediaDevices;
      var afterSelect = Promise.resolve(false);
      if (media && typeof media.selectAudioOutput === 'function') {
        afterSelect = media.selectAudioOutput().then(function (device) {
          if (device && device.deviceId) {
            return setPreferredSink(device.deviceId, device.label || deviceLabel(device, 0)).then(function () { return true; });
          }
          return false;
        }).catch(function (error) {
          var name = error && error.name;
          if (name === 'NotAllowedError' || name === 'AbortError') {
            setSinkError('Mic permission is only used to read speaker names; nothing is recorded');
            return true;
          }
          return false;
        });
      }
      return afterSelect.then(function (done) {
        if (done) return;
        var mic = Promise.resolve();
        if (media && media.getUserMedia) {
          mic = media.getUserMedia({ audio: true }).then(function (stream) {
            stream.getTracks().forEach(function (track) { track.stop(); });
          });
        }
        return mic.then(function () { return refreshSinkList(); }).catch(function () {
          setSinkError('Mic permission is only used to read speaker names; nothing is recorded');
        });
      });
    }

    function openSink() {
      closeHelp();
      sinkOpen = true;
      var el = $('sink-overlay');
      if (el) el.hidden = false;
      setSinkError('');
      renderSinkOptions([], true);
      refreshSinkList();
    }

    function handleSinkKey(key) {
      if (key === 'Escape') { closeSink(); return; }
      if (key === 'a' || key === 'A') { revealSinkLabels(); return; }
      if (key === 'Enter' || key === ' ') {
        var activeEl = document.activeElement;
        if (activeEl && activeEl.id === 'sink-names') { revealSinkLabels(); return; }
        if (key === 'Enter') applySinkCursor();
        return;
      }
      if (['ArrowDown', 'ArrowRight', 'PageDown'].indexOf(key) >= 0) { moveSink(1); paintSinkSelection(true); return; }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].indexOf(key) >= 0) { moveSink(-1); paintSinkSelection(true); return; }
      if (key === 'r' || key === 'R') { refreshSinkList(); return; }
      if (/^[0-9]$/.test(key)) {
        var n = key === '0' ? 10 : Number(key);
        if (n >= 1 && n <= sinkOptions.length) {
          sinkCursor = n - 1;
          paintSinkSelection(true);
          applySinkCursor();
        }
      }
    }

    function handleNavKey(key) {
      if (key === 'ArrowRight' || key === 'PageDown') { go(1); return true; }
      if (key === ' ') {
        if (toggleCurrentVideo()) return true;
        go(1);
        return true;
      }
      if (key === 'ArrowLeft' || key === 'PageUp') { go(-1); return true; }
      if (key === 'Home') { show(1); return true; }
      if (key === 'End') { show(slides.length); return true; }
      return false;
    }

    function toggleFullscreen() {
      var activeFs = document.fullscreenElement || document.webkitFullscreenElement;
      var result;
      if (!activeFs) {
        var el = document.documentElement;
        var request = el.requestFullscreen || el.webkitRequestFullscreen;
        result = request && request.call(el);
      } else {
        var exit = document.exitFullscreen || document.webkitExitFullscreen;
        result = exit && exit.call(document);
      }
      if (result && typeof result.catch === 'function') result.catch(function () {});
    }

    function handleDeckKey(event) {
      var key = event.key;
      if (helpOpen) {
        if (key === 's' || key === 'S') { event.preventDefault(); closeHelp(); openSink(); return true; }
        if (key === 'Escape' || key === '?' || key === 'h' || key === 'H') { event.preventDefault(); closeHelp(); return true; }
        event.preventDefault();
        return true;
      }
      if (sinkOpen) {
        if (key === '?' || key === 'h' || key === 'H') { event.preventDefault(); closeSink(); openHelp(); return true; }
        event.preventDefault();
        handleSinkKey(key);
        return true;
      }
      if (key === '?' || key === 'h' || key === 'H') { event.preventDefault(); openHelp(); return true; }
      if (key === 's' || key === 'S') { event.preventDefault(); openSink(); return true; }
      if (key === 'n' || key === 'N') { event.preventDefault(); toggleNotes(); return true; }
      if (key === 'p' || key === 'P') { event.preventDefault(); openPresenter(); return true; }
      if (key === 'f' || key === 'F') { event.preventDefault(); toggleFullscreen(); return true; }
      if (['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', ' ', 'Home', 'End'].indexOf(key) >= 0) {
        event.preventDefault();
        handleNavKey(key);
        return true;
      }
      return false;
    }

    function isFullscreen() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }

    function wakeLockAvailable() {
      return !!(window.isSecureContext && navigator.wakeLock && typeof navigator.wakeLock.request === 'function');
    }

    function acquireScreenWakeLock() {
      if (!wakeLockAvailable()) {
        console.log('Screen Wake Lock unavailable (missing API or insecure context).');
        return;
      }
      if (!isFullscreen() || document.visibilityState !== 'visible') return;
      if (screenWakeLockPending) return;
      if (screenWakeLock && !screenWakeLock.released) return;
      screenWakeLockPending = true;
      navigator.wakeLock.request('screen').then(function (lock) {
        screenWakeLock = lock;
        lock.addEventListener('release', function () {
          console.log('Screen Wake Lock released');
          if (isFullscreen() && document.visibilityState === 'visible') acquireScreenWakeLock();
        });
        console.log('Screen Wake Lock acquired');
        if (!screenWakeLockToastShown) {
          screenWakeLockToastShown = true;
          toast('Screen will stay awake');
        }
      }).catch(function (err) {
        console.log('Screen Wake Lock request failed', err);
      }).then(function () {
        screenWakeLockPending = false;
      });
    }

    function releaseScreenWakeLock() {
      var lock = screenWakeLock;
      screenWakeLock = null;
      if (lock && !lock.released) {
        try { lock.release(); }
        catch (err) { console.log('Screen Wake Lock release failed', err); }
      }
    }

    function onFullscreenChange() {
      if (isFullscreen()) acquireScreenWakeLock();
      else releaseScreenWakeLock();
    }

    function onKeyDown(event) {
      var tag = event.target && event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      handleDeckKey(event);
    }

    function onHashChange() {
      var next = parseHash();
      if (next == null) return;
      index = next;
      render();
    }

    function onMessage(event) {
      var data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === MSG_READY) {
        if (event.source && event.source !== window) presenterWin = event.source;
        syncPresenter();
        return;
      }
      if (data.type === MSG_CMD) {
        if (data.cmd === 'prev') { go(-1); return; }
        if (data.cmd === 'next') { go(1); return; }
        if (data.cmd === 'key' && data.key) {
          handleDeckKey({ key: data.key, preventDefault: function () {}, target: document.body });
        }
      }
    }

    function bindChrome() {
      var prev = $('prev');
      var next = $('next');
      if (prev) prev.addEventListener('click', function () { go(-1); }, { signal: signal });
      if (next) next.addEventListener('click', function () { go(1); }, { signal: signal });
      var refresh = $('sink-refresh');
      var names = $('sink-names');
      if (refresh) refresh.addEventListener('click', function () { refreshSinkList(); }, { signal: signal });
      if (names) names.addEventListener('click', function () { revealSinkLabels(); }, { signal: signal });
      Array.prototype.forEach.call(document.querySelectorAll('.pa-overlay'), function (el) {
        el.addEventListener('click', function (event) {
          if (event.target !== el) return;
          if (el.id === 'help-overlay') closeHelp();
          if (el.id === 'sink-overlay') closeSink();
        }, { signal: signal });
      });
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', function () {
          fallbackIfMissing().then(function () { if (sinkOpen) refreshSinkList(); });
        }, { signal: signal });
      }
    }

    document.addEventListener('keydown', onKeyDown, { signal: signal });
    window.addEventListener('resize', fitSlide, { signal: signal });
    window.addEventListener('hashchange', onHashChange, { signal: signal });
    window.addEventListener('message', onMessage, { signal: signal });
    document.addEventListener('fullscreenchange', onFullscreenChange, { signal: signal });
    document.addEventListener('webkitfullscreenchange', onFullscreenChange, { signal: signal });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && isFullscreen()) acquireScreenWakeLock();
    }, { signal: signal });

    var clock = setInterval(function () {
      if (presenterWin && !presenterWin.closed) syncPresenter();
    }, 1000);
    signal.addEventListener('abort', function () { clearInterval(clock); });

    bindChrome();
    fallbackIfMissing();

    var hashed = parseHash();
    index = hashed == null ? 1 : hashed;
    closeHelp();
    closeSink();
    notesOpen = false;
    render();

    return {
      get index() { return index; },
      get total() { return slides.length; },
      go: go,
      show: show,
      render: render,
      openHelp: openHelp,
      closeHelp: closeHelp,
      toggleNotes: toggleNotes,
      openSink: openSink,
      closeSink: closeSink,
      openPresenter: openPresenter,
      destroy: function () { controller.abort(); }
    };
  }

  return {
    version: VERSION,
    keys: KEYS,
    esc: esc,
    init: init
  };
});
