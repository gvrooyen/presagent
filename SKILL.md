---
name: presagent
description: >
  Use when creating, scaffolding, or editing a single-page HTML presentation
  deck that should keep presagent behaviour (hash deep links, keyboard
  navigation, speaker notes, presenter window, local video, YouTube, audio
  output picker, fullscreen wake lock) while using an entirely custom look.
  Also use when adding a slide, a custom slide type, or a new visual theme
  to an existing presagent deck.
---

# presagent

presagent is a dependency-free engine for one HTML file of slides. The engine owns behaviour. The deck owns the look. A theme may replace every colour, typeface, and piece of slide markup. It must not change the controls below.

Study `examples/history-of-cinema/` for a full deck: its own type, its own CSS, and public-domain clips listed in that folder’s `CREDITS.md`. Start a new deck from `template/`, not by restyling the example.

Do not copy material from a client's existing talk into this repo or into a new deck. Invent the words, or use only assets you made or that are clearly public domain or CC0, and attribute those.

## Behaviour you must not change

Tick these after you edit a deck. If a change would make any line false, revert the behaviour and keep the change in CSS or in a render function.

- The stage is a fixed design size (1600×900 unless the deck passes `stage`) scaled to the window. The slide number is 1-based and lives in the URL hash (`#4`). A bad hash opens slide 1. Editing the hash to an in-range number moves there. An out-of-range hash does not move.
- Keys, including from the presenter window: ←/→ and PgUp/PgDn move one slide; Home/End jump to the ends; Space plays or pauses the slide's `<video>`, otherwise it advances; F toggles fullscreen; N toggles cue notes; P opens or focuses the presenter window; S opens the audio-output picker; ? or H toggles help; Esc closes help or the picker. Help and the picker swallow every other key. Esc does not close notes.
- Keys do nothing when focus is in an `input`, `textarea`, or `select`.
- Help lists every key above, and says the screen stays awake in fullscreen.
- N shows `cueNotes` only. `narration` is never shown on the slide, in N, or in the presenter window. Notes stay open while you change slides.
- P opens a popup (`window.open` + `postMessage`). It shows the section, `index / total`, the plain title, cue notes, the next slide, and a `mm:ss` timer that starts the first time P is pressed and does not reset per slide. Prev/Next buttons and every control key in that window are sent back to the deck. A blocked popup shows a toast.
- Slides may be text/HTML, image, local mp4, or YouTube. Local video does not autoplay. It starts paused, with `controls playsinline preload="metadata"`. Space and a click on the stage (not on the video element itself) toggle playback. The chosen audio output is applied again every time a slide renders. YouTube is an embed with no `autoplay` parameter; Space advances, because there is no `<video>` element to toggle.
- S uses `HTMLMediaElement.setSinkId` and `enumerateDevices`. The picker always offers System default, lists outputs, and includes **Allow access to list speakers** until permission is granted and every listed device has a label. That button calls `selectAudioOutput` where it exists, otherwise `getUserMedia({ audio: true })` and then stops the tracks. Refresh re-reads devices. ↑/↓ move the highlight, Enter or a click applies, number keys 1–9 and 0 (the 10th) apply, A lists speakers, R refreshes. The id is stored in `localStorage` under `presagent-audio-sink-id` and reapplied to every `video` and `audio`. `devicechange` drops the choice if that device is gone. With no `setSinkId`, or on a `file://` page, the picker explains the limit and does not throw. Safari has no `setSinkId`.
- Entering fullscreen requests a screen wake lock. Leaving fullscreen releases it. If the browser releases the sentinel while still fullscreen and visible, the engine asks again. Coming back to a visible fullscreen page asks again. The toast "Screen will stay awake" is shown once. Failure is only a `console.log`.
- On-screen ←/→ buttons do the same as the arrow keys. The progress bar is `index / total`.
- Serve the deck with `python3 -m http.server 8000 --bind 127.0.0.1` (the deck's `serve.command` / `serve.bat` do this). `setSinkId` and the wake lock need a secure context. `http://127.0.0.1` counts. `file://` does not.

The reference implementation of this contract is `engine/presagent.js`. Read it before changing it. A deck's `theme.css` and render functions are the right place for a new look.

## Scaffold a deck

1. Copy `template/` to a new folder, for example `talks/harbour/`.
2. In `index.html`, point the CSS and script at the engine. From `template/` that is `../engine/`. From `examples/<name>/` it is `../../engine/`. If you copy the deck out of the repo, copy `engine/` into the deck and use `engine/presagent.js`.
3. Replace `slides.js`, then `theme.css`. Add renderers in `deck.js` only when the default markup is in the way.
4. Keep `serve.command` and `serve.bat`. They walk up until they find `engine/presagent.js`, serve that directory, and open the deck URL.
5. Design at the stage size. The engine scales `#slide` with `transform: scale(...)`. Use pixels in that coordinate space, not `vw` inside the slide.

`index.html` stays this small:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Harbour lights</title>
  <link rel="stylesheet" href="../engine/presagent-base.css">
  <link rel="stylesheet" href="theme.css">
</head>
<body>
  <script src="../engine/presagent.js"></script>
  <script src="slides.js"></script>
  <script src="deck.js"></script>
</body>
</html>
```

Include `presagent-base.css`. It is the stage, the overlays, the notes, the toast, and the picker. It has to work with no theme. Your theme overrides the variables and may restyle every class. Do not fork the engine to change a colour.

`slides.js` assigns `window.DECK_SLIDES`. `deck.js` calls `Presagent.init`. A plain script tag is the supported setup. There is no build step. `engine/presagent.mjs` is an optional ES module entry for pages that already use `type="module"`; it loads the same file.

## Slide schema

```js
window.DECK_SLIDES = [
  {
    type: 'text',              // text, title, section, html, image, photo, video, youtube, or your own
    eyebrow: '01',
    title: 'A title with <em>HTML</em>',  // prose is HTML, not escaped
    subtitle: 'One sentence.',
    body: '<p>Optional HTML body.</p>',
    bullets: ['First point', 'Second <strong>point</strong>'],
    docSection: '01 · Opening', // notes header and presenter section line
    cueNotes: [
      { text: 'Say the title once', bold: 'title' }
    ],
    narration: 'Longer script. Never rendered.'
  },
  {
    type: 'image',
    title: 'A chart',
    src: 'assets/chart.svg',   // imageSrc is also accepted
    alt: 'Short description',
    caption: 'Escaped plain text.',
    imageSrc: 'assets/chart.svg' // also used to preload the next illustrated slide
  },
  {
    type: 'video',
    title: 'A clip',
    src: 'assets/clip.mp4',
    poster: 'assets/clip.jpg',
    caption: 'Space or click to play.',
    vertical: false
  },
  {
    type: 'youtube',
    title: 'An archive film',
    youtubeId: 'GXwbM_vOvb0',  // id or a full YouTube URL
    youtubeTitle: 'Accessible iframe title',
    caption: 'Who made it, and the licence.'
  },
  {
    type: 'html',
    html: '<div class="mine">Anything.</div>'
  }
];
```

Unknown fields are ignored by the engine and are available to your renderer. `links` and `ref` are conventional places for sources; render them yourself in `renderFooter` if you want them on the slide.

Built-in types: `text`, `title`, and `section` share one text renderer. `html` inserts `slide.html`. `image` and `photo` share an image renderer. `video` and `youtube` have their own. A renderer you pass in `renderers` replaces the built-in of the same name.

Prose fields (`title`, `subtitle`, `body`, `bullets`, and `html`) are trusted HTML. Attributes (`src`, `alt`, `caption`, `poster`, YouTube ids) are escaped by the built-in renderers. Escape anything you put in an attribute inside a custom renderer (`ctx.esc`).

## Notes

`cueNotes` is the only notes surface.

- At most 6 bullets.
- At most 6 words each.
- One bold word per bullet, and that word must occur inside `text`. The engine bolds the first match. If `bold` is missing from `text`, the line is shown with no bold.
- A string form works too: `"**Space** plays and pauses"` becomes the same shape. Prefer the object form.

```js
cueNotes: [
  { text: 'Space plays and pauses', bold: 'Space' },
  { text: 'Then take one question', bold: 'one' }
]
```

`narration` is a string or an array of strings for the speaker's full script. Do not render it. Do not copy it into `body` or into the presenter. The engine never reads it.

`docSection` is a short locator such as `04 · The clip`. It is the notes heading and the presenter's section line. It is not a paragraph.

## Theme freely

Set these on `:root` in `theme.css`. Overlays, notes, the toast, the picker, and the presenter window all read them. The presenter copies the computed values when it opens, so the popup follows the deck without sharing a stylesheet.

| Variable | Used for |
| --- | --- |
| `--pa-bg` | Page behind the stage, presenter background |
| `--pa-fg` | Slide and presenter text |
| `--pa-muted` | Hints, captions |
| `--pa-accent` | Progress, keymap, note emphasis, presenter timer |
| `--pa-card`, `--pa-card-fg` | Overlay, notes, picker rows |
| `--pa-line` | Borders |
| `--pa-overlay` | Backdrop behind help and the picker |
| `--pa-font`, `--pa-font-display` | UI and titles |
| `--pa-radius`, `--pa-shadow`, `--pa-frame-pad` | Chrome |
| `--pa-slide` | Slide background when you use the default markup |

`--pa-frame-pad` defaults to `28px`. The frame width is `min(100vw - 2*pad, (100vh - 2*pad) * aspect)`. Leave that formula alone; tests lock the 1600×900 scale.

Style the engine's chrome with `.pa-frame`, `.pa-slide`, `.pa-progress`, `.pa-notes`, `.pa-overlay`, `.pa-toast`, `.pa-controls`. Hide a piece with CSS if the design does not want it. Do not remove the nodes, and do not reimplement the key handlers.

`presenterCSS` in `Presagent.init` appends extra CSS into the popup when variables are not enough. Unstyled, the popup still shows the title, notes, timer, and buttons.

## Custom slide types

Pass `renderers`. Return an HTML string. Return `null` from `renderSlide` to fall through to the type renderer.

```js
Presagent.init({
  title: 'Harbour lights',
  footer: false,
  slides: window.DECK_SLIDES,
  stage: { w: 1600, h: 900 },
  renderers: {
    signal: function (slide, ctx) {
      return '<div class="sig"><h1>' + ctx.esc(slide.title) + '</h1></div>';
    },
    video: function (slide, ctx) {
      // Keep data-video-stage and a <video> or Space will not toggle playback.
      return '<div class="sig" data-video-stage>' +
        '<video src="' + ctx.esc(slide.src) + '" controls playsinline preload="metadata"></video>' +
        '<div class="pa-video-hint">Space / click to play</div></div>';
    }
  }
});
```

`ctx` is `{ index, total, slide, slides, esc, type, deckTitle }`. `index` is 1-based.

For a local video the markup must include a `<video>` inside the slide. Wrap it in `[data-video-stage]` so a click on the surrounding stage toggles play, and so the `playing` class hides `.pa-video-hint` / `.video-hint`. Do not set `autoplay`. The engine pauses every video after each render, then wires the first stage.

A YouTube slide is an iframe to `https://www.youtube.com/embed/ID` with the allow list `accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share` and `allowfullscreen`. Do not add `autoplay=1`. Space will move to the next slide.

`renderFooter(slide, ctx)` is appended inside the slide. The default footer is the mark plus `index / total`. Pass `footer: false` if your renderer draws its own.

`slideClass(slide, ctx)` adds classes on `#slide`. `onRender(slide, ctx)` runs after video wiring. `preloadSrc(slide)` returns the next image URL to warm; the default reads `imageSrc`, then `src` on image slides, then `poster`.

## Assets

- Put files in `assets/` next to `index.html` and refer to them with relative paths (`assets/clip.mp4`).
- Prefer SVG or CSS you drew. For a photograph or a film, use something you made, or a work that is clearly public domain or CC0, and name it in the deck caption and in the README.
- Keep a bundled video modest. A talk-length file belongs on the static host or on YouTube, not in git. GitHub rejects very large files. The cinema example trims public-domain films to between 30 and 180 seconds and lists each licence in `examples/history-of-cinema/CREDITS.md`.
- Posters (`poster` on a video slide) avoid a black rectangle before play.
- The engine preloads the next slide's image at low priority. It does not download every video up front.

## Serve and deploy

Local, from the deck folder:

```bash
# Mac: double-click serve.command
# Windows: double-click serve.bat
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open the printed URL. The slide number survives a reload.

Any static host works: GitHub Pages, Vercel, Netlify, an S3 bucket. The site must be served over HTTPS so the speaker picker and the wake lock run. Point the project at the repo root if decks use relative links into `engine/`. No build command. Do not put secrets in the deck; it is a public HTML file.

## API

```js
const deck = Presagent.init({
  slides,                  // required, non-empty array
  title: 'Harbour lights', // document title and presenter window title
  stage: { w: 1600, h: 900 },
  mark: 'Harbour',         // default footer, left side
  footer: false,           // skip the default footer
  renderSlide(slide, ctx) {},
  renderers: {},
  renderFooter(slide, ctx) {},
  slideClass(slide, ctx) {},
  formatTitle(slide, ctx) {},
  onRender(slide, ctx) {},
  preloadSrc(slide) {},
  presenterCSS: '',
  presenterName: 'presagent-presenter',
  sinkStorageKey: 'presagent-audio-sink-id',
  mount: '#app'
});

deck.index;            // 1-based
deck.total;
deck.go(1);            // or -1
deck.show(4);
deck.render();
deck.openHelp();
deck.closeHelp();
deck.toggleNotes();
deck.openSink();
deck.closeSink();
deck.openPresenter();
deck.destroy();
```

Presenter messages, if you ever debug the popup:

- Deck → popup: `{ type: 'presagent-presenter', index, total, section, title, notesHtml, nextTitle, nextSection, timer }`
- Popup → deck: `{ type: 'presagent-presenter-cmd', cmd: 'prev' | 'next' | 'key', key }`
- Popup → deck: `{ type: 'presagent-presenter-ready' }`

Stable ids the engine creates and tests use: `#slide`, `#progress`, `#pa-status`, `#notes`, `#notes-title`, `#notes-body`, `#toast`, `#help-overlay`, `#sink-overlay`, `#sink-names`, `#sink-refresh`, `#prev`, `#next`. Themes style them. They do not recreate them.

## Browser support

Chrome and Edge implement the full set, including `setSinkId` and the screen wake lock. Safari can present, but it has no `setSinkId`; the picker says so, and the system output has to be changed outside the page. Other browsers without `setSinkId` get that same message. Fullscreen uses the standard API and the older `webkit` prefixed call when the standard one is missing. The wake lock is skipped, quietly, when the API or a secure context is missing.

## Before you finish

- [ ] New deck is a copy of `template/` plus your own words and CSS, not a restyle of someone else's talk.
- [ ] Every slide that a human will speak has cue notes within 6×6, one bold word each.
- [ ] `narration`, if present, is not visible in the slide, the N overlay, or the presenter window.
- [ ] Video slides use `<video>` plus `[data-video-stage]`, no `autoplay`. YouTube slides have no `autoplay=1`.
- [ ] `theme.css` does not edit key bindings, the hash, or `engine/presagent.js`.
- [ ] Assets are original, public domain, or CC0, and attributed.
- [ ] `npm test` still passes. Add a case if you added engine behaviour. A new theme does not need a new key binding.
- [ ] You opened the deck through the local server and pressed ?, N, P, S, and F.
