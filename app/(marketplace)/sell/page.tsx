import { Metadata } from "next";
import Link from "next/link";
import { PlusCircle, Camera, DollarSign, Send } from "lucide-react";

export const metadata: Metadata = { title: "Sell an Item" };

export default function SellPage() {
  const steps = [
    { icon: PlusCircle, title: "Add details", description: "Title, description, category, and condition" },
    { icon: Camera, title: "Upload photos", description: "Clear photos help items sell faster" },
    { icon: DollarSign, title: "Set your price", description: "Or offer it for free" },
    { icon: Send, title: "Publish", description: "Your item is live to all students" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sell an Item</h1>
      <p className="mt-3 text-slate-500">List your item in minutes. Reach students across campus.</p>

      <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {steps.map(({ icon: Icon, title, description }, i) => (
          <div key={title} className="flex flex-col items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {i + 1}
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/listings/new"
        className="mt-12 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        <PlusCircle className="h-5 w-5" />
        Start Listing
      </Link>
    </div>
  );
}
