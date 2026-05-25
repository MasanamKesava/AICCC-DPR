import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { type DprEntry } from "@/lib/dpr-constants";

export const Route = createFileRoute("/_authenticated/departments")({
  component: DeptPage,
});

type DeptStats = {
  department: string;

  rfiReceived: number;
  rfiPending: number;
  rfiCompleted: number;

  worklogReceived: number;
  worklogPending: number;
  worklogCompleted: number;

  drawingReceived: number;
  drawingPending: number;
  drawingCompleted: number;

  grandReceived: number;
  grandPending: number;
  grandCompleted: number;
};

function DeptPage() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["department-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dpr_entries").select("*").limit(5000);

      if (error) throw error;

      return data as DprEntry[];
    },
  });

  const departments = [
    "Flood Mitigation",
    "H&B Housing",
    "H&B Offices",
    "LPS Infra",
    "Trunk Infra E Roads",
    "Trunk Infra N Roads",
    "Water Supply",
    "Electrical Infra",
    "Grievance",
  ];

  const rows: DeptStats[] = useMemo(() => {
    return departments.map((department) => {
      const deptEntries = entries.filter((e) => e.department === department);

      const getCounts = (category: string) => {
        const categoryEntries = deptEntries.filter(
          (e) => e.category?.toLowerCase() === category.toLowerCase(),
        );

        const received = categoryEntries.length;

        const completed = categoryEntries.filter(
          (e) => e.status === "resolved" || e.status === "closed",
        ).length;

        const pending = received - completed;

        return {
          received,
          pending,
          completed,
        };
      };

      const rfi = getCounts("rfi");
      const worklog = getCounts("worklog");
      const drawing = getCounts("drawing");

      return {
        department,

        rfiReceived: rfi.received,
        rfiPending: rfi.pending,
        rfiCompleted: rfi.completed,

        worklogReceived: worklog.received,
        worklogPending: worklog.pending,
        worklogCompleted: worklog.completed,

        drawingReceived: drawing.received,
        drawingPending: drawing.pending,
        drawingCompleted: drawing.completed,

        grandReceived: rfi.received + worklog.received + drawing.received,

        grandPending: rfi.pending + worklog.pending + drawing.pending,

        grandCompleted: rfi.completed + worklog.completed + drawing.completed,
      };
    });
  }, [entries]);

  /* FIXED INFINITE RENDER ISSUE */
  const [editableRows, setEditableRows] = useState<DeptStats[]>([]);

  useEffect(() => {
    setEditableRows(rows);
  }, [rows]);

  const handleChange = (index: number, field: keyof DeptStats, value: string) => {
    const updated = [...editableRows];

    updated[index] = {
      ...updated[index],
      [field]: field === "department" ? value : Number(value),
    };

    updated[index].grandReceived =
      updated[index].rfiReceived + updated[index].worklogReceived + updated[index].drawingReceived;

    updated[index].grandPending =
      updated[index].rfiPending + updated[index].worklogPending + updated[index].drawingPending;

    updated[index].grandCompleted =
      updated[index].rfiCompleted +
      updated[index].worklogCompleted +
      updated[index].drawingCompleted;

    setEditableRows(updated);
  };

  const sectionTotals = useMemo(() => {
    return editableRows.reduce(
      (acc, row) => ({
        rfiReceived: acc.rfiReceived + row.rfiReceived,

        rfiPending: acc.rfiPending + row.rfiPending,

        rfiCompleted: acc.rfiCompleted + row.rfiCompleted,

        worklogReceived: acc.worklogReceived + row.worklogReceived,

        worklogPending: acc.worklogPending + row.worklogPending,

        worklogCompleted: acc.worklogCompleted + row.worklogCompleted,

        drawingReceived: acc.drawingReceived + row.drawingReceived,

        drawingPending: acc.drawingPending + row.drawingPending,

        drawingCompleted: acc.drawingCompleted + row.drawingCompleted,

        grandReceived: acc.grandReceived + row.grandReceived,

        grandPending: acc.grandPending + row.grandPending,

        grandCompleted: acc.grandCompleted + row.grandCompleted,
      }),
      {
        rfiReceived: 0,
        rfiPending: 0,
        rfiCompleted: 0,

        worklogReceived: 0,
        worklogPending: 0,
        worklogCompleted: 0,

        drawingReceived: 0,
        drawingPending: 0,
        drawingCompleted: 0,

        grandReceived: 0,
        grandPending: 0,
        grandCompleted: 0,
      },
    );
  }, [editableRows]);

  const downloadPDF = () => {
    const doc = new jsPDF("landscape");

    doc.setFillColor(12, 35, 64);
    doc.rect(0, 0, 300, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("AICCC - Department Performance Summary", 14, 18);

    doc.setTextColor(0, 0, 0);

    doc.setFontSize(11);
    doc.text(`Date: ${reportDate}`, 14, 40);

    autoTable(doc, {
      startY: 50,

      styles: {
        fontSize: 7,
        cellPadding: 3,
        halign: "center",
      },

      headStyles: {
        fillColor: [45, 138, 158],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      footStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },

      head: [
        [
          "Department",

          "RFI Rec",
          "RFI Pen",
          "RFI Comp",

          "WL Rec",
          "WL Pen",
          "WL Comp",

          "DR Rec",
          "DR Pen",
          "DR Comp",

          "GT Rec",
          "GT Pen",
          "GT Comp",
        ],
      ],

      body: editableRows.map((row) => [
        row.department,

        row.rfiReceived,
        row.rfiPending,
        row.rfiCompleted,

        row.worklogReceived,
        row.worklogPending,
        row.worklogCompleted,

        row.drawingReceived,
        row.drawingPending,
        row.drawingCompleted,

        row.grandReceived,
        row.grandPending,
        row.grandCompleted,
      ]),

      foot: [
        [
          "TOTALS",

          sectionTotals.rfiReceived,
          sectionTotals.rfiPending,
          sectionTotals.rfiCompleted,

          sectionTotals.worklogReceived,
          sectionTotals.worklogPending,
          sectionTotals.worklogCompleted,

          sectionTotals.drawingReceived,
          sectionTotals.drawingPending,
          sectionTotals.drawingCompleted,

          sectionTotals.grandReceived,
          sectionTotals.grandPending,
          sectionTotals.grandCompleted,
        ],
      ],
    });

    doc.save("Department-Performance.pdf");
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Department Breakdown Performance</h1>

          <p className="text-sm text-muted-foreground">DPR Department Wise Summary Report</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />

          <Button onClick={downloadPDF}>Download PDF</Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Department Performance Summary</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th rowSpan={2} className="min-w-[170px] border px-3 py-2 text-center">
                    Department
                  </th>

                  <th colSpan={3} className="border bg-orange-50 px-2 py-2">
                    RFI
                  </th>

                  <th colSpan={3} className="border bg-green-50 px-2 py-2">
                    WorkLogs
                  </th>

                  <th colSpan={3} className="border bg-blue-50 px-2 py-2">
                    Drawings
                  </th>

                  <th colSpan={3} className="border bg-purple-50 px-2 py-2">
                    Grand Total
                  </th>
                </tr>

                <tr className="bg-muted/40">
                  {Array(4)
                    .fill(["Received", "Pending", "Completed"])
                    .flat()
                    .map((label, i) => (
                      <th key={i} className="border px-2 py-1 text-center text-[10px]">
                        {label}
                      </th>
                    ))}
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={13} className="py-8 text-center">
                      Loading...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  editableRows.map((row, index) => (
                    <tr key={row.department} className="hover:bg-muted/20">
                      <td className="border px-2 py-2 font-medium">{row.department}</td>

                      {(
                        [
                          "rfiReceived",
                          "rfiPending",
                          "rfiCompleted",

                          "worklogReceived",
                          "worklogPending",
                          "worklogCompleted",

                          "drawingReceived",
                          "drawingPending",
                          "drawingCompleted",

                          "grandReceived",
                          "grandPending",
                          "grandCompleted",
                        ] as (keyof DeptStats)[]
                      ).map((field) => (
                        <td key={field} className="border px-1 py-1 text-center">
                          <input
                            type="number"
                            value={row[field]}
                            onChange={(e) => handleChange(index, field, e.target.value)}
                            className="w-16 rounded border px-1 py-1 text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!isLoading && (
                  <tr className="bg-gray-100 font-bold">
                    <td className="border px-2 py-2">Section Totals</td>

                    <td className="border text-center">{sectionTotals.rfiReceived}</td>

                    <td className="border text-center">{sectionTotals.rfiPending}</td>

                    <td className="border text-center">{sectionTotals.rfiCompleted}</td>

                    <td className="border text-center">{sectionTotals.worklogReceived}</td>

                    <td className="border text-center">{sectionTotals.worklogPending}</td>

                    <td className="border text-center">{sectionTotals.worklogCompleted}</td>

                    <td className="border text-center">{sectionTotals.drawingReceived}</td>

                    <td className="border text-center">{sectionTotals.drawingPending}</td>

                    <td className="border text-center">{sectionTotals.drawingCompleted}</td>

                    <td className="border text-center text-purple-700">
                      {sectionTotals.grandReceived}
                    </td>

                    <td className="border text-center">{sectionTotals.grandPending}</td>

                    <td className="border text-center text-green-700">
                      {sectionTotals.grandCompleted}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
