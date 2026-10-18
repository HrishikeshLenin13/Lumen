import { test } from "node:test";
import assert from "node:assert/strict";
import { rockLines, rareRockLine } from "../js/rock-lines.mjs";
test("the pet rock has over two hundred unique lines that all name the rock", () => { assert.ok(rockLines.length >= 206); assert.equal(new Set(rockLines).size, rockLines.length); for (const line of [...rockLines, rareRockLine]) { assert.match(line, /^The rock /); assert.doesNotMatch(line, /—/); } assert.ok(!rockLines.includes(rareRockLine)); });
