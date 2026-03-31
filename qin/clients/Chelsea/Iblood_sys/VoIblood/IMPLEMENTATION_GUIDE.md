# iBlood - Blood Bank Management Information System
## Implementation Guide

---

## 📋 Project Overview

**iBlood** is a modern, web-based Blood Bank Management Information System (BBMIS) designed to digitize and optimize blood donation, storage, and distribution processes within healthcare facilities.

### Key Objectives
- Automate donor registration and management
- Enable real-time tracking of blood inventory
- Minimize blood wastage through expiry monitoring
- Improve emergency response time
- Enhance communication between hospitals and blood banks
- Provide accurate reporting for decision-making

---

## 🏗️ Architecture

### 3-Tier Architecture
1. **Presentation Layer** - Next.js UI (Frontend)
2. **Application Layer** - Node.js + Express API (Backend)
3. **Data Layer** - Database (MongoDB/PostgreSQL)

### Tech Stack
- **Frontend**: Next.js 16 with React 19, TypeScript, Tailwind CSS
- **Authentication**: Custom JWT-based system (Ready for Supabase integration)
- **Database**: Ready for MongoDB, PostgreSQL, or Supabase
- **Deployment**: Vercel (Frontend)

---

## 🎯 Core Modules

### 1. **Donor Management** (`/app/dashboard/donors`)
Manages all donor-related data and activities.

**Features**:
- Donor registration and updates
- Storage of medical and donation history
- Eligibility tracking
- Blood group classification

**Key Fields**:
- `donorId` - Unique identifier
- `fullName` - Donor name
- `bloodGroup` - A, B, AB, O
- `rhFactor` - Positive or Negative
- `contactInfo` - Phone and email
- `lastDonationDate` - Tracking eligibility
- `eligibilityStatus` - Eligible/Ineligible

---

### 2. **Blood Inventory Management** (`/app/dashboard/inventory`)
Handles storage and tracking of blood units.

**Features**:
- Record blood collection
- Categorize by blood group and Rh factor
- Track real-time stock levels
- Location tracking

**Key Fields**:
- `unitId` - Unique unit identifier
- `bloodGroup` - Type classification
- `quantity` - Number of units
- `collectionDate` - When collected
- `expiryDate` - When it expires
- `status` - Available/Reserved/Expired

---

### 3. **Expiry Monitoring System** (`/app/dashboard/expiry`)
Ensures efficient utilization of blood resources.

**Features**:
- Automatic expiry detection
- Smart alerts for near-expiry units
- Waste reduction tracking
- Compliance reporting

**Alert Thresholds**:
- Expired: 0 days remaining
- Near Expiry: 1-3 days
- Watch List: 4-7 days

---

### 4. **Hospital Request Management** (`/app/dashboard/requests`)
Facilitates communication between hospitals and blood banks.

**Features**:
- Digital request submission
- Real-time availability verification
- Approval workflow
- Request status tracking

**Request Workflow**:
1. Hospital submits request
2. System verifies availability
3. Admin approves/rejects
4. Request fulfilled or cancelled

---

### 5. **Reporting & Analytics** (`/app/dashboard/reports`)
Provides comprehensive insights for decision-making.

**Report Types**:
- Inventory reports
- Donor activity analysis
- Usage trends
- Performance metrics
- Compliance reports

---

## 👥 User Roles & Permissions

### Admin
Full system access and control.

**Permissions**:
- Manage all users
- Manage donors (CRUD)
- Manage inventory
- Approve/reject requests
- View all reports
- System settings

### Blood Bank Staff
Operational blood bank management.

**Permissions**:
- Create and manage donors
- Record blood collection
- Update inventory
- Process requests
- View reports

### Hospital User
Limited access for blood requests.

**Permissions**:
- Submit blood requests
- View own request status
- View blood availability

---

## 🔐 Authentication & Security

### Current Implementation
- Custom JWT-based authentication with role-based access control (RBAC)
- Secure session management with token validation
- Password hashing (ready for bcrypt integration)

### Future Enhancement
- Supabase Auth integration
- Two-factor authentication (2FA)
- OAuth providers (Google, Microsoft)
- Audit logging

### How to Use Authentication

```typescript
// Login example
import { useAuth } from '@/components/auth/auth-provider'

export function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth()
  
  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.fullName}</p>
          <button onClick={logout}>Sign Out</button>
        </>
      ) : (
        <p>Not authenticated</p>
      )}
    </div>
  )
}
```

### Check Permissions

```typescript
import { usePermission } from '@/hooks/use-permission'

export function AdminPanel() {
  const permission = usePermission()
  
  if (!permission.isAdmin()) {
    return <div>Access Denied</div>
  }
  
  return <div>Admin Controls</div>
}
```

---

## 📁 Project Structure

```
iblood/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   └── dashboard/
│       ├── page.tsx             # Dashboard home
│       ├── donors/page.tsx
│       ├── inventory/page.tsx
│       ├── expiry/page.tsx
│       ├── requests/page.tsx
│       ├── reports/page.tsx
│       ├── settings/page.tsx
│       └── layout.tsx
│
├── components/
│   ├── landing/
│   │   ├── header.tsx
│   │   ├── hero.tsx
│   │   ├── features.tsx
│   │   ├── how-it-works.tsx
│   │   ├── modules.tsx
│   │   ├── cta.tsx
│   │   └── footer.tsx
│   │
│   ├── auth/
│   │   ├── auth-card.tsx
│   │   ├── auth-provider.tsx
│   │   └── protected-route.tsx
│   │
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── top-nav.tsx
│   │   └── overview.tsx
│   │
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── field.tsx
│
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   └── use-permission.ts
│
├── lib/
│   ├── utils.ts
│   └── auth.ts
│
├── app/
│   ├── globals.css              # Design tokens
│   ├── layout.tsx
│   └── page.tsx
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## 🎨 Design System

### Color Palette
- **Primary**: Medical Red (`#C23030`) - Trust, Urgency
- **Secondary**: Ocean Blue (`#2563EB`) - Professional, Healthcare
- **Accent**: Teal (`#1D9B9B`) - Success, Healing
- **Neutrals**: Gray scale (background, text, borders)

### Typography
- **Headings**: Geist (Bold, 2xl-4xl)
- **Body**: Geist (Regular, 14px-16px)
- **Code**: Geist Mono

### Components
All components follow shadcn/ui patterns with custom theming.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- VS Code or equivalent editor

### Installation & Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd iblood

# 2. Install dependencies
pnpm install

# 3. Create environment variables
cp .env.example .env.local

# 4. Start development server
pnpm dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### Environment Variables (Future)
```env
# Database (when connecting to backend)
NEXT_PUBLIC_API_URL=http://localhost:3001
DATABASE_URL=your_database_url

# Authentication (when using Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# File Storage (when using Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

---

## 📊 Database Schema (Future Implementation)

### Users Collection/Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'hospital'),
  organizationId UUID,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Donors Collection/Table
```sql
CREATE TABLE donors (
  id UUID PRIMARY KEY,
  organizationId UUID,
  fullName VARCHAR(255),
  bloodGroup VARCHAR(3),
  rhFactor VARCHAR(1),
  contactInfo VARCHAR(20),
  lastDonationDate DATE,
  eligibilityStatus BOOLEAN,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Inventory Collection/Table
```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  organizationId UUID,
  bloodGroup VARCHAR(3),
  rhFactor VARCHAR(1),
  quantity INT,
  collectionDate DATE,
  expiryDate DATE,
  status ENUM('available', 'reserved', 'expired'),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Requests Collection/Table
```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY,
  hospitalId UUID,
  bloodGroup VARCHAR(3),
  quantity INT,
  status ENUM('pending', 'approved', 'fulfilled', 'rejected'),
  requestDate TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

---

## 🔄 API Endpoints (Future Implementation)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Donors
- `GET /api/donors` - List all donors
- `GET /api/donors/:id` - Get donor details
- `POST /api/donors` - Create donor
- `PUT /api/donors/:id` - Update donor
- `DELETE /api/donors/:id` - Delete donor

### Inventory
- `GET /api/inventory` - List blood units
- `GET /api/inventory/by-type` - Get by blood type
- `POST /api/inventory` - Record collection
- `PUT /api/inventory/:id` - Update unit status
- `GET /api/inventory/expiry-alerts` - Get expiry alerts

### Requests
- `GET /api/requests` - List requests
- `POST /api/requests` - Create request
- `PUT /api/requests/:id/approve` - Approve request
- `PUT /api/requests/:id/reject` - Reject request

### Reports
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/donors` - Donor report
- `GET /api/reports/usage` - Usage report

---

## 📝 Next Steps for Completion

### Phase 1: Backend Integration (Week 1-2)
- [ ] Set up Node.js + Express server
- [ ] Configure database (MongoDB or PostgreSQL)
- [ ] Implement authentication API
- [ ] Implement Donor API endpoints
- [ ] Implement Inventory API endpoints
- [ ] Implement Request API endpoints

### Phase 2: Frontend Integration (Week 2-3)
- [ ] Connect login/signup to backend
- [ ] Integrate Donor Management CRUD
- [ ] Integrate Inventory management
- [ ] Integrate Request processing
- [ ] Connect Dashboard to real data

### Phase 3: Advanced Features (Week 3-4)
- [ ] Implement real-time notifications (WebSockets)
- [ ] Add reporting/export functionality
- [ ] Implement Supabase Auth
- [ ] Add file upload (Cloudinary)
- [ ] Set up audit logging

### Phase 4: Testing & Deployment (Week 4-5)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Deploy to Vercel

---

## 🧪 Testing

```bash
# Run tests (when configured)
pnpm test

# Run E2E tests
pnpm test:e2e

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## 🔧 Development Commands

```bash
# Development server with HMR
pnpm dev

# Build optimized production bundle
pnpm build

# Analyze bundle size
pnpm analyze

# Format code with prettier
pnpm format

# Lint code with eslint
pnpm lint

# Type checking
pnpm type-check
```

---

## 📚 Key Libraries

- **Next.js 16**: React framework with server components
- **React 19**: Latest React with new features
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Accessible component library
- **Lucide Icons**: Beautiful icon library

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/module-name`
2. Make changes and test locally
3. Commit with descriptive messages
4. Push and create pull request
5. Code review and merge

---

## 📞 Support & Contact

For questions or issues:
- Documentation: See this file
- Issues: Create GitHub issue
- Email: support@iblood.com

---

## 📜 License

Proprietary - iBlood System

---

## 🗺️ Future Roadmap

### Q2 2024
- Mobile app (React Native)
- SMS/Email notifications
- Advanced analytics dashboards
- National system integration

### Q3 2024
- AI-powered demand prediction
- Automated inventory optimization
- Multi-language support
- Regional federation

### Q4 2024
- Blockchain for supply chain
- Integration with health systems
- Advanced compliance reporting
- Machine learning insights

---

**Last Updated**: March 21, 2024
**Version**: 1.0.0 (Foundation Release)
