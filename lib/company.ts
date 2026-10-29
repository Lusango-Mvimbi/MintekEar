import raw from "../company.json";

export type CompanyColors = {
  primary: string;
  primaryDark: string;
  ink: string;
  muted: string;
  paper: string;
  accent: string;
  line: string;
};

export type Company = {
  name: string;
  appName: string;
  tagline: string;
  logo: string;
  mark: string;
  colors: CompanyColors;
};

const colorKeys = [
  "primary",
  "primaryDark",
  "ink",
  "muted",
  "paper",
  "accent",
  "line",
] as const;

function assertCompany(value: typeof raw): Company {
  if (!value.name?.trim() || !value.appName?.trim() || !value.tagline?.trim()) {
    throw new Error("company.json needs a name, appName, and tagline.");
  }
  if (!value.logo?.startsWith("/")) {
    throw new Error("company.json logo must be a path inside public, starting with /.");
  }
  const mark = value.mark?.trim() ? value.mark : value.logo;
  if (!mark.startsWith("/")) {
    throw new Error("company.json mark must be a path inside public, starting with /.");
  }
  for (const key of colorKeys) {
    const color = value.colors?.[key];
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error(`company.json colors.${key} must be a #rrggbb colour.`);
    }
  }
  return { ...value, mark };
}

export const company = assertCompany(raw);
