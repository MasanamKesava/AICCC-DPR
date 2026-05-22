# DPR Management — Phase 2 Enhancements

This is a large scope. I'll deliver it in one focused phase that covers the core "DPR report" experience matching your reference image, plus the sidebar toggle. Advanced AI features, OCR, QR verification, audit logs, and approval workflow will follow in later phases.

## What I'll build now

### 1. Database (migration)
New tables with RLS:
- `absentees` — employee_name, department, designation, absent_date, remarks
- `recorded_by` — user_id, name, designation, signature_url, recorded_at, dpr_date
- Storage bucket `signatures` for signature uploads

(`dpr_grand_totals` will be computed live from `dpr_entries` instead of stored — avoids drift.)

### 2. Collapsible sidebar
Replace the current static `AppShell` sidebar with shadcn `Sidebar` + `SidebarProvider` + `SidebarTrigger` (toggle button in header). Adds menu items:
- Dashboard, DPR Summary (new), DPR Entries, Departments, Attendance/Absentees (new), Reports, Analytics

Collapsible to icon-only on desktop, off-canvas on mobile.

### 3. DPR Summary page (`/dpr-summary`) — matches your reference
- **Header band**: "AICCC — DAILY PROGRESS REPORT" left, "APCRDA Project Office" right; date/day/project/vendor/site row; date picker to switch days.
- **KPI row**: Total / Completed / In Progress / Delayed tickets with trend % vs previous day and mini sparkline (Recharts).
- **Main DPR table** with columns: Sl.No · Title · Activity Done Today · Person Responsible · Output/Evidence · Issues Noticed · Action Required. Rows: Tickets, BIM, CCTV, Drone, Logs (+ custom). The Tickets row lists RFI / Worklog / Drawing / Hindrance / Labour / Machinery / Grievance counts auto-calculated from `dpr_entries`.
- **Grand Total Summary** footer table: Category × Total / Completed / In Progress / Delayed + % completion + final GRAND TOTAL row.
- **Absentees** section: S.No · Name table with add/edit/delete dialog, date-tagged.
- **Recorded By** section: Prepared / Reviewed / Approved trio — name, designation, signature image upload (Supabase Storage), timestamp; name auto-filled from logged-in user.
- **Print / Download PDF** buttons.

### 4. Printable PDF export
Upgrade `reports.tsx` and add a "Download DPR (A4)" action on the Summary page using `jsPDF + autotable`:
- Header with org block, report number, date/day
- DPR table, Grand Total table, Absentees table, Recorded By block with signature images
- Pagination, timestamp footer

### 5. Landing / Home page
Keep the existing marketing landing at `/` (already exists) and link "DPR Summary" prominently. The authenticated "home" becomes the DPR Summary page (dashboard remains separate).

## Out of scope this phase (will follow up)
- AI auto-summary, delay prediction, OCR, smart escalation
- QR verification codes, full approval workflow state machine
- SLA breach analytics, user productivity charts, audit logs
- SAML / department-level RBAC beyond existing role checks
- Weekly/Monthly aggregated DPR variants (daily is delivered; range filter stays in Reports)

## Technical notes
- Live totals via a single `useQuery` over `dpr_entries` filtered by date — no stored aggregates.
- Signatures stored in `signatures/{user_id}/{filename}` bucket, public read.
- Existing teal Smart City theme retained.
- Sidebar uses shadcn `collapsible="icon"` so the toggle keeps icons visible.

Proceeding will start with the Supabase migration (absentees, recorded_by, signatures bucket), then code.
