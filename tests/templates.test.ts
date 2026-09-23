import test from "node:test";
import assert from "node:assert/strict";
import {
  renderTemplate,
  starter,
  templateSchema,
  validateData,
} from "../src/lib/templates";
import { body, HttpError, userId } from "../src/lib/server";

void test("invoice renders repeating rows and escapes supplied HTML", () => {
  const result = renderTemplate(starter, {
    ...starter.sample_data,
    customer_name: "<script>alert(1)</script>",
  });
  assert.match(result, /&lt;script&gt;/);
  assert.match(result, /Development support/);
  assert.match(result, /Content-Security-Policy/);
});
void test("unknown and missing variables are rejected including inside rows", () => {
  assert.throws(
    () =>
      validateData(starter.variables, { ...starter.sample_data, extra: true }),
    /Unknown variable/,
  );
  assert.throws(() => validateData(starter.variables, {}), /Missing required/);
  assert.throws(
    () =>
      validateData(starter.variables, {
        ...starter.sample_data,
        items: [{ description: "Design", amount: 1, extra: 2 }],
      }),
    /Unknown variable/,
  );
});
void test("numbers and dates use strict types and valid calendar dates", () => {
  assert.throws(
    () =>
      validateData(starter.variables, {
        ...starter.sample_data,
        total: "1250",
      }),
    /must be a number/,
  );
  assert.throws(
    () =>
      validateData(starter.variables, {
        ...starter.sample_data,
        invoice_date: "2026-02-30",
      }),
    /valid YYYY-MM-DD/,
  );
});
void test("defaults apply and optional lists are empty", () => {
  assert.deepEqual(
    validateData(
      [
        { name: "title", type: "text", required: true, default: "Hello" },
        {
          name: "rows",
          type: "list",
          required: false,
          fields: [{ name: "value", type: "number", required: true }],
        },
      ],
      {},
    ),
    { title: "Hello", rows: [] },
  );
});
void test("undeclared template references, raw HTML, duplicate variables and unsafe image URLs fail", () => {
  assert.throws(() =>
    renderTemplate({ ...starter, html: "{{unknown}}" }, starter.sample_data),
  );
  assert.throws(
    () =>
      renderTemplate(
        { ...starter, html: "{{{customer_name}}}" },
        starter.sample_data,
      ),
    /raw HTML/,
  );
  assert.throws(
    () =>
      validateData(
        [starter.variables[0], starter.variables[0]],
        starter.sample_data,
      ),
    /unique/,
  );
  assert.throws(
    () =>
      validateData([{ name: "logo", type: "image", required: true }], {
        logo: "http://127.0.0.1/secret",
      }),
    /embedded/,
  );
  assert.equal(
    templateSchema.safeParse({
      ...starter,
      variables: [{ name: "constructor", type: "text", required: true }],
    }).success,
    false,
  );
});
void test("row count is bounded", () =>
  assert.throws(
    () =>
      validateData(starter.variables, {
        ...starter.sample_data,
        items: Array.from({ length: 101 }, () => ({
          description: "x",
          amount: 1,
        })),
      }),
    /at most 100/,
  ));
void test("unauthenticated requests fail before database access", async () => {
  await assert.rejects(
    userId(new Request("http://localhost")),
    (e: unknown) => e instanceof HttpError && e.status === 401,
  );
});
void test("JSON reader bounds actual bytes and rejects malformed JSON", async () => {
  await assert.rejects(
    body(
      new Request("http://localhost", {
        method: "POST",
        body: "x".repeat(1024 * 1024 + 1),
      }),
    ),
    (e: unknown) => e instanceof HttpError && e.status === 413,
  );
  await assert.rejects(
    body(new Request("http://localhost", { method: "POST", body: "{" })),
    (e: unknown) => e instanceof HttpError && e.status === 400,
  );
});
void test("block conditions must be declared and nested loops are rejected", () => {
  assert.throws(
    () =>
      renderTemplate(
        { ...starter, html: "{{#if unknown}}yes{{/if}}" },
        starter.sample_data,
      ),
    /Unknown template variable/,
  );
  assert.throws(
    () =>
      renderTemplate(
        {
          ...starter,
          html: "{{#each items}}{{#each description}}x{{/each}}{{/each}}",
        },
        starter.sample_data,
      ),
    /nested loops/,
  );
  assert.throws(
    () =>
      renderTemplate(
        { ...starter, html: "{{#each items}}{{missing}}{{/each}}" },
        { ...starter.sample_data, items: [] },
      ),
    /Unknown template variable/,
  );
});
