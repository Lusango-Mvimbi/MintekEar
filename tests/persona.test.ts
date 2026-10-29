import assert from "node:assert/strict";
import test from "node:test";
import { demoPersona, personaHeadline } from "../lib/persona";
import type { Viewer } from "../lib/directory";

function viewer(overrides: Partial<Viewer>): Viewer {
  return {
    divisionId: "pyrometallurgy",
    hrDivision: false,
    source: "preview",
    staffId: null,
    staffLabel: null,
    canReadComments: false,
    canViewAnalysis: false,
    canDownloadReport: false,
    isAdmin: false,
    ...overrides,
  };
}

test("demo persona labels employee and HR admin clearly", () => {
  assert.equal(demoPersona(viewer({})), "employee");
  assert.equal(personaHeadline(viewer({})), "Normal employee");

  assert.equal(
    demoPersona(
      viewer({
        divisionId: "human-resources",
        hrDivision: true,
        staffId: "hr-admin",
        isAdmin: true,
        canReadComments: true,
        canViewAnalysis: true,
        canDownloadReport: true,
      }),
    ),
    "hr-admin",
  );
  assert.equal(
    personaHeadline(
      viewer({
        divisionId: "human-resources",
        hrDivision: true,
        isAdmin: true,
        canReadComments: true,
        canViewAnalysis: true,
        canDownloadReport: true,
      }),
    ),
    "HR administrator",
  );
});
