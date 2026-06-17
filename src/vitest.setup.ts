// Polyfill localStorage for jsdom test environment
if (!globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    length: Object.keys(store).length,
  };
}
