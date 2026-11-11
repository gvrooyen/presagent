(function () {
  var esc = Presagent.esc;

  function shell(slide, body, ctx, modifier) {
    var n = String(ctx.index).padStart(2, '0');
    var total = String(ctx.total).padStart(2, '0');
    var sub = slide.subtitle ? '<p class="hoc-sub">' + esc(slide.subtitle) + '</p>' : '';
    return '<div class="hoc' + (modifier ? ' ' + modifier : '') + '">' +
      '<p class="hoc-eye">' + esc(slide.eyebrow || '') + '</p>' +
      '<h1 class="hoc-title">' + esc(slide.title || '') + '</h1>' +
      sub +
      (body || '') +
      '<footer class="hoc-foot"><span>A history of cinema</span><span>' + n + ' / ' + total + '</span></footer>' +
      '</div>';
  }

  function bullets(items) {
    return '<ul class="hoc-list">' + (items || []).map(function (item) {
      return '<li>' + esc(item) + '</li>';
    }).join('') + '</ul>';
  }

  Presagent.init({
    title: 'A history of cinema',
    footer: false,
    slides: window.DECK_SLIDES,
    stage: { w: 1600, h: 900 },
    renderers: {
      title: function (slide, ctx) {
        return shell(slide, '', ctx, 'hoc-open');
      },
      section: function (slide, ctx) {
        return shell(slide, '', ctx, 'hoc-section');
      },
      text: function (slide, ctx) {
        return shell(slide, bullets(slide.bullets), ctx);
      },
      timeline: function (slide, ctx) {
        var rail = '<ol class="hoc-rail">' + (slide.marks || []).map(function (mark) {
          return '<li><b>' + esc(mark.year) + '</b><span>' + esc(mark.text) + '</span></li>';
        }).join('') + '</ol>';
        return shell(slide, rail, ctx, 'hoc-times');
      },
      video: function (slide, ctx) {
        var poster = slide.poster ? ' poster="' + esc(slide.poster) + '"' : '';
        var body = '<div class="hoc-stage" data-video-stage>' +
          '<video src="' + esc(slide.src) + '"' + poster + ' controls playsinline preload="metadata"></video>' +
          '<div class="pa-video-hint">Space / click to play</div>' +
          '</div>' +
          (slide.caption ? '<p class="hoc-cap">' + esc(slide.caption) + '</p>' : '');
        return shell(slide, body, ctx, 'hoc-media');
      }
    }
  });
})();
