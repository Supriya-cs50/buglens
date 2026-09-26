import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  return <AuthShell title="Password help" subtitle="We’ll point you to the right next step." footer={<>Remember your password? <Link href="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">Sign in</Link></>}>
    {submitted ? <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-5"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-indigo-700"><MailCheck className="h-5 w-5" /></div><p className="text-sm font-semibold text-slate-800">Contact your workspace administrator</p><p className="mt-2 text-sm leading-6 text-slate-600">Self-service email recovery is not configured for this workspace yet. For account access, ask your BugLens administrator to help reset your credentials.</p></div> : <form onSubmit={event => { event.preventDefault(); setSubmitted(true); }} className="space-y-4"><label className="block space-y-1.5 text-sm font-medium text-slate-700">Account email<Input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" className="h-11 rounded-xl border-slate-200" /></label><p className="text-xs leading-5 text-slate-500">Password reset emails are not enabled in this installation. This form will not send or store your email.</p><Button type="submit" className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700">Continue</Button></form>}
    <Link href="/login" className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Back to sign in</Link>
  </AuthShell>;
}
