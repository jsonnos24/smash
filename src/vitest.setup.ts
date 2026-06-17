// Polyfill localStorage for the test environment.
// Vitest's jsdom environment does NOT expose `localStorage` on the global
// (verified: `typeof globalThis.localStorage === "undefined"` without this
// file), even though jsdom implements it. The persistence layer's tests need
// it, so this shim is required — do not remove it.
if (!globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return index in keys ? keys[index] : null;
    },
    // Live getter so length tracks the store (a static value would freeze at 0).
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}
