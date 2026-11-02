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

export function filterStaffByName<T extends { displayName: string }>(people: readonly T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return people.slice();
  return people.filter((person) => person.displayName.toLocaleLowerCase().includes(needle));
}

/** Remove stays unavailable only when this person is the sole administrator. Name search does not count. */
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
