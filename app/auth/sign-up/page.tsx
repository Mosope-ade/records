"use client";

import { useActionState } from "react";
import { signUpWithEmail } from "./actions";
import Link from "next/link";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="auth-logo">SS</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Join ShopSync</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Create a staff account to start tracking records</p>
        </div>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label className="ledger-amount-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              placeholder="e.g. John Staff"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="ledger-amount-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="name@company.com"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="ledger-amount-label" htmlFor="password">Create Password</label>
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
            {isPending ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account?{" "}
          <Link href="/auth/sign-in" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
