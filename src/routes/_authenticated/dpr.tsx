import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { DEPARTMENTS, CATEGORIES, STATUSES, PRIORITIES, type DprEntry } from "@/lib/dpr-constants";

export const Route = createFileRoute("/_authenticated/dpr")({ component: DprPage });

const entrySchema = z.object({
  entry_date: z.string(),
  department: z.string().min(1),
  category: z.enum(["rfi", "worklog", "drawing", "hindrance", "labour", "machinery", "grievance", "bim", "cctv", "drone", "logs"]),
  description: z.string().trim().min(3).max(2000),
  vendor: z.string().max(150).optional(),
  location: z.string().max(150).optional(),
  activity_type: z.string().max(150).optional(),
  person_responsible: z.string().max(150).optional(),
  output_evidence: z.string().max(1000).optional(),
  issues_noticed: z.string().max(1000).optional(),
  action_required: z.string().max(1000).optional(),
  status: z.enum(["open", "in_progress", "escalated", "resolved", "closed"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  session: z.string(),
});

function DprPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["dpr-entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dpr_entries").select("*").order("entry_date", { ascending: false }).limit(500);
      if (error) throw error;
      return data as DprEntry[];
    },
  });

  const filtered = entries.filter((e) =>
    (filterDept === "all" || e.department === filterDept) &&
    (filterCat === "all" || e.category === filterCat)
  );

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dpr_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dpr-entries"] });
      qc.invalidateQueries({ queryKey: ["dpr-all"] });
      toast.success("Entry deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">DPR Entries</h1>
          <p className="text-sm text-muted-foreground">Capture daily activity per site, department, and category.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New entry</Button></DialogTrigger>
          <NewEntryDialog onClose={() => setOpen(false)} userId={user!.id} />
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No entries yet. Click "New entry" to add one.</td></tr>
                )}
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(e.entry_date), "dd MMM yyyy")}</td>
                    <td className="px-4 py-3">{e.department}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="uppercase">{e.category}</Badge></td>
                    <td className="px-4 py-3 max-w-md truncate">{e.description}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={e.priority} /></td>
                    <td className="px-4 py-3 text-right">
                      {(e.created_by === user?.id) && (
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </td>
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

function StatusBadge({ status }: { status: DprEntry["status"] }) {
  const map: Record<string, string> = {
    open: "bg-muted text-foreground",
    in_progress: "bg-warning/15 text-warning",
    escalated: "bg-destructive/15 text-destructive",
    resolved: "bg-success/15 text-success",
    closed: "bg-secondary text-secondary-foreground",
  };
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${map[status]}`}>{status.replace("_", " ")}</span>;
}
function PriorityBadge({ priority }: { priority: DprEntry["priority"] }) {
  const map: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-accent/15 text-accent",
    high: "bg-warning/15 text-warning",
    critical: "bg-destructive/15 text-destructive",
  };
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${map[priority]}`}>{priority}</span>;
}

function NewEntryDialog({ onClose, userId }: { onClose: () => void; userId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    entry_date: format(new Date(), "yyyy-MM-dd"),
    department: DEPARTMENTS[0] as string,
    category: "rfi" as DprEntry["category"],
    description: "",
    vendor: "",
    location: "",
    activity_type: "",
    person_responsible: "",
    output_evidence: "",
    issues_noticed: "",
    action_required: "",
    status: "open" as DprEntry["status"],
    priority: "medium" as DprEntry["priority"],
    session: "morning",
  });

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = entrySchema.parse(form);
      const { error } = await supabase.from("dpr_entries").insert({ ...parsed, created_by: userId, project_name: "AICCC" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dpr-entries"] });
      qc.invalidateQueries({ queryKey: ["dpr-all"] });
      toast.success("Entry added");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New DPR entry</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
        <div><Label>Session</Label>
          <Select value={form.session} onValueChange={(v) => setForm({ ...form, session: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Department</Label>
          <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as DprEntry["category"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Vendor</Label><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
        <div><Label>Location / Site</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        <div><Label>Activity Type</Label><Input value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} /></div>
        <div><Label>Person Responsible</Label><Input value={form.person_responsible} onChange={(e) => setForm({ ...form, person_responsible: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Description *</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Output / Evidence</Label><Textarea rows={2} value={form.output_evidence} onChange={(e) => setForm({ ...form, output_evidence: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Issues Noticed</Label><Textarea rows={2} value={form.issues_noticed} onChange={(e) => setForm({ ...form, issues_noticed: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Action Required</Label><Textarea rows={2} value={form.action_required} onChange={(e) => setForm({ ...form, action_required: e.target.value })} /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as DprEntry["status"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as DprEntry["priority"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save entry"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
