"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { saveHrAccess, saveHrRole } from "@/app/actions";
import {
  filterStaffByName,
  rosterStatusMessage,
  soleAdministratorId,
  type AccessRosterPerson,
  type RosterNoun,
} from "@/lib/access-directory";

const rowBg = "bg-white align-middle group-hover:bg-paper";
const cell = `${rowBg} px-3 py-2.5`;
const head = "bg-paper px-3 py-3 text-left text-sm font-semibold whitespace-nowrap";

function SavePrivilegesButton({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Save privileges for ${name}`}
      className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

function RoleSubmitButton({
  label,
  ariaLabel,
  tone,
}: {
  label: string;
  ariaLabel: string;
  tone: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const className =
    tone === "primary"
      ? "rounded-full bg-brand px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-brand-dark disabled:opacity-60"
      : "rounded-full bg-white px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-ink ring-1 ring-line hover:bg-paper disabled:opacity-60";
  return (
    <button type="submit" disabled={pending} aria-label={ariaLabel} className={className}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function PrivilegeCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <td className={`${rowBg} p-0 text-center`}>
      <label className="flex cursor-pointer items-center justify-center px-3 py-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
          className="size-4 accent-[var(--brand)]"
        />
      </label>
    </td>
  );
}

function ColleagueRow({ person }: { person: AccessRosterPerson }) {
  const [comments, setComments] = useState(person.canReadComments);
  const [analysis, setAnalysis] = useState(person.canViewAnalysis);
  const [download, setDownload] = useState(person.canDownloadReport);

  return (
    <tr className="group border-b border-line/80 last:border-b-0">
      <th scope="row" className={`${cell} sticky left-0 z-10 min-w-48 border-r border-line text-left font-semibold text-ink`}>
        {person.displayName}
      </th>
      <td className={`${cell} whitespace-nowrap text-muted`}>{person.division ?? "—"}</td>
      <PrivilegeCheck
        label={`Read comments for ${person.displayName}`}
        checked={comments}
        onChange={setComments}
      />
      <PrivilegeCheck
        label={`Analysis report for ${person.displayName}`}
        checked={analysis}
        onChange={setAnalysis}
      />
      <PrivilegeCheck
        label={`Download or print for ${person.displayName}`}
        checked={download}
        onChange={setDownload}
      />
      <td className={cell}>
        <form action={saveHrRole}>
          <input type="hidden" name="staffId" value={person.staffId} />
          <input type="hidden" name="role" value="administrator" />
          <RoleSubmitButton
            label="Make administrator"
            ariaLabel={`Make ${person.displayName} an administrator`}
            tone="primary"
          />
        </form>
      </td>
      <td className={cell}>
        <form action={saveHrAccess}>
          <input type="hidden" name="staffId" value={person.staffId} />
          {comments ? <input type="hidden" name="canReadComments" value="on" /> : null}
          {analysis ? <input type="hidden" name="canViewAnalysis" value="on" /> : null}
          {download ? <input type="hidden" name="canDownloadReport" value="on" /> : null}
          <SavePrivilegesButton name={person.displayName} />
        </form>
      </td>
    </tr>
  );
}

function AdministratorRow({ person, onlyAdmin }: { person: AccessRosterPerson; onlyAdmin: boolean }) {
  return (
    <tr className="group border-b border-line/80 last:border-b-0">
      <th scope="row" className={`${cell} sticky left-0 z-10 min-w-48 border-r border-line text-left font-semibold text-ink`}>
        {person.displayName}
      </th>
      <td className={`${cell} whitespace-nowrap text-muted`}>{person.division ?? "—"}</td>
      <td className={`${cell} whitespace-nowrap`}>
        <span className="font-medium text-ink">Administrator (HR)</span>
      </td>
      <td className={`${cell} max-w-sm`}>
        {onlyAdmin ? (
          <p className="text-sm text-muted">Only administrator.</p>
        ) : (
          <form action={saveHrRole}>
            <input type="hidden" name="staffId" value={person.staffId} />
            <input type="hidden" name="role" value="colleague" />
            <RoleSubmitButton
              label="Remove administrator"
              ariaLabel={`Remove administrator from ${person.displayName}`}
              tone="secondary"
            />
          </form>
        )}
      </td>
    </tr>
  );
}

function RosterStatus({
  total,
  shown,
  query,
  noun,
}: {
  total: number;
  shown: number;
  query: string;
  noun: RosterNoun;
}) {
  const message = rosterStatusMessage(total, shown, query, noun);
  const missed = query.trim().length > 0 && shown === 0;
  if (shown === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p role="status" className="text-sm font-semibold text-ink">
          {message}
        </p>
        {missed ? (
          <p className="mt-1 text-sm text-muted">Check the spelling, or clear the search to see the full list.</p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="border-b border-line px-4 py-3">
      <p role="status" className="text-sm text-muted">
        {message}
      </p>
    </div>
  );
}

function RosterTable({
  caption,
  tableName,
  columns,
  children,
}: {
  caption: string;
  tableName: string;
  columns: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table data-access-table={tableName} className="w-full min-w-[920px] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper text-muted">
            <tr>{columns}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-muted sm:hidden">
        Swipe sideways to see every column. The name stays in view.
      </p>
    </>
  );
}

export function AccessDirectory({ people }: { people: AccessRosterPerson[] }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const colleagues = people.filter((person) => !person.isAdmin);
  const administrators = people.filter((person) => person.isAdmin);
  const visibleColleagues = filterStaffByName(colleagues, query);
  const visibleAdministrators = filterStaffByName(administrators, query);
  const onlyAdminId = soleAdministratorId(people);

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  return (
    <div className="mt-8">
      <div className="sticky top-0 z-30 -mx-4 bg-paper px-4 py-3 sm:mx-0 sm:px-0">
        <label htmlFor="access-name-search" className="block text-sm font-semibold text-ink">
          Search by name
        </label>
        <div className="relative mt-2 max-w-xl">
          <input
            ref={searchRef}
            id="access-name-search"
            data-access-search=""
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Name and surname"
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 pr-16 text-sm outline-none focus:border-accent"
          />
          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full px-2 py-1 text-sm font-semibold text-accent hover:bg-paper"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <section id="make-administrator" className="mt-4">
        <h2 className="text-[22px] font-bold tracking-tight">Colleagues</h2>
        <div className="mt-4 overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.04]">
          <RosterStatus total={colleagues.length} shown={visibleColleagues.length} query={query} noun="colleague" />
          {visibleColleagues.length > 0 ? (
            <RosterTable
              caption="Colleagues who are not administrators"
              tableName="colleagues"
              columns={
                <>
                  <th scope="col" className={`${head} sticky left-0 z-10 border-r border-line`}>
                    Name
                  </th>
                  <th scope="col" className={head}>
                    Division
                  </th>
                  <th scope="col" className={`${head} text-center`}>
                    Read comments
                  </th>
                  <th scope="col" className={`${head} text-center`}>
                    Analysis
                  </th>
                  <th scope="col" className={`${head} text-center`}>
                    Download / print
                  </th>
                  <th scope="col" className={head}>
                    Role
                  </th>
                  <th scope="col" className={head}>
                    Save
                  </th>
                </>
              }
            >
              {visibleColleagues.map((person) => (
                <ColleagueRow key={person.staffId} person={person} />
              ))}
            </RosterTable>
          ) : null}
        </div>
      </section>

      <section className="mt-10" id="administrators">
        <h2 className="text-[22px] font-bold tracking-tight">Administrators</h2>
        <div className="mt-4 overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.04]">
          <RosterStatus
            total={administrators.length}
            shown={visibleAdministrators.length}
            query={query}
            noun="administrator"
          />
          {visibleAdministrators.length > 0 ? (
            <RosterTable
              caption="Administrators"
              tableName="administrators"
              columns={
                <>
                  <th scope="col" className={`${head} sticky left-0 z-10 border-r border-line`}>
                    Name
                  </th>
                  <th scope="col" className={head}>
                    Division
                  </th>
                  <th scope="col" className={head}>
                    Role
                  </th>
                  <th scope="col" className={head}>
                    Action
                  </th>
                </>
              }
            >
              {visibleAdministrators.map((person) => (
                <AdministratorRow key={person.staffId} person={person} onlyAdmin={person.staffId === onlyAdminId} />
              ))}
            </RosterTable>
          ) : null}
        </div>
      </section>
    </div>
  );
}
