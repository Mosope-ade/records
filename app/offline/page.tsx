import Link from "next/link";

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "2rem",
      background: "var(--bg)", color: "var(--text-primary)", textAlign: "center",
    }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📡</div>
      <h1 style={{ marginBottom: "0.5rem" }}>You&apos;re offline</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Cannot connect. Your previously loaded data is still accessible.
      </p>
      <Link href="/ledger" className="btn btn-primary">Back to Ledger</Link>
    </div>
  );
}
