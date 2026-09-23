import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { admin, hash, HttpError, userId } from "../src/lib/server";
import {
  POST as authenticate,
  DELETE as signOut,
} from "../src/app/api/auth/route";
import { GET as list, POST as mutate } from "../src/app/api/console/route";
import { POST as preview } from "../src/app/api/preview/route";
import { starter } from "../src/lib/templates";

const origin = "http://localhost:3000";
function request(path: string, payload?: unknown, cookie?: string) {
  return new Request(origin + path, {
    method: payload ? "POST" : "GET",
    headers: {
      origin,
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
}

void test(
  "PostgreSQL accounts, isolation, keys, PDF preview and atomic reservations",
  {
    skip: !process.env.TEST_DATABASE_URL,
    timeout: 60000,
  },
  async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const db = admin();
    const emails = [0, 1].map(() => `test-${randomUUID()}@example.com`);
    const password = "a long integration test password";
    const sessions: string[] = [];
    const owners: string[] = [];
    try {
      for (const email of emails) {
        const response = await authenticate(
          request("/api/auth", { action: "signup", email, password }),
        );
        assert.equal(response.status, 200, await response.text());
        const cookie = response.headers.get("set-cookie")?.split(";")[0];
        assert.ok(cookie);
        sessions.push(cookie);
        owners.push(await userId(request("/api/console", undefined, cookie)));
      }
      const [ownerCookie, otherCookie] = sessions;
      const [owner] = owners;
      const template = { ...starter, id: randomUUID() };
      assert.equal(
        (
          await mutate(
            request("/api/console", { action: "save", template }, ownerCookie),
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await mutate(
            request(
              "/api/console",
              { action: "save", template: { ...template, name: "stolen" } },
              otherCookie,
            ),
          )
        ).status,
        404,
      );
      const otherData = z
        .object({ templates: z.array(z.unknown()) })
        .parse(
          await (
            await list(request("/api/console", undefined, otherCookie))
          ).json(),
        );
      assert.equal(otherData.templates.length, 0);

      const keyData = z
        .object({ key: z.string() })
        .parse(
          await (
            await mutate(
              request(
                "/api/console",
                { action: "create_key", name: "test" },
                ownerCookie,
              ),
            )
          ).json(),
        );
      const keyRequest = new Request(origin + "/api/v1/send", {
        headers: { authorization: `Bearer ${keyData.key}` },
      });
      assert.equal(await userId(keyRequest, true), owner);
      const key = await db.query<{ id: string; hash: string }>(
        "select id,hash from api_keys where owner_id = $1",
        [owner],
      );
      assert.equal(key.rows[0].hash, hash(keyData.key));
      await mutate(
        request(
          "/api/console",
          { action: "revoke_key", id: key.rows[0].id },
          otherCookie,
        ),
      );
      assert.equal(await userId(keyRequest, true), owner);
      await mutate(
        request(
          "/api/console",
          { action: "revoke_key", id: key.rows[0].id },
          ownerCookie,
        ),
      );
      await assert.rejects(
        userId(keyRequest, true),
        (error: unknown) => error instanceof HttpError && error.status === 401,
      );

      const reserve = (key: string, payloadHash = "same") =>
        db.query<{
          reservation: {
            id?: string;
            existing?: boolean;
            conflict?: boolean;
            limited?: boolean;
          };
        }>("select reserve_delivery($1,$2,$3,$4,$5,$6) as reservation", [
          owner,
          key,
          payloadHash,
          template.id,
          template.name,
          emails[0],
        ]);
      const reservations = await Promise.all([
        reserve("concurrent"),
        reserve("concurrent"),
      ]);
      assert.equal(
        reservations[0].rows[0].reservation.id,
        reservations[1].rows[0].reservation.id,
      );
      assert.equal(
        reservations.filter((result) => result.rows[0].reservation.existing)
          .length,
        1,
      );
      assert.equal(
        (await reserve("concurrent", "different")).rows[0].reservation.conflict,
        true,
      );
      await Promise.all(
        Array.from({ length: 19 }, (_, index) => reserve(`send-${index}`)),
      );
      assert.equal(
        (await reserve("over-limit")).rows[0].reservation.limited,
        true,
      );

      const pdf = await preview(
        request("/api/preview", { template }, ownerCookie),
      );
      assert.equal(pdf.status, 200);
      assert.equal(
        Buffer.from(await pdf.arrayBuffer())
          .subarray(0, 5)
          .toString(),
        "%PDF-",
      );

      const wrongPassword = await authenticate(
        request("/api/auth", {
          action: "signin",
          email: emails[0],
          password: "incorrect password",
        }),
      );
      assert.equal(wrongPassword.status, 401);
      const login = await authenticate(
        request("/api/auth", { action: "signin", email: emails[0], password }),
      );
      assert.equal(login.status, 200);
      const loginCookie = login.headers.get("set-cookie")?.split(";")[0];
      assert.ok(loginCookie);
      assert.equal(
        await userId(request("/api/console", undefined, loginCookie)),
        owner,
      );
      const logout = await signOut(
        new Request(origin + "/api/auth", {
          method: "DELETE",
          headers: { origin, cookie: loginCookie },
        }),
      );
      assert.equal(logout.status, 200);
      await assert.rejects(
        userId(request("/api/console", undefined, loginCookie)),
        (error: unknown) => error instanceof HttpError && error.status === 401,
      );
      await db.query(
        "update sessions set expires_at = now() - interval '1 second' where owner_id = $1",
        [owner],
      );
      await assert.rejects(
        userId(request("/api/console", undefined, ownerCookie)),
        (error: unknown) => error instanceof HttpError && error.status === 401,
      );
      await db.query(
        "update auth_attempts set attempts = 10 where email_hash = $1",
        [hash(emails[0])],
      );
      assert.equal(
        (
          await authenticate(
            request("/api/auth", {
              action: "signin",
              email: emails[0],
              password,
            }),
          )
        ).status,
        429,
      );
    } finally {
      await db.query("delete from users where email = any($1::text[])", [
        emails,
      ]);
      await db.query(
        "delete from auth_attempts where email_hash = any($1::text[])",
        [emails.map(hash)],
      );
      await db.end();
    }
  },
);
