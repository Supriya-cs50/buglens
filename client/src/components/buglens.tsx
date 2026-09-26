import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

const severityStyles: Record<string, string> = {
  CRITICAL: "border-rose-200 bg-rose-50 text-rose-700",
  HIGH: "border-orange-200 bg-orange-50 text-orange-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
};
const priorityStyles: Record<string, string> = {
  P0: "border-rose-200 bg-rose-50 text-rose-700",
  P1: "border-orange-200 bg-orange-50 text-orange-700",
  P2: "border-amber-200 bg-amber-50 text-amber-700",
  P3: "border-slate-200 bg-slate-50 text-slate-600",
};
const statusStyles: Record<string, string> = {
  ANALYZED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED_WITH_ERRORS: "border-amber-200 bg-amber-50 text-amber-700",
  PENDING: "border-slate-200 bg-slate-50 text-slate-600",
  QUEUED: "border-slate-200 bg-slate-50 text-slate-600",
  PROCESSING: "border-blue-200 bg-blue-50 text-blue-700",
  ANALYZING: "border-blue-200 bg-blue-50 text-blue-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
};

export function SeverityBadge({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  return <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide", severityStyles[value] ?? severityStyles.LOW, className)}>{value}</Badge>;
}
export function PriorityBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  return <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", priorityStyles[value] ?? priorityStyles.P3)}>{value}</Badge>;
}
export function StatusBadge({ value }: { value: string }) {
  return <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", statusStyles[value] ?? statusStyles.PENDING)}>{value.replaceAll("_", " ")}</Badge>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600">{eyebrow}</p>}<h1 className="mt-1 text-[25px] font-semibold tracking-[-0.035em] text-slate-950 sm:text-[29px]">{title}</h1>{description && <p className="mt-1.5 max-w-[670px] text-sm leading-6 text-slate-500">{description}</p>}</div>{action}</div>;
}
export function SectionHeading({ title, href, label = "View all" }: { title: string; href?: string; label?: string }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">{title}</h2>{href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">{label}<ArrowUpRight className="h-3 w-3" /></Link>}</div>;
}
export function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
