"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import type { Listing, Category, ListingCondition } from "@/types";

const CONDITIONS = [
  { value: "New", label: "New" },
  { value: "Like New", label: "Like New" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
  { value: "Poor", label: "Poor" },
];

const STATUSES = [
  { value: "Available", label: "Available" },
  { value: "Reserved",  label: "Reserved" },
  { value: "Removed",   label: "Removed" },
];

interface EditListingFormProps {
  listing: Listing;
  categories: Category[];
}

export function EditListingForm({ listing, categories }: EditListingFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    title:       listing.title,
    description: listing.description,
    category_id: String(listing.category_id),
    condition:   listing.condition,
    price:       String(listing.price),
    location:    listing.location,
    status:      listing.status,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categoryOptions = categories.map(c => ({
    value: c.id,
    label: c.parent_id ? `  ↳ ${c.name}` : c.name,
  }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       form.title,
          description: form.description,
          category_id: parseInt(form.category_id),
          condition:   form.condition,
          price:       parseFloat(form.price),
          location:    form.location,
          status:      form.status,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to update.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push(`/listings/${listing.id}`), 800);
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
        <h2 className="text-lg font-semibold">Listing updated!</h2>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="space-y-4">
          <Input label="Title" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          <Textarea label="Description" value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required rows={5} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category_id}
              onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
              options={categoryOptions} required />
            <Select label="Condition" value={form.condition}
              onChange={e => setForm(p => ({ ...p, condition: e.target.value as ListingCondition }))}
              options={CONDITIONS} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₹)" type="number" value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              min={0} required />
            <Input label="Location" value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))} required />
          </div>
          <Select label="Status" value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value as typeof form.status }))}
            options={STATUSES} />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" size="lg" loading={submitting} fullWidth>
          Save changes
        </Button>
        <Button type="button" variant="outline" size="lg"
          onClick={() => router.push(`/listings/${listing.id}`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
