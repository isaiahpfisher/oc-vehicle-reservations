// Google redirect (frontend-services.mdc: production deploys under a subpath)
import { afterEach, describe, expect, it, vi } from "vitest";
import { startGoogleSignIn } from "../src/services/googleAuth.js";

const redirectUriFor = (baseUrl) => {
  vi.stubEnv("BASE_URL", baseUrl);
  const assign = vi.fn();
  vi.stubGlobal("location", { origin: "https://example.test", assign });

  startGoogleSignIn();

  return new URL(assign.mock.calls[0][0]).searchParams.get("redirect_uri");
};

describe("startGoogleSignIn (frontend-services.mdc)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("redirects back to /login at the site root in development", () => {
    expect(redirectUriFor("/")).toBe("https://example.test/login");
  });

  it("redirects back to the login route under the production subpath", () => {
    expect(redirectUriFor("/seiv2026/p4/t1/")).toBe("https://example.test/seiv2026/p4/t1/login");
  });
});
