"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { timeAgo } from "@/lib/utils";

type StockStatus = "LOW_STOCK" | "OUT_OF_STOCK" | "RESTOCKED";

interface InventoryItem {
  id: string;
  itemName: string;
  status: StockStatus;
  quantity: number;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: StockStatus }) {
  if (status === "LOW_STOCK")   return <span className="badge badge-warning">Low Stock</span>;
  if (status === "OUT_OF_STOCK") return <span className="badge badge-danger">Out of Stock</span>;
  return <span className="badge badge-success">Restocked</span>;
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────
function AddItemModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [itemName, setItemName] = useState("");
  const [status, setStatus] = useState<"LOW_STOCK" | "OUT_OF_STOCK">("LOW_STOCK");
  const [quantity, setQuantity] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemName.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?type=products&q=${encodeURIComponent(itemName)}`);
        if (res.ok) {
          setSuggestions(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [itemName]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: itemName.trim(),
          status,
          quantity: parseInt(quantity) || 0
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to report shortage");
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
        <h2 style={{ marginBottom: '1rem' }}>Report Shortage</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Autocomplete matches from your Products Catalog
        </p>
        {error && (
          <div style={{ padding: "0.75rem", background: "#FFF5F5", color: "var(--danger)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, border: "1px solid #FED7D7", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* Autocomplete Input */}
          <div style={{ position: "relative" }} ref={suggestRef}>
            <label className="ledger-amount-label">Item Name</label>
            <input
              id="item-name"
              className="form-input"
              placeholder="e.g. Indomie Noodles"
              value={itemName}
              onChange={e => {
                setItemName(e.target.value);
                setShowSuggest(true);
              }}
              onFocus={() => setShowSuggest(true)}
              required
              autoComplete="off"
            />
            {showSuggest && suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "white", border: "1px solid var(--border)",
                borderRadius: "8px", marginTop: "4px", zIndex: 10,
                boxShadow: "var(--shadow-lg)", overflow: "hidden"
              }}>
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setItemName(s.name);
                      setShowSuggest(false);
                    }}
                    style={{
                      padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)",
                      cursor: "pointer", fontSize: "0.9rem", fontWeight: 500
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--primary-soft)"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    📦 {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="ledger-amount-label">Shortage Status</label>
            <select id="item-status" className="form-select" value={status} onChange={e => setStatus(e.target.value as "LOW_STOCK" | "OUT_OF_STOCK")}>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          <div>
            <label className="ledger-amount-label">Remaining Quantity</label>
            <input
              id="item-qty"
              className="form-input"
              type="number"
              min="0"
              placeholder="e.g. 2"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: "1rem" }}>
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
  const [quantity, setQuantity] = useState(item.quantity?.toString() ?? "0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          quantity: status !== "RESTOCKED" ? (parseInt(quantity) || 0) : 0
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
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
        <h2 style={{ marginBottom: '0.25rem' }}>Update Status</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>{item.itemName}</p>
        {error && (
          <div style={{ padding: "0.75rem", background: "#FFF5F5", color: "var(--danger)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, border: "1px solid #FED7D7", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {(["LOW_STOCK", "OUT_OF_STOCK", "RESTOCKED"] as StockStatus[]).map(s => (
            <button
              key={s}
              id={`status-${s.toLowerCase()}`}
              className={`btn ${status === s ? "btn-primary" : "btn-ghost"}`}
              style={{ justifyContent: "flex-start", gap: "1rem", padding: '0.85rem' }}
              onClick={() => setStatus(s)}
            >
              <span style={{ fontSize: '1.2rem' }}>{s === "LOW_STOCK" ? "⚡" : s === "OUT_OF_STOCK" ? "🔴" : "✅"}</span>
              {s === "LOW_STOCK" ? "Low Stock" : s === "OUT_OF_STOCK" ? "Out of Stock" : "Restocked"}
            </button>
          ))}
        </div>

        {status !== "RESTOCKED" && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="ledger-amount-label">Remaining Quantity</label>
            <input
              className="form-input"
              type="number"
              min="0"
              placeholder="e.g. 5"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
            />
          </div>
        )}

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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/inventory${showAll ? "?all=true" : ""}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [showAll]);

  useEffect(() => { load(); }, [load]);

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
          /* Mobile-first cards list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map(item => (
              <div
                key={item.id}
                className="card"
                onClick={() => setSelected(item)}
                style={{
                  display: "flex", flexDirection: "column", gap: "0.5rem",
                  padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)",
                  cursor: "pointer", opacity: item.status === "RESTOCKED" ? 0.6 : 1
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{item.itemName}</h3>
                  <StatusBadge status={item.status} />
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  <div>
                    {timeAgo(item.createdAt)}
                    {item.status !== "RESTOCKED" && (
                      <span style={{ fontWeight: 700, color: "var(--danger)" }}>
                        {" "}• {item.quantity} remaining
                      </span>
                    )}
                  </div>
                  <div>Reported by: {item.reporterName}</div>
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
