import type { DatabaseSync } from "node:sqlite";

const day = 24 * 60 * 60 * 1000;

type SeedReview = {
  id: string;
  managerId: string;
  rating: number;
  body: string;
  tags: string[];
  ageMs: number;
};

type SeedManager = {
  id: string;
  name: string;
  title: string;
};

const managers: SeedManager[] = [
  { id: "mgr-thabo", name: "Thabo Molefe", title: "Engineering Manager" },
  { id: "mgr-lerato", name: "Lerato Nkosi", title: "Research Manager" },
  { id: "mgr-ayesha", name: "Ayesha Patel", title: "Laboratory Manager" },
  { id: "mgr-johan", name: "Johan Botha", title: "Operations Manager" },
  { id: "mgr-sipho", name: "Sipho Dlamini", title: "Project Manager" },
];

const reviews: SeedReview[] = [
  {
    id: "rev-thabo-latest",
    managerId: "mgr-thabo",
    rating: 1,
    ageMs: day,
    tags: ["micromanages", "takes-credit", "blames-team"],
    body: "He questions every step and then walks the team through the work as if no one else can hold it. When a result lands, the credit moves up. When it slips, the blame stays with the team.",
  },
  {
    id: "rev-thabo-older",
    managerId: "mgr-thabo",
    rating: 1,
    ageMs: day * 18,
    tags: ["micromanages"],
    body: "There is a check on every small choice. People wait rather than decide.",
  },
  {
    id: "rev-lerato-latest",
    managerId: "mgr-lerato",
    rating: 5,
    ageMs: day + 5 * 60 * 60 * 1000,
    tags: [],
    body: "Solid manager. The group gets cover when a result is late for a real reason, and the weekly conversation is about the work rather than how it looks.",
  },
  {
    id: "rev-ayesha-latest",
    managerId: "mgr-ayesha",
    rating: 5,
    ageMs: day * 2,
    tags: ["supportive", "clear-communicator", "gives-feedback"],
    body: "Ayesha is a really good manager to work for. She puts her team first, says what she means, and the feedback shows up while you can still use it.",
  },
  {
    id: "rev-ayesha-older",
    managerId: "mgr-ayesha",
    rating: 5,
    ageMs: day * 24,
    tags: ["clear-communicator", "low-ego"],
    body: "Clear on what done looks like, and she does not take the credit for the lab's work.",
  },
  {
    id: "rev-johan-latest",
    managerId: "mgr-johan",
    rating: 1,
    ageMs: day * 3,
    tags: ["low-ego", "poor-communication", "plays-favourites"],
    body: "He does not grandstand, but the priority is whatever is most visible that week. Reasons for a decision are thin, and the same people are shielded when a date slips.",
  },
  {
    id: "rev-johan-mid",
    managerId: "mgr-johan",
    rating: 2,
    ageMs: day * 10,
    tags: ["poor-communication"],
    body: "Plans change after the work has started. You hear about it late.",
  },
  {
    id: "rev-johan-old",
    managerId: "mgr-johan",
    rating: 1,
    ageMs: day * 30,
    tags: ["plays-favourites"],
    body: "Favour sits with a small circle. Everyone else gets the urgent work.",
  },
  {
    id: "rev-sipho-latest",
    managerId: "mgr-sipho",
    rating: 3,
    ageMs: day * 6,
    tags: ["clear-communicator", "fair"],
    body: "He shares the context and he is fair about leave. The month still ends in a rush because the plan is soft until the last week.",
  },
  {
    id: "rev-sipho-older",
    managerId: "mgr-sipho",
    rating: 4,
    ageMs: day * 21,
    tags: ["fair", "supportive"],
    body: "Credit is shared and he will back you in a meeting. Priorities could be steadier.",
  },
];

export function seedIfEmpty(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM managers").get() as { count: number } | undefined;
  if ((row?.count ?? 0) > 0) return;

  const now = Date.now();
  const insertManager = db.prepare(
    "INSERT INTO managers (id, name, title, sample, created_at) VALUES (?, ?, ?, 1, ?)",
  );
  const insertReview = db.prepare(
    "INSERT INTO reviews (id, manager_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertTag = db.prepare("INSERT INTO review_tags (review_id, tag) VALUES (?, ?)");

  db.exec("BEGIN IMMEDIATE");
  try {
    for (const manager of managers) {
      insertManager.run(manager.id, manager.name, manager.title, new Date(now).toISOString());
    }
    for (const review of reviews) {
      insertReview.run(
        review.id,
        review.managerId,
        review.rating,
        review.body,
        new Date(now - review.ageMs).toISOString(),
      );
      for (const tag of review.tags) insertTag.run(review.id, tag);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
