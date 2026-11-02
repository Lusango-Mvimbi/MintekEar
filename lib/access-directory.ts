/** Pure helpers for the Access roster. Search filters the staff list already loaded on the page. */

export type AccessRosterPerson = {
  staffId: string;
  displayName: string;
  division: string | null;
  isAdmin: boolean;
  canReadComments: boolean;
  canViewAnalysis: boolean;
  canDownloadReport: boolean;
};

export type RosterNoun = "colleague" | "administrator";

/** Rows shown at once on each Access staff table. */
export const ACCESS_PAGE_SIZE = 20;

export type StaffPage<T> = {
  items: T[];
  /** 1-based page currently shown. */
  page: number;
  pageCount: number;
  /** Length of the list being paged (already filtered). */
  total: number;
  /** 1-based index of the first row on this page. 0 when the list is empty. */
  start: number;
  /** 1-based index of the last row on this page. 0 when the list is empty. */
  end: number;
};

export function filterStaffByName<T extends { displayName: string }>(people: readonly T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return people.slice();
  return people.filter((person) => person.displayName.toLocaleLowerCase().includes(needle));
}

/**
 * Search first, then take one page. Page numbers outside 1..N clamp to the ends.
 * An empty list is page 1 of 1 with no rows.
 */
export function paginateStaff<T>(
  items: readonly T[],
  page: number,
  pageSize: number = ACCESS_PAGE_SIZE,
): StaffPage<T> {
  const size = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : ACCESS_PAGE_SIZE;
  const total = items.length;
  const pageCount = total === 0 ? 1 : Math.ceil(total / size);
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  const safePage = Math.min(Math.max(requested, 1), pageCount);
  const startIndex = (safePage - 1) * size;
  const slice = items.slice(startIndex, startIndex + size);
  return {
    items: slice,
    page: safePage,
    pageCount,
    total,
    start: slice.length === 0 ? 0 : startIndex + 1,
    end: startIndex + slice.length,
  };
}

/** Filtered name search, then the requested page of those matches. */
export function visibleStaffPage<T extends { displayName: string }>(
  people: readonly T[],
  query: string,
  page: number,
): StaffPage<T> {
  return paginateStaff(filterStaffByName(people, query), page);
}

export function staffPageLabel(page: Pick<StaffPage<unknown>, "page" | "pageCount">): string {
  return `Page ${page.page} of ${page.pageCount}`;
}

/** Remove stays unavailable only when this person is the sole administrator. Name search and the current page do not count. */
export function soleAdministratorId(staff: readonly { staffId: string; isAdmin: boolean }[]): string | null {
  let found: string | null = null;
  for (const person of staff) {
    if (!person.isAdmin) continue;
    if (found) return null;
    found = person.staffId;
  }
  return found;
}

function plural(count: number, noun: RosterNoun): string {
  return count === 1 ? noun : `${noun}s`;
}

/** Status line for a colleagues or administrators table, including a search with no matches. */
export function rosterStatusMessage(total: number, shown: number, query: string, noun: RosterNoun): string {
  const trimmed = query.trim();
  if (!trimmed) {
    if (total === 0) {
      return noun === "colleague"
        ? "Everyone on this list is an Administrator (HR)."
        : "No administrators yet.";
    }
    return `${total} ${plural(total, noun)}`;
  }
  if (shown === 0) return `No ${plural(2, noun)} match “${trimmed}”.`;
  const verb = shown === 1 ? "matches" : "match";
  if (shown === total) return `${shown} ${plural(shown, noun)} ${verb} “${trimmed}”.`;
  return `${shown} of ${total} ${verb} “${trimmed}”.`;
}
