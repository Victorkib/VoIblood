# Blood Bank Information System (BBMIS)

## Technical Specification & Architecture (MERN + Supabase)

---

# 1. Overview

This document defines the technical architecture and implementation plan for a **Web-Based Blood Bank Management Information System (BBMIS)**.

The system aims to automate and optimize:

- Donor management
- Blood inventory tracking
- Expiry monitoring
- Hospital request processing
- Reporting and analytics

---

# 2. Tech Stack (Updated)

## Frontend

- Next.js (React Framework)
- Tailwind CSS / SCSS
- Axios / Fetch API

## Backend

- Node.js
- Express.js (API layer)

## Authentication

- Supabase Auth
  - Email/Password
  - JWT-based session handling
  - Role-based access control

## Database Options

- MongoDB (Recommended for flexibility)
  OR
- MySQL (Recommended for structured relational data)

## Media Storage

- Cloudinary
  - Profile images
  - Document uploads (if needed)

## Deployment

- Frontend: Vercel
- Backend: Render / Railway
- Database: MongoDB Atlas / Supabase DB / PlanetScale

---

# 3. System Architecture

## 3-Tier Architecture

### 1. Presentation Layer (Frontend)

- Next.js UI
- Dashboards
- Forms
- Role-based views

### 2. Application Layer (Backend)

- REST API (Node + Express)
- Business logic
- Validation

### 3. Data Layer

- Database (MongoDB/MySQL)
- Supabase Auth (User management)

---

# 4. Core Modules

## 4.1 Donor Management Module

### Features

- Register donor
- Update donor details
- Track donation history
- Eligibility validation

### Fields

- donorId
- fullName
- bloodGroup
- rhFactor
- contactInfo
- lastDonationDate
- eligibilityStatus

---

## 4.2 Blood Inventory Module

### Features

- Record blood collection
- Categorize blood units
- Track stock levels

### Fields

- unitId
- bloodGroup
- rhFactor
- quantity
- collectionDate
- expiryDate
- status (available, used, expired)

---

## 4.3 Expiry Monitoring Module

### Features

- Auto-detect near-expiry units
- Trigger alerts
- Prevent wastage

### Logic

- Daily cron job checks expiry dates
- Flag units within threshold (e.g., 3 days)

---

## 4.4 Hospital Request Module

### Features

- Submit blood requests
- Approve/reject requests
- Track status

### Fields

- requestId
- hospitalId
- bloodType
- quantity
- status (pending, approved, rejected)
- requestDate

---

## 4.5 Reporting Module

### Features

- Inventory reports
- Donor activity reports
- Usage trends

---

# 5. User Roles

## Admin

- Full system access
- Manage users
- Approve requests

## Blood Bank Staff

- Manage donors
- Update inventory

## Hospital User

- Request blood
- Track requests

---

# 6. Authentication Flow (Supabase)

1. User signs up/login via Supabase
2. Supabase returns JWT
3. Frontend stores session
4. Backend verifies token
5. Role-based access enforced

---

# 7. API Structure (Node + Express)

## Auth (Handled by Supabase)

## Donor Routes

- POST /donors
- GET /donors
- GET /donors/:id
- PUT /donors/:id

## Inventory Routes

- POST /inventory
- GET /inventory
- PUT /inventory/:id

## Request Routes

- POST /requests
- GET /requests
- PUT /requests/:id

## Reports

- GET /reports/inventory
- GET /reports/donors

---

# 8. Database Design

## Option A: MongoDB (Recommended)

### Collections

- users
- donors
- inventory
- requests

## Option B: MySQL

### Tables

- users
- donors
- blood_units
- requests

---

# 9. Key System Features

- Real-time inventory updates
- Expiry alerts
- Role-based dashboards
- Secure authentication
- Centralized data access

---

# 10. Non-Functional Requirements

- Security (JWT, RBAC)
- Performance (fast queries)
- Reliability (uptime)
- Scalability (modular design)

---

# 11. Deployment Strategy

## Frontend

- Deploy on Vercel

## Backend

- Deploy on Render/Railway

## Database

- MongoDB Atlas or Managed SQL

## Media

- Cloudinary CDN

---

# 12. Future Enhancements

- SMS/Email notifications
- AI demand prediction
- National system integration

---

# 13. Summary

This system is a **modern, scalable, and secure healthcare information system** designed to replace manual blood bank operations with a fully digital, real-time platform.

The MERN-based architecture combined with Supabase authentication ensures:

- Fast development
- High scalability
- Strong security

---

**End of Document**
