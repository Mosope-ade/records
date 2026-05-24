"use client";

import { useActionState } from "react";
import { signInWithEmail } from "./actions";
import Link from "next/link";

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="auth-logo">SS</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>ShopSync</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Enter your credentials to access the shop ledger</p>
        </div>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="ledger-amount-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="staff@shopsync.com"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="ledger-amount-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              disabled={isPending}
            />
          </div>

          {state?.error && (
            <div style={{ 
              padding: '0.75rem', background: '#FFF5F5', color: 'var(--danger)', 
              borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #FED7D7'
            }}>
              {state.error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isPending}>
            {isPending ? "Signing in..." : "Sign In to Dashboard"}
          </button>
        </form>

      </div>
    </div>
  );
}
