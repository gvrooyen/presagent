Untitled talk
=============

Open index.html in Chrome or Edge. Press ? for the full control list.
Press S to pick which speakers play clip audio.

Audio output (S)
- Works in Chrome and Edge. Safari can't switch output in the page;
  change the system output, then reload. The slide number stays in
  the URL (#3 and so on).
- The picker needs a secure context (https, or http://127.0.0.1).
- Opening index.html as a file usually will not let the browser
  switch audio output. Double-click serve.command (Mac) or serve.bat
  (Windows), or from this folder's parent run:

      python3 -m http.server 8000 --bind 127.0.0.1

  The serve script finds the presagent engine and opens the right URL.

Controls
  ← / →       Previous / next slide
  Space       Play or pause a clip, or next slide
  PgUp/PgDn   Previous / next
  Home / End  First / last slide
  F           Fullscreen
  N           Speaker notes
  P           Presenter view (allow pop-ups)
  S           Audio output
  ? or H      Control list
  Esc         Close overlays
