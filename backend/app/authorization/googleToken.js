import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import authConfig from "../config/auth.config.js";

let client;

const googleClient = () => {
  if (!client) {
    client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return client;
};

/** Verify a Google ID token. Tests sign a stand-in token with AUTH_SECRET. */
export const verifyGoogleIdToken = async (credential) => {
  if (!credential || typeof credential !== "string" || !credential.trim()) {
    return null;
  }

  if (process.env.NODE_ENV === "test") {
    try {
      return jwt.verify(credential, authConfig.secret);
    } catch {
      return null;
    }
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return null;
  }

  try {
    const ticket = await googleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload() ?? null;
  } catch {
    return null;
  }
};
