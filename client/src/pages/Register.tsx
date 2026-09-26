import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const mutation = trpc.buglens.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Your BugLens workspace is ready.");
      setLocation("/dashboard");
    },
    onError: error => toast.error(error.message || "Unable to create your account."),
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [problem, setProblem] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblem("");
    if (password !== confirm) return setProblem("Your passwords do not match.");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return setProblem("Use at least 8 characters with an uppercase letter, a lowercase letter, and a number.");
    mutation.mutate({ name, email, password });
  }

  return <AuthShell title="Create your account" subtitle="Start turning raw reports into clear, actionable tickets." footer={<>Already have a workspace? <Link href="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">Sign in</Link></>}>
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Full name<Input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Jordan Lee" className="h-11 rounded-xl border-slate-200 bg-white" /></label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Work email<Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="h-11 rounded-xl border-slate-200 bg-white" /></label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Password<div className="relative"><Input type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" className="h-11 rounded-xl border-slate-200 pr-11" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
      <p className="-mt-2 text-[11px] leading-5 text-slate-400">At least 8 characters, with uppercase, lowercase, and a number.</p>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Confirm password<Input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Enter your password again" className="h-11 rounded-xl border-slate-200" /></label>
      {(problem || mutation.error) && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{problem || mutation.error?.message}</p>}
      <Button type="submit" disabled={mutation.isPending} className="h-11 w-full rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-700">{mutation.isPending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : "Create account"}</Button>
      <p className="pt-1 text-center text-[11px] leading-5 text-slate-400">By continuing, you agree to use BugLens responsibly and keep submitted issue data appropriate for your workspace.</p>
    </form>
  </AuthShell>;
}
