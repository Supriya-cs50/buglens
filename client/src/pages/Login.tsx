import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.buglens.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Welcome back.");
      setLocation("/dashboard");
    },
    onError: error => toast.error(error.message || "Unable to sign in."),
  });
  return <AuthShell title="Welcome back" subtitle="Sign in to see your team’s latest bug triage." footer={<>New to BugLens? <Link href="/register" className="font-semibold text-indigo-700 hover:text-indigo-800">Create an account</Link></>}>
    <form onSubmit={event => { event.preventDefault(); login.mutate({ email, password }); }} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Email address<Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="h-11 rounded-xl border-slate-200" /></label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Password<Input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" className="h-11 rounded-xl border-slate-200" /></label>
      <div className="flex justify-end"><Link href="/forgot-password" className="text-xs font-semibold text-indigo-700 hover:text-indigo-800">Forgot password?</Link></div>
      {login.error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{login.error.message}</p>}
      <Button type="submit" disabled={login.isPending} className="h-11 w-full rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-700">{login.isPending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
    </form>
  </AuthShell>;
}
