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
