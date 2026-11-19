import request from "supertest";
import app from "../server.js";

it("sends supertest requests to the loopback address the test server holds", async () => {
  const test = request(app).get("/api/health");
  const { address, family } = test._server.address();
  const host = family === "IPv6" ? "[::1]" : "127.0.0.1";
  expect(address).toBe(family === "IPv6" ? "::" : "0.0.0.0");
  expect(test.url).toBe(`http://${host}:${test._server.address().port}/api/health`);
  expect((await test).body).toEqual({ status: "ok" });
});
