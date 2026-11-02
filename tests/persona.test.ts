import assert from "node:assert/strict";
import test from "node:test";
import { demoPersona, personaHeadline, personaSummary } from "../lib/persona";
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

test("demo persona is only a colleague or an administrator", () => {
  assert.equal(demoPersona(viewer({})), "colleague");
  assert.equal(personaHeadline(viewer({})), "Colleague");
  assert.match(personaSummary(viewer({})), /Pyrometallurgy/);
  assert.match(personaSummary(viewer({})), /Comments stay hidden/);

  const admin = viewer({
    divisionId: "human-resources",
    hrDivision: true,
    staffId: "hr-admin",
    isAdmin: true,
    canReadComments: true,
    canViewAnalysis: true,
    canDownloadReport: true,
  });
  assert.equal(demoPersona(admin), "administrator");
  assert.equal(personaHeadline(admin), "Administrator (HR)");
  assert.match(personaSummary(admin), /Full access/);
});

test("people in Human Resources who are not administrators stay colleagues", () => {
  const hrStaff = viewer({
    divisionId: "human-resources",
    hrDivision: true,
    staffId: "hr-general",
    staffLabel: "Colleague (example)",
  });
  assert.equal(demoPersona(hrStaff), "colleague");
  assert.equal(personaHeadline(hrStaff), "Colleague");

  const granted = viewer({
    divisionId: "human-resources",
    hrDivision: true,
    staffId: "hr-general",
    canReadComments: true,
    canViewAnalysis: true,
    canDownloadReport: false,
  });
  assert.equal(demoPersona(granted), "colleague");
  assert.equal(personaHeadline(granted), "Colleague");
  assert.match(personaSummary(granted), /administrator has granted comments, Analysis/);
  assert.doesNotMatch(personaHeadline(granted), /analyst|HR colleague/i);
});
