"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flag, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { REPORT_REASONS } from "@/lib/validation/schemas";

export function ReportForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reasonOptions = REPORT_REASONS.map(r => ({ value: r, label: r }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason) { setError("Please select a reason."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, reason, description }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to submit report.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Report submitted</h2>
        <p className="text-sm text-slate-500 mt-2">Our team will review this listing.</p>
        <button
          onClick={() => router.back()}
          className="mt-6 text-sm text-indigo-600 hover:underline"
        >
          Go back
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Select
          label="Reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          options={reasonOptions}
          placeholder="Select a reason"
          required
        />
        <Textarea
          label="Additional details (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the issue..."
          rows={4}
        />
        <div className="flex gap-3">
          <Button type="submit" loading={submitting} fullWidth>
            <Flag className="h-4 w-4" />
            Submit report
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
