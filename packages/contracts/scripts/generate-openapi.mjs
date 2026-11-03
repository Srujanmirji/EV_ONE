#!/usr/bin/env node
// Writes openapi.json from the built contracts. CI regenerates it and fails
// if the committed file differs (pnpm contract:check).
import { writeFileSync } from "node:fs";
import { buildOpenApiDocument } from "../dist/index.js";

const target = new URL("../openapi.json", import.meta.url);
writeFileSync(target, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
console.log(`Wrote ${target.pathname}`);
