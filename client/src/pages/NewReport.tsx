import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading } from "@/components/buglens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, FileText, LoaderCircle, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const example = {
  title: "Checkout freezes after clicking Pay",
  description: "After logging into the application, clicking the checkout button causes the page to freeze. The issue occurs consistently and the user is unable to complete payment. The loading spinner stays visible and no confirmation appears.",
  environment: "Chrome 128 · Windows 11",
  appModule: "Payments / Checkout",
};

export default function NewReport() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState("");
  const [appModule, setAppModule] = useState("");
  const [severity, setSeverity] = useState("");
  const [problem, setProblem] = useState("");
  const create = trpc.buglens.reports.create.useMutation();
  const analyze = trpc.buglens.reports.analyze.useMutation();
  const busy = create.isPending || analyze.isPending;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setProblem("");
    if (title.trim().length < 3) return setProblem("Enter a title with at least 3 characters.");
    if (description.trim().length < 10) return setProblem("Add a little more detail (at least 10 characters).");
    try {
      const report = await create.mutateAsync({ title, description, environment, appModule, ...(severity ? { reportedSeverity: severity as "CRITICAL"|"HIGH"|"MEDIUM"|"LOW" } : {}) });
      await utils.buglens.reports.list.invalidate();
      try {
        await analyze.mutateAsync({ id: report.id });
        toast.success("Report saved and analyzed.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to analyze the report. You can try again from the report page.");
      }
      await Promise.all([utils.buglens.dashboard.stats.invalidate(), utils.buglens.reports.detail.invalidate({ id: report.id })]);
      setLocation(`/reports/${report.id}`);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Unable to save this report. Please try again.");
    }
  }

  return <DashboardLayout><div className="mx-auto max-w-[1040px]"><PageHeading eyebrow="Capture an issue" title="New bug report" description="Preserve what happened; BugLens will turn the details into a structured triage ticket." action={<Button asChild variant="outline" className="h-9 rounded-lg border-slate-200 bg-white text-xs"><Link href="/reports"><ArrowLeft className="mr-2 h-3.5 w-3.5"/>All reports</Link></Button>} />
    <form onSubmit={submit}><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_275px]">
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4"><div><CardTitle className="text-sm">Issue details</CardTitle><p className="mt-1 text-xs text-slate-400">Fields marked with * are required.</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><FileText className="h-4 w-4"/></span></CardHeader><CardContent className="space-y-5 p-5 sm:p-6">
        <label className="block space-y-2 text-xs font-semibold text-slate-700">Bug title <span className="text-rose-500">*</span><Input required minLength={3} maxLength={255} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Checkout freezes after payment" className="h-11 rounded-xl border-slate-200 text-sm font-normal"/><span className="block text-right text-[10px] font-normal text-slate-400">{title.length}/255</span></label>
        <label className="block space-y-2 text-xs font-semibold text-slate-700">Raw bug description <span className="text-rose-500">*</span><Textarea required minLength={10} maxLength={20000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe what happened, how often, and what the user was trying to do…" className="min-h-[205px] resize-y rounded-xl border-slate-200 text-sm font-normal leading-6"/><span className={`block text-right text-[10px] font-normal ${description.length>19000?"text-amber-600":"text-slate-400"}`}>{description.length.toLocaleString()}/20,000</span></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2 text-xs font-semibold text-slate-700">Environment<Input maxLength={1000} value={environment} onChange={e=>setEnvironment(e.target.value)} placeholder="Browser, OS, app version…" className="h-10 rounded-xl border-slate-200 text-xs font-normal"/></label><label className="block space-y-2 text-xs font-semibold text-slate-700">Application / module<Input maxLength={120} value={appModule} onChange={e=>setAppModule(e.target.value)} placeholder="e.g. Checkout" className="h-10 rounded-xl border-slate-200 text-xs font-normal"/></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2 text-xs font-semibold text-slate-700">Reported severity <span className="font-normal text-slate-400">(optional)</span><select value={severity} onChange={e=>setSeverity(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"><option value="">Let triage determine</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-700">Original report is preserved</p><p className="mt-1 text-[10px] leading-4 text-slate-500">AI findings are shown separately from these details and can be regenerated.</p></div></div>
        {problem&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{problem}</p>}
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><Link href="/reports" className="text-center text-xs font-semibold text-slate-500 hover:text-slate-800 sm:text-left">Cancel</Link><Button type="submit" disabled={busy} className="h-11 rounded-xl bg-indigo-600 px-5 font-semibold hover:bg-indigo-700">{busy?<><LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>{analyze.isPending?"Analyzing bug report…":"Saving report…"}</>:<><Sparkles className="mr-2 h-4 w-4"/>Save &amp; analyze report</>}</Button></div>
      </CardContent></Card>
      <aside className="space-y-4"><Card className="rounded-2xl border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center justify-between"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-indigo-700 shadow-sm"><WandSparkles className="h-4 w-4"/></div><span className="rounded-full border border-indigo-100 bg-white/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-indigo-700">AI Triage</span></div><p className="text-sm font-semibold text-slate-900">What happens next?</p><p className="mt-1.5 text-xs leading-5 text-slate-500">Your report is saved first, then analyzed privately on the server. Structured findings become part of this ticket.</p><div className="mt-4 space-y-2.5">{["Concise bug summary","Severity & priority","Impact & reproduction steps","Likely cause & next action"].map(item=><p key={item} className="flex items-center gap-2 text-[10px] text-slate-600"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/>{item}</p>)}</div></CardContent></Card>
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-800">Need a starting point?</p><span className="text-[9px] text-slate-400">SAMPLE</span></div><p className="mt-2 text-[11px] leading-5 text-slate-500">Use a sample checkout issue to preview how a clear report is structured.</p><Button type="button" variant="outline" onClick={()=>{setTitle(example.title);setDescription(example.description);setEnvironment(example.environment);setAppModule(example.appModule);setSeverity("");setProblem("");}} className="mt-4 h-9 w-full rounded-lg border-slate-200 text-xs font-semibold text-slate-700"><WandSparkles className="mr-2 h-3.5 w-3.5 text-indigo-600"/>Use example report</Button></CardContent></Card>
        <div className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3"><p className="text-[10px] leading-5 text-slate-400">Avoid adding passwords, access tokens, or other secrets to report descriptions.</p></div>
      </aside>
    </div></form>
  </div></DashboardLayout>;
}
