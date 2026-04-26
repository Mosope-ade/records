import { redirect } from "next/navigation";

/** Root redirect → Ledger */
export default function Home() {
  redirect("/ledger");
}
