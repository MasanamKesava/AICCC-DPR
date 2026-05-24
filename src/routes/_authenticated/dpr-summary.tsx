import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

import { format, parseISO, subDays } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Printer, FileDown, Plus, Trash2, Upload } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { CATEGORIES, DEPARTMENTS, ROW_SECTIONS, computeSectionStats, type DprEntry } from "@/lib/dpr-constants";
import { z } from "zod";

const absenteeSchema = z.object({
  employee_name: z.string().trim().min(1, "Name required").max(150),
  department: z.string().trim().max(100).optional(),
  designation: z.string().trim().max(100).optional(),
  absent_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export const Route = createFileRoute("/_authenticated/dpr-summary")({ component: DprSummary });

type Absentee = {
  id: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  absent_date: string;
  remarks: string | null;
  created_by: string | null;
};
type Recorder = {
  id: string;
  user_id: string;
  name: string;
  designation: string | null;
  department: string | null;
  role: "prepared_by" | "reviewed_by" | "approved_by";
  signature_url: string | null;
  dpr_date: string;
  recorded_at: string;
};

const ROW_TITLES = ROW_SECTIONS.map((s) => s.title) as readonly ("Tickets" | "BIM" | "CCTV" | "Drone" | "Logs")[];
type RowTitle = (typeof ROW_TITLES)[number];
type ManualDprRow = {
  total: string;
  completed: string;
  inProgress: string;
  description: string;
  people: string;
  evidence: string;
  issues: string;
  action: string;
};

const emptyManualRows = () =>
  ROW_TITLES.reduce(
    (acc, title) => ({
      ...acc,
      [title]: {
        total: "",
        completed: "",
        inProgress: "",
        description: "",
        people: "",
        evidence: "",
        issues: "",
        action: "",
      },
    }),
    {} as Record<RowTitle, ManualDprRow>,
  );

const numValue = (value: string, fallback = 0) => {
  if (value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatActivity = (
  row: ManualDprRow,
  fallback?: { total: number; completed: number; inProgress: number },
) => {
  const total = numValue(row.total, fallback?.total ?? 0);
  const completed = numValue(row.completed, fallback?.completed ?? 0);
  const inProgress = numValue(row.inProgress, fallback?.inProgress ?? 0);
  return `Total Tickets - ${total}\nCompleted - ${completed}\nIn Progress - ${inProgress}`;
};

function DprSummary() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualRows, setManualRows] = useState<Record<RowTitle, ManualDprRow>>(() =>
    emptyManualRows(),
  );

  const { data: entries = [] } = useQuery({
    queryKey: ["dpr-summary-entries", date],
    queryFn: async () => {
      const from = format(subDays(parseISO(date), 6), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("dpr_entries")
        .select("*")
        .gte("entry_date", from)
        .lte("entry_date", date)
        .order("entry_date");
      if (error) throw error;
      return data as DprEntry[];
    },
  });

  const { data: absentees = [] } = useQuery({
    queryKey: ["absentees", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absentees")
        .select("*")
        .eq("absent_date", date)
        .order("employee_name");
      if (error) throw error;
      return data as Absentee[];
    },
  });

  const { data: recorders = [] } = useQuery({
    queryKey: ["recorders", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("recorded_by").select("*").eq("dpr_date", date);
      if (error) throw error;
      return data as Recorder[];
    },
  });

  const todayEntries = entries.filter((e) => e.entry_date === date);
  const yesterday = format(subDays(parseISO(date), 1), "yyyy-MM-dd");
  const yesterdayEntries = entries.filter((e) => e.entry_date === yesterday);

  const counts = useMemo(() => {
    const tot = todayEntries.length;
    const completed = todayEntries.filter(
      (e) => e.status === "resolved" || e.status === "closed",
    ).length;
    const inProgress = todayEntries.filter((e) => e.status === "in_progress").length;
    const delayed = todayEntries.filter(
      (e) => e.status === "escalated" || e.status === "open",
    ).length;
    const prevTot = yesterdayEntries.length || 1;
    const trend = Math.round(((tot - yesterdayEntries.length) / prevTot) * 100);
    return { tot, completed, inProgress, delayed, trend };
  }, [todayEntries, yesterdayEntries]);

  const sparkData = useMemo(() => {
    const days: { day: string; v: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(parseISO(date), i), "yyyy-MM-dd");
      days.push({
        day: format(parseISO(d), "EEE"),
        v: entries.filter((e) => e.entry_date === d).length,
      });
    }
    return days;
  }, [entries, date]);

  // Single source of truth: per-section stats derived from today's entries.
  // Used by Activity Log rows, Grand Total Summary, chart, and PDF.
  const sectionStats = useMemo(() => computeSectionStats(todayEntries), [todayEntries]);

  const ticketBreakdown = sectionStats.map((s) => ({
    label: s.title,
    total: s.total,
    completed: s.completed,
    inProgress: s.inProgress,
    delayed: s.delayed,
  }));

  const grandTotal = ticketBreakdown.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      completed: acc.completed + r.completed,
      inProgress: acc.inProgress + r.inProgress,
      delayed: acc.delayed + r.delayed,
    }),
    { total: 0, completed: 0, inProgress: 0, delayed: 0 },
  );

  const updateManualRow = (title: RowTitle, field: keyof ManualDprRow, value: string) => {
    setManualRows((current) => ({
      ...current,
      [title]: { ...current[title], [field]: value },
    }));
  };

  const dprRows = useMemo(() => {
    return ROW_SECTIONS.map((section) => {
      const title = section.title as RowTitle;
      const manual = manualRows[title];
      const stats = sectionStats.find((s) => s.title === section.title)!;
      const sectionEntries = todayEntries.filter((e) =>
        (section.categories as readonly string[]).includes(e.category),
      );
      const activity = formatActivity(manual, {
        total: stats.total,
        completed: stats.completed,
        inProgress: stats.inProgress,
      });
      const join = (vals: (string | null)[], n: number) =>
        Array.from(new Set(vals.filter(Boolean) as string[])).slice(0, n).join("; ");
      return {
        title,
        stats,
        activity,
        description: manual.description || join(sectionEntries.map((e) => e.description), 4),
        people:
          manual.people ||
          Array.from(new Set(sectionEntries.map((e) => e.person_responsible).filter(Boolean))).join(
            ", ",
          ),
        evidence: manual.evidence || join(sectionEntries.map((e) => e.output_evidence), 3),
        issues: manual.issues || join(sectionEntries.map((e) => e.issues_noticed), 3),
        action: manual.action || join(sectionEntries.map((e) => e.action_required), 3),
      };
    });
  }, [manualRows, sectionStats, todayEntries]);

  const initialVendor = todayEntries.find((e) => e.vendor)?.vendor ?? "—";
  const initialLocation = todayEntries.find((e) => e.location)?.location ?? "—";

  const [vendor, setVendor] = useState<string>(initialVendor);
  const [location, setLocation] = useState<string>(initialLocation);

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(12, 35, 64);
    doc.rect(0, 0, w, 60, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14).setFont("helvetica", "bold");
    doc.text("AICCC — DAILY PROGRESS REPORT", 30, 28);
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text("APCRDA Project Office", w - 30, 28, { align: "right" });
    doc.setFontSize(9);
    doc.text(
      `${format(parseISO(date), "dd MMM yyyy")}  ·  ${format(parseISO(date), "EEEE")}`,
      30,
      46,
    );
    doc.text(`Vendor: ${vendor}  ·  Site: ${location}`, w - 30, 46, { align: "right" });
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 80,
      head: [
        [
          "Sl",
          "Title",
          "Activity Done Today",
          "Description",
          "Person Responsible",
          "Output / Evidence",
          "Issues",
          "Action Required",
        ],
      ],
      body: dprRows.map((r, i) => [
        i + 1,
        r.title,
        r.activity,
        r.description || "—",
        r.people || "—",
        r.evidence || "—",
        r.issues || "—",
        r.action || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 4, valign: "top" },
      headStyles: { fillColor: [45, 138, 158] },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 45 }, 2: { cellWidth: 85 } },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [["Category", "Total", "Completed", "In Progress", "Delayed", "% Done"]],
      body: [
        ...ticketBreakdown.map((r) => [
          r.label,
          r.total,
          r.completed,
          r.inProgress,
          r.delayed,
          r.total ? Math.round((r.completed / r.total) * 100) + "%" : "0%",
        ]),
        [
          "GRAND TOTAL",
          grandTotal.total,
          grandTotal.completed,
          grandTotal.inProgress,
          grandTotal.delayed,
          grandTotal.total
            ? Math.round((grandTotal.completed / grandTotal.total) * 100) + "%"
            : "0%",
        ],
      ],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [12, 35, 64] },
      foot: undefined,
      didParseCell: (data) => {
        if (data.row.index === ticketBreakdown.length && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 245, 250];
        }
      },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [["ABSENTEES", ""]],
      body: absentees.length
        ? absentees.map((a, i) => [
            i + 1,
            a.employee_name + (a.department ? ` (${a.department})` : ""),
          ])
        : [["—", "No absentees recorded"]],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [12, 35, 64] },
      columnStyles: { 0: { cellWidth: 40 } },
    });

    let y = (doc as any).lastAutoTable.finalY + 25;
    doc.setFont("helvetica", "bold").setFontSize(10).text("RECORDED BY", 30, y);
    y += 15;
    doc.setFont("helvetica", "normal").setFontSize(9);
    (["prepared_by", "reviewed_by", "approved_by"] as const).forEach((role, i) => {
      const r = recorders.find((x) => x.role === role);
      const x = 30 + i * ((w - 60) / 3);
      doc.text(role.replace("_", " ").toUpperCase(), x, y);
      doc.text(r?.name ?? "—", x, y + 14);
      doc.text(r?.designation ?? "", x, y + 26);
    });

    doc.addPage("a4", "portrait");
    doc.setFillColor(12, 35, 64);
    doc.rect(0, 0, w, 60, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("AICCC REPORTS DATA", 30, 28);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text("APCRDA Project Office", w - 30, 28, { align: "right" });
    doc.setFontSize(9);
    doc.text(
      `${format(parseISO(date), "dd MMM yyyy")}  ·  ${format(parseISO(date), "EEEE")}`,
      30,
      46,
    );
    doc.text(`Department: All  ·  Total entries: ${todayEntries.length}`, w - 30, 46, { align: "right" });
    doc.setTextColor(0, 0, 0);

    const reportSummaryRows = DEPARTMENTS.map((department) => {
      const departmentEntries = todayEntries.filter((entry) => entry.department === department);
      return [
        department,
        ...CATEGORIES.map((category) =>
          departmentEntries.filter((entry) => entry.category === category.value).length,
        ),
        departmentEntries.length,
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [["Department", ...CATEGORIES.map((category) => category.label), "Total"]],
      body: reportSummaryRows,
      styles: { fontSize: 5.6, cellPadding: 2 },
      headStyles: { fillColor: [12, 35, 64] },
      columnStyles: { 0: { cellWidth: 85 } },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [["Date", "Dept", "Category", "Description", "Status", "Priority"]],
      body: todayEntries.map((entry) => [
        format(new Date(entry.entry_date), "dd MMM"),
        entry.department,
        entry.category.toUpperCase(),
        entry.description || "",
        entry.status.replace("_", " "),
        entry.priority,
      ]),
      styles: { fontSize: 7, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [45, 138, 158] },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 95 }, 2: { cellWidth: 60 }, 3: { cellWidth: 170 } },
    });

    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7).setTextColor(120, 120, 120);
    doc.text(
      `Generated ${format(new Date(), "dd MMM yyyy HH:mm")}  ·  Report #DPR-${date.replace(/-/g, "")}`,
      30,
      pageH - 20,
    );

    doc.save(`AICCC-DPR-${date}.pdf`);
    toast.success("DPR PDF downloaded");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">DPR Summary</h1>
          <p className="text-sm text-muted-foreground">
            Daily progress report — printable A4 format.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setManualRows(emptyManualRows());
            }}
            className="w-[170px]"
          />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={downloadPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Report header band */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[hsl(var(--sidebar-background))] px-5 py-3 text-sidebar-foreground">
            <div>
              <h2 className="text-lg font-bold tracking-tight">AICCC — DAILY PROGRESS REPORT</h2>
              <p className="text-xs opacity-80">
                Andhra Pradesh Capital Region Development Authority
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">APCRDA Project Office</p>
              <p className="text-xs opacity-80">Report #DPR-{date.replace(/-/g, "")}</p>
            </div>
          </div>
          <div className="grid gap-2 px-5 py-3 text-sm sm:grid-cols-4">
            <Field label="Date" value={format(parseISO(date), "dd MMM yyyy")} />
            <Field label="Day" value={format(parseISO(date), "EEEE")} />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Project</p>
              <p className="font-medium">AICCC</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vendor</p>
              <Input
                value={vendor}
                onChange={(e: any) => setVendor(e.target.value)}
                className="h-8 mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Location / Site
              </p>
              <Input
                value={location}
                onChange={(e: any) => setLocation(e.target.value)}
                className="h-8 mt-1"
              />
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Tickets"
            value={counts.tot}
            trend={counts.trend}
            data={sparkData}
            color="hsl(var(--primary))"
          />
          <KpiCard
            title="Completed"
            value={counts.completed}
            trend={counts.tot ? Math.round((counts.completed / counts.tot) * 100) : 0}
            trendLabel="% done"
            data={sparkData}
            color="hsl(var(--success))"
          />
          <KpiCard
            title="In Progress"
            value={counts.inProgress}
            trend={counts.tot ? Math.round((counts.inProgress / counts.tot) * 100) : 0}
            trendLabel="% wip"
            data={sparkData}
            color="hsl(var(--warning))"
          />
          <KpiCard
            title="Delayed / Open"
            value={counts.delayed}
            trend={counts.tot ? Math.round((counts.delayed / counts.tot) * 100) : 0}
            trendLabel="% delay"
            data={sparkData}
            color="hsl(var(--destructive))"
          />
        </div>

        {/* Main DPR table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">DPR — Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/60 text-left">
                    <th className="border-b border-border px-3 py-2 font-semibold">Sl.</th>
                    <th className="border-b border-border px-3 py-2 font-semibold">Title</th>
                    <th className="border-b border-border px-3 py-2 font-semibold">
                      Activity Done Today
                    </th>
                    <th className="border-b border-border px-3 py-2 font-semibold">
                      Description
                    </th>
                    <th className="border-b border-border px-3 py-2 font-semibold">
                      Person Responsible
                    </th>
                    <th className="border-b border-border px-3 py-2 font-semibold">
                      Output / Evidence
                    </th>
                    <th className="border-b border-border px-3 py-2 font-semibold">
                      Issues Noticed
                    </th>
                    <th className="border-b border-border px-3 py-2 font-semibold">
                      Action Required
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dprRows.map((r, i) => (
                    <tr key={r.title} className="align-top">
                      <td className="border-b border-border px-3 py-2">{i + 1}</td>
                      <td className="border-b border-border px-3 py-2 font-semibold">{r.title}</td>
                      <td className="border-b border-border px-3 py-2">
                        <EditableActivityCell
                          row={manualRows[r.title]}
                          fallback={r.stats}
                          printValue={r.activity}
                          onChange={(field, value) => updateManualRow(r.title, field, value)}
                        />
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        <EditableTextCell
                          value={manualRows[r.title].description}
                          printValue={r.description}
                          onChange={(value) => updateManualRow(r.title, "description", value)}
                        />
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        <EditableTextCell
                          value={manualRows[r.title].people}
                          printValue={r.people}
                          onChange={(value) => updateManualRow(r.title, "people", value)}
                        />
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        <EditableTextCell
                          value={manualRows[r.title].evidence}
                          printValue={r.evidence}
                          onChange={(value) => updateManualRow(r.title, "evidence", value)}
                        />
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        <EditableTextCell
                          value={manualRows[r.title].issues}
                          printValue={r.issues}
                          onChange={(value) => updateManualRow(r.title, "issues", value)}
                        />
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        <EditableTextCell
                          value={manualRows[r.title].action}
                          printValue={r.action}
                          onChange={(value) => updateManualRow(r.title, "action", value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Grand Total */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grand Total Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[hsl(var(--sidebar-background))] text-sidebar-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Completed</th>
                    <th className="px-3 py-2 text-right">In Progress</th>
                    <th className="px-3 py-2 text-right">Delayed</th>
                    <th className="px-3 py-2 text-right">% Done</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketBreakdown.map((r) => (
                    <tr key={r.label} className="border-b border-border">
                      <td className="px-3 py-2">{r.label}</td>
                      <td className="px-3 py-2 text-right">{r.total}</td>
                      <td className="px-3 py-2 text-right text-success">{r.completed}</td>
                      <td className="px-3 py-2 text-right text-warning">{r.inProgress}</td>
                      <td className="px-3 py-2 text-right text-destructive">{r.delayed}</td>
                      <td className="px-3 py-2 text-right">
                        {r.total ? Math.round((r.completed / r.total) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted font-bold">
                    <td className="px-3 py-2">GRAND TOTAL</td>
                    <td className="px-3 py-2 text-right">{grandTotal.total}</td>
                    <td className="px-3 py-2 text-right">{grandTotal.completed}</td>
                    <td className="px-3 py-2 text-right">{grandTotal.inProgress}</td>
                    <td className="px-3 py-2 text-right">{grandTotal.delayed}</td>
                    <td className="px-3 py-2 text-right">
                      {grandTotal.total
                        ? Math.round((grandTotal.completed / grandTotal.total) * 100)
                        : 0}
                      %
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Grand Total chart — same numbers as table & PDF */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grand Total — Status by Section</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ticketBreakdown}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={12} />
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


        <div className="grid gap-4 lg:grid-cols-2">
          <AbsenteesCard
            date={date}
            absentees={absentees}
            userId={user!.id}
            onChanged={() => qc.invalidateQueries({ queryKey: ["absentees", date] })}
          />
          <RecordedByCard
            date={date}
            recorders={recorders}
            userId={user!.id}
            userEmail={user!.email ?? ""}
            onChanged={() => qc.invalidateQueries({ queryKey: ["recorders", date] })}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function EditableActivityCell({
  row,
  fallback,
  printValue,
  onChange,
}: {
  row: ManualDprRow;
  fallback?: { tot?: number; total?: number; completed: number; inProgress: number };
  printValue: string;
  onChange: (field: "total" | "completed" | "inProgress", value: string) => void;
}) {
  const totalFallback = fallback?.total ?? fallback?.tot ?? 0;
  const fields: { field: "total" | "completed" | "inProgress"; label: string; fallback: number }[] =
    [
      { field: "total", label: "Total Tickets", fallback: totalFallback },
      { field: "completed", label: "Completed", fallback: fallback?.completed ?? 0 },
      { field: "inProgress", label: "In Progress", fallback: fallback?.inProgress ?? 0 },
    ];

  return (
    <>
      <div className="grid min-w-[170px] gap-2 print:hidden">
        {fields.map(({ field, label, fallback }) => (
          <label key={field} className="grid grid-cols-[1fr_70px] items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <Input
              type="number"
              min="0"
              value={row[field]}
              placeholder={String(fallback)}
              onChange={(e) => onChange(field, e.target.value)}
              className="h-8 text-right"
            />
          </label>
        ))}
      </div>
      <span className="hidden whitespace-pre-line print:block">{printValue || "—"}</span>
    </>
  );
}

function EditableTextCell({
  value,
  printValue,
  onChange,
}: {
  value: string;
  printValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <Textarea
        value={value}
        placeholder={printValue || "—"}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20 min-w-[150px] resize-y text-xs print:hidden"
      />
      <span className="hidden whitespace-pre-line print:block">{printValue || "—"}</span>
    </>
  );
}

function KpiCard({
  title,
  value,
  trend,
  trendLabel,
  data,
  color,
}: {
  title: string;
  value: number;
  trend: number;
  trendLabel?: string;
  data: { day: string; v: number }[];
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p
              className="text-xs"
              style={{ color: trend >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}
            >
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}
              {trendLabel ?? "%"}
            </p>
          </div>
          <div className="h-12 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip cursor={false} contentStyle={{ fontSize: 10, padding: 4 }} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  fill={`url(#g-${title})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AbsenteesCard({
  date,
  absentees,
  userId,
  onChanged,
}: {
  date: string;
  absentees: Absentee[];
  userId: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");

  const addMut = useMutation({
    mutationFn: async () => {
      const parsed = absenteeSchema.safeParse({
        employee_name: name,
        department: dept || undefined,
        absent_date: date,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { error } = await supabase.from("absentees").insert({
        employee_name: parsed.data.employee_name,
        department: parsed.data.department ?? null,
        absent_date: parsed.data.absent_date,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setDept("");
      setOpen(false);
      onChanged();
      toast.success("Absentee added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("absentees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      onChanged();
      toast.success("Removed");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="min-w-max whitespace-nowrap text-base">Absentees</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="print:hidden">
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add absentee</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Employee name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={dept} onChange={(e) => setDept(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => addMut.mutate()} disabled={!name || addMut.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-2">S.No</th>
              <th className="px-3 py-2">Name</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {absentees.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-muted-foreground">
                  No absentees recorded for {format(parseISO(date), "dd MMM yyyy")}
                </td>
              </tr>
            )}
            {absentees.map((a, i) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">
                  {a.employee_name}
                  {a.department && (
                    <span className="ml-2 text-xs text-muted-foreground">({a.department})</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {a.created_by === userId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 print:hidden"
                      onClick={() => delMut.mutate(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function RecordedByCard({
  date,
  recorders,
  userId,
  userEmail,
  onChanged,
}: {
  date: string;
  recorders: Recorder[];
  userId: string;
  userEmail: string;
  onChanged: () => void;
}) {
  const roles: Recorder["role"][] = ["prepared_by", "reviewed_by", "approved_by"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recorded By</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {roles.map((role) => {
          const r = recorders.find((x) => x.role === role);
          return (
            <RecorderSlot
              key={role}
              role={role}
              recorder={r}
              date={date}
              userId={userId}
              userEmail={userEmail}
              onChanged={onChanged}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function RecorderSlot({
  role,
  recorder,
  date,
  userId,
  userEmail,
  onChanged,
}: {
  role: Recorder["role"];
  recorder: Recorder | undefined;
  date: string;
  userId: string;
  userEmail: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(recorder?.name ?? userEmail.split("@")[0]);
  const [designation, setDesignation] = useState(recorder?.designation ?? "");
  const [uploading, setUploading] = useState(false);

  const saveMut = useMutation({
    mutationFn: async (signature_url: string | null) => {
      if (recorder) {
        const { error } = await supabase
          .from("recorded_by")
          .update({ name, designation, signature_url: signature_url ?? recorder.signature_url })
          .eq("id", recorder.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recorded_by")
          .insert({ user_id: userId, name, designation, role, dpr_date: date, signature_url });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      onChanged();
      setOpen(false);
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSignature = async (file: File) => {
    setUploading(true);
    try {
      const path = `${userId}/${role}-${date}-${file.name}`;
      const { error } = await supabase.storage
        .from("signatures")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("signatures").getPublicUrl(path);
      await saveMut.mutateAsync(data.publicUrl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {role.replace("_", " ")}
      </p>
      <p className="mt-1 font-semibold">{recorder?.name ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{recorder?.designation ?? ""}</p>
      <div className="mt-2 h-14 rounded border border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
        {recorder?.signature_url ? (
          <img src={recorder.signature_url} alt="signature" className="max-h-full object-contain" />
        ) : (
          <span className="text-[10px] text-muted-foreground">No signature</span>
        )}
      </div>
      {recorder?.recorded_at && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {format(new Date(recorder.recorded_at), "dd MMM HH:mm")}
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="mt-2 w-full print:hidden">
            {recorder ? "Edit" : "Sign"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{role.replace("_", " ")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </div>
            <div>
              <Label>Signature image</Label>
              <label className="mt-1 flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-border hover:bg-muted/40">
                <Upload className="mr-2 h-4 w-4" />
                <span className="text-sm">{uploading ? "Uploading..." : "Upload signature"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleSignature(e.target.files[0])}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveMut.mutate(null)} disabled={!name || saveMut.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
