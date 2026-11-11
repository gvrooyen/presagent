/**
 * ES module entry for presagent.
 * The implementation lives in presagent.js so a plain script tag works
 * with no build step. This module injects that file and re-exports it.
 *
 *   import { init } from './presagent.mjs';
 *
 * Classic pages should use <script src="presagent.js"></script> instead.
 * Importing this module needs a browser document and an HTTP origin;
 * file:// often blocks module imports.
 */
if (typeof document === 'undefined') {
  throw new Error('presagent.mjs needs a browser document. Use presagent.js from Node, or serve the page over http.');
}

function loadClassic() {
  if (globalThis.Presagent && typeof globalThis.Presagent.init === 'function') {
    return Promise.resolve(globalThis.Presagent);
  }
  return new Promise(function (resolve, reject) {
    var script = document.createElement('script');
    script.src = new URL('./presagent.js', import.meta.url).href;
    script.onload = function () { resolve(globalThis.Presagent); };
    script.onerror = function () { reject(new Error('presagent: failed to load presagent.js')); };
    document.head.appendChild(script);
  });
}

const api = await loadClassic();

export const version = api.version;
export const keys = api.keys;
export const esc = api.esc;
export const init = (options) => api.init(options);
export default api;
