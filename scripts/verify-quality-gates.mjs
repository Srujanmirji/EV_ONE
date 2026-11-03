#!/usr/bin/env node
// Negative check for EV-010: each quality gate must FAIL on a deliberately
// broken probe file. A gate that passes on bad input is reported as broken.
// Probes are temporary, written inside apps/web and always removed.
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const web = join(root, "apps/web");

const gates = [
  {
    name: "typecheck rejects invalid types",
    file: "lib/__gate_probe_type.ts",
    content: 'export const probe: number = "not a number";\n',
    command: ["pnpm", ["--filter", "@evone/web", "typecheck"]],
  },
  {
    name: "format:check rejects unformatted code",
    file: "lib/__gate_probe_format.ts",
    content: "export   const probe = {a:1,\n b:2}\n",
    command: ["pnpm", ["format:check"]],
  },
  {
    name: "lint rejects rule violations",
    file: "lib/__gate_probe_lint.ts",
    content: "export const probe = (value: any): unknown => value;\n",
    command: ["pnpm", ["--filter", "@evone/web", "lint"]],
  },
  {
    name: "test:unit rejects failing tests",
    file: "lib/__gate_probe_unit.test.ts",
    content:
      'import { expect, it } from "vitest";\n\nit("fails on purpose", () => {\n  expect(1).toBe(2);\n});\n',
    command: ["pnpm", ["--filter", "@evone/web", "test:unit"]],
  },
];

let broken = 0;
for (const gate of gates) {
  const path = join(web, gate.file);
  writeFileSync(path, gate.content);
  try {
    const [cmd, args] = gate.command;
    const result = spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
    if (result.status === 0) {
      broken += 1;
      console.error(`BROKEN  ${gate.name}: exited 0 on a bad probe`);
    } else {
      console.log(`ok      ${gate.name} (exit ${result.status})`);
    }
  } finally {
    rmSync(path, { force: true });
  }
}

if (broken > 0) {
  console.error(`${broken} gate(s) accepted invalid input.`);
  process.exit(1);
}
console.log("All quality gates reject invalid input.");
