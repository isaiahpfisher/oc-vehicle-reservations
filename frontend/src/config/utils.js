// The signed-in user lives in the Pinia auth store (stores/auth.js), not here.
const Utils = {
  errorMessage: (error, fallback) => error?.response?.data?.message || error?.message || fallback,
};

export default Utils;
