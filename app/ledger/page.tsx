"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

function fmt(n: string | number) {
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
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

// ─── Add Debt Modal ──────────────────────────────────────────────────────────
function AddDebtModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const submit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!name.trim() || !total) return;
    setLoading(true);
    await fetch("/api/debt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: name.trim(), totalDebt: parseFloat(total), notes }),
    });
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={ref}>
        <div className="modal-handle" />
        <h2 className="modal-title">New Debt Entry</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input id="debt-name" className="form-input" placeholder="e.g. Iya Shola" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Total Debt (₦)</label>
            <input id="debt-amount" className="form-input" type="number" min="0" step="0.01" placeholder="5000.00" value={total} onChange={e => setTotal(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea id="debt-notes" className="form-textarea" placeholder="Item purchased, etc." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button id="debt-submit" className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save Entry"}
          </button>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setLoading(true);
    await fetch(`/api/debt/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(amount), note }),
    });
    setLoading(false);
    onSaved();
    onClose();
  };

  const pct = Math.min(100, (Number(entry.amountPaid) / Number(entry.totalDebt)) * 100);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h2 className="modal-title">Record Payment</h2>
        <div className="card card-highlight" style={{ marginBottom: "1.25rem" }}>
          <div className="entry-name" style={{ marginBottom: 8 }}>{entry.customerName}</div>
          <div className="entry-amounts">
            <div className="amount-cell">
              <div className="amount-label">Total</div>
              <div className="amount-value purple">{fmt(entry.totalDebt)}</div>
            </div>
            <div className="amount-cell">
              <div className="amount-label">Paid</div>
              <div className="amount-value green">{fmt(entry.amountPaid)}</div>
            </div>
            <div className="amount-cell">
              <div className="amount-label">Balance</div>
              <div className="amount-value red">{fmt(entry.balance)}</div>
            </div>
          </div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {entry.payments.length > 0 && (
          <>
            <h3 style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Payment History</h3>
            <div style={{ marginBottom: "1rem", maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {entry.payments.map(p => (
                <div key={p.id} style={{ background: "var(--bg)", borderRadius: 8, padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--success)", fontWeight: 700, fontSize: "0.9rem" }}>+{fmt(p.amount)}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{timeAgo(p.paidAt)}</span>
                </div>
              ))}
            </div>
            <div className="divider" />
          </>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Amount Paid (₦)</label>
            <input id="pay-amount" className="form-input" type="number" min="0.01" step="0.01" max={Number(entry.balance)} placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input id="pay-note" className="form-input" placeholder="e.g. part payment" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <button id="pay-submit" className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Record Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Ledger Page ─────────────────────────────────────────────────────────────
export default function LedgerPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<DebtEntry | null>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("name", search);
    if (date)   params.set("date", date);
    const res = await fetch(`/api/debt?${params}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalBalance = entries.reduce((s, e) => s + Number(e.balance), 0);
  const outstanding  = entries.filter(e => Number(e.balance) > 0).length;

  return (
    <>
      <main className="page">
        <div className="page-header">
          <div>
            <h1>Ledger</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>Debt records</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Owed</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--danger)" }}>{fmt(totalBalance)}</div>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat-pill">
            <div className="label">Entries</div>
            <div className="value">{entries.length}</div>
          </div>
          <div className="stat-pill">
            <div className="label">Outstanding</div>
            <div className="value" style={{ color: "var(--warning)" }}>{outstanding}</div>
          </div>
          <div className="stat-pill">
            <div className="label">Cleared</div>
            <div className="value" style={{ color: "var(--success)" }}>{entries.length - outstanding}</div>
          </div>
        </div>

        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
          <input id="ledger-search" className="search-input" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="filter-row">
          <input id="ledger-date" type="date" className="form-input filter-date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: "0.85rem" }} />
          {date && <button className="btn btn-ghost btn-sm" onClick={() => setDate("")}>Clear</button>}
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-card" />)
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <h3>No entries found</h3>
            <p style={{ fontSize: "0.85rem" }}>Tap + to add the first debt entry</p>
          </div>
        ) : (
          <div className="entry-list">
            {entries.map(e => (
              <div key={e.id} className="entry-card" onClick={() => setSelected(e)}>
                <div className="entry-card-top">
                  <span className="entry-name">{e.customerName}</span>
                  <span className="entry-date">{e.creatorName} • {timeAgo(e.createdAt)}</span>
                </div>
                {e.notes && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8 }}>{e.notes}</p>}
                <div className="entry-amounts">
                  <div className="amount-cell">
                    <div className="amount-label">Debt</div>
                    <div className="amount-value purple">{fmt(e.totalDebt)}</div>
                  </div>
                  <div className="amount-cell">
                    <div className="amount-label">Paid</div>
                    <div className="amount-value green">{fmt(e.amountPaid)}</div>
                  </div>
                  <div className="amount-cell">
                    <div className="amount-label">Balance</div>
                    <div className="amount-value red">{fmt(e.balance)}</div>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (Number(e.amountPaid)/Number(e.totalDebt))*100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button id="ledger-fab" className="fab" onClick={() => setShowAdd(true)} aria-label="New debt entry">+</button>

      {showAdd && <AddDebtModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {selected && <PayModal entry={selected} onClose={() => setSelected(null)} onSaved={load} />}

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
