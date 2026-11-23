global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom has no layout, so it doesn't implement scrolling.
Element.prototype.scrollIntoView = () => {};

Object.defineProperty(global, "visualViewport", {
  value: {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  configurable: true,
});

const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// UI/UX backlog #48: the success toast lives in a store shared by the whole run; start every test without one,
// so a toast from one test isn't on screen in the next.
import { beforeEach } from "vitest";
beforeEach(async () => {
  const { useNoticeStore } = await import("../src/stores/notice.js");
  useNoticeStore().clear();
});
