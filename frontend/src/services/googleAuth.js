const NONCE_KEY = "google-oauth-nonce";

const decodePayload = (idToken) => {
  const segment = idToken.split(".")[1];
  if (!segment) {
    return null;
  }

  const json = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
};

/** Send the browser to Google. Google redirects back to /login#id_token=... */
export const startGoogleSignIn = () => {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(NONCE_KEY, nonce);

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    redirect_uri: `${window.location.origin}/login`,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });

  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  return null;
};

/** Read the ID token Google put on the /login redirect, if the nonce matches. */
export const readRedirectIdToken = () => {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hash) {
    return null;
  }

  const idToken = new URLSearchParams(hash).get("id_token");
  if (!idToken) {
    return null;
  }

  const expectedNonce = sessionStorage.getItem(NONCE_KEY);
  sessionStorage.removeItem(NONCE_KEY);

  let nonce = "";
  try {
    nonce = decodePayload(idToken)?.nonce || "";
  } catch {
    return null;
  }

  if (!expectedNonce || nonce !== expectedNonce) {
    return null;
  }

  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  return idToken;
};
