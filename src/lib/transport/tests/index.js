// should I really use "I_" to prefix imported types from other modules
// just so they don't clash with global types? 🙄

/**
 * @typedef I_AnyTransport
 * @type {import('../index.js').AnyTransport}
 */

/**
 * @type {Set<I_AnyTransport>}
 */
const test = new Set();
test.forEach((transport) => {
  transport.connect();
});
