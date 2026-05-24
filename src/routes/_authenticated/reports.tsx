import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
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

type ReportPeriod = "daily" | "weekly" | "monthly" | "custom";

const reportPeriodLabels: Record<ReportPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

const csvCell = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const detailRows = (entries: DprEntry[]) =>
  entries.map((e) => ({
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

function ReportsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [selectedDate, setSelectedDate] = useState(today);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [dept, setDept] = useState("all");

  const range = useMemo(() => {
    const baseDate = parseISO(selectedDate);
    if (period === "daily") {
      return { from: selectedDate, to: selectedDate };
    }
    if (period === "weekly") {
      return {
        from: format(startOfWeek(baseDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(baseDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    }
    if (period === "monthly") {
      return {
        from: format(startOfMonth(baseDate), "yyyy-MM-dd"),
        to: format(endOfMonth(baseDate), "yyyy-MM-dd"),
      };
    }
    return { from, to };
  }, [from, period, selectedDate, to]);

  const reportTitle = `${reportPeriodLabels[period]} DPR Report`;
  const filePrefix = `AICCC_DPR_${period}_${range.from}_to_${range.to}`;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["report", range.from, range.to, dept],
    queryFn: async () => {
      let q = supabase
        .from("dpr_entries")
        .select("*")
        .gte("entry_date", range.from)
        .lte("entry_date", range.to)
        .order("entry_date", { ascending: true });
      if (dept !== "all") q = q.eq("department", dept);
      const { data, error } = await q;
      if (error) throw error;
      return data as DprEntry[];
    },
  });

  const summaryRows = DEPARTMENTS.map((d) => {
    const ents = entries.filter((e) => e.department === d);
    return [d, ...CATEGORIES.map((c) => ents.filter((e) => e.category === c.value).length), ents.length];
  });

  const exportPdf = () => {
    if (!entries.length) {
      toast.error("No data in range");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`AICCC ${reportTitle}`, 14, 16);
    doc.setFontSize(10);
    doc.text(
      `Period: ${format(parseISO(range.from), "dd MMM yyyy")} - ${format(parseISO(range.to), "dd MMM yyyy")}`,
      14,
      23,
    );
    doc.text(`Department: ${dept === "all" ? "All" : dept}   |   Total entries: ${entries.length}`, 14, 29);

    autoTable(doc, {
      startY: 34,
      head: [["Date", "Dept", "Category", "Description", "Total", "Done", "WIP", "Status", "Priority"]],
      body: entries.map((entry) => [
        format(parseISO(entry.entry_date), "dd MMM"),
        entry.department,
        entry.category.toUpperCase(),
        entry.description,
        (entry as any).total_tickets ?? 0,
        (entry as any).completed_tickets ?? 0,
        (entry as any).in_progress_tickets ?? 0,
        entry.status.replace("_", " "),
        entry.priority,
      ]),
      styles: { fontSize: 7, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [45, 138, 158] },
      columnStyles: {
        3: { cellWidth: 110 },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
    });
      row.Total = ents.length;
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");

    XLSX.writeFile(wb, `${filePrefix}.xlsx`);
    toast.success("Excel generated");
  };

  const exportCsv = () => {
    if (!entries.length) {
      toast.error("No data in range");
      return;
    }

    const rowsData = detailRows(entries);
    const headers = Object.keys(rowsData[0]);
    const rows = rowsData.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filePrefix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate daily, weekly, monthly, or custom DPR downloads.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Report type</Label>
              <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === "custom" ? (
              <>
                <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              </>
            ) : (
              <div>
                <Label>Calendar date</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
            )}

            <div>
              <Label>Department</Label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading..." : `${entries.length} entries match`}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Selected period: {format(parseISO(range.from), "dd MMM yyyy")} - {format(parseISO(range.to), "dd MMM yyyy")}
          </p>

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
                    <td className="px-4 py-2 whitespace-nowrap">{format(parseISO(e.entry_date), "dd MMM yyyy")}</td>
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
