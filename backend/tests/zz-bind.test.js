import request from "supertest";
import app from "../server.js";
it("binds supertest servers to 127.0.0.1", async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  expect(server.address().address).toBe("127.0.0.1");
  server.close();
  expect((await request(app).get("/api/health")).body).toEqual({ status: "ok" });
});
