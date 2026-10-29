import { formatScore, scoreTone, verdictLabel } from "@/lib/format";
import { StarIcon } from "./icons";

const tones = {
  good: { badge: "bg-[#e7f6ee] text-[#0f8a4b]", label: "text-[#0f8a4b]" },
  mixed: { badge: "bg-[#fff6e0] text-[#a16207]", label: "text-[#a16207]" },
  bad: { badge: "bg-[#fdecee] text-[#d64545]", label: "text-[#d64545]" },
};

export function ScoreBlock({ score }: { score: number }) {
  const tone = scoreTone(score);
  const style = tones[tone];
  return (
    <div className="flex flex-col items-start">
      <div className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[15px] font-bold ${style.badge}`}>
        <StarIcon />
        <span>{formatScore(score)}</span>
      </div>
      <p className={`mt-2 text-sm font-semibold ${style.label}`}>{verdictLabel(score)}</p>
    </div>
  );
}
