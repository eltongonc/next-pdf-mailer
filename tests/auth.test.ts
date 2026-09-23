import test from "node:test";
import assert from "node:assert/strict";
import { passwordHash, verifyPassword } from "../src/lib/password";
import { HttpError, sameOrigin, sessionToken, userId } from "../src/lib/server";

void test("password hashes are salted and verify only the correct password", async () => {
  const first = await passwordHash("correct horse battery staple");
  const second = await passwordHash("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(
    await verifyPassword("correct horse battery staple", first),
    true,
  );
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword("password", "invalid"), false);
});
void test("cookie parsing matches only the session cookie", () => {
  assert.equal(
    sessionToken(
      new Request("http://localhost", {
        headers: { cookie: "other=x; paperpost_session=abc; final=y" },
      }),
    ),
    "abc",
  );
  assert.equal(
    sessionToken(
      new Request("http://localhost", {
        headers: { cookie: "other_paperpost_session=abc" },
      }),
    ),
    undefined,
  );
});
void test("cookie writes reject missing or cross-site origins before database access", async () => {
  for (const origin of ["https://attacker.example", ""]) {
    const request = new Request("http://localhost/api/console", {
      method: "POST",
      headers: {
        cookie: "paperpost_session=abc",
        ...(origin ? { origin } : {}),
      },
    });
    await assert.rejects(
      userId(request),
      (error: unknown) => error instanceof HttpError && error.status === 403,
    );
  }
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("http://localhost/api/auth", {
        headers: { origin: process.env.APP_ORIGIN || "http://localhost" },
      }),
    ),
  );
});
void test("API keys cannot authenticate dashboard routes", async () => {
  await assert.rejects(
    userId(
      new Request("http://localhost/api/console", {
        headers: { authorization: "Bearer pp_example" },
      }),
    ),
    (error: unknown) => error instanceof HttpError && error.status === 401,
  );
});
