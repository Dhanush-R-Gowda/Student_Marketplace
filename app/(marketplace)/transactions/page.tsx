import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getTransactionsByUser } from "@/lib/db/queries/transactions";
import { TransactionsClient } from "./TransactionsClient";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login?redirect=/transactions");
  }

  const transactions = await getTransactionsByUser(session.id, "both");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Transactions
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your complete buy and sell history
        </p>
      </div>
      <TransactionsClient transactions={transactions} userId={session.id} />
    </div>
  );
}
