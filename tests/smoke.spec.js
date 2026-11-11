const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const DEMO = '/examples/history-of-cinema/';
const TEMPLATE = '/template/';

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
  });
  return errors;
}

function assertClean(errors) {
  expect(errors, errors.join('\n')).toEqual([]);
}

test.describe('history of cinema', () => {
  test('loads without console errors and deep-links through the hash', async ({ page }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(DEMO);
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '1');
    await expect(page.locator('#slide')).toHaveAttribute('data-type', 'title');
    await expect(page.locator('#pa-status')).toHaveText('1 / 20');
    await expect(page).toHaveURL(/#1$/);
    await expect(page).toHaveTitle(/1\/20 · A history of cinema/);
    await expect(page.locator('#slide')).toHaveCSS('width', '1600px');
    await expect(page.locator('#slide')).toHaveCSS('height', '900px');

    const scale = await page.locator('#slide').evaluate((el) => {
      const match = el.style.transform.match(/scale\(([^)]+)\)/);
      return match ? Number(match[1]) : NaN;
    });
    expect(Math.abs(scale - 0.7378)).toBeLessThan(0.01);

    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/#2$/);
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '2');
    await expect(page.locator('h1')).toHaveText('Before the picture moved');

    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/#1$/);
    await page.keyboard.press('PageDown');
    await expect(page).toHaveURL(/#2$/);
    await page.keyboard.press('PageUp');
    await expect(page).toHaveURL(/#1$/);
    await page.keyboard.press('End');
    await expect(page).toHaveURL(/#20$/);
    await expect(page.locator('h1')).toHaveText('Leave the number in the address');
    await page.keyboard.press('Home');
    await expect(page).toHaveURL(/#1$/);

    await page.locator('#next').click({ force: true });
    await expect(page).toHaveURL(/#2$/);
    await page.locator('#prev').click({ force: true });
    await expect(page).toHaveURL(/#1$/);

    await page.goto(DEMO + '#4');
    await expect(page.locator('#slide')).toHaveAttribute('data-type', 'timeline');
    await expect(page.locator('.hoc-rail li')).toHaveCount(6);

    const fresh = await page.context().newPage();
    fresh.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
    fresh.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
    await fresh.goto(DEMO + '#nope');
    await expect(fresh).toHaveURL(/#1$/);
    await expect(fresh.locator('#slide')).toHaveAttribute('data-index', '1');
    await fresh.close();
    await page.goto(DEMO + '#2');
    await page.evaluate(() => { location.hash = '#99'; });
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '2');
    assertClean(errors);
  });

  test('? lists every key, H and Esc close it, and help swallows navigation', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(DEMO);
    await page.keyboard.press('?');
    const help = page.locator('#help-overlay');
    await expect(help).toBeVisible();
    await expect(help.locator('kbd')).toHaveCount(10);
    for (const label of [
      'Previous / next slide',
      'Play or pause clip, or next slide',
      'First / last slide',
      'Fullscreen',
      'Speaker notes',
      'Presenter view',
      'Audio output',
      'This list (H also works)',
      'Close overlays',
      'The screen stays awake while the deck is in fullscreen.'
    ]) {
      await expect(help).toContainText(label);
    }
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '1');
    await page.keyboard.press('h');
    await expect(help).toBeHidden();
    await page.keyboard.press('h');
    await expect(help).toBeVisible();
    await help.click({ position: { x: 8, y: 8 } });
    await expect(help).toBeHidden();
    await page.keyboard.press('?');
    await page.keyboard.press('Escape');
    await expect(help).toBeHidden();
    assertClean(errors);
  });

  test('N shows cue notes and keeps narration off the slide and the overlay', async ({ page }) => {
    const errors = trackErrors(page);
    const secret = 'This longer script stays off the slide.';
    await page.goto(DEMO);
    await expect(page.locator('#notes')).toBeHidden();
    await expect(page.locator('#slide')).not.toContainText(secret);
    await page.keyboard.press('n');
    await expect(page.locator('#notes')).toBeVisible();
    await expect(page.locator('#notes-title')).toHaveText('01 · Title');
    await expect(page.locator('#notes-body')).toContainText('Open on a dark house');
    await expect(page.locator('#notes-body strong').first()).toHaveText('Open');
    await expect(page.locator('#notes-body')).not.toContainText(secret);
    await expect(page.locator('#toast')).toHaveText('Notes on (N to hide)');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#notes')).toBeVisible();
    await expect(page.locator('#notes-body')).toContainText('Pause before the camera');
    await page.keyboard.press('n');
    await expect(page.locator('#notes')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.locator('#notes')).toBeHidden();
    assertClean(errors);
  });

  test('Space advances a text slide and plays a local video without changing slides', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(DEMO + '#4');
    await page.keyboard.press('Space');
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '5');
    await expect(page.locator('h1')).toHaveText('A train comes in');

    const video = page.locator('#slide video');
    await expect(video).toHaveAttribute('src', /train\.mp4$/);
    await expect(video).toHaveJSProperty('paused', true);
    await expect(page.locator('.pa-video-hint')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(video).toHaveJSProperty('paused', false);
    await expect(page.locator('[data-video-stage]')).toHaveClass(/playing/);
    await expect(page.locator('.pa-video-hint')).toBeHidden();
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '5');
    await page.evaluate(() => {
      document.querySelector('[data-video-stage]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(video).toHaveJSProperty('paused', true);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '6');
    await expect(page.locator('#slide video')).toHaveCount(0);
    assertClean(errors);
  });

  test('the three clips sit between 30 and 180 seconds, and Willie has audio', async ({ page }) => {
    const errors = trackErrors(page);
    async function durationOf(hash) {
      await page.goto(DEMO + hash);
      await page.waitForFunction(() => {
        const video = document.querySelector('#slide video');
        return video && Number.isFinite(video.duration) && video.duration > 0;
      });
      return page.locator('#slide video').evaluate((video) => video.duration);
    }
    for (const hash of ['#5', '#8', '#15']) {
      const seconds = await durationOf(hash);
      expect(seconds).toBeGreaterThanOrEqual(30);
      expect(seconds).toBeLessThanOrEqual(180);
    }
    await page.goto(DEMO + '#15');
    await expect(page.locator('#slide video')).toHaveAttribute('src', /willie\.mp4$/);
    await page.keyboard.press('Space');
    await expect.poll(async () => page.locator('#slide video').evaluate((video) => video.webkitAudioDecodedByteCount || 0), { timeout: 8000 }).toBeGreaterThan(0);
    assertClean(errors);
  });

  test('P opens a presenter window that stays in sync both ways', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(DEMO);
    const popupPromise = page.waitForEvent('popup');
    await page.keyboard.press('p');
    const popup = await popupPromise;
    const popupErrors = trackErrors(popup);
    await expect(popup.locator('#title')).toHaveText('A history of cinema');
    await expect(popup.locator('#count')).toHaveText('1 / 20');
    await expect(popup.locator('#sec')).toHaveText('01 · Title');
    await expect(popup.locator('#notes')).toContainText('Open on a dark house');
    await expect(popup.locator('#notes')).not.toContainText('This longer script stays off the slide.');
    await expect(popup.locator('#next')).toContainText('Before the picture moved');
    await expect(popup.locator('#timer')).toHaveText(/^\d\d:\d\d$/);
    const started = await popup.locator('#timer').innerText();
    await expect.poll(async () => popup.locator('#timer').innerText(), { timeout: 4000 }).not.toBe(started);
    const timerColor = await popup.locator('#timer').evaluate((el) => getComputedStyle(el).color);
    expect(timerColor).toBe('rgb(230, 161, 92)');

    await popup.keyboard.press('ArrowRight');
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '2');
    await expect(popup.locator('#title')).toHaveText('Before the picture moved');
    await expect(popup.locator('#count')).toHaveText('2 / 20');

    await popup.locator('#nextBtn').click();
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '3');
    await expect(popup.locator('#title')).toHaveText('Three toys that already knew');

    await popup.locator('#prevBtn').click();
    await expect(page.locator('#slide')).toHaveAttribute('data-index', '2');

    await page.keyboard.press('ArrowRight');
    await expect(popup.locator('#count')).toHaveText('3 / 20');

    await popup.keyboard.press('n');
    await expect(page.locator('#notes')).toBeVisible();
    await popup.keyboard.press('?');
    await expect(page.locator('#help-overlay')).toBeVisible();
    await popup.keyboard.press('Escape');
    await expect(page.locator('#help-overlay')).toBeHidden();

    assertClean(errors);
    assertClean(popupErrors);
  });

  test('S opens the speaker picker, persists a choice, and reapplies it', async ({ page }) => {
    const errors = trackErrors(page);
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.setSinkId = function (id) {
        this.dataset.appliedSink = String(id);
        return Promise.resolve();
      };
      window.__outputs = [
        { kind: 'audiooutput', deviceId: 'default', label: 'Laptop Speakers' },
        { kind: 'audiooutput', deviceId: 'hdmi-1', label: 'HDMI Monitor' }
      ];
      const md = navigator.mediaDevices;
      md.enumerateDevices = async () => window.__outputs.map((device) => Object.assign({ kind: 'audiooutput', label: '' }, device));
      md.getUserMedia = async () => ({ getTracks: () => [{ stop() {} }] });
      const skip = async () => {
        const error = new Error('skip');
        error.name = 'NotFoundError';
        throw error;
      };
      try {
        Object.defineProperty(md, 'selectAudioOutput', { configurable: true, value: skip });
      } catch (e) {
        md.selectAudioOutput = skip;
      }
      if (navigator.permissions && navigator.permissions.query) {
        const query = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (desc) => {
          if (desc && desc.name === 'microphone') return Promise.resolve({ state: 'prompt' });
          return query(desc);
        };
      }
    });

    await page.goto(DEMO);
    await page.keyboard.press('s');
    await expect(page.locator('#sink-overlay')).toBeVisible();
    await expect(page.locator('#sink-title')).toHaveText('Audio output');
    await expect(page.locator('#sink-names')).toBeVisible();
    await expect(page.locator('#sink-names')).toHaveText('Allow access to list speakers');
    await expect(page.locator('#sink-refresh')).toBeVisible();
    await expect(page.locator('#sink-hint')).toContainText('Enter to apply');
    await expect(page.locator('.sink-item')).toHaveCount(3);
    await page.locator('#sink-names').click();
    await expect(page.locator('#sink-error')).toBeHidden();

    await page.locator('.sink-item', { hasText: 'HDMI Monitor' }).click();
    await expect(page.locator('#toast')).toHaveText('Audio → HDMI Monitor');
    await expect(page.locator('#sink-overlay')).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('presagent-audio-sink-id'))).toBe('hdmi-1');

    await page.goto(DEMO + '#5');
    await expect(page.locator('#slide video')).toHaveAttribute('data-applied-sink', 'hdmi-1');

    await page.evaluate(() => {
      window.__outputs = [{ kind: 'audiooutput', deviceId: 'default', label: 'Laptop Speakers' }];
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
    });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('presagent-audio-sink-id'))).toBe(null);

    await page.keyboard.press('s');
    await page.keyboard.press('?');
    await expect(page.locator('#help-overlay')).toBeVisible();
    await expect(page.locator('#sink-overlay')).toBeHidden();
    assertClean(errors);
  });

  test('fullscreen asks for a screen wake lock once, then releases it', async ({ page }) => {
    const errors = trackErrors(page);
    await page.addInitScript(() => {
      window.__wake = [];
      let fullscreen = null;
      const lockAPI = {
        request(type) {
          const lock = {
            type,
            released: false,
            addEventListener(name, fn) { if (name === 'release') this.onrelease = fn; },
            release() {
              this.released = true;
              if (typeof this.onrelease === 'function') this.onrelease();
            }
          };
          window.__wake.push(lock);
          return Promise.resolve(lock);
        }
      };
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, get: () => lockAPI });
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen });
      Element.prototype.requestFullscreen = function () {
        fullscreen = this;
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      };
      Document.prototype.exitFullscreen = function () {
        fullscreen = null;
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      };
    });

    await page.goto(DEMO);
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => window.__wake.length)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__wake[0].type)).toBe('screen');
    await expect(page.locator('#toast')).toHaveText('Screen will stay awake');

    await page.evaluate(() => {
      const lock = window.__wake[0];
      lock.released = true;
      if (typeof lock.onrelease === 'function') lock.onrelease();
    });
    await expect.poll(() => page.evaluate(() => window.__wake.length)).toBe(2);

    await expect(page.locator('#toast')).toBeHidden({ timeout: 3000 });
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => window.__wake[0].released && window.__wake[1].released)).toBe(true);
    await page.waitForTimeout(250);
    await expect(page.locator('#toast')).toBeHidden();
    assertClean(errors);
  });
});

test('the template deck navigates and hides its narration', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(TEMPLATE);
  await expect(page.locator('h1')).toHaveText('Untitled talk');
  await expect(page.locator('#slide')).toHaveCSS('width', '1600px');
  const secret = 'This sentence is a speaker script.';
  await expect(page.locator('#slide')).not.toContainText(secret);
  await page.keyboard.press('n');
  await expect(page.locator('#notes-body')).not.toContainText(secret);
  await expect(page.locator('#notes-body strong').first()).toHaveText('name');
  await page.keyboard.press('End');
  await expect(page).toHaveURL(/#3$/);
  await page.keyboard.press('?');
  await expect(page.locator('#help-overlay kbd')).toHaveCount(10);
  assertClean(errors);
});

test('the repo does not carry the reference deck’s client material', async () => {
  const banned = [
    'Momen' + 'tum',
    'San' + 'lam',
    'Oco' + 'toco',
    'Future' + ' Crimes',
    'future-' + 'crimes',
    'Brown' + 'ing',
    'Coffee' + 'zilla',
    'Stellen' + 'bosch',
    'scam-' + 'bait',
    'fc-' + 'presenter',
    'fc-' + 'audio'
  ];
  const skip = new Set(['node_modules', '.git', 'test-results', 'playwright-report', 'blob-report']);
  const textExt = new Set(['.js', '.mjs', '.css', '.html', '.md', '.txt', '.svg', '.json', '.yml', '.yaml', '.command', '.bat']);
  const hits = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && textExt.has(path.extname(entry.name).toLowerCase())) {
        const hay = fs.readFileSync(full, 'utf8').toLowerCase();
        for (const word of banned) {
          if (hay.includes(word.toLowerCase())) hits.push(path.relative(process.cwd(), full) + ' :: ' + word);
        }
      }
    }
  }
  walk(process.cwd());
  expect(hits, hits.join('\n')).toEqual([]);
});
