"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type StockStatus = "LOW_STOCK" | "OUT_OF_STOCK" | "RESTOCKED";

interface InventoryItem {
  id: string;
  itemName: string;
  status: StockStatus;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: StockStatus }) {
  if (status === "LOW_STOCK")   return <span className="badge badge-low">Low Stock</span>;
  if (status === "OUT_OF_STOCK") return <span className="badge badge-out">Out of Stock</span>;
  return <span className="badge badge-stock">Restocked</span>;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────
function AddItemModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [itemName, setItemName] = useState("");
  const [status, setStatus] = useState<"LOW_STOCK" | "OUT_OF_STOCK">("LOW_STOCK");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    setLoading(true);
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemName: itemName.trim(), status }),
    });
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h2 className="modal-title">Report Shortage</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input id="item-name" className="form-input" placeholder="e.g. Indomie Noodles" value={itemName} onChange={e => setItemName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select id="item-status" className="form-select" value={status} onChange={e => setStatus(e.target.value as "LOW_STOCK" | "OUT_OF_STOCK")}>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
          <button id="item-submit" className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Report Item"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Status Update Modal ──────────────────────────────────────────────────────
function UpdateModal({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<StockStatus>(item.status);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    await fetch(`/api/inventory/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h2 className="modal-title">Update Status</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem", fontWeight: 600 }}>{item.itemName}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {(["LOW_STOCK", "OUT_OF_STOCK", "RESTOCKED"] as StockStatus[]).map(s => (
            <button
              key={s}
              id={`status-${s.toLowerCase()}`}
              className={`btn ${status === s ? "btn-primary" : "btn-ghost"}`}
              style={{ justifyContent: "flex-start", gap: "0.75rem" }}
              onClick={() => setStatus(s)}
            >
              <span>{s === "LOW_STOCK" ? "⚡" : s === "OUT_OF_STOCK" ? "🔴" : "✅"}</span>
              {s === "LOW_STOCK" ? "Low Stock" : s === "OUT_OF_STOCK" ? "Out of Stock" : "Restocked"}
            </button>
          ))}
        </div>
        <button id="status-confirm" className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
          {loading ? "Saving…" : "Update Status"}
        </button>
      </div>
    </div>
  );
}

// ─── Inventory Page ──────────────────────────────────────────────────────────
export default function InventoryPage() {
  const pathname = usePathname();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/inventory${showAll ? "?all=true" : ""}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [showAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const outCount  = items.filter(i => i.status === "OUT_OF_STOCK").length;
  const lowCount  = items.filter(i => i.status === "LOW_STOCK").length;
  const stockCount = items.filter(i => i.status === "RESTOCKED").length;

  return (
    <>
      <main className="page">
        <div className="page-header">
          <div>
            <h1>Inventory</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>Stock shortages</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(v => !v)}>
            {showAll ? "Active only" : "Show all"}
          </button>
        </div>

        <div className="stat-row">
          <div className="stat-pill">
            <div className="label">Out</div>
            <div className="value" style={{ color: "var(--danger)" }}>{outCount}</div>
          </div>
          <div className="stat-pill">
            <div className="label">Low</div>
            <div className="value" style={{ color: "var(--warning)" }}>{lowCount}</div>
          </div>
          <div className="stat-pill">
            <div className="label">Restocked</div>
            <div className="value" style={{ color: "var(--success)" }}>{stockCount}</div>
          </div>
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-card" />)
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <h3>All clear!</h3>
            <p style={{ fontSize: "0.85rem" }}>No shortages to report</p>
          </div>
        ) : (
          <div className="entry-list">
            {items.map(item => (
              <div
                key={item.id}
                className="entry-card"
                onClick={() => setSelected(item)}
                style={{ opacity: item.status === "RESTOCKED" ? 0.55 : 1 }}
              >
                <div className="entry-card-top">
                  <span className="entry-name">{item.itemName}</span>
                  <StatusBadge status={item.status} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Reported {timeAgo(item.createdAt)} · tap to update
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <button id="inventory-fab" className="fab" onClick={() => setShowAdd(true)} aria-label="Report shortage">+</button>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {selected && <UpdateModal item={selected} onClose={() => setSelected(null)} onSaved={load} />}

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
