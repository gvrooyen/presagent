/* Slide data for this deck. Prose fields are HTML. Media attributes are plain text.
   cueNotes are what N and the presenter window show. narration is never shown. */
window.DECK_SLIDES = [
  {
    type: 'title',
    eyebrow: 'A new deck',
    title: 'Untitled talk',
    subtitle: 'Replace this copy. Restyle <em>theme.css</em>. Keep the engine.',
    docSection: '01 · Title',
    cueNotes: [
      { text: 'Say your name once', bold: 'name' },
      { text: 'Promise the three points', bold: 'three' }
    ],
    narration: 'This sentence is a speaker script. It must not appear on the slide, in the notes overlay, or in the presenter window.'
  },
  {
    type: 'text',
    eyebrow: 'What to edit',
    title: 'Three files, then the assets',
    bullets: [
      '<strong>slides.js</strong> holds the words.',
      '<strong>theme.css</strong> holds the look.',
      '<strong>deck.js</strong> holds custom slide types.'
    ],
    docSection: '02 · What to edit',
    cueNotes: [
      { text: 'Point at slides.js', bold: 'slides.js' },
      { text: 'Then the theme file', bold: 'theme' },
      { text: 'Custom types live in deck.js', bold: 'deck.js' }
    ]
  },
  {
    type: 'text',
    eyebrow: 'Leave-behind',
    title: 'Press ? any time',
    subtitle: 'The hash in the address bar is the slide number.',
    docSection: '03 · Close',
    cueNotes: [
      { text: 'Show the question-mark help', bold: 'help' },
      { text: 'Stop. Do not add a slide.', bold: 'Stop' }
    ]
  }
];
