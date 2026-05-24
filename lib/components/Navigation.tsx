"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { signOut } from "./action";

const BASE_NAV_ITEMS = [
  { href: "/ledger", label: "Ledger", icon: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
  )},
  { href: "/inventory", label: "Inventory", icon: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
  )},
  { href: "/products", label: "Prices", icon: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h6M9 13h6"/></svg>
  )},
  { href: "/profile", label: "Profile", icon: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  )},
];

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/me")
        .then(r => r.ok ? r.json() : null)
        .then(setUser)
        .catch(console.error);
    } else {
      setUser(null);
    }
  }, [session]);

  const userRole = user?.role || (session?.user as any)?.role || (session?.user as any)?.metadata?.role;
  const isAdmin = userRole === "admin";

  const navItems = [...BASE_NAV_ITEMS];
  if (isAdmin) {
    // Insert "Users" tab before Profile
    navItems.splice(3, 0, {
      href: "/admin/users",
      label: "Users",
      icon: (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
        </svg>
      )
    });
  }

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div className="sidebar-logo">
          <div style={{ 
            width: 36, height: 36, background: 'white', color: 'var(--primary)', 
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900
          }}>SS</div>
          ShopSync
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`sidebar-item ${pathname.startsWith(item.href) ? "active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
          <span onClick={signOut} className="sidebar-item" style={{ color: '#FC8181' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/>
            </svg>
            Sign Out
          </span>
        </div>
      </aside>
    </>
  );
}
