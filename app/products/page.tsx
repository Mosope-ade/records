"use client";

import { useEffect, useState, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { fmt } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  priceUnit: string;
  unitName: string;
  priceBulk: string;
  bulkName: string;
  createdAt: string;
}

// ─── Add/Edit Product Modal ──────────────────────────────────────────────────
function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [priceUnit, setPriceUnit] = useState(product?.priceUnit ?? "");
  const [unitName, setUnitName] = useState(product?.unitName ?? "pcs");
  const [priceBulk, setPriceBulk] = useState(product?.priceBulk ?? "");
  const [bulkName, setBulkName] = useState(product?.bulkName ?? "carton");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !priceUnit || !priceBulk) return;

    setLoading(true);
    setError(null);
    const url = product ? `/api/products/${product.id}` : "/api/products";
    const method = product ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          priceUnit: parseFloat(priceUnit as string),
          unitName: unitName.trim(),
          priceBulk: parseFloat(priceBulk as string),
          bulkName: bulkName.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save product");
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
        <h2>{product ? "Edit Product Details" : "Add New Product"}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          Set name, unit price, and bulk prices
        </p>

        {error && (
          <div style={{ padding: "0.75rem", background: "#FFF5F5", color: "var(--danger)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, border: "1px solid #FED7D7", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
          <div>
            <label className="ledger-amount-label">Product Name</label>
            <input className="form-input" placeholder="e.g. Indomie Onion Chicken" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 2 }}>
              <label className="ledger-amount-label">Unit Price (₦)</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="100.00" value={priceUnit} onChange={e => setPriceUnit(e.target.value)} required disabled={loading} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="ledger-amount-label">Unit Label</label>
              <input className="form-input" placeholder="e.g. pcs, bottle" value={unitName} onChange={e => setUnitName(e.target.value)} required disabled={loading} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 2 }}>
              <label className="ledger-amount-label">Bulk Price (₦)</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="2400.00" value={priceBulk} onChange={e => setPriceBulk(e.target.value)} required disabled={loading} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="ledger-amount-label">Bulk Label</label>
              <input className="form-input" placeholder="e.g. carton, pack" value={bulkName} onChange={e => setBulkName(e.target.value)} required disabled={loading} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} type="submit" disabled={loading}>
              {loading ? "Saving…" : product ? "Update Price" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Products Page ──────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data: session } = authClient.useSession();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/me")
        .then(r => r.ok ? r.json() : null)
        .then(setCurrentUser)
        .catch(console.error);
    } else {
      setCurrentUser(null);
    }
  }, [session]);

  const userRole = currentUser?.role || (session?.user as any)?.role || (session?.user as any)?.metadata?.role;
  const isAdmin = userRole === "admin";
  const canEditProducts = isAdmin || userRole === "price_manager";
  const suggestRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update autocomplete suggestions based on database items matching input
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const q = search.trim().toLowerCase();
    const matches = products
      .filter(p => p.name.toLowerCase().includes(q))
      .map(p => p.name)
      .slice(0, 5);
    setSuggestions(matches);
  }, [search, products]);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification(`🗑️ ${name} deleted successfully!`);
      load();
    } else {
      showNotification("❌ Failed to delete product");
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <main className="page">
        <header className="page-header" style={{ marginBottom: "1.5rem" }}>
          <div>
            <h1>Products & Prices</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Search items and update current store prices
            </p>
          </div>
        </header>

        {/* Mobile Search input with Suggestion autocompletion */}
        <div style={{ position: "relative", marginBottom: "1.5rem" }} ref={suggestRef}>
          <div style={{ position: "relative" }}>
            <input
              id="product-search"
              className="form-input"
              placeholder="Search items..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggest(true);
              }}
              onFocus={() => setShowSuggest(true)}
              style={{ paddingLeft: "2.5rem" }}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", width: "1.2rem", color: "var(--text-muted)" }}>
              <circle cx={11} cy={11} r={8} />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          {/* Autocomplete Dropdown list matching database values */}
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
                  🔍 {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3].map(i => <div key={i} className="card" style={{ height: "100px", opacity: 0.5 }}>Loading...</div>)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "white", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏷️</div>
            <h3>No products found</h3>
            <p style={{ color: "var(--text-muted)" }}>Tap the `+` button to add products and set prices.</p>
          </div>
        ) : (
          /* Mobile-first Price catalog grid list */
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filtered.map((p) => (
              <div key={p.id} className="card" style={{
                display: "flex", flexDirection: "column", gap: "1rem",
                padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--primary)" }}>{p.name}</h3>
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem",
                  padding: "0.75rem 1rem", background: "var(--primary-soft)",
                  borderRadius: "8px", border: "none"
                }}>
                  <div>
                    <span className="ledger-amount-label">Unit Price</span>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                      {fmt(p.priceUnit)} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {p.unitName || "pcs"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="ledger-amount-label">Bulk Price</span>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                      {fmt(p.priceBulk)} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {p.bulkName || "carton"}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  {canEditProducts && (
                    <button className="btn btn-ghost" style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }} onClick={() => {
                      setSelectedProduct(p);
                      setModalOpen(true);
                    }}>
                      ✏️ Edit Price
                    </button>
                  )}
                  {isAdmin && (
                    <button className="btn btn-ghost" style={{ padding: "0.45rem 1rem", fontSize: "0.8rem", color: "var(--danger)", borderColor: "rgba(197, 48, 48, 0.2)" }} onClick={() => handleDelete(p.id, p.name)}>
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {canEditProducts && (
        <button className="fab" onClick={() => {
          setSelectedProduct(null);
          setModalOpen(true);
        }} aria-label="Add new product">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{ width: 28, height: 28 }}><path d="M12 5v14M5 12h14" /></svg>
        </button>
      )}

      {modalOpen && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setModalOpen(false);
            setSelectedProduct(null);
          }}
          onSaved={() => {
            load();
            showNotification(selectedProduct ? "⚡ Product updated successfully!" : "🏷️ Product added successfully!");
          }}
        />
      )}

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </>
  );
}
