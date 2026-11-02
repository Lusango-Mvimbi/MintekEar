export const POLICY_TITLE = "Review policy";

export const POLICY_SHORT = [
  "Write only about behaviour you saw at work.",
  "Do not name other staff, and do not use hate, threats, or harassment.",
  "Selected HR may hide a review that breaks this policy. They still will not be told who wrote it.",
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
      "Division staff see scores and traits. Written comments stay with HR people the administrator allows.",
    ],
  },
  {
    title: "What HR can do",
    points: [
      "Selected HR can read comments and the Analysis report.",
      "If a review breaks this policy, those HR people may hide it so it no longer counts on the manager.",
      "Hiding a review does not reveal who wrote it. There is no author on the review to look up.",
    ],
  },
] as const;

export const POLICY_ACCEPT_LABEL =
  "I have read the review policy. I will stick to behaviour I saw at work, and I understand selected HR may hide a review that breaks the rules.";
