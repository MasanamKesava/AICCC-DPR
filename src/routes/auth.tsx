import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — AICCC DPR Management System" },
      { name: "description", content: "Sign in or request access to the AICCC DPR Management System to record and review Daily Progress Reports." },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://aiccc-pulse.lovable.app/auth" }],
  }),
});

const schema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4" style={{ backgroundImage: "var(--gradient-hero)", backgroundSize: "100% 200px", backgroundRepeat: "no-repeat" }}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-elevated)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-semibold leading-tight">AICCC DPR — Sign In</h1>
            <p className="text-xs text-muted-foreground leading-tight">Authorized personnel only</p>
          </div>
        </div>

        <form onSubmit={signIn} className="space-y-3 pt-2">
          <div><Label htmlFor="signin-email">Email</Label><Input id="signin-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label htmlFor="signin-password">Password</Label><Input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access is invite-only. Contact your administrator to request an account.
        </p>
      </div>
    </main>
  );
}
