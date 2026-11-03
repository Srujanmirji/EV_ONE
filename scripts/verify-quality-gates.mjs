#!/usr/bin/env node
// Negative check for EV-010: each quality gate must FAIL on a deliberately
// broken probe file. A gate that passes on bad input is reported as broken.
// Probes are temporary, written inside each app and always removed.
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

const typeProbe = 'export const probe: number = "not a number";\n';
const lintProbe = "export const probe = (value: any): unknown => value;\n";
const unitProbe =
  'import { expect, it } from "vitest";\n\nit("fails on purpose", () => {\n  expect(1).toBe(2);\n});\n';

const gates = [
  {
    name: "format:check rejects unformatted code",
    file: "apps/web/lib/__gate_probe_format.ts",
    content: "export   const probe = {a:1,\n b:2}\n",
    command: ["pnpm", ["format:check"]],
  },
];
for (const [pkg, dir, srcDir, hasUnit] of [
  ["@evone/web", "apps/web", "lib", true],
  ["@evone/api", "apps/api", "src", true],
  ["@evone/db", "packages/db", "src", false],
  ["@evone/contracts", "packages/contracts", "src", true],
  ["@evone/sdk", "packages/sdk", "src", true],
  ["@evone/ui", "packages/ui", "src", true],
  ["@evone/queue", "packages/queue", "src", false],
  ["@evone/worker", "apps/worker", "src", true],
]) {
  gates.push(
    {
      name: `${pkg} typecheck rejects invalid types`,
      file: `${dir}/${srcDir}/__gate_probe_type.ts`,
      content: typeProbe,
      command: ["pnpm", ["--filter", pkg, "typecheck"]],
    },
    {
      name: `${pkg} lint rejects rule violations`,
      file: `${dir}/${srcDir}/__gate_probe_lint.ts`,
      content: lintProbe,
      command: ["pnpm", ["--filter", pkg, "lint"]],
    },
  );
  if (hasUnit) {
    gates.push({
      name: `${pkg} test:unit rejects failing tests`,
      file: `${dir}/${srcDir}/__gate_probe_unit.test.ts`,
      content: unitProbe,
      command: ["pnpm", ["--filter", pkg, "test:unit"]],
    });
  }
}

let broken = 0;
for (const gate of gates) {
  const path = join(root, gate.file);
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
