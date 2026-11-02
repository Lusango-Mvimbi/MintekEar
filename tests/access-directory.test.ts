import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccessDirectory } from "../components/AccessDirectory";
import {
  ACCESS_PAGE_SIZE,
  filterStaffByName,
  paginateStaff,
  rosterStatusMessage,
  soleAdministratorId,
  staffPageLabel,
  visibleStaffPage,
  type AccessRosterPerson,
} from "../lib/access-directory";

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

test("each Access table pages 20 filtered rows at a time", () => {
  assert.equal(ACCESS_PAGE_SIZE, 20);

  const colleagues = Array.from({ length: 45 }, (_, index) => ({
    displayName: `Colleague ${String(index + 1).padStart(2, "0")}`,
    staffId: `c-${index + 1}`,
    isAdmin: false as const,
  }));
  const administrators = Array.from({ length: 21 }, (_, index) => ({
    displayName: `Admin ${String(index + 1).padStart(2, "0")}`,
    staffId: `a-${index + 1}`,
    isAdmin: true as const,
  }));

  const first = paginateStaff(colleagues, 1);
  assert.equal(first.items.length, 20);
  assert.deepEqual(
    first.items.map((person) => person.staffId),
    colleagues.slice(0, 20).map((person) => person.staffId),
  );
  assert.equal(first.page, 1);
  assert.equal(first.pageCount, 3);
  assert.equal(first.total, 45);
  assert.equal(first.start, 1);
  assert.equal(first.end, 20);
  assert.equal(staffPageLabel(first), "Page 1 of 3");

  const second = paginateStaff(colleagues, 2);
  assert.equal(second.items.length, 20);
  assert.equal(second.items[0]?.staffId, "c-21");
  assert.equal(second.items[19]?.staffId, "c-40");
  assert.equal(second.start, 21);
  assert.equal(second.end, 40);
  assert.equal(staffPageLabel(second), "Page 2 of 3");

  const last = paginateStaff(colleagues, 3);
  assert.equal(last.items.length, 5);
  assert.equal(last.items[0]?.staffId, "c-41");
  assert.equal(last.start, 41);
  assert.equal(last.end, 45);

  assert.equal(paginateStaff(colleagues, 0).page, 1);
  assert.equal(paginateStaff(colleagues, -3).items[0]?.staffId, "c-1");
  assert.equal(paginateStaff(colleagues, 9).page, 3);
  assert.equal(paginateStaff(colleagues, Number.NaN).page, 1);
  assert.equal(paginateStaff(colleagues.slice(0, 20), 1).pageCount, 1);
  assert.equal(paginateStaff(colleagues.slice(0, 21), 2).items.length, 1);

  const empty = paginateStaff([], 4);
  assert.equal(empty.total, 0);
  assert.equal(empty.items.length, 0);
  assert.equal(empty.page, 1);
  assert.equal(empty.pageCount, 1);
  assert.equal(empty.start, 0);
  assert.equal(empty.end, 0);

  const adminPage = paginateStaff(administrators, 1);
  assert.equal(adminPage.items.length, ACCESS_PAGE_SIZE);
  assert.equal(adminPage.pageCount, 2);
  assert.equal(paginateStaff(administrators, 2).items.length, 1);
  assert.equal(paginateStaff(administrators, 2).items[0]?.staffId, "a-21");
});

test("search runs before pagination, and a page is not the last-administrator roster", () => {
  const roster = Array.from({ length: 50 }, (_, index) => ({
    displayName: index % 2 === 0 ? `Naledi ${index}` : `Thabo ${index}`,
    staffId: `p-${index}`,
    isAdmin: index % 10 === 0,
  }));
  const naledi = filterStaffByName(roster, "  NALEDI ");
  assert.equal(naledi.length, 25);

  const page = visibleStaffPage(roster, "naledi", 2);
  assert.equal(page.total, 25);
  assert.equal(page.page, 2);
  assert.equal(page.pageCount, 2);
  assert.equal(page.items.length, 5);
  assert.equal(page.start, 21);
  assert.equal(page.end, 25);
  assert.deepEqual(
    page.items.map((person) => person.staffId),
    ["p-40", "p-42", "p-44", "p-46", "p-48"],
  );
  assert.ok(page.items.every((person) => person.displayName.startsWith("Naledi")));

  const unfilteredPage = paginateStaff(roster, 2);
  assert.equal(unfilteredPage.items.length, 20);
  assert.notDeepEqual(
    unfilteredPage.items.map((person) => person.staffId),
    page.items.map((person) => person.staffId),
  );

  const firstPageAfterSearch = visibleStaffPage(roster, "thabo", 1);
  assert.equal(firstPageAfterSearch.items.length, ACCESS_PAGE_SIZE);
  assert.equal(firstPageAfterSearch.items[0]?.staffId, "p-1");
  assert.equal(firstPageAfterSearch.pageCount, 2);

  const narrow = filterStaffByName(roster, "Thabo 1");
  assert.deepEqual(
    narrow.map((person) => person.displayName),
    ["Thabo 1", "Thabo 11", "Thabo 13", "Thabo 15", "Thabo 17", "Thabo 19"],
  );
  const tooFar = visibleStaffPage(roster, "Thabo 1", 6);
  assert.equal(tooFar.total, narrow.length);
  assert.equal(tooFar.page, 1);
  assert.equal(tooFar.pageCount, 1);
  assert.deepEqual(
    tooFar.items.map((person) => person.staffId),
    narrow.map((person) => person.staffId),
  );

  const wideAdmins = Array.from({ length: 21 }, (_, index) => ({
    displayName: `Keeper ${index}`,
    staffId: `admin-${index}`,
    isAdmin: true,
  }));
  const lastAdminPage = paginateStaff(wideAdmins, 2);
  assert.equal(lastAdminPage.items.length, 1);
  assert.equal(lastAdminPage.items[0]?.staffId, "admin-20");
  assert.equal(soleAdministratorId(wideAdmins), null);
  assert.equal(soleAdministratorId(lastAdminPage.items), "admin-20");

  const onlyAdminLater = [
    ...Array.from({ length: 21 }, (_, index) => ({
      staffId: `c-${index}`,
      displayName: `Colleague ${index}`,
      isAdmin: false,
    })),
    { staffId: "only-admin", displayName: "Only Admin", isAdmin: true },
  ];
  const colleagueWindow = visibleStaffPage(
    onlyAdminLater.filter((person) => !person.isAdmin),
    "",
    1,
  );
  assert.equal(colleagueWindow.items.length, ACCESS_PAGE_SIZE);
  assert.equal(colleagueWindow.items.some((person) => person.isAdmin), false);
  assert.equal(soleAdministratorId(colleagueWindow.items), null);
  assert.equal(soleAdministratorId(onlyAdminLater), "only-admin");
});

function rosterPerson(partial: Pick<AccessRosterPerson, "staffId" | "displayName" | "isAdmin">): AccessRosterPerson {
  return {
    division: "Human Resources",
    canReadComments: partial.isAdmin,
    canViewAnalysis: partial.isAdmin,
    canDownloadReport: partial.isAdmin,
    ...partial,
  };
}

function tableBody(html: string, name: string): string {
  const marker = `data-access-table="${name}"`;
  const start = html.indexOf(marker);
  assert.ok(start >= 0, name);
  const tbody = html.indexOf("<tbody>", start);
  const end = html.indexOf("</tbody>", tbody);
  return html.slice(tbody, end);
}

test("the access tables render one page of 20, with actions only on that page", () => {
  const people = [
    ...Array.from({ length: 45 }, (_, index) =>
      rosterPerson({
        staffId: `c-${index + 1}`,
        displayName: `Colleague ${index + 1}`,
        isAdmin: false,
      }),
    ),
    ...Array.from({ length: 21 }, (_, index) =>
      rosterPerson({
        staffId: `a-${index + 1}`,
        displayName: `Admin ${index + 1}`,
        isAdmin: true,
      }),
    ),
  ];
  const html = renderToStaticMarkup(React.createElement(AccessDirectory, { people }));
  const colleagues = tableBody(html, "colleagues");
  const administrators = tableBody(html, "administrators");

  assert.equal(colleagues.split("<tr").length - 1, ACCESS_PAGE_SIZE);
  assert.equal(administrators.split("<tr").length - 1, ACCESS_PAGE_SIZE);
  assert.equal(html.includes(">Page 1 of 3<"), true);
  assert.equal(html.includes(">Page 1 of 2<"), true);
  assert.equal(html.includes("Make Colleague 1 an administrator"), true);
  assert.equal(html.includes("Save privileges for Colleague 1"), true);
  assert.equal(html.includes("Colleague 21"), false);
  assert.equal(html.includes("Remove administrator from Admin 1"), true);
  assert.equal(html.includes("Admin 21"), false);
  assert.equal(html.includes("Only administrator."), false);
});

test("paging colleagues does not hide that one administrator is the last", () => {
  const people = [
    ...Array.from({ length: 25 }, (_, index) =>
      rosterPerson({
        staffId: `c-${index + 1}`,
        displayName: `Colleague ${index + 1}`,
        isAdmin: false,
      }),
    ),
    rosterPerson({ staffId: "only-admin", displayName: "Only Admin", isAdmin: true }),
  ];
  const html = renderToStaticMarkup(React.createElement(AccessDirectory, { people }));

  assert.equal(tableBody(html, "colleagues").split("<tr").length - 1, ACCESS_PAGE_SIZE);
  assert.equal(html.includes("Colleague 21"), false);
  assert.equal(html.includes(">Page 1 of 2<"), true);
  assert.equal(html.includes('data-access-pager="administrator"'), false);
  assert.equal(html.includes("Only administrator."), true);
  assert.equal(html.includes("Remove administrator from Only Admin"), false);
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
