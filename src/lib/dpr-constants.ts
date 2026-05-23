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

export function computeSectionStats<T extends { category: string; status: DprStatus }>(
  entries: T[],
) {
  return ROW_SECTIONS.map((section) => {
    const rows = entries.filter((e) => (section.categories as readonly string[]).includes(e.category));
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
  status: "open" | "in_progress" | "escalated" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  session: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
