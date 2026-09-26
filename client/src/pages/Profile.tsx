import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading, formatDate } from "@/components/buglens";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, Check, LoaderCircle, Mail, Shield, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Profile() {
  const {user}=useAuth();
  const utils=trpc.useUtils();
  const [name,setName]=useState(user?.name??"");
  useEffect(()=>setName(user?.name??""),[user?.name]);
  const update=trpc.buglens.profile.update.useMutation({onSuccess:async()=>{toast.success("Profile updated.");await utils.auth.me.invalidate();},onError:error=>toast.error(error.message)});
  return <DashboardLayout><div className="mx-auto max-w-[950px]"><PageHeading eyebrow="Workspace identity" title="My profile" description="Manage your personal details and review account access."/>
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]"><section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-4 border-b border-slate-100 pb-5"><Avatar className="h-14 w-14 border border-indigo-100"><AvatarFallback className="bg-indigo-50 text-lg font-semibold text-indigo-700">{user?.name?.slice(0,1).toUpperCase()||"U"}</AvatarFallback></Avatar><div><p className="text-base font-semibold text-slate-900">{user?.name||"BugLens user"}</p><p className="mt-1 text-xs text-slate-500">{user?.email||"No email provided"}</p></div></div>
      <form onSubmit={event=>{event.preventDefault();update.mutate({name});}} className="mt-5 space-y-4"><label className="block space-y-1.5 text-xs font-semibold text-slate-700">Display name<Input value={name} onChange={e=>setName(e.target.value)} maxLength={100} minLength={2} required className="h-10 rounded-xl border-slate-200 text-xs font-normal"/></label><label className="block space-y-1.5 text-xs font-semibold text-slate-700">Email address<div className="relative"><Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><Input value={user?.email??""} readOnly className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 text-xs text-slate-500"/></div><span className="block text-[10px] font-normal text-slate-400">Email changes are managed by your identity provider.</span></label><Button type="submit" disabled={update.isPending||name.trim()===user?.name} className="h-9 rounded-lg bg-indigo-600 text-xs">{update.isPending?<LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin"/>:<Check className="mr-2 h-3.5 w-3.5"/>}Save profile</Button></form>
    </section><aside className="space-y-4"><section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Shield className="h-4 w-4"/></span><h2 className="text-sm font-semibold text-slate-900">Account access</h2></div><Info icon={BadgeCheck} label="Workspace role" value={user?.role==="admin"?"Administrator":"Member"}/><Info icon={UserRound} label="Member since" value={formatDate(user?.createdAt)}/><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-700">Your reports are private</p><p className="mt-1 text-[10px] leading-5 text-slate-500">Only your account and workspace administrators can access reports associated with you.</p></div></section><section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5"><p className="text-xs font-semibold text-slate-800">Need administrator access?</p><p className="mt-1.5 text-[11px] leading-5 text-slate-500">Ask an existing BugLens administrator to grant your account the appropriate role.</p></section></aside></div>
  </div></DashboardLayout>;
}
function Info({icon:Icon,label,value}:{icon:typeof UserRound;label:string;value:string}){return <div className="flex items-center gap-3 border-b border-slate-50 py-3 last:border-0"><Icon className="h-4 w-4 text-slate-400"/><span className="flex-1 text-[11px] text-slate-500">{label}</span><span className="text-[11px] font-medium text-slate-800">{value}</span></div>}
