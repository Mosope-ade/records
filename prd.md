# 📄 PRD: ShopSync PWA (Internal Records & Inventory)

## 1. Project Overview
**Goal:** A mobile-first Progressive Web App to replace paper ledgers with a real-time, multi-user system for tracking customer debt and shop inventory shortages.

## 2. Technical Stack
* **Framework:** Next.js (App Router)
* **Database:** NeonDB (PostgreSQL)
* **ORM:** Prisma
* **Authentication:** Neon Auth
* **Notifications:** Web Push API & Service Workers
* **Deployment:** Vercel (for seamless Next.js PWA support)

---

## 3. Detailed Feature Requirements

### **A. User Management & Roles**
* **Multi-staff Access:** Secure login via Neon Auth.
* **Role-Based Access Control (RBAC):**
    * **Admin:** Full CRUD (Create, Read, Update, Delete) on all records. View total aggregate debt.
    * **Staff:** Can create debt entries, search records, and update payments. **Cannot delete or edit** historical entries once saved (prevents record tampering).
    * the staff that creates or updates an entry will also be recorded as part of the entry for audit trail

### **B. Debt Ledger Module (Core)**
* **Entry Schema:** `Customer Name`, `Total Debt Amount`, `Amount Paid`, `Balance` (auto-calculated), `Date/Time` (auto-stamped).
* **Real-time Updates:** When a customer pays a portion of an existing debt, the staff selects the specific entry and updates the `Amount Paid`. The system must maintain an `UpdatedAt` timestamp.
* **Search & Filters:**
    * **Name Search:** Fuzzy search for names (e.g., typing "Iya" brings up "Iya Shola").
    * **Date Filter:** A date-picker to view all transactions recorded on a specific calendar day.

### **C. Inventory Replenishment Module**
* **Shortage Tracker:** A simple list view of items needed.
* **Fields:** `Item Name`, `Status` (Dropdown: "Low Stock" or "Out of Stock"), `Timestamp`.
* **Logic:** Once an item is replenished, it can be marked as "Restocked" (which removes it from the active list or moves it to an archive).

### **D. Push Notification System**
* **Triggers:** 1.  **New Debt:** Notify Admin immediately when a Staff member saves a new debt entry.
    2.  **Inventory Alert:** Notify Admin when an item status is set to "Out of Stock."
* **Technology:** Implementation of Service Workers to handle background push events even when the browser is closed.

---

## 4. UI/UX Requirements (Mobile-First)
* **PWA Manifest:** Must be installable on Android/iOS with a custom icon.
* **Bottom Navigation:** Simple tabs for **[Ledger]**, **[Inventory]**, and **[Profile]**.
* **Quick Action Button (FAB):** A floating "+" button on the Ledger screen for rapid data entry during busy shop hours.
* **Offline Support:** Basic caching via Service Workers so the list remains viewable if the shop internet flickers.
```