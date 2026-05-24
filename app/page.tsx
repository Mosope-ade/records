"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending) {
      if (session?.user) router.replace("/ledger");
      else router.replace("/auth/sign-in");
    }
  }, [session, isPending, router]);

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--primary)", marginBottom: "0.5rem" }}>SS</div>
        <p>Loading…</p>
      </div>
    </main>
  );
}
