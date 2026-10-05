"use client";

import { useState, FormEvent } from "react";
import { X, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

interface MakeOfferModalProps {
  listingId:    string;
  listingTitle: string;
  listingPrice: number;
  onClose:      () => void;
  onSuccess?:   () => void;
}

export function MakeOfferModal({
  listingId,
  listingTitle,
  listingPrice,
  onClose,
  onSuccess,
}: MakeOfferModalProps) {
  const [amount,  setAmount]  = useState(String(listingPrice));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      setError("Please enter a valid offer amount.");
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/offers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ listing_id: listingId, amount: amt, message: message || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to submit offer.");
        return;
      }
      setSuccess(true);
      onSuccess?.();
      setTimeout(onClose, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Make an offer"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Make an Offer</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {success ? (
            <div className="flex flex-col items-center py-6 text-center gap-3">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-slate-900 dark:text-white">Offer submitted!</p>
              <p className="text-sm text-slate-500">The seller will be notified.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                  Offering on: <span className="font-medium text-slate-700 dark:text-slate-300">{listingTitle}</span>
                </p>

                {error && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}

                <Input
                  label="Your offer (₹)"
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min={0}
                  step={1}
                  required
                  hint={`Listed at ₹${listingPrice.toLocaleString("en-IN")}`}
                />
              </div>

              <Textarea
                label="Message to seller (optional)"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Hi, I'm interested in this item..."
                rows={3}
                maxLength={500}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" fullWidth loading={loading}>
                  Submit offer
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
