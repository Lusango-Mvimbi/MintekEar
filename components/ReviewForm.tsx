"use client";

import { useActionState, useState } from "react";
import { submitReview, type SubmitState } from "@/app/actions";
import { verdictLabel } from "@/lib/format";
import type { ManagerOption } from "@/lib/queries";
import { TAGS } from "@/lib/tags";
import { StarIcon } from "./icons";

const initialState: SubmitState = {};

export function ReviewForm({
  managers,
  initialManagerId,
  divisionName,
}: {
  managers: ManagerOption[];
  initialManagerId?: string;
  divisionName: string;
}) {
  const knownManager = managers.some((manager) => manager.id === initialManagerId);
  const [state, formAction, pending] = useActionState(submitReview, initialState);
  const [mode, setMode] = useState<"existing" | "new">(
    managers.length === 0 ? "new" : "existing",
  );
  const [managerId, setManagerId] = useState(knownManager ? initialManagerId ?? "" : "");
  const [managerName, setManagerName] = useState("");
  const [managerTitle, setManagerTitle] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [tagNote, setTagNote] = useState("");

  function toggleTag(id: string) {
    setTags((current) => {
      if (current.includes(id)) {
        setTagNote("");
        return current.filter((tag) => tag !== id);
      }
      if (current.length >= 6) {
        setTagNote("Choose up to 6 traits.");
        return current;
      }
      setTagNote("");
      return [...current, id];
    });
  }

  return (
    <form action={formAction} className="rounded-[22px] bg-white p-6 shadow-[0_10px_30px_rgba(0,19,29,0.05)] ring-1 ring-black/[0.04] md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Write a review</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        This stays in {divisionName}. Your name is not asked for, and the review stores the score, the words, and the
        day. It does not store who wrote it or which computer it came from.
      </p>

      {state.error ? (
        <p role="alert" className="mt-5 rounded-2xl bg-[#fdecee] px-4 py-3 text-sm font-medium text-[#d64545]">
          {state.error}
        </p>
      ) : null}

      <fieldset className="mt-8">
        <legend className="text-sm font-bold">Who is this about?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-full bg-paper p-1">
          <button
            type="button"
            aria-pressed={mode === "existing"}
            disabled={managers.length === 0}
            onClick={() => setMode("existing")}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              mode === "existing" ? "bg-accent text-white" : "text-ink"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Listed manager
          </button>
          <button
            type="button"
            aria-pressed={mode === "new"}
            onClick={() => setMode("new")}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              mode === "new" ? "bg-accent text-white" : "text-ink"
            }`}
          >
            Add a manager
          </button>
        </div>
        <input type="hidden" name="mode" value={mode} />

        {mode === "existing" ? (
          <label className="mt-4 block text-sm font-medium">
            Manager
            <select
              name="managerId"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option value="">Choose a manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} · {manager.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Name
              <input
                name="managerName"
                value={managerName}
                onChange={(event) => setManagerName(event.target.value)}
                required
                autoComplete="off"
                placeholder="Name and surname"
                className="mt-2 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm font-medium">
              Role
              <input
                name="managerTitle"
                value={managerTitle}
                onChange={(event) => setManagerTitle(event.target.value)}
                required
                autoComplete="off"
                placeholder="Engineering Manager"
                className="mt-2 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>
        )}
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-sm font-bold">Score</legend>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div role="radiogroup" aria-label="Score from 1 to 5" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = rating > 0 && value <= rating;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} out of 5`}
                  onClick={() => setRating(value)}
                  className={`rounded-lg p-1.5 ${selected ? "text-[#e0a100]" : "text-line"}`}
                >
                  <StarIcon className="h-7 w-7" />
                </button>
              );
            })}
          </div>
          <p className="text-sm font-semibold text-ink">
            {rating ? `${rating}.0 · ${verdictLabel(rating)}` : "Choose a score from 1 to 5"}
          </p>
        </div>
        <input type="hidden" name="rating" value={rating || ""} />
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-sm font-bold">What stood out?</legend>
        <p className="mt-1 text-sm text-muted">Optional. Choose up to 6.</p>
        {(["positive", "negative"] as const).map((tone) => (
          <div key={tone} className="mt-4">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">
              {tone === "positive" ? "Goes well" : "Gets in the way"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TAGS.filter((tag) => tag.tone === tone).map((tag) => {
                const on = tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      on
                        ? tag.tone === "positive"
                          ? "border-[#0f8a4b] bg-[#e7f6ee] text-[#0f8a4b]"
                          : "border-[#d64545] bg-[#fdecee] text-[#d64545]"
                        : "border-line bg-white text-ink"
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {tags.map((tag) => (
          <input key={tag} type="hidden" name="tags" value={tag} />
        ))}
        {tagNote ? <p className="mt-2 text-sm text-[#d64545]">{tagNote}</p> : null}
      </fieldset>

      <label className="mt-8 block text-sm font-bold">
        What happened?
        <textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          minLength={20}
          maxLength={1500}
          rows={6}
          placeholder="What is it like to work for this person? Stick to what you saw them do."
          className="mt-2 w-full rounded-xl border border-line px-3 py-2.5 text-sm leading-6 font-normal outline-none focus:border-accent"
        />
        <span className={`mt-1 block text-xs font-medium ${body.trim().length > 1500 ? "text-brand" : "text-muted"}`}>
          {body.trim().length}/1500
        </span>
      </label>

      <div className="sr-only" aria-hidden="true">
        <label>
          Company website
          <input name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post anonymously"}
      </button>
    </form>
  );
}
