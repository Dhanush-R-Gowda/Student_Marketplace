"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, ImagePlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import type { Category } from "@/types";

interface CreateListingFormProps {
  categories: Category[];
}

const CONDITIONS = [
  { value: "New",      label: "New — Unused, in original packaging" },
  { value: "Like New", label: "Like New — Used once or twice, no damage" },
  { value: "Good",     label: "Good — Minor wear, fully functional" },
  { value: "Fair",     label: "Fair — Visible wear, works fine" },
  { value: "Poor",     label: "Poor — Heavy wear, may need attention" },
];

const LOCATIONS = [
  "Hostel Block A", "Hostel Block B", "Main Campus", "Library",
  "Engineering Block", "Science Block", "Near Canteen", "Sports Complex",
];

export function CreateListingForm({ categories }: CreateListingFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    condition: "",
    price: "",
    location: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);

  function update(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(p => { const n = { ...p }; delete n[field]; return n; });
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newImages = [...images, ...files].slice(0, 5); // max 5 images
    setImages(newImages);

    // Generate previews
    const newPreviews: string[] = [];
    newImages.forEach(f => {
      newPreviews.push(URL.createObjectURL(f));
    });
    setPreviews(newPreviews);
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      // 1. Create the listing
      const payload = {
        title: form.title,
        description: form.description,
        category_id: parseInt(form.category_id),
        condition: form.condition,
        price: parseFloat(form.price) || 0,
        location: form.location,
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.details) {
          setFieldErrors(json.details);
        } else {
          setError(json.error ?? "Failed to create listing.");
        }
        return;
      }

      const listingId = json.data.id;

      // 2. Upload images (if any)
      for (let i = 0; i < images.length; i++) {
        const formData = new FormData();
        formData.append("file", images[i]);
        formData.append("listingId", listingId);
        formData.append("displayOrder", String(i));

        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        // Non-fatal if individual image fails
      }

      setSuccess(true);
      // Redirect to the listing detail page
      setTimeout(() => router.push(`/listings/${listingId}`), 1000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Listing created!
        </h2>
        <p className="text-slate-500 mt-2">Redirecting to your listing…</p>
      </Card>
    );
  }

  const categoryOptions = categories.map(c => ({
    value: c.id,
    label: c.parent_id
      ? `  ↳ ${c.name}`  // indent subcategories
      : c.name,
  }));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 px-4 py-3 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {/* Basic info */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Item details
        </h2>
        <div className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={e => update("title", e.target.value)}
            placeholder="e.g. Casio FX-991ES Plus Scientific Calculator"
            required
            error={fieldErrors.title?.[0]}
            hint="Be specific — mention brand, model, or key feature"
          />

          <Textarea
            label="Description"
            value={form.description}
            onChange={e => update("description", e.target.value)}
            placeholder="Describe the item's condition, features, what's included, reason for selling..."
            required
            rows={5}
            error={fieldErrors.description?.[0]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category_id}
              onChange={e => update("category_id", e.target.value)}
              options={categoryOptions}
              placeholder="Select category"
              required
              error={fieldErrors.category_id?.[0]}
            />
            <Select
              label="Condition"
              value={form.condition}
              onChange={e => update("condition", e.target.value)}
              options={CONDITIONS}
              placeholder="Select condition"
              required
              error={fieldErrors.condition?.[0]}
            />
          </div>
        </div>
      </Card>

      {/* Price & Location */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Price & location
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Price (₹)"
            type="number"
            value={form.price}
            onChange={e => update("price", e.target.value)}
            placeholder="0 for free items"
            min={0}
            step={1}
            required
            error={fieldErrors.price?.[0]}
            hint="Enter 0 to list as a free giveaway"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              list="location-suggestions"
              value={form.location}
              onChange={e => update("location", e.target.value)}
              placeholder="e.g. Hostel Block A"
              required
              className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <datalist id="location-suggestions">
              {LOCATIONS.map(l => <option key={l} value={l} />)}
            </datalist>
            {fieldErrors.location?.[0] && (
              <p className="text-xs text-red-500">{fieldErrors.location[0]}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Images */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
          Photos
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Up to 5 photos. JPEG, PNG, or WebP. Max 5MB each.
        </p>

        {/* Image previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label={`Remove image ${i + 1}`}
                >
                  <X className="h-3 w-3" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[10px] text-white">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {images.length < 5 && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Upload images"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 py-8 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <ImagePlus className="h-5 w-5" />
              Click to upload photos
            </button>
          </>
        )}
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" size="lg" loading={submitting} fullWidth>
          <Upload className="h-4 w-4" />
          {submitting ? "Publishing…" : "Publish listing"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
