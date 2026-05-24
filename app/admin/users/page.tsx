"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";

type UserRole = "admin" | "price_manager" | "staff";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  banned: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "👑 Admin",
  price_manager: "🏷️ Price Mgr",
  staff: "Staff",
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: "badge-warning",
  price_manager: "badge-info",
  staff: "badge-success",
};

// ─── Add User Modal ──────────────────────────────────────────────────────────
function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, role }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create user account");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h2>Add User Account</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          Create new credentials for a shop worker or admin.
        </p>

        {error && (
          <div style={{ padding: "0.75rem", background: "#FFF5F5", color: "var(--danger)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, border: "1px solid #FED7D7", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
          <div>
            <label className="ledger-amount-label">Worker Name</label>
            <input className="form-input" placeholder="e.g. Iya Lola" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
          </div>
          <div>
            <label className="ledger-amount-label">Email Address</label>
            <input className="form-input" type="email" placeholder="name@shopsync.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
          </div>
          <div>
            <label className="ledger-amount-label">Password</label>
            <input className="form-input" type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading} />
          </div>
          <div>
            <label className="ledger-amount-label">Access Level</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value as UserRole)} disabled={loading}>
              <option value="staff">Staff — Add debts, report inventory (read-only on prices)</option>
              <option value="price_manager">Price Manager — Staff access + add/edit product prices</option>
              <option value="admin">Administrator — Full access, delete data, manage users</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Admin Panel ────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/me")
        .then(r => r.ok ? r.json() : null)
        .then(data => { setCurrentUser(data || session.user); })
        .catch(() => { setCurrentUser(session.user); })
        .finally(() => setMeLoading(false));
    } else if (!sessionLoading) {
      setCurrentUser(null);
      setMeLoading(false);
    }
  }, [session, sessionLoading]);

  const userRole = currentUser?.role || (currentUser as any)?.metadata?.role;
  const isAdmin = userRole === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleAccess = async (user: User) => {
    const action = user.banned ? "enable" : "disable";
    const confirmMsg = user.banned
      ? `Restore access for ${user.name}?`
      : `Disable and revoke access for ${user.name}? They will be signed out.`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showNotification(user.banned ? `✅ Access enabled for ${user.name}` : `🔒 Access disabled for ${user.name}`);
        load();
      } else {
        showNotification("❌ Failed to update access");
      }
    } catch {
      showNotification("❌ An error occurred");
    }
  };

  const handleChangeRole = async (user: User, newRole: UserRole) => {
    if (newRole === user.role) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", role: newRole }),
      });
      if (res.ok) {
        showNotification(`✅ ${user.name}'s role updated to ${newRole}`);
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification(`❌ ${err.error || "Failed to update role"}`);
      }
    } catch {
      showNotification("❌ An error occurred");
    }
  };

  if (sessionLoading || meLoading) {
    return <main className="page"><div className="card">Loading session details...</div></main>;
  }

  if (!currentUser || !isAdmin) {
    return (
      <main className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="card" style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
          <h2>Access Denied</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
            You must be signed in as an Administrator to access the user management panel.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="page">
        <header className="page-header" style={{ marginBottom: "1.5rem" }}>
          <div>
            <h1>User Management</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Onboard new workers and manage login access and roles
            </p>
          </div>
          <button className="btn btn-primary btn-sm" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }} onClick={() => setModalOpen(true)}>
            ➕ Add Worker
          </button>
        </header>

        {/* Role legend */}
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem", fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <span><strong style={{ color: "var(--text-primary)" }}>Staff</strong> — debt &amp; inventory management</span>
          <span><strong style={{ color: "var(--text-primary)" }}>Price Manager</strong> — staff access + add/edit prices</span>
          <span><strong style={{ color: "var(--text-primary)" }}>Admin</strong> — full access + user management</span>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3].map(i => <div key={i} className="card" style={{ height: "80px", opacity: 0.5 }}>Loading...</div>)}
          </div>
        ) : users.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <h3>No users registered</h3>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Create user credentials to get started.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {users.map(u => (
              <div key={u.id} className="card" style={{
                display: "flex", flexDirection: "column", gap: "0.75rem",
                padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)",
                opacity: u.banned ? 0.6 : 1
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{u.name}</h3>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span className={`badge ${ROLE_BADGE_CLASS[u.role]}`} style={{ fontSize: "0.65rem" }}>
                      {ROLE_LABELS[u.role]}
                    </span>
                    <span className={`badge`} style={{
                      fontSize: "0.65rem",
                      background: u.banned ? "#FEE2E2" : "#DCFCE7",
                      color: u.banned ? "#991B1B" : "#166534"
                    }}>
                      {u.banned ? "Disabled" : "Active"}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Email: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{u.email}</span>
                </div>

                {u.id !== currentUser.id && (
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <div style={{ flex: 1, minWidth: "160px" }}>
                      <label className="ledger-amount-label" style={{ marginBottom: "0.3rem", display: "block" }}>Role</label>
                      <select
                        className="form-select"
                        style={{ fontSize: "0.82rem", padding: "0.4rem 0.6rem" }}
                        value={u.role}
                        onChange={e => handleChangeRole(u, e.target.value as UserRole)}
                      >
                        <option value="staff">Staff</option>
                        <option value="price_manager">Price Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: "0.4rem 1rem", fontSize: "0.8rem", alignSelf: "flex-end",
                        color: u.banned ? "var(--success)" : "var(--danger)",
                        borderColor: u.banned ? "rgba(56, 161, 105, 0.2)" : "rgba(197, 48, 48, 0.2)"
                      }}
                      onClick={() => handleToggleAccess(u)}
                    >
                      {u.banned ? "🔓 Enable Access" : "🔒 Disable Access"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <AddUserModal
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            load();
            showNotification("👥 Worker account created successfully!");
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
