import assert from "node:assert/strict";
import test from "node:test";
import { company } from "../lib/company";

test("this deployment is MintekEar for Mintek", () => {
  assert.equal(company.name, "Mintek");
  assert.equal(company.appName, "MintekEar");
  assert.equal(company.logo, "/brand/mintek-logo.png");
  assert.equal(company.mark, "/brand/mintek-mark.png");
  assert.equal(company.colors.primary, "#d22d20");
  assert.equal(company.colors.ink, "#00131d");
});
