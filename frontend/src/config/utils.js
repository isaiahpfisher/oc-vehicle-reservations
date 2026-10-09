const Utils = {
  setStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getStore(key) {
    const value = localStorage.getItem(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },

  removeItem(key) {
    localStorage.removeItem(key);
  },

  errorMessage: (error, fallback) => error?.response?.data?.message || error?.message || fallback,
};

export default Utils;
