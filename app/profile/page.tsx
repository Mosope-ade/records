"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "admin" | "staff";
}

async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const reg = await navigator.serviceWorker.ready;

  // Fetch VAPID public key
  const res = await fetch("/api/push/subscribe");
  const { publicKey } = await res.json();
  if (!publicKey) return false;

  // Request permission
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  // Subscribe
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });

  return true;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function ProfilePage() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .finally(() => setLoading(false));

    if ("Notification" in window) {
      if (Notification.permission === "granted") setPushStatus("granted");
      if (Notification.permission === "denied")  setPushStatus("denied");
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePush = async () => {
    setPushStatus("loading");
    const ok = await subscribeToPush();
    setPushStatus(ok ? "granted" : "denied");
    showToast(ok ? "🔔 Push notifications enabled!" : "❌ Push permission denied");
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      {toast && (
        <div className="toast-wrap">
          <div className="toast">{toast}</div>
        </div>
      )}

      <main className="page">
        <div className="page-header">
          <h1>Profile</h1>
        </div>

        {loading ? (
          <>
            <div className="skeleton" style={{ width: 64, height: 64, borderRadius: "50%", marginBottom: 12 }} />
            <div className="skeleton" style={{ width: 160, height: 20, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 200, height: 16 }} />
          </>
        ) : user ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="avatar">
                {user.image ? <img src={user.image} alt={user.name ?? "avatar"} /> : initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user.name ?? "Staff"}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{user.email}</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${user.role === "admin" ? "badge-purple" : "badge-low"}`}>
                    {user.role === "admin" ? "👑 Admin" : "Staff"}
                  </span>
                </div>
              </div>
            </div>

            <div className="divider" />

            {/* Push Notifications */}
            <div className="card" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Push Notifications</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {pushStatus === "granted" ? "Enabled — you'll be notified of new debts & stock alerts" : "Get alerts for new debt entries and out-of-stock items"}
                  </div>
                </div>
                {pushStatus === "granted" ? (
                  <span className="badge badge-stock">ON</span>
                ) : pushStatus === "denied" ? (
                  <span className="badge badge-out">Blocked</span>
                ) : (
                  <button id="enable-push" className="btn btn-primary btn-sm" onClick={handlePush} disabled={pushStatus === "loading"}>
                    {pushStatus === "loading" ? "…" : "Enable"}
                  </button>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Quick Actions</div>
              <Link href="/ledger" className="btn btn-ghost" style={{ justifyContent: "flex-start" }}>📒 Go to Ledger</Link>
              <Link href="/inventory" className="btn btn-ghost" style={{ justifyContent: "flex-start" }}>📦 Go to Inventory</Link>
            </div>

            <div className="divider" />

            <a href="/api/auth/signout" id="sign-out" className="btn btn-danger btn-full">Sign Out</a>
          </>
        ) : (
          <div className="empty-state">
            <h3>Not signed in</h3>
            <p style={{ fontSize: "0.85rem" }}>Please sign in to use ShopSync</p>
            <a href="/api/auth/signin" className="btn btn-primary" style={{ marginTop: "1rem" }}>Sign In</a>
          </div>
        )}
      </main>

      <BottomNav pathname={pathname} />
    </>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="bottom-nav">
      <Link href="/ledger"    className={`nav-item ${pathname === "/ledger"    ? "active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Ledger
      </Link>
      <Link href="/inventory" className={`nav-item ${pathname === "/inventory" ? "active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        Inventory
      </Link>
      <Link href="/profile"   className={`nav-item ${pathname === "/profile"   ? "active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Profile
      </Link>
    </nav>
  );
}
