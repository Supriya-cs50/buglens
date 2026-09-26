import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Admin = lazy(() => import("@/pages/Admin"));
const Batch = lazy(() => import("@/pages/Batch"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const History = lazy(() => import("@/pages/History"));
const Login = lazy(() => import("@/pages/Login"));
const NewReport = lazy(() => import("@/pages/NewReport"));
const Profile = lazy(() => import("@/pages/Profile"));
const Register = lazy(() => import("@/pages/Register"));
const ReportDetail = lazy(() => import("@/pages/ReportDetail"));
const Reports = lazy(() => import("@/pages/Reports"));

function Router() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f7f8fc]" aria-label="Loading page"/>}><Switch>
    <Route path="/" component={Home}/>
    <Route path="/register" component={Register}/>
    <Route path="/login" component={Login}/>
    <Route path="/forgot-password" component={ForgotPassword}/>
    <Route path="/dashboard" component={Dashboard}/>
    <Route path="/reports/new" component={NewReport}/>
    <Route path="/reports/:id" component={ReportDetail}/>
    <Route path="/reports" component={Reports}/>
    <Route path="/batch" component={Batch}/>
    <Route path="/history" component={History}/>
    <Route path="/profile" component={Profile}/>
    <Route path="/admin" component={Admin}/>
    <Route path="/404" component={NotFound}/>
    <Route component={NotFound}/>
  </Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
