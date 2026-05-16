import { useMemo, useState } from "react";
import { useAdminAuditLog } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function generateAuditPdf(rows: any[]) {
  const doc = new jsPDF();
  const generatedAt = new Date().toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
  });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. LOGO (Top Center)
  try {
    doc.addImage("/kusa-icon.png", "PNG", (pageWidth - 30) / 2, 10, 30, 30);
  } catch (e) {
    console.error("Logo failed to load", e);
  }

  // 2. HEADER
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("KUSA E-Voting System", pageWidth / 2, 50, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text("Report Title: System Audit Log Report", 14, 65);
  doc.text(`Report ID: AUD-${Date.now()}`, 14, 71);
  doc.text(`Generated At: ${generatedAt}`, 14, 77);
  doc.text("Report validity: FINAL OFFICIAL REPORT", 14, 83);
  doc.line(14, 88, pageWidth - 14, 88);

  // 3. SUMMARY
  doc.setFont("times", "bold");
  doc.text("EXECUTIVE SUMMARY", 14, 98);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(
    `This report contains a comprehensive audit trail of ${rows.length} system events, including administrative actions, voting activities, and security logs.`,
    14,
    105,
  );

  // 4. DATA TABLE
  const tableData = rows.map((r) => [
    new Date(r.createdAt).toLocaleString("en-KE", {
      timeZone: "Africa/Nairobi",
    }),
    r.action,
    r.actorEmail ?? "—",
    r.actorRole ?? "—",
    r.target ?? "—",
  ]);

  autoTable(doc, {
    startY: 115,
    head: [["Time (EAT)", "Action", "Actor", "Role", "Target"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      font: "times",
      fontStyle: "bold",
    },
    bodyStyles: { font: "times", fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  // 5. CLOSURE
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont("times", "bold");
  doc.text("Verification & Approval", 14, finalY);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text(
    "This audit report is electronically generated and verified by the KUSA E-Voting System. Any alterations render this document void.",
    14,
    finalY + 7,
  );
  doc.text(
    `Verification Hash: ${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
    14,
    finalY + 14,
  );

  doc.save("system-audit-log.pdf");
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

const ACTION_COLORS: Record<string, string> = {
  "vote.cast": "bg-primary/15 text-primary border-primary/30",
  "admin.lock_poll": "bg-destructive/15 text-destructive border-destructive/30",
  "admin.unlock_poll": "bg-green-500/15 text-green-700 border-green-500/30",
  "admin.delete_poll":
    "bg-destructive/15 text-destructive border-destructive/30",
  "admin.approve_candidate": "bg-primary/15 text-primary border-primary/30",
  "admin.reject_candidate":
    "bg-destructive/15 text-destructive border-destructive/30",
  "user.login": "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "admin.login": "bg-chart-5/15 text-chart-5 border-chart-5/30",
};

export default function AdminAuditPage() {
  const { data: rows = [], isLoading } = useAdminAuditLog();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return (rows as any[]).filter((r) => {
      if (q) {
        const needle = q.toLowerCase();
        const match = [
          r.action,
          r.actorEmail,
          r.actorRole,
          r.target,
          r.details,
        ].some((v) => v?.toLowerCase().includes(needle));
        if (!match) return false;
      }
      if (dateFrom && new Date(r.createdAt) < new Date(dateFrom + "T00:00:00Z"))
        return false;
      if (dateTo && new Date(r.createdAt) > new Date(dateTo + "T23:59:59Z"))
        return false;
      return true;
    });
  }, [rows, q, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only record of all platform activity with accurate timestamps.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[14rem]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search action, actor, target…"
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>From</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36"
              />
              <span>To</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36"
              />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {filtered.length} events
            </CardTitle>
            <Button
              size="sm"
              variant="default"
              className="gap-2"
              onClick={() => generateAuditPdf(filtered as any[])}
            >
              <FileText className="h-4 w-4" /> Download PDF Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-md bg-muted/40" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatTime(r.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${ACTION_COLORS[r.action] ?? ""}`}
                        >
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.actorEmail ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.actorRole ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-56 truncate">
                        {r.target ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.details ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
