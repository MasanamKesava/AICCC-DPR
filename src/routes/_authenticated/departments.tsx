import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEPARTMENTS, CATEGORIES, type DprEntry } from "@/lib/dpr-constants";

export const Route = createFileRoute("/_authenticated/departments")({ component: DeptPage });

function DeptPage() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["dpr-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dpr_entries").select("*").limit(2000);
      if (error) throw error;
      return data as DprEntry[];
    },
  });

  const rows = DEPARTMENTS.map((dep) => {
    const ents = entries.filter((e) => e.department === dep);
    const counts: Record<string, number> = {};
    CATEGORIES.forEach((c) => { counts[c.value] = ents.filter((e) => e.category === c.value).length; });
    const completed = ents.filter((e) => e.status === "resolved" || e.status === "closed").length;
    return { dep, counts, total: ents.length, completed, pct: ents.length ? Math.round((completed / ents.length) * 100) : 0 };
  });

  const totals = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.value] = rows.reduce((s, r) => s + r.counts[c.value], 0);
    return acc;
  }, {});
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Department Summary</h1>
        <p className="text-sm text-muted-foreground">Auto-aggregated counts across all DPR entries.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Counts by category</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Department</th>
                  {CATEGORIES.map((c) => <th key={c.value} className="px-4 py-3 text-center">{c.label}</th>)}
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Completion</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={CATEGORIES.length + 3} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!isLoading && rows.map((r) => (
                  <tr key={r.dep} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.dep}</td>
                    {CATEGORIES.map((c) => <td key={c.value} className="px-4 py-3 text-center">{r.counts[c.value]}</td>)}
                    <td className="px-4 py-3 text-center font-semibold">{r.total}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-success" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{r.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-primary/5 font-semibold">
                  <td className="px-4 py-3">Grand Total</td>
                  {CATEGORIES.map((c) => <td key={c.value} className="px-4 py-3 text-center">{totals[c.value]}</td>)}
                  <td className="px-4 py-3 text-center">{grandTotal}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
