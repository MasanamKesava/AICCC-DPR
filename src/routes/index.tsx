import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, FileText, Shield, Workflow, Building2 } from "lucide-react";

const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ca408d60-0114-48cd-a23b-832d10d95c02/id-preview-2415bf7c--50abdf37-baa6-4b34-9d4b-68bdf842b1b2.lovable.app-1779434895215.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "AICCC DPR Management System — Smart City Infrastructure Command Center" },
      { name: "description", content: "Track RFIs, worklogs, drawings, hindrances and department progress across every AICCC site from one unified Daily Progress Report platform." },
      { property: "og:title", content: "AICCC DPR Management System" },
      { property: "og:description", content: "Track RFIs, worklogs, drawings, hindrances and department progress across every AICCC site from one unified Daily Progress Report platform." },
      { property: "og:url", content: "https://aiccc-pulse.lovable.app/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "AICCC DPR Management System" },
      { name: "twitter:description", content: "Track RFIs, worklogs, drawings, hindrances and department progress across every AICCC site." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://aiccc-pulse.lovable.app/" }],
  }),
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const appLink = user ? "/dashboard" : "/auth";
  const appAction = user ? "Open dashboard" : "Sign in";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">AICCC</p>
              <p className="text-xs text-muted-foreground leading-tight">DPR Management</p>
            </div>
          </div>
          <Link to={appLink}><Button>{appAction}</Button></Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)", opacity: 0.05 }} />
        <div className="container mx-auto px-4 py-24 text-center">
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Smart City Infrastructure Command Center
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            AICCC Daily Progress<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Report Management</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A centralized platform to track RFIs, worklogs, drawings, hindrances and department progress across every site — one source of truth for the project.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to={appLink}><Button size="lg">{appAction}</Button></Link>
            {!user && <Link to="/auth"><Button size="lg" variant="outline">Sign in</Button></Link>}
          </div>
        </div>
      </section>

      <main>
        <section className="container mx-auto px-4 pb-24">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Everything you need to run the daily report</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: FileText, title: "DPR Entry", desc: "Capture every site activity by department, category and session." },
              { icon: BarChart3, title: "Live Dashboard", desc: "Ticket aging, SLA breaches and department performance at a glance." },
              { icon: Workflow, title: "Department Summary", desc: "RFI, worklog, drawing and hindrance counts auto-aggregated daily." },
              { icon: Activity, title: "Trends & Analytics", desc: "Daily and weekly trend charts powered by Recharts." },
              { icon: Shield, title: "Role-based Access", desc: "Admin, PM, Coordinator, PMC, Field Engineer and Viewer roles." },
              { icon: FileText, title: "PDF & Excel Reports", desc: "Government-style exportable DPRs for any date range." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <f.icon className="h-8 w-8 text-accent" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
