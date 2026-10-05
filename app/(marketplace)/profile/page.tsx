import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/queries/users";
import { getListingsBySeller } from "@/lib/db/queries/listings";
import { getTransactionsByUser } from "@/lib/db/queries/transactions";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  const [user, listings, transactions] = await Promise.all([
    getUserById(session.id),
    getListingsBySeller(session.id),
    getTransactionsByUser(session.id, "both"),
  ]);

  if (!user) redirect("/login");

  return <ProfileClient user={user} listings={listings} transactions={transactions} />;
}
