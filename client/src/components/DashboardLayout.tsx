import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Activity,
  Bug,
  ChevronRight,
  Clock3,
  Gauge,
  Layers3,
  LogOut,
  PanelLeft,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type MenuItem = { icon: typeof Gauge; label: string; path: string; admin?: boolean };
const menuItems: MenuItem[] = [
  { icon: Gauge, label: "Overview", path: "/dashboard" },
  { icon: Bug, label: "Bug reports", path: "/reports" },
  { icon: Plus, label: "New report", path: "/reports/new" },
  { icon: Layers3, label: "Batch processing", path: "/batch" },
  { icon: Clock3, label: "Processing history", path: "/history" },
  { icon: UserRound, label: "My profile", path: "/profile" },
  { icon: ShieldCheck, label: "Admin console", path: "/admin", admin: true },
];

const SIDEBAR_WIDTH_KEY = "buglens-sidebar-width";
const DEFAULT_WIDTH = 252;
const MIN_WIDTH = 220;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = saved ? Number.parseInt(saved, 10) : DEFAULT_WIDTH;
    return Number.isFinite(parsed) ? parsed : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f7fb] px-5 text-center">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-9 shadow-xl shadow-slate-900/5">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700"><Bug className="h-6 w-6" /></div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sign in to your workspace</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Your reports and triage history are private to your account.</p>
          <Button onClick={() => setLocation("/login")} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700">Continue to sign in <ChevronRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void };

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const visibleItems = menuItems.filter(item => !item.admin || user?.role === "admin");
  const activeMenuItem = visibleItems.find(item => item.path === location) ?? visibleItems.find(item => item.path !== "/dashboard" && location.startsWith(`${item.path}/`));

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white" disableTransition={isResizing}>
          <SidebarHeader className="h-[76px] justify-center border-b border-slate-100 px-3">
            <div className="flex w-full items-center gap-3">
              <button onClick={toggleSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-900/20 transition-transform active:scale-95" aria-label="Toggle navigation"><Bug className="h-[18px] w-[18px]" /></button>
              {!isCollapsed && <div className="min-w-0"><p className="truncate text-sm font-bold tracking-tight text-slate-900">BugLens</p><p className="truncate text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">Engineering triage</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="gap-0 px-2 py-5">
            {!isCollapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>}
            <SidebarMenu className="gap-1">
              {visibleItems.map(item => {
                const isActive = item.path === location || (item.path !== "/dashboard" && location.startsWith(`${item.path}/`));
                return <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={item.label} className={`h-10 rounded-xl font-medium transition-colors ${isActive ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                    <item.icon className="h-[17px] w-[17px]" /><span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>;
              })}
            </SidebarMenu>
            {!isCollapsed && <div className="mx-2 mt-7 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-3.5"><div className="mb-2 flex items-center gap-2 text-indigo-700"><Activity className="h-4 w-4" /><span className="text-xs font-semibold">Triage, in focus</span></div><p className="text-[11px] leading-5 text-slate-600">Turn noisy issue reports into clear next steps for your team.</p></div>}
          </SidebarContent>
          <SidebarFooter className="border-t border-slate-100 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 border border-indigo-100 bg-indigo-50"><AvatarFallback className="bg-indigo-50 text-xs font-semibold text-indigo-700">{user?.name?.slice(0, 1).toUpperCase() || "U"}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-slate-800">{user?.name || "BugLens user"}</p><p className="mt-1 truncate text-[10px] text-slate-500">{user?.email || "Workspace account"}</p></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl">
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer"><UserRound className="mr-2 h-4 w-4" />My profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()} className="cursor-pointer text-rose-600 focus:text-rose-600"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!isCollapsed && <div className="px-2 pb-1 pt-2 text-[10px] text-slate-400">BugLens workspace · {user?.role === "admin" ? "Admin" : "Member"}</div>}
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-indigo-300/40 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} />
      </div>
      <SidebarInset className="min-w-0 bg-[#f6f8fc]">
        {isMobile && <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur"><SidebarTrigger className="h-9 w-9 rounded-lg" /><span className="text-sm font-semibold text-slate-800">{activeMenuItem?.label ?? "BugLens"}</span></div>}
        <main className="min-h-screen min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 xl:px-9">{children}</main>
      </SidebarInset>
    </>
  );
}
