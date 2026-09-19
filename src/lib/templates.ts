import Handlebars from "handlebars";
import { z } from "zod";

const name = z
  .string()
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/,
    "Use letters, numbers and underscores; start with a letter.",
  )
  .refine(
    (v) => !["constructor", "prototype", "__proto__"].includes(v),
    "Reserved name",
  );
const scalar = z
  .object({
    name,
    type: z.enum(["text", "number", "date", "image"]),
    required: z.boolean(),
    default: z.union([z.string().max(200000), z.number()]).optional(),
  })
  .strict();
export const variableSchema = z.union([
  scalar,
  z
    .object({
      name,
      type: z.literal("list"),
      required: z.boolean(),
      fields: z.array(scalar).min(1).max(20),
    })
    .strict(),
]);
export type Variable = z.infer<typeof variableSchema>;
export const templateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    html: z.string().min(1).max(100000),
    variables: z.array(variableSchema).max(40),
    sample_data: z.record(z.string(), z.unknown()),
  })
  .strict();
export type Template = z.infer<typeof templateSchema>;
export type Delivery = {
  id: string;
  template_name: string;
  recipient: string;
  status: string;
  created_at: string;
  error: string | null;
};
export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
};

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function validateData(
  variables: Variable[],
  input: unknown,
): Record<string, unknown> {
  if (!object(input)) throw new Error("Variables must be a JSON object.");
  const names = new Set(variables.map((v) => v.name));
  if (names.size !== variables.length)
    throw new Error("Variable names must be unique.");
  for (const key of Object.keys(input))
    if (!names.has(key)) throw new Error(`Unknown variable: ${key}`);
  const result: Record<string, unknown> = {};
  for (const field of variables) {
    const value = Object.hasOwn(input, field.name)
      ? input[field.name]
      : "default" in field
        ? field.default
        : undefined;
    if (value === undefined || value === null || value === "") {
      if (field.required)
        throw new Error(`Missing required variable: ${field.name}`);
      result[field.name] = field.type === "list" ? [] : "";
      continue;
    }
    if (field.type === "list") {
      if (!Array.isArray(value) || value.length > 100)
        throw new Error(`${field.name} must be a list with at most 100 rows.`);
      result[field.name] = value.map((row) => validateData(field.fields, row));
      continue;
    }
    if (field.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`${field.name} must be a number.`);
    } else {
      if (typeof value !== "string" || value.length > 200000)
        throw new Error(`${field.name} must be text (max 200,000 characters).`);
      if (
        field.type === "date" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          Number.isNaN(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        throw new Error(`${field.name} must be a valid YYYY-MM-DD date.`);
      if (
        field.type === "image" &&
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)
      )
        throw new Error(
          `${field.name} must be an embedded PNG, JPEG or WebP data URL.`,
        );
    }
    result[field.name] = value;
  }
  return result;
}
function validateReferences(html: string, variables: Variable[]) {
  const ast = Handlebars.parse(html);
  function visit(
    program: hbs.AST.Program,
    scope: Variable[],
    inRow = false,
    depth = 0,
  ) {
    if (depth > 8)
      throw new Error("Template blocks can be nested at most 8 levels.");
    function field(expression: hbs.AST.Expression) {
      const path = expression as hbs.AST.PathExpression;
      if (
        path.type !== "PathExpression" ||
        path.depth ||
        path.data ||
        path.parts.length !== 1
      )
        throw new Error("Use a declared variable name directly.");
      const result = scope.find((v) => v.name === path.parts[0]);
      if (!result)
        throw new Error(`Unknown template variable: ${path.original}`);
      return result;
    }
    for (const node of program.body) {
      if (node.type === "ContentStatement" || node.type === "CommentStatement")
        continue;
      if (node.type === "MustacheStatement") {
        const statement = node as hbs.AST.MustacheStatement;
        if (
          statement.params.length ||
          statement.hash?.pairs.length ||
          !statement.escaped
        )
          throw new Error("Use escaped variables without custom helpers.");
        field(statement.path);
      } else if (node.type === "BlockStatement") {
        const block = node as hbs.AST.BlockStatement;
        if (
          !["each", "if", "unless"].includes(block.path.original) ||
          block.params.length !== 1 ||
          block.hash?.pairs.length ||
          block.program.blockParams?.length
        )
          throw new Error(
            "Supported blocks are #each, #if and #unless with one declared variable.",
          );
        const target = field(block.params[0]);
        if (block.path.original === "each") {
          if (inRow || target.type !== "list")
            throw new Error(
              "#each needs a declared list; nested loops are disabled.",
            );
          visit(block.program, target.fields, true, depth + 1);
        } else visit(block.program, scope, inRow, depth + 1);
        if (block.inverse) visit(block.inverse, scope, inRow, depth + 1);
      } else
        throw new Error(
          "Partials, decorators and custom helpers are disabled.",
        );
    }
  }
  visit(ast, variables);
}
export function renderTemplate(template: Template, data: unknown): string {
  const values = validateData(template.variables, data);
  if (/\{\{\{|\{\{\s*&/.test(template.html))
    throw new Error(
      "Use escaped {{variables}}; raw HTML variables are disabled.",
    );
  validateReferences(template.html, template.variables);
  const html = Handlebars.compile(template.html, {
    strict: true,
    knownHelpersOnly: true,
  })(values);
  if (html.length > 2_000_000)
    throw new Error("Rendered document exceeds 2 MB.");
  // The same restrictive document policy is used for HTML preview and PDF rendering.
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'"><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#222}img{max-width:100%}tr{break-inside:avoid}</style></head><body>${html}</body></html>`;
}
export const starter: Template = {
  id: "a34a0e24-15a9-4c30-905a-03fd468bd18a",
  name: "Monthly invoice",
  variables: [
    { name: "customer_name", type: "text", required: true },
    { name: "invoice_number", type: "text", required: true },
    { name: "invoice_date", type: "date", required: true },
    { name: "total", type: "number", required: true },
    {
      name: "items",
      type: "list",
      required: true,
      fields: [
        { name: "description", type: "text", required: true },
        { name: "amount", type: "number", required: true },
      ],
    },
  ],
  sample_data: {
    customer_name: "Studio North",
    invoice_number: "INV-2026-001",
    invoice_date: "2026-09-19",
    total: 1250,
    items: [
      { description: "Product design · September", amount: 1000 },
      { description: "Development support", amount: 250 },
    ],
  },
  html: `<style>
.header{display:flex;justify-content:space-between;align-items:start;margin-bottom:70px}.brand{font-size:23px;font-weight:bold;letter-spacing:-1px}.dot{color:#ce5a3d}.muted{color:#888;font-size:12px;line-height:1.7}h1{font-size:42px;letter-spacing:-2px;margin:0 0 12px}.details{display:flex;justify-content:space-between;margin:36px 0 45px}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;color:#888;font-size:10px;letter-spacing:1px;text-transform:uppercase}td,th{padding:16px 0;border-bottom:1px solid #e7e5e1}.right{text-align:right}.total{text-align:right;font-size:23px;font-weight:bold;margin-top:28px}.footer{margin-top:100px;border-top:1px solid #e7e5e1;padding-top:20px}
</style>
<div class="header"><div class="brand"><span class="dot">◒</span> acme studio</div><div class="muted">Designing good things.<br>Amsterdam, Netherlands</div></div>
<h1>Invoice</h1><div class="muted">{{invoice_number}}</div>
<div class="details"><div><div class="muted">BILL TO</div><p>{{customer_name}}</p></div><div><div class="muted">ISSUED ON</div><p>{{invoice_date}}</p></div></div>
<table><thead><tr><th>Description</th><th class="right">Amount (EUR)</th></tr></thead><tbody>{{#each items}}<tr><td>{{description}}</td><td class="right">€ {{amount}}</td></tr>{{/each}}</tbody></table>
<div class="total"><span class="muted">TOTAL DUE &nbsp;&nbsp;</span> € {{total}}</div>
<div class="footer muted">Thank you for working with us.<br>Please include your invoice number as the payment reference.</div>`,
};
