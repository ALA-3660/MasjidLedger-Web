# MasjidLedger REST API Specification (v1)

This document provides the complete technical API reference for connecting web and native Android (Kotlin + Jetpack Compose) applications to the MasjidLedger backend.

---

## 1. Base URL Configuration

| Environment | Base HTTP URL | Base WebSocket URL |
| :--- | :--- | :--- |
| **Development (Web / Container)** | `http://localhost:3000/api/v1` | `ws://localhost:3000/ws` |
| **Android Emulator (Localhost)** | `http://10.0.2.2:3000/api/v1` | `ws://10.0.2.2:3000/ws` |
| **Android Physical Device (LAN)** | `http://<YOUR_LOCAL_IP>:3000/api/v1` | `ws://<YOUR_LOCAL_IP>:3000/ws` |
| **Production / Cloud Run** | `https://<APP_DOMAIN>/api/v1` | `wss://<APP_DOMAIN>/ws` |

---

## 2. Common Headers & Authentication

All private API requests require standard authentication headers:

```http
Content-Type: application/json
Authorization: Bearer <TOKEN>
x-mosque-id: <MOSQUE_ID>
x-user-id: <USER_ID>
Idempotency-Key: <UUID_V4>  # Required for financial write operations
```

### Standard Response Envelope

All API endpoints return standard JSON responses:

```json
{
  "success": true,
  "data": { ... },
  "message": "সফল হয়েছে।",
  "error": {
    "code": "ERROR_CODE",
    "message": "ত্রুটির বিবরণ",
    "fields": { "amount": "টাকার পরিমাণ আবশ্যক।" }
  }
}
```

---

## 3. API Endpoints Inventory

### 3.1 Authentication & Profile (`/auth`)

#### `POST /auth/login`
User login with phone or email and password.
- **Request Body**:
  ```json
  {
    "phoneOrEmail": "01711000001",
    "password": "password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "token": "ml-jwt-usr-admin-1-1724500000-abcd1234",
      "refreshToken": "ml-refresh-usr-admin-1-1724500000-efgh5678",
      "expiresIn": 604800,
      "user": {
        "id": "usr-admin-1",
        "name": "মুহাম্মদ রফিকুল ইসলাম",
        "phone": "01711000001",
        "email": "admin@mamunmasjid.org",
        "role": "MOSQUE_ADMIN",
        "permissions": ["VIEW_DASHBOARD", "CREATE_INCOME", "CREATE_EXPENSE", "APPROVE_INCOME", "APPROVE_EXPENSE", "VIEW_REPORT", "MANAGE_COMMITTEE", "MANAGE_ACCOUNTS", "MANAGE_STAFF", "MANAGE_ASSETS", "MANAGE_PROPERTY", "MANAGE_CEMETERY", "MANAGE_SETTINGS"],
        "mosqueId": "mosque-mamun-001",
        "status": "ACTIVE"
      },
      "mosque": {
        "id": "mosque-mamun-001",
        "code": "MAMUN-WAQF-01",
        "nameBn": "মামুন জামে মসজিদ ওয়াকফ এস্টেট"
      }
    }
  }
  ```

#### `POST /auth/refresh`
Refresh expired access tokens.
- **Request Body**: `{ "refreshToken": "ml-refresh-usr-admin-1-..." }`

#### `GET /auth/me`
Get current user profile, active permissions, and mosque context.

#### `PUT /auth/profile`
Update user name, phone, address, and avatar image.

---

### 3.2 Mosque & Public Portal (`/mosques`)

#### `GET /mosques/current`
Get details of current mosque tenant.

#### `PUT /mosques/current`
Update mosque profile, Waqf registry number, address, and QR codes.

#### `GET /mosques/public/:code` (Public - No Auth Required)
Retrieve public portal transparency dashboard and active public notices.

---

### 3.3 Dashboard (`/dashboard`)

#### `GET /dashboard/stats`
Get aggregated financial analytics:
```json
{
  "success": true,
  "data": {
    "currentBalance": 756950,
    "totalIncome": 850000,
    "totalExpense": 93050,
    "netBalance": 756950,
    "todayIncome": 32500,
    "todayExpense": 0,
    "monthlyIncome": 325000,
    "monthlyExpense": 48500,
    "yearlyIncome": 1250000,
    "yearlyExpense": 493050,
    "totalDonation": 285000,
    "cashBalance": 128450,
    "bankBalance": 628500,
    "pendingApprovalsCount": 0,
    "recentTransactions": [...],
    "monthlyTrend": [...],
    "incomeCategories": [...],
    "expenseCategories": [...]
  }
}
```

---

### 3.4 Accounting, Accounts & Heads (`/accounting`)

#### `GET /accounting/accounts`
List all cash, bank, and MFS accounts for current mosque.

#### `POST /accounting/accounts`
Create a new bank account or cash fund.
- **Request Body**:
  ```json
  {
    "nameBn": "সোনালী ব্যাংক চলতি হিসাব",
    "accountType": "BANK",
    "bankName": "Sonali Bank PLC",
    "branchName": "Mirpur Branch",
    "accountNumber": "010203040506",
    "openingBalance": 50000
  }
  ```

#### `POST /accounting/accounts/transfer` (Transaction Safe)
Transfer funds between accounts (e.g. Cash -> Bank Deposit).
- **Request Body**:
  ```json
  {
    "fromAccountId": "acc-cash-01",
    "toAccountId": "acc-bank-01",
    "amount": 25000,
    "date": "2026-08-24",
    "description": "শুক্রবারের জুমার ক্যাশ কালেকশন ব্যাংকে জমা",
    "reference": "Slip #99182"
  }
  ```

#### `GET /accounting/account-heads`
List Chart of Accounts (Income & Expense heads with hierarchy).

#### `POST /accounting/account-heads`
Create new account head or subhead.

---

### 3.5 Income Management (`/accounting/income`)

#### `GET /accounting/income`
List income vouchers with filtering by date, head, or status.

#### `POST /accounting/income` (Supports `Idempotency-Key`)
Create a new income voucher and atomically credit account balance.
- **Request Body**:
  ```json
  {
    "mainHeadId": "head-inc-01",
    "subHeadId": "head-inc-01-1",
    "amount": 32500,
    "paymentMethod": "CASH",
    "accountId": "acc-cash-01",
    "donorName": "জুমার সাধারণ মুসল্লিবৃন্দ",
    "date": "2026-08-24",
    "description": "জুমার নামাজে রুমাল কালেকশন"
  }
  ```

#### `POST /accounting/income/:id/reverse`
Cancel/reverse an income entry with audit trail and balance debit.

---

### 3.6 Expense Management (`/accounting/expense`)

#### `GET /accounting/expense`
List expense vouchers.

#### `POST /accounting/expense` (Supports `Idempotency-Key`)
Create a new expense voucher and atomically debit account balance.
- **Request Body**:
  ```json
  {
    "mainHeadId": "head-exp-02",
    "subHeadId": "head-exp-02-1",
    "amount": 14250,
    "paymentMethod": "BANK",
    "accountId": "acc-bank-01",
    "payeeName": "ঢাকা পাওয়ার ডিস্ট্রিবিউশন কোম্পানি (DPDC)",
    "date": "2026-08-24",
    "description": "আগস্ট মাসের মসজিদ ও এসি বিদ্যুৎ বিল"
  }
  ```

#### `POST /accounting/expense/:id/reverse`
Cancel/reverse an expense entry with audit trail and balance credit.

---

### 3.7 Donations & Donation Boxes (`/donations`, `/donation-boxes`)

#### `GET /donations`
List all donation receipts.

#### `POST /donations` (Supports `Idempotency-Key`)
Record a formal donation, generate printable receipt number `REC-2026-XXXXXX`, and auto-create double-entry income voucher.

#### `GET /donation-boxes`
List all donation boxes and collection history.

#### `POST /donation-boxes`
Add a new fixed or mobile donation box.

#### `POST /donation-boxes/collect`
Record unsealing, counting, and depositing donation box contents with witness signatures.

---

### 3.8 Committee & Meetings (`/committee`)

#### `GET /committee`
Retrieve terms, active members with designations, and meeting minutes.

#### `POST /committee/terms`
Create committee tenure term (e.g. 2025–2027).

#### `POST /committee/members`
Add committee executive member with NID, phone, and role.

#### `PUT /committee/members/:id`
Update member designation or status.

#### `DELETE /committee/members/:id`
Remove member from term.

#### `POST /committee/meetings`
Document committee meeting agenda, attendees, and approved resolutions.

---

### 3.9 Staff & Payroll (`/staff`)

#### `GET /staff`
List mosque employees (Imam, Muezzin, Khadem, Accountant, Security).

#### `POST /staff`
Add new staff record with monthly salary and NID.

#### `PUT /staff/:id`
Update staff designation, status, or basic salary.

#### `DELETE /staff/:id`
Remove staff member.

#### `POST /staff/pay`
Disburse monthly salary/honorarium, auto-generate expense voucher, and update account balance.

#### `GET /staff/payments`
List historical salary disbursement slips.

---

### 3.10 Assets & Properties (`/assets`, `/properties`)

#### `GET /assets` / `POST /assets` / `PUT /assets/:id` / `DELETE /assets/:id`
Manage mosque physical equipment (AC, Sound Systems, Inverters, Generators, Carpets).

#### `GET /properties` / `POST /properties` / `PUT /properties/:id`
Manage Waqf properties, rental shops, ponds, agricultural land, and rental income tracking.

---

### 3.11 Cemetery (`/cemetery`)

#### `GET /cemetery` / `POST /cemetery` / `PUT /cemetery/:id`
Record grave plot allocations, deceased details, dates of burial, and next-of-kin contacts.

---

### 3.12 Notices & Notifications (`/notices`, `/notifications`)

#### `GET /notices` / `POST /notices` / `PUT /notices/:id`
Publish general notices, Jummah announcements, and public notices.

#### `GET /notifications` / `POST /notifications/mark-all-read`
In-app notification center for users and administrators.

---

### 3.13 File Upload (`/upload`)

#### `POST /upload`
Upload voucher photos, receipt scans, member portraits, and logo files.
- **Request Body**:
  ```json
  {
    "fileName": "electricity_bill_august.jpg",
    "fileType": "image/jpeg",
    "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
  ```
- **Response**: `{ "success": true, "data": { "id": "file-123", "url": "data:image/jpeg;base64,..." } }`

---

### 3.14 Financial Reports (`/reports/:reportType`)

Supported `reportType` paths:
- `CASH_BOOK`: Detailed chronological cash journal.
- `INCOME_STATEMENT`: Category-wise income statement.
- `EXPENSE_STATEMENT`: Category-wise expense statement.
- `HEAD_WISE`: Sub-ledger breakdown by account head.
- `DONOR_LEDGER`: Individual donor giving history.

**Query Parameters**:
- `fromDate` (YYYY-MM-DD)
- `toDate` (YYYY-MM-DD)
- `headId`
- `accountId`

---

### 3.15 AI Financial Advisor & Audit (`/ai/advisor`, `/audit/logs`)

#### `POST /ai/advisor`
Server-side Gemini powered assistant that analyzes mosque finances and provides audits in Bengali.

#### `GET /audit/logs`
Immutable audit log tracking all logins, approvals, transfers, and cancellations with IP address.
