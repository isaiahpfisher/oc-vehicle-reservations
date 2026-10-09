import { reactive } from "vue";
import Utils from "../config/utils";

const defaults = {
  title: "Are you sure?",
  message: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
  confirmColor: "primary",
  maxWidth: 420,
  onConfirm: null,
};

const state = reactive({ open: false, loading: false, error: "", options: { ...defaults } });
let resolver = null;

const settle = (result) => {
  resolver?.(result);
  resolver = null;
  state.open = false;
  state.loading = false;
};

const confirm = (options = {}) => {
  settle(false);
  state.options = { ...defaults, ...options };
  state.error = "";
  state.open = true;
  return new Promise((resolve) => {
    resolver = resolve;
  });
};

const accept = async () => {
  const { onConfirm } = state.options;
  if (!onConfirm) return settle(true);

  state.loading = true;
  state.error = "";

  try {
    await onConfirm();
    settle(true);
  } catch (error) {
    state.error = Utils.errorMessage(error, "Something went wrong.");
    state.loading = false;
  }
};

const cancel = () => {
  if (!state.loading) settle(false);
};

export const useConfirm = () => confirm;

export const useConfirmState = () => ({ state, accept, cancel });
