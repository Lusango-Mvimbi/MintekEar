import { company } from "@/lib/company";

export function CompanyMark() {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-ink">
      <img src={company.mark} alt="" className="h-6 w-auto" />
      {company.name}
    </span>
  );
}
