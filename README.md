# Analogue Pro

> Enterprise HR & Organization Management Platform

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![i18n](https://img.shields.io/badge/i18n-TH%20%2F%20EN-orange)

---

## Overview

Analogue Pro คือ Enterprise HR Platform ที่ออกแบบจาก Organization Structure จริง ไม่ใช่แค่ CRUD HR App ทั่วไป รองรับหลายบริษัท หลายสาขา หลาย Role และ Permission แบบ Granular RBAC

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| State | Zustand |
| i18n | react-i18next (TH / EN) |
| Deploy | Vercel |

---

## Project Structure

```
analogue-pro/
├── src/
│   ├── core/
│   │   ├── rbac/
│   │   │   └── PermissionGate.jsx     # RBAC component + hook
│   │   └── store/
│   │       └── authStore.js           # Zustand auth store
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.jsx           # Sidebar + Topbar + Mobile nav
│   │   └── ui/
│   │       └── index.jsx              # Shared UI components
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── PinPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── CompanyPage.jsx
│   │   ├── BranchesPage.jsx
│   │   ├── DepartmentsPage.jsx
│   │   ├── PositionsPage.jsx
│   │   └── RolesPage.jsx
│   ├── services/
│   │   └── supabase.js
│   ├── locales/
│   │   └── i18n.js                    # TH / EN translations
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env
├── vite.config.js
└── package.json
```

---

## Database Schema

```
companies
    └── branches          (company_id → companies)
    └── departments       (company_id, branch_id, parent_id → self)
    └── positions         (company_id, department_id)
    └── roles             (company_id)
          └── role_permissions  (role_id → permissions)
    └── employees         (company_id, branch_id, department_id, position_id, role_id, manager_id)
          └── employee_transfers
    └── activity_logs

permissions               (global — code, module, action)
```

---

## RBAC System

### Role Levels
| Level | Role |
|-------|------|
| 100 | Super Admin |
| 80 | Company Admin |
| 60 | HR Manager |
| 50 | Finance / HR Staff |
| 40 | Manager |
| 20 | Supervisor |
| 10 | Employee |

### Permission Format
```
{module}.{action}

employee.view_self       # ดูข้อมูลตัวเอง
employee.view_team       # ดูทีมตัวเอง
employee.view_all        # ดูพนักงานทั้งหมด
employee.create          # เพิ่มพนักงาน
leave.approve_team       # อนุมัติลาทีม
payroll.manage           # จัดการเงินเดือน
org.manage_branch        # จัดการสาขา
```

### Usage in Code
```jsx
// Component
<PermissionGate perm="employee.view_all">
  <AdminPanel />
</PermissionGate>

// Hook
const { can, canAny, isLevel } = usePermission()
if (can('leave.approve_team')) { ... }
if (isLevel(40)) { ... }  // Manager+

// Store
const { can } = useAuthStore()
```

---

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/your-username/analogue-pro.git
cd analogue-pro
npm install
```

### 2. Environment Variables
สร้างไฟล์ `.env` ที่ root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> ⚠️ ใช้ **anon public** key เท่านั้น ห้ามใช้ service_role key ใน frontend

### 3. Database Setup
รัน SQL ใน Supabase SQL Editor ตามลำดับ:

```
sql/
├── 01_schema.sql      # Tables + RLS + Functions
├── 02_seed.sql        # Permissions seed data
└── 03_first_admin.sql # First company + admin user
```

### 4. Run
```bash
npm run dev
```

---

## First Admin Setup

หลัง setup database แล้ว:

1. ไปที่ **Supabase → Authentication → Users → Add User**
2. กรอก email + password + Auto Confirm
3. Copy User ID ที่ได้
4. รัน SQL:

```sql
insert into employees (
  user_id, company_id, branch_id, department_id,
  position_id, role_id, employee_code,
  first_name, last_name, email, status
)
values (
  'your-user-id-here',
  'your-company-id',
  'your-branch-id',
  'your-dept-id',
  'your-position-id',
  'your-role-id',
  'EMP-0001',
  'Admin', 'User',
  'admin@company.com',
  'active'
);
```

---

## Roadmap

### ✅ Week 1 — Foundation (Done)
- [x] Database Schema + RLS
- [x] Auth + PIN Authentication
- [x] RBAC (PermissionGate + usePermission)
- [x] UI Shell (Sidebar + Topbar + Mobile)
- [x] i18n TH/EN
- [x] Dashboard

### ✅ Week 2 — Organization (Done)
- [x] Company Management
- [x] Branch Management
- [x] Department (with sub-department)
- [x] Position Management
- [x] Role & Permission Management

### 🔄 Week 3 — HR Operations (In Progress)
- [ ] Employee Management (List, Add, Edit, Profile)
- [ ] Attendance (Check-in/out + GPS)
- [ ] Leave Management + Approval Workflow
- [ ] OT Management + Approval Workflow
- [ ] Payroll + Payslip

### 📋 Week 4 — Polish
- [ ] Reports + Analytics
- [ ] Notifications
- [ ] Mobile Responsive (full)
- [ ] Activity Logs
- [ ] Export PDF / Excel

---

## UI Components

```jsx
import {
  Button, Card, Modal, Drawer,
  Field, Input, Textarea, Select, Toggle,
  Badge, StatusBadge, EmptyState, Skeleton,
  Table, PageHeader, SearchInput,
  ConfirmDialog, useToast
} from '@/components/ui'
```

---

## Key Decisions

| Decision | Reason |
|----------|--------|
| Organization-first architecture | Foundation ที่แข็งแรงก่อน feature |
| Zustand over Context | Simple, no boilerplate, TypeScript-friendly |
| RLS disabled in dev | Enable ทีหลังเมื่อ schema เสถียร |
| PIN auth | UX สำหรับ mobile ใช้งานบ่อย |
| Granular permissions | Enterprise-ready RBAC จริง |

---

## License

MIT © 2025 Analogue Pro
