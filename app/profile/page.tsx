"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "@/lib/components/action";

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "admin" | "staff";
}



async function subscribeToPush() {
  // console.log("Checking for SW support...")
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    // console.warn("Push notifications not supported")
    return false;
  }

  console.log("Waiting for service worker ready...")
  const reg = await navigator.serviceWorker.ready;
  console.log("Service worker is ready:", reg);
  // Request permission
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  // Subscribe
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });

  console.log("Sending subscription to server...")
  const pushRes = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub }),
  });

  if (!pushRes.ok) {
    console.error("Failed to save subscription on server", await pushRes.text());
    return false;
  }

  console.log("Successfully subscribed!");

  return true;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [toast, setToast] = useState<string | null>(null);

  async function registerServiceWorker() {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    const sub = await registration.pushManager.getSubscription()
  }

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .finally(() => setLoading(false));

    if ('serviceWorker' in navigator && 'PushManager' in window) {
    registerServiceWorker()
    }

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
    try {
    setPushStatus("loading");
    const ok = await subscribeToPush();
    setPushStatus(ok ? "granted" : "denied");
    showToast(ok ? "🔔 Push notifications enabled!" : "❌ Push permission denied");
    } catch (error) {
      console.error(error);
      setPushStatus("idle");
      showToast((error as Error).message);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <main className="page">
        <header className="page-header">
          <h1>Profile</h1>
        </header>

        {loading ? (
          <div className="card">Loading profile...</div>
        ) : user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--primary)', color: 'white' }}>
              <div style={{ 
                width: 80, height: 80, borderRadius: '50%', background: 'white', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800,
                boxShadow: 'var(--shadow-lg)'
              }}>
                {user.image ? <img src={user.image} alt={user.name ?? "avatar"} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
              </div>
              <div>
                <h2 style={{ color: 'white', marginBottom: '0.25rem' }}>{user.name ?? "Shop Staff"}</h2>
                <p style={{ opacity: 0.8, marginBottom: '0.75rem' }}>{user.email}</p>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  {user.role === "admin" ? "👑 Admin" : "Staff Member"}
                </span>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.25rem' }}>Notifications</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Push Alerts</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Get real-time alerts for new debts and stock issues.
                  </p>
                </div>
                {pushStatus === "granted" ? (
                  <span className="badge badge-success">Enabled</span>
                ) : pushStatus === "denied" ? (
                  <span className="badge badge-danger">Blocked</span>
                ) : (
                  <button id="enable-push" className="btn btn-primary btn-sm" onClick={handlePush}
                  //  disabled={pushStatus === "loading"}
                   >
                    {pushStatus === "loading" ? "Activating..." : "Enable"}
                  </button>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.25rem' }}>Account Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href="/ledger" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  View Debt Ledger
                </Link>
                <Link href="/inventory" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  Check Inventory
                </Link>
                <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }}></div>
                <span onClick={signOut} className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: 'var(--danger)', borderColor: 'rgba(197, 48, 48, 0.2)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
                  Sign Out of ShopSync
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h3>You are not signed in</h3>
            <Link href="/auth/sign-in" className="btn btn-primary" style={{ marginTop: '1rem' }}>Sign In</Link>
          </div>
        )}
      </main>

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </>
  );
}
