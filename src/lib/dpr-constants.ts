export const DEPARTMENTS = [
  "Electrical Infra",
  "Flood Mitigation",
  "H&B Housing",
  "H&B Offices",
  "LPS Infra",
  "Trunk Infra E Roads",
  "Trunk Infra N Roads",
  "Water Supply",
  "Grievance",
] as const;

export const CATEGORIES = [
  { value: "rfi", label: "RFI" },
  { value: "worklog", label: "Worklog" },
  { value: "drawing", label: "Drawing" },
  { value: "hindrance", label: "Hindrance" },
  { value: "labour", label: "Labour" },
  { value: "machinery", label: "Machinery" },
  { value: "grievance", label: "Grievance" },
  { value: "bim", label: "BIM" },
  { value: "cctv", label: "CCTV" },
  { value: "drone", label: "Drone" },
  { value: "logs", label: "Logs" },
] as const;

export const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

// Sections used in DPR Activity Log -> map to one or more entry categories.
// Keeping this central guarantees the Activity Log, Grand Total Summary,
// Dashboard chart, and printable PDF all derive identical numbers.
export const ROW_SECTIONS = [
  {
    title: "Tickets",
    categories: ["rfi", "worklog", "drawing", "hindrance", "labour", "machinery", "grievance"],
  },
  { title: "BIM", categories: ["bim"] },
  { title: "CCTV", categories: ["cctv"] },
  { title: "Drone", categories: ["drone"] },
  { title: "Logs", categories: ["logs"] },
] as const;

export type RowSectionTitle = (typeof ROW_SECTIONS)[number]["title"];

export type DprStatus = "open" | "in_progress" | "escalated" | "resolved" | "closed";

type StatsEntry = {
  category: string;
  status: DprStatus;
  total_tickets?: number | null;
  completed_tickets?: number | null;
  in_progress_tickets?: number | null;
};

// Sum the ticket-count fields per section. Falls back to entry-row counts
// (with status-based completed/in-progress) when no manual numbers were entered.
export function computeSectionStats<T extends StatsEntry>(entries: T[]) {
  return ROW_SECTIONS.map((section) => {
    const rows = entries.filter((e) => (section.categories as readonly string[]).includes(e.category));
    const summedTotal = rows.reduce((a, e) => a + (e.total_tickets ?? 0), 0);
    const summedDone = rows.reduce((a, e) => a + (e.completed_tickets ?? 0), 0);
    const summedWip = rows.reduce((a, e) => a + (e.in_progress_tickets ?? 0), 0);
    if (summedTotal > 0 || summedDone > 0 || summedWip > 0) {
      const delayed = Math.max(summedTotal - summedDone - summedWip, 0);
      return { title: section.title, total: summedTotal, completed: summedDone, inProgress: summedWip, delayed };
    }
    const completed = rows.filter((e) => e.status === "resolved" || e.status === "closed").length;
    const inProgress = rows.filter((e) => e.status === "in_progress").length;
    const delayed = rows.filter((e) => e.status === "escalated" || e.status === "open").length;
    return { title: section.title, total: rows.length, completed, inProgress, delayed };
  });
}

export type DprEntry = {
  id: string;
  entry_date: string;
  project_name: string;
  vendor: string | null;
  location: string | null;
  department: string;
  category: "rfi" | "worklog" | "drawing" | "hindrance" | "labour" | "machinery" | "grievance" | "bim" | "cctv" | "drone" | "logs";
  activity_type: string | null;
  description: string;
  person_responsible: string | null;
  output_evidence: string | null;
  issues_noticed: string | null;
  action_required: string | null;
  status: DprStatus;
  priority: "low" | "medium" | "high" | "critical";
  session: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  total_tickets?: number;
  completed_tickets?: number;
  in_progress_tickets?: number;
};
