export const POLICY_TITLE = "Review policy";

export const POLICY_SHORT = [
  "Write only about behaviour you saw at work.",
  "Do not name other staff, and do not use hate, threats, or harassment.",
  "One review per manager each year. An administrator (HR) may hide a review that breaks this policy without being told who wrote it.",
] as const;

export const POLICY_SECTIONS = [
  {
    title: "What a review is for",
    points: [
      "Reviews are about managers, not about Mintek as an organisation.",
      "Stick to what you saw the person do: decisions, feedback, credit, how the team was treated.",
      "Keep the words specific and fair. Opinions without a work example do not help anyone.",
    ],
  },
  {
    title: "What is not allowed",
    points: [
      "Hate speech, threats, sexual harassment, or insults aimed at protected characteristics.",
      "Naming or outing other employees in the review text.",
      "Copying the same attack many times, or using the form only to pile on.",
      "Anything that is not about work behaviour.",
    ],
  },
  {
    title: "Privacy",
    points: [
      "A review stores the manager, the score, the words, the traits, and the calendar day.",
      "It does not store your name, staff number, IP address, or which computer you used.",
      "Separately, the system may record that you have reviewed a manager this year so you cannot post twice. That receipt is not linked to the review text.",
      "Colleagues see scores and traits. Written comments stay closed unless an administrator (HR) grants access.",
    ],
  },
  {
    title: "One review per manager",
    points: [
      "You may post one review of each manager in your division each calendar year.",
      "That stops someone from knocking a score down with many posts after a single argument.",
      "Administrators can see who has or has not posted a required review. They still cannot open a review and see who wrote it.",
    ],
  },
  {
    title: "Comments and hiding",
    points: [
      "An administrator (HR) can read comments and the Analysis report, and can grant the same to a colleague.",
      "If a review breaks this policy, a person with that access may hide it so it no longer counts on the manager.",
      "Hiding a review does not reveal who wrote it. There is no author on the review to look up.",
    ],
  },
] as const;

export const POLICY_ACCEPT_LABEL =
  "I have read the review policy. I will stick to behaviour I saw at work, and I understand an administrator may hide a review that breaks the rules.";
