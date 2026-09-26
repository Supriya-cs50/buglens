import { Bug, MoveLeft } from "lucide-react";
import { Link } from "wouter";

export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f7f8fc] px-4 py-12 text-slate-900">
      <div className="pointer-events-none absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-[380px] w-[380px] rounded-full bg-sky-100 blur-3xl" />
      <div className="relative w-full max-w-[440px]">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors hover:text-indigo-700"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white"><Bug className="h-4 w-4" /></span>BugLens</Link>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xl shadow-slate-900/[0.06] sm:p-9">
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">{footer}</div>
        </section>
        <Link href="/" className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"><MoveLeft className="h-3.5 w-3.5" />Back to BugLens</Link>
        <p className="mt-8 text-center text-[11px] text-slate-400">Secure workspace · Your issue data stays private</p>
      </div>
    </main>
  );
}
