import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Search } from "lucide-react";
import { z } from "zod";

const absenteeSchema = z.object({
  employee_name: z.string().trim().min(1, "Name required").max(150),
  department: z.string().trim().max(100).optional(),
  designation: z.string().trim().max(100).optional(),
  absent_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export const Route = createFileRoute("/_authenticated/absentees")({ component: AbsenteesPage });

type Absentee = {
  id: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  absent_date: string;
  remarks: string | null;
  created_by: string | null;
};

function AbsenteesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_name: "",
    department: "",
    designation: "",
    absent_date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["absentees-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absentees")
        .select("*")
        .order("absent_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Absentee[];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const parsed = absenteeSchema.safeParse({
        employee_name: form.employee_name,
        department: form.department || undefined,
        designation: form.designation || undefined,
        absent_date: form.absent_date,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { error } = await supabase.from("absentees").insert({
        employee_name: parsed.data.employee_name,
        department: parsed.data.department ?? null,
        designation: parsed.data.designation ?? null,
        absent_date: parsed.data.absent_date,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absentees-all"] });
      setOpen(false);
      toast.success("Added");
      setForm({ ...form, employee_name: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("absentees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absentees-all"] });
      toast.success("Removed");
    },
  });

  const filtered = rows.filter(
    (r) =>
      !q ||
      r.employee_name.toLowerCase().includes(q.toLowerCase()) ||
      (r.department ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Absentees</h1>
          <p className="text-sm text-muted-foreground">
            Daily attendance — absent employees by date.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add absentee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add absentee</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Employee name *</Label>
                <Input
                  value={form.employee_name}
                  onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
              <div>
                <Label>Designation</Label>
                <Input
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.absent_date}
                  onChange={(e) => setForm({ ...form, absent_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!form.employee_name || addMut.isPending}
                onClick={() => addMut.mutate()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or department..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-2">S.No</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Designation</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Remarks</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No absentees
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.employee_name}</td>
                  <td className="px-3 py-2">{r.department ?? "—"}</td>
                  <td className="px-3 py-2">{r.designation ?? "—"}</td>
                  <td className="px-3 py-2">{format(new Date(r.absent_date), "dd MMM yyyy")}</td>
                  <td className="px-3 py-2">{r.remarks ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {r.created_by === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => delMut.mutate(r.id)}
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
    </div>
  );
}
