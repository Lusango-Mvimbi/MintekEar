export type Division = {
  id: string;
  name: string;
};

/** Bold names from the Mintek division directory. Items under each name are document libraries, not divisions. */
export const DIVISIONS: readonly Division[] = [
  { id: "pyrometallurgy", name: "Pyrometallurgy" },
  { id: "biometallurgy", name: "Biometallurgy" },
  { id: "mineral-processing", name: "Mineral Processing" },
  { id: "advanced-materials", name: "Advanced Materials" },
  { id: "mining-and-mineral-economics", name: "Mining and Mineral Economics" },
  { id: "hydrometallurgy", name: "Hydrometallurgy" },
  { id: "analytical-chemistry", name: "Analytical Chemistry" },
  { id: "mineralogy", name: "Mineralogy" },
  { id: "measurement-and-control", name: "Measurement and Control" },
  { id: "ict", name: "ICT" },
  { id: "sample-management", name: "Sample Management" },
  { id: "finance", name: "Finance" },
  { id: "communication", name: "Communication" },
  { id: "planning-monitoring-evaluation", name: "Planning, Monitoring, Evaluation" },
  { id: "sheq-and-erm", name: "SHEQ & ERM" },
  { id: "campus-and-maintenance", name: "Campus and Maintenance Support" },
  { id: "human-resources", name: "Human Resources" },
  { id: "mott", name: "MOTT" },
  { id: "research-and-development", name: "R&D Management" },
];

export const HR_DIVISION_ID = "human-resources";

const byId = new Map(DIVISIONS.map((division) => [division.id, division]));

export function divisionById(id: string): Division | undefined {
  return byId.get(id);
}

export function divisionName(id: string): string {
  return byId.get(id)?.name ?? "Division";
}
