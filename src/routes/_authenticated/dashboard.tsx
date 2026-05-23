import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  HardHat,
  Wrench,
  MessageSquare,
  Pencil,
  Truck,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { DEPARTMENTS, ROW_SECTIONS, computeSectionStats } from "@/lib/dpr-constants";
import type { DprEntry } from "@/lib/dpr-constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["dpr-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dpr_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as DprEntry[];
    },
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter((e) => e.entry_date === today);
  const byCat = (cat: string) => todayEntries.filter((e) => e.category === cat).length;

  const stats = [
    { label: "Total Tickets", value: entries.length, icon: FileText, tone: "text-primary" },
    {
      label: "Completed",
      value: entries.filter((e) => e.status === "resolved" || e.status === "closed").length,
      icon: CheckCircle2,
      tone: "text-success",
    },
    {
      label: "In Progress",
      value: entries.filter((e) => e.status === "in_progress").length,
      icon: Clock,
      tone: "text-warning",
    },
    {
      label: "Escalated",
      value: entries.filter((e) => e.status === "escalated").length,
      icon: AlertTriangle,
      tone: "text-destructive",
    },
  ];

  const todayCards = [
    { label: "Today's RFIs", value: byCat("rfi"), icon: FileText },
    { label: "Worklogs", value: byCat("worklog"), icon: Pencil },
    { label: "Drawings", value: byCat("drawing"), icon: FileText },
    { label: "Hindrances", value: byCat("hindrance"), icon: FileWarning },
    { label: "Labour", value: byCat("labour"), icon: HardHat },
    { label: "Machinery", value: byCat("machinery"), icon: Truck },
    { label: "Grievances", value: byCat("grievance"), icon: MessageSquare },
  ];

  // Daily trend (last 7 days)
  const trend = Array.from({ length: 7 }).map((_, i) => {
    const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const dayEntries = entries.filter((e) => e.entry_date === d);
    return {
      date: format(parseISO(d), "MMM dd"),
      total: dayEntries.length,
      resolved: dayEntries.filter((e) => e.status === "resolved" || e.status === "closed").length,
    };
  });

  const deptData = DEPARTMENTS.map((dep) => ({
    name: dep.length > 12 ? dep.slice(0, 12) + "…" : dep,
    tickets: entries.filter((e) => e.department === dep).length,
  }));

  // Grand Total Summary by section (today) — shares logic with DPR Summary / PDF
  const sectionStats = computeSectionStats(todayEntries);
  const grandTotal = sectionStats.reduce(
    (a, s) => ({
      total: a.total + s.total,
      completed: a.completed + s.completed,
      inProgress: a.inProgress + s.inProgress,
      delayed: a.delayed + s.delayed,
    }),
    { total: 0, completed: 0, inProgress: 0, delayed: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Command Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          AICCC project overview · {format(new Date(), "EEEE, dd MMMM yyyy")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-3xl font-bold">{isLoading ? "—" : s.value}</p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted ${s.tone}`}
              >
                <s.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Today's Activity
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {todayCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <c.icon className="h-4 w-4 text-accent" />
                  <Badge variant="secondary">{c.value}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Trends (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Total"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="tickets" fill="oklch(0.62 0.09 210)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grand Total Summary — mirrors DPR Summary & printable PDF */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Grand Total Summary (Today)</CardTitle>
          <span className="text-xs text-muted-foreground">
            Total {grandTotal.total} · {grandTotal.completed} done · {grandTotal.inProgress} wip ·{" "}
            {grandTotal.delayed} delayed
          </span>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sectionStats.map((s) => ({ name: s.title, ...s }))}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" stackId="a" fill="hsl(var(--success))" name="Completed" />
              <Bar dataKey="inProgress" stackId="a" fill="hsl(var(--warning))" name="In Progress" />
              <Bar dataKey="delayed" stackId="a" fill="hsl(var(--destructive))" name="Delayed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

