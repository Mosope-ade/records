"use client";

import { useEffect, useState } from "react";

type StockStatus = "LOW_STOCK" | "OUT_OF_STOCK" | "RESTOCKED";

interface InventoryItem {
  id: string;
  itemName: string;
  status: StockStatus;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: StockStatus }) {
  if (status === "LOW_STOCK")   return <span className="badge badge-warning">Low Stock</span>;
  if (status === "OUT_OF_STOCK") return <span className="badge badge-danger">Out of Stock</span>;
  return <span className="badge badge-success">Restocked</span>;
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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h2 style={{ marginBottom: '1.5rem' }}>Report Shortage</h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="ledger-amount-label">Item Name</label>
            <input id="item-name" className="form-input" placeholder="e.g. Indomie Noodles" value={itemName} onChange={e => setItemName(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="ledger-amount-label">Status</label>
            <select id="item-status" className="form-select" value={status} onChange={e => setStatus(e.target.value as "LOW_STOCK" | "OUT_OF_STOCK")}>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} type="button" onClick={onClose}>Cancel</button>
            <button id="item-submit" className="btn btn-primary" style={{ flex: 2 }} type="submit" disabled={loading}>
              {loading ? "Saving…" : "Report Item"}
            </button>
          </div>
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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h2 style={{ marginBottom: '0.5rem' }}>Update Status</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{item.itemName}</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {(["LOW_STOCK", "OUT_OF_STOCK", "RESTOCKED"] as StockStatus[]).map(s => (
            <button
              key={s}
              id={`status-${s.toLowerCase()}`}
              className={`btn ${status === s ? "btn-primary" : "btn-ghost"}`}
              style={{ justifyContent: "flex-start", gap: "1rem", padding: '1rem' }}
              onClick={() => setStatus(s)}
            >
              <span style={{ fontSize: '1.2rem' }}>{s === "LOW_STOCK" ? "⚡" : s === "OUT_OF_STOCK" ? "🔴" : "✅"}</span>
              {s === "LOW_STOCK" ? "Low Stock" : s === "OUT_OF_STOCK" ? "Out of Stock" : "Restocked"}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button id="status-confirm" className="btn btn-primary" style={{ flex: 2 }} onClick={submit} disabled={loading}>
            {loading ? "Saving…" : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Page ──────────────────────────────────────────────────────────
export default function InventoryPage() {
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
        <header className="page-header">
          <div>
            <h1>Inventory</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Monitor stock shortages and replenishment</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(v => !v)}>
            {showAll ? "Active shortages" : "View all items"}
          </button>
        </header>

        <section className="stat-grid">
          <div className="stat-card">
            <div className="label">Out of Stock</div>
            <div className="value text-danger">{outCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Low Stock</div>
            <div className="value text-warning">{lowCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Restocked</div>
            <div className="value text-success">{stockCount}</div>
          </div>
        </section>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3,4].map(i => <div key={i} className="card" style={{ height: '80px', opacity: 0.5 }}>Loading...</div>)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3>Inventory looks good!</h3>
            <p style={{ color: 'var(--text-muted)' }}>No stock shortages reported at the moment.</p>
          </div>
        ) : (
          <div className="ledger-container">
             <div className="ledger-header">
              <div>Item Name</div>
              <div>Status</div>
              <div>Reporter</div>
            </div>
            {items.map(item => (
              <div
                key={item.id}
                className="ledger-row"
                onClick={() => setSelected(item)}
                style={{ opacity: item.status === "RESTOCKED" ? 0.6 : 1 }}
              >
                <div>
                  <div className="ledger-name">{item.itemName}</div>
                  <div className="ledger-meta">{timeAgo(item.createdAt)}</div>
                </div>
                <div>
                  <StatusBadge status={item.status} />
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: 'right' }}>
                  {item.reporterName}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <button id="inventory-fab" className="fab" onClick={() => setShowAdd(true)} aria-label="Report shortage">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{ width: 28, height: 28 }}><path d="M12 5v14M5 12h14"/></svg>
      </button>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {selected && <UpdateModal item={selected} onClose={() => setSelected(null)} onSaved={load} />}
    </>
  );
}
