import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEPARTMENTS, type DprEntry } from "@/lib/dpr-constants";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/analytics")({ component: AnalyticsPage });

const COLORS = ["oklch(0.27 0.07 250)", "oklch(0.62 0.09 210)", "oklch(0.75 0.1 190)", "oklch(0.7 0.15 75)", "oklch(0.6 0.22 25)"];

function AnalyticsPage() {
  const { data: entries = [] } = useQuery({
    queryKey: ["dpr-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dpr_entries").select("*").limit(2000);
      if (error) throw error;
      return data as DprEntry[];
    },
  });

  const trend14 = Array.from({ length: 14 }).map((_, i) => {
    const d = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
    const day = entries.filter((e) => e.entry_date === d);
    return {
      date: format(parseISO(d), "MMM dd"),
      open: day.filter((e) => e.status === "open").length,
      progress: day.filter((e) => e.status === "in_progress").length,
      resolved: day.filter((e) => e.status === "resolved" || e.status === "closed").length,
    };
  });

  const statusPie = [
    { name: "Open", value: entries.filter((e) => e.status === "open").length },
    { name: "In Progress", value: entries.filter((e) => e.status === "in_progress").length },
    { name: "Escalated", value: entries.filter((e) => e.status === "escalated").length },
    { name: "Resolved", value: entries.filter((e) => e.status === "resolved").length },
    { name: "Closed", value: entries.filter((e) => e.status === "closed").length },
  ];

  const deptBar = DEPARTMENTS.map((d) => ({
    name: d.length > 14 ? d.slice(0, 14) + "…" : d,
    total: entries.filter((e) => e.department === d).length,
    completed: entries.filter((e) => e.department === d && (e.status === "resolved" || e.status === "closed")).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Trends, completion rates and ticket aging insights.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Ticket trend (14 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend14}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="open" stroke={COLORS[0]} strokeWidth={2} />
                <Line type="monotone" dataKey="progress" stroke={COLORS[1]} strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke={COLORS[2]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Department productivity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptBar}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
