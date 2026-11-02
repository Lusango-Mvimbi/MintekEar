import assert from "node:assert/strict";
import test from "node:test";
import { filterStaffByName, rosterStatusMessage, soleAdministratorId } from "../lib/access-directory";

const people = [
  { displayName: "Ayanda September (example)", staffId: "hr-ayanda", isAdmin: false },
  { displayName: "Colleague (example)", staffId: "hr-general", isAdmin: false },
  { displayName: "Administrator (HR)", staffId: "hr-admin", isAdmin: true },
];

test("name search is case-insensitive, trimmed, and keeps list order", () => {
  assert.deepEqual(
    filterStaffByName(people, "  aYaNdA ").map((person) => person.staffId),
    ["hr-ayanda"],
  );
  assert.deepEqual(
    filterStaffByName(people, "sept").map((person) => person.staffId),
    ["hr-ayanda"],
  );
  assert.deepEqual(
    filterStaffByName(people, "a").map((person) => person.staffId),
    ["hr-ayanda", "hr-general", "hr-admin"],
  );
  assert.equal(filterStaffByName(people, "   ").length, 3);
  assert.equal(filterStaffByName(people, "").length, 3);
  assert.equal(filterStaffByName(people, "human resources").length, 0);
  assert.equal(filterStaffByName(people, "zzzz-no-such-person").length, 0);
});

test("name search can scan a long staff list without dropping matches", () => {
  const many = Array.from({ length: 1000 }, (_, index) => ({
    displayName: `Person ${String(index).padStart(4, "0")}`,
  }));
  const found = filterStaffByName(many, "person 0042");
  assert.equal(found.length, 1);
  assert.equal(found[0]?.displayName, "Person 0042");
  assert.equal(filterStaffByName(many, "PERSON").length, 1000);
});

test("the last-administrator guard uses the full roster, not a name search", () => {
  assert.equal(soleAdministratorId(people), "hr-admin");
  assert.equal(soleAdministratorId([]), null);

  const twoAdmins = [
    { staffId: "hr-admin", displayName: "Administrator (HR)", isAdmin: true },
    { staffId: "hr-ayanda", displayName: "Ayanda September (example)", isAdmin: true },
    { staffId: "hr-general", displayName: "Colleague (example)", isAdmin: false },
  ];
  assert.equal(soleAdministratorId(twoAdmins), null);
  const visibleAdmins = filterStaffByName(
    twoAdmins.filter((person) => person.isAdmin),
    "ayanda",
  );
  assert.equal(visibleAdmins.length, 1);
  assert.equal(visibleAdmins[0]?.staffId, "hr-ayanda");
  assert.equal(soleAdministratorId(twoAdmins), null);
  assert.equal(soleAdministratorId(visibleAdmins), "hr-ayanda");
});

test("roster status names an empty search and a full list", () => {
  assert.equal(rosterStatusMessage(2, 2, "", "colleague"), "2 colleagues");
  assert.equal(rosterStatusMessage(1, 1, "  ", "administrator"), "1 administrator");
  assert.equal(
    rosterStatusMessage(0, 0, "", "colleague"),
    "Everyone on this list is an Administrator (HR).",
  );
  assert.equal(rosterStatusMessage(0, 0, "", "administrator"), "No administrators yet.");
  assert.equal(rosterStatusMessage(2, 1, " ayanda ", "colleague"), "1 of 2 matches “ayanda”.");
  assert.equal(rosterStatusMessage(2, 2, "e", "colleague"), "2 colleagues match “e”.");
  assert.equal(rosterStatusMessage(1, 1, "Ayanda", "colleague"), "1 colleague matches “Ayanda”.");
  assert.equal(rosterStatusMessage(2, 0, "zzzz", "colleague"), "No colleagues match “zzzz”.");
  assert.equal(rosterStatusMessage(1, 0, "zzzz", "administrator"), "No administrators match “zzzz”.");
});
