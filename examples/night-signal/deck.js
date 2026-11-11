(function () {
  var esc = Presagent.esc;

  function shell(slide, body, ctx, modifier) {
    var cls = 'ns' + (modifier ? ' ' + modifier : '');
    var sub = slide.subtitle ? '<p class="ns-sub">' + esc(slide.subtitle) + '</p>' : '';
    var n = String(ctx.index).padStart(2, '0');
    var total = String(ctx.total).padStart(2, '0');
    return '<div class="' + cls + '">' +
      '<p class="ns-bearing">' + esc(slide.eyebrow || '') + '</p>' +
      '<h1 class="ns-title">' + esc(slide.title || '') + '</h1>' +
      sub +
      (body || '') +
      '<footer class="ns-foot"><span>Night Signal</span><span>' + n + ' / ' + total + '</span></footer>' +
      '</div>';
  }

  function bullets(items) {
    return '<ol class="ns-list">' + items.map(function (item, i) {
      return '<li><span>' + String(i + 1).padStart(2, '0') + '</span><p>' + esc(item) + '</p></li>';
    }).join('') + '</ol>';
  }

  Presagent.init({
    title: 'Night Signal',
    footer: false,
    slides: window.DECK_SLIDES,
    stage: { w: 1600, h: 900 },
    renderers: {
      title: function (slide, ctx) {
        return shell(slide, '', ctx, 'ns-open');
      },
      text: function (slide, ctx) {
        return shell(slide, bullets(slide.bullets || []), ctx);
      },
      image: function (slide, ctx) {
        var figure = '<figure class="ns-fig"><img src="' + esc(slide.src) + '" alt="' + esc(slide.alt || '') + '">' +
          '<figcaption>' + esc(slide.caption || '') + '</figcaption></figure>';
        return shell(slide, figure, ctx);
      },
      video: function (slide, ctx) {
        var poster = slide.poster ? ' poster="' + esc(slide.poster) + '"' : '';
        var body = '<div class="ns-stage" data-video-stage>' +
          '<video src="' + esc(slide.src) + '"' + poster + ' controls playsinline preload="metadata"></video>' +
          '<div class="pa-video-hint">Space / click to play</div>' +
          '</div>' +
          (slide.caption ? '<p class="ns-cap">' + esc(slide.caption) + '</p>' : '');
        return shell(slide, body, ctx, 'ns-media');
      },
      youtube: function (slide, ctx) {
        var id = esc(slide.youtubeId || '');
        var body = '<div class="ns-stage ns-yt">' +
          '<iframe src="https://www.youtube.com/embed/' + id + '" title="' + esc(slide.youtubeTitle || 'YouTube video') + '" ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>' +
          '</div>' +
          (slide.caption ? '<p class="ns-cap">' + esc(slide.caption) + '</p>' : '');
        return shell(slide, body, ctx, 'ns-media');
      },
      marks: function (slide, ctx) {
        var flags = '<div class="ns-flags">' + (slide.marks || []).map(function (mark) {
          return '<figure class="ns-flag">' +
            '<span class="ns-lamp is-' + esc(mark.tone) + '"></span>' +
            '<figcaption><b>' + esc(mark.name) + '</b> ' + esc(mark.meaning) + '</figcaption>' +
            '</figure>';
        }).join('') + '</div>';
        return shell(slide, flags, ctx);
      }
    }
  });
})();
