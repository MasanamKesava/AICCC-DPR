import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS, CATEGORIES, type DprEntry } from "@/lib/dpr-constants";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

function ReportsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [dept, setDept] = useState("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["report", from, to, dept],
    queryFn: async () => {
      let q = supabase.from("dpr_entries").select("*").gte("entry_date", from).lte("entry_date", to).order("entry_date", { ascending: true });
      if (dept !== "all") q = q.eq("department", dept);
      const { data, error } = await q;
      if (error) throw error;
      return data as DprEntry[];
    },
  });

  const exportPdf = () => {
    if (!entries.length) { toast.error("No data in range"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("AICCC Daily Progress Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Period: ${format(new Date(from), "dd MMM yyyy")} – ${format(new Date(to), "dd MMM yyyy")}`, 14, 23);
    doc.text(`Department: ${dept === "all" ? "All" : dept}   |   Total entries: ${entries.length}`, 14, 29);

    // Department summary
    const summaryRows = DEPARTMENTS.map((d) => {
      const ents = entries.filter((e) => e.department === d);
      return [d, ...CATEGORIES.map((c) => ents.filter((e) => e.category === c.value).length), ents.length];
    });
    autoTable(doc, {
      startY: 34,
      head: [["Department", ...CATEGORIES.map((c) => c.label), "Total"]],
      body: summaryRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [12, 35, 64] },
    });

    // Entries detail
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Date", "Dept", "Category", "Description", "Status", "Priority"]],
      body: entries.map((e) => [
        format(new Date(e.entry_date), "dd MMM"),
        e.department,
        e.category.toUpperCase(),
        (e.description || "").slice(0, 60),
        e.status,
        e.priority,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 138, 158] },
    });

    doc.save(`AICCC_DPR_${from}_to_${to}.pdf`);
    toast.success("PDF generated");
  };

  const exportXlsx = () => {
    if (!entries.length) { toast.error("No data in range"); return; }
    const wb = XLSX.utils.book_new();
    const detail = entries.map((e) => ({
      Date: e.entry_date,
      Department: e.department,
      Category: e.category,
      Vendor: e.vendor ?? "",
      Location: e.location ?? "",
      ActivityType: e.activity_type ?? "",
      Description: e.description,
      PersonResponsible: e.person_responsible ?? "",
      OutputEvidence: e.output_evidence ?? "",
      IssuesNoticed: e.issues_noticed ?? "",
      ActionRequired: e.action_required ?? "",
      Status: e.status,
      Priority: e.priority,
      Session: e.session ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "Entries");

    const summary = DEPARTMENTS.map((d) => {
      const ents = entries.filter((e) => e.department === d);
      const row: Record<string, string | number> = { Department: d };
      CATEGORIES.forEach((c) => { row[c.label] = ents.filter((e) => e.category === c.value).length; });
      row.Total = ents.length;
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");

    XLSX.writeFile(wb, `AICCC_DPR_${from}_to_${to}.xlsx`);
    toast.success("Excel generated");
  };

  const exportCsv = () => {
    if (!entries.length) { toast.error("No data in range"); return; }
    const headers = ["Date", "Department", "Category", "Description", "Status", "Priority"];
    const rows = entries.map((e) => [e.entry_date, e.department, e.category, `"${(e.description || "").replace(/"/g, '""')}"`, e.status, e.priority].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `AICCC_DPR_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate downloadable DPRs for any date range.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Report parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div><Label>Department</Label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><p className="text-sm text-muted-foreground">{isLoading ? "Loading…" : `${entries.length} entries match`}</p></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />Download PDF</Button>
            <Button onClick={exportXlsx} variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" />Download Excel</Button>
            <Button onClick={exportCsv} variant="outline"><FileDown className="mr-2 h-4 w-4" />Download CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preview ({entries.length} entries)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-muted/80 text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Department</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-4 py-2 whitespace-nowrap">{format(new Date(e.entry_date), "dd MMM yyyy")}</td>
                    <td className="px-4 py-2">{e.department}</td>
                    <td className="px-4 py-2 uppercase">{e.category}</td>
                    <td className="px-4 py-2 max-w-lg truncate">{e.description}</td>
                    <td className="px-4 py-2 capitalize">{e.status.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
