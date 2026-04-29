import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

/** Root page checks for auth and redirects accordingly */
export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/ledger");
  }

  redirect("/auth/sign-in");
}
