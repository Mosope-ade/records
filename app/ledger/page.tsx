"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmt, timeAgo } from "@/lib/utils";

interface DebtEntry {
  id: string;
  customerName: string;
  totalDebt: string;
  amountPaid: string;
  balance: string;
  notes?: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: string;
  note?: string;
  paidAt: string;
}

// ─── Add Debt Modal ──────────────────────────────────────────────────────────
function AddDebtModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?type=customers&q=${encodeURIComponent(name)}`);
        if (res.ok) {
          setSuggestions(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !total) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name.trim(), totalDebt: parseFloat(total), notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save debt entry");
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
        <h2 style={{ marginBottom: '1.5rem' }}>New Debt Entry</h2>
        {error && (
          <div style={{ padding: "0.75rem", background: "#FFF5F5", color: "var(--danger)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, border: "1px solid #FED7D7", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        <form onSubmit={submit}>
          
          {/* Autocomplete Input */}
          <div style={{ marginBottom: '1.25rem', position: "relative" }} ref={suggestRef}>
            <label className="ledger-amount-label">Customer Name</label>
            <input
              id="debt-name"
              className="form-input"
              placeholder="e.g. Iya Shola"
              value={name}
              onChange={e => {
                setName(e.target.value);
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
                      setName(s);
                      setShowSuggest(false);
                    }}
                    style={{
                      padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)",
                      cursor: "pointer", fontSize: "0.9rem", fontWeight: 500
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--primary-soft)"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    👤 {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="ledger-amount-label">Total Debt (₦)</label>
            <input id="debt-amount" className="form-input" type="number" min="0" step="0.01" placeholder="5000.00" value={total} onChange={e => setTotal(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="ledger-amount-label">Notes (optional)</label>
            <textarea id="debt-notes" className="form-textarea" placeholder="Item purchased, etc." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} type="button" onClick={onClose}>Cancel</button>
            <button id="debt-submit" className="btn btn-primary" style={{ flex: 2 }} type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pay Modal ───────────────────────────────────────────────────────────────
function PayModal({ entry, onClose, onSaved }: { entry: DebtEntry; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!amount) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/debt/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), note }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record payment");
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
        <h2 style={{ marginBottom: '0.5rem' }}>Record Payment</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{entry.customerName}</p>
        {error && (
          <div style={{ padding: "0.75rem", background: "#FFF5F5", color: "var(--danger)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, border: "1px solid #FED7D7", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        
        <div className="card" style={{ marginBottom: "1.5rem", background: 'var(--primary-soft)', border: 'none' }}>
          <div className="ledger-amounts">
            <div className="ledger-amount-group">
              <div className="ledger-amount-label">Balance Due</div>
              <div className="ledger-amount-value" style={{ color: 'var(--danger)', fontSize: '1.25rem' }}>{fmt(entry.balance)}</div>
            </div>
            <div className="ledger-amount-group">
              <div className="ledger-amount-label">Paid</div>
              <div className="ledger-amount-value" style={{ color: 'var(--success)' }}>{fmt(entry.amountPaid)}</div>
            </div>
          </div>
        </div>

        {entry.payments.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Payment History</h3>
            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
              {entry.payments.map(p => (
                <div key={p.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span className="text-success" style={{ fontWeight: 700 }}>+{fmt(p.amount)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{timeAgo(p.paidAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="ledger-amount-label">Amount Paid (₦)</label>
            <input id="pay-amount" className="form-input" type="number" min="0.01" step="0.01" max={Number(entry.balance)} placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="ledger-amount-label">Note (optional)</label>
            <input id="pay-note" className="form-input" placeholder="e.g. part payment" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} type="button" onClick={onClose}>Cancel</button>
            <button id="pay-submit" className="btn btn-primary" style={{ flex: 2 }} type="submit" disabled={loading}>
              {loading ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ledger Page ─────────────────────────────────────────────────────────────
export default function LedgerPage() {
  const [entries, setEntries] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<DebtEntry | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("name", search);
    if (date)   params.set("date", date);
    const res = await fetch(`/api/debt?${params}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [search, date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?type=customers&q=${encodeURIComponent(search)}`);
        if (res.ok) {
          setSuggestions(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalBalance = entries.reduce((s, e) => s + Number(e.balance), 0);
  const outstanding  = entries.filter(e => Number(e.balance) > 0).length;

  return (
    <>
      <main className="page">
        <header className="page-header">
          <div>
            <h1>Ledger</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Track customer debts and payments</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Outstanding</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>{fmt(totalBalance)}</div>
          </div>
        </header>

        <section className="stat-grid">
          <div className="stat-card">
            <div className="label">Total Entries</div>
            <div className="value">{entries.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Outstanding</div>
            <div className="value text-warning">{outstanding}</div>
          </div>
          <div className="stat-card">
            <div className="label">Cleared</div>
            <div className="value text-success">{entries.length - outstanding}</div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          
          {/* Autocomplete Input Search */}
          <div style={{ flex: 2, position: 'relative', minWidth: '200px' }} ref={suggestRef}>
            <div style={{ position: "relative" }}>
              <input 
                id="ledger-search" 
                className="form-input" 
                placeholder="Search by customer name..." 
                value={search} 
                onChange={e => {
                  setSearch(e.target.value);
                  setShowSuggest(true);
                }}
                onFocus={() => setShowSuggest(true)}
                style={{ paddingLeft: '2.5rem' }}
                autoComplete="off"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.2rem', color: 'var(--text-muted)' }}><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
            </div>
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
                      setSearch(s);
                      setShowSuggest(false);
                    }}
                    style={{
                      padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)",
                      cursor: "pointer", fontSize: "0.9rem", fontWeight: 500
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--primary-soft)"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    👤 {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <input 
            id="ledger-date" 
            type="date" 
            className="form-input" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            style={{ flex: 1, minWidth: '150px' }} 
          />
          {date && <button className="btn btn-ghost" onClick={() => setDate("")}>Reset</button>}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3,4].map(i => <div key={i} className="card" style={{ height: '80px', opacity: 0.5 }}>Loading...</div>)}
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📒</div>
            <h3>No entries found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Tap the + button to record a new debt.</p>
          </div>
        ) : (
          /* Mobile-first cards list for Ledger */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {entries.map(e => (
              <div key={e.id} className="card" onClick={() => setSelected(e)} style={{
                display: "flex", flexDirection: "column", gap: "0.85rem",
                padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)",
                cursor: "pointer"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="ledger-name">{e.customerName}</div>
                    <div className="ledger-meta">{e.creatorName} • {timeAgo(e.createdAt)}</div>
                  </div>
                  <div>
                    <span className={`badge ${Number(e.balance) > 0 ? "badge-danger" : "badge-success"}`} style={{ fontSize: '0.65rem' }}>
                      {Number(e.balance) > 0 ? "Outstanding" : "Cleared"}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem",
                  padding: "0.6rem 0.85rem", background: "var(--primary-soft)",
                  borderRadius: "8px"
                }}>
                  <div>
                    <span className="ledger-amount-label">Debt</span>
                    <div style={{ fontWeight: 800 }}>{fmt(e.totalDebt)}</div>
                  </div>
                  <div>
                    <span className="ledger-amount-label">Balance</span>
                    <div style={{ fontWeight: 800, color: Number(e.balance) > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(e.balance)}</div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                    {Number(e.balance) > 0 ? "Record Payment" : "View Payments"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <button id="ledger-fab" className="fab" onClick={() => setShowAdd(true)} aria-label="New debt entry">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{ width: 28, height: 28 }}><path d="M12 5v14M5 12h14"/></svg>
      </button>

      {showAdd && <AddDebtModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {selected && <PayModal entry={selected} onClose={() => setSelected(null)} onSaved={load} />}
    </>
  );
}
