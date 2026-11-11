(function () {
  var esc = Presagent.esc;

  function page(slide, body, ctx) {
    var n = String(ctx.index);
    return '<article class="jn">' +
      '<p class="jn-kicker">' + esc(slide.kicker || '') + '</p>' +
      '<h1>' + esc(slide.title || '') + '</h1>' +
      (body || '') +
      '<p class="jn-page">p. ' + n + '</p>' +
      '</article>';
  }

  Presagent.init({
    title: 'Under the hedge',
    footer: false,
    slides: window.DECK_SLIDES,
    stage: { w: 1920, h: 1080 },
    renderers: {
      journal: function (slide, ctx) {
        var body = slide.body ? '<p class="jn-body">' + esc(slide.body) + '</p>' : '';
        if (Array.isArray(slide.bullets) && slide.bullets.length) {
          body += '<ul class="jn-list">' + slide.bullets.map(function (item) {
            return '<li>' + esc(item) + '</li>';
          }).join('') + '</ul>';
        }
        return page(slide, body, ctx);
      },
      plate: function (slide, ctx) {
        var body = '<figure class="jn-plate"><img src="' + esc(slide.src) + '" alt="' + esc(slide.alt || '') + '">' +
          '<figcaption>' + esc(slide.caption || '') + '</figcaption></figure>';
        return page(slide, body, ctx);
      }
    }
  });
})();
