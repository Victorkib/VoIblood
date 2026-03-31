# iBlood - Blood Bank Management Information System

A modern, web-based Blood Bank Management Information System (BBMIS) designed to digitize and optimize blood donation, storage, and distribution processes within healthcare facilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### Environment Setup

1. **Copy environment file:**
```bash
cp .env.local.example .env.local
```

2. **Configure Supabase:**
   - Create account at [supabase.com](https://supabase.com)
   - Create a new project
   - Go to Settings → API
   - Copy `Project URL` and `anon public` key to `.env.local`

3. **Configure MongoDB:**
   - Create account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get connection string
   - Add to `DATABASE_URL` in `.env.local`

4. **Configure OAuth Providers (Optional):**
   - In Supabase Dashboard → Authentication → Providers
   - Enable Google, Discord, and/or GitHub
   - Follow provider-specific setup instructions

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# Navigate to http://localhost:3000
```

## 📖 Documentation

Comprehensive implementation guide available in [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md)

### Key Sections:
- Project Overview & Architecture
- Core Modules (6 main features)
- User Roles & Permissions
- Authentication & Security
- Project Structure
- Design System
- Database Schema (planned)
- API Endpoints (planned)
- Development Commands
- Next Steps for Completion

## 🎯 Features

### ✅ Implemented
- **Landing Page** - Marketing & product overview
- **Authentication System** - Login/Signup with role-based access
- **Dashboard** - Overview with key metrics
- **Donor Management** - Create, view, manage donors
- **Blood Inventory** - Real-time tracking of blood units
- **Expiry Monitoring** - Smart alerts for near-expiry units
- **Hospital Requests** - Request submission & approval workflow
- **Reporting** - Analytics and report generation
- **Settings** - Account, notification, team & security settings
- **Design System** - Healthcare-focused color palette & components

### 🔄 In Progress
- Backend API integration
- Real data persistence
- Advanced authentication (Supabase, OAuth)

### 📋 Planned
- Real-time notifications (WebSockets)
- Mobile app (React Native)
- AI-powered demand prediction
- National system integration
- Advanced compliance reporting

## 🏗️ Architecture

```
Frontend (Next.js 16) → API Layer → Database
      ↓
  Vercel Deployment
```

### Tech Stack
- **Frontend**: Next.js 16, React 19, JavaScript, Tailwind CSS
- **UI Components**: shadcn/ui, Lucide Icons
- **Authentication**: Custom JWT + Supabase ready
- **Database**: Ready for MongoDB, PostgreSQL, or Supabase
- **Deployment**: Vercel

## 👥 User Roles

1. **Admin** - Full system access, user management
2. **Blood Bank Staff** - Operational management
3. **Hospital User** - Blood request submission

## 🔐 Security

- Role-based access control (RBAC)
- Permission-based authorization
- Secure session management
- Password hashing ready
- Ready for 2FA and OAuth integration

## 📁 Project Structure

```
app/
├── page.tsx                 # Landing page
├── auth/                    # Authentication pages
│   ├── login/
│   ├── signup/
│   └── layout.tsx
└── dashboard/               # Main application
    ├── page.tsx            # Overview
    ├── donors/
    ├── inventory/
    ├── expiry/
    ├── requests/
    ├── reports/
    ├── settings/
    └── layout.tsx

components/
├── landing/                 # Landing page sections
├── auth/                    # Auth components
├── dashboard/               # Dashboard components
└── ui/                      # Reusable UI components

lib/
├── auth.ts                  # Auth utilities & RBAC
└── utils.ts                 # Helper functions

hooks/
├── use-permission.ts        # Permission hook
└── use-mobile.tsx           # Responsive hook
```

## 🎨 Design System

### Colors
- **Primary**: Medical Red (#C23030)
- **Secondary**: Ocean Blue (#2563EB)
- **Accent**: Teal (#1D9B9B)
- **Background**: Clean white/dark variants

### Typography
- **Headings**: Geist Bold
- **Body**: Geist Regular
- **Code**: Geist Mono

## 🧪 Available Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript check
```

## 📚 Key Components

### Authentication
- `AuthProvider` - Context for auth state
- `useAuth()` - Hook to access auth context
- `ProtectedRoute` - Component for route protection
- `usePermission()` - Hook for permission checks

### Dashboard
- `Sidebar` - Navigation menu
- `TopNav` - Header with search
- `DashboardOverview` - Stats and charts

### Landing
- Responsive hero section
- Features showcase
- How it works guide
- Module descriptions
- Call-to-action sections

## 🔄 Integration Points

### Next: Database Integration
1. Choose database (MongoDB, PostgreSQL, or Supabase)
2. Set up tables/collections
3. Create API routes in `/app/api`
4. Connect frontend to API

### Next: Backend Setup
1. Create Node.js + Express server
2. Implement authentication API
3. Implement CRUD endpoints for all modules
4. Deploy to Render or Railway

### Next: Real-Time Features
1. Add WebSocket support
2. Implement live notifications
3. Real-time inventory updates
4. Request status tracking

## 📱 Responsive Design

- Mobile-first approach
- Fully responsive layout
- Mobile sidebar menu
- Touch-friendly UI

## ♿ Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Color contrast compliant
- Screen reader friendly

## 🚢 Deployment

### Frontend (Vercel)
```bash
# Deploy to Vercel
pnpm build
git push origin main
# Auto-deploys from main branch
```

### Environment Variables
```env
# Add to .env.local for development
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📊 Next Phase Checklist

- [ ] Set up backend API (Node.js/Express)
- [ ] Configure database
- [ ] Implement authentication API
- [ ] Connect frontend to real data
- [ ] Add file upload (Cloudinary)
- [ ] Implement WebSocket notifications
- [ ] Set up error handling & logging
- [ ] Add form validation
- [ ] Create API documentation
- [ ] Set up CI/CD pipeline
- [ ] Write unit & integration tests
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deploy to production

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Create a pull request
5. Code review & merge

## 📞 Support

For questions or issues:
- Check [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) for detailed documentation
- Review component examples in the codebase
- Check Next.js documentation at [nextjs.org](https://nextjs.org)

## 📄 License

Proprietary - iBlood System

---

**Status**: Foundation Release v1.0.0  
**Last Updated**: March 21, 2024  
**Ready for**: Backend Integration & Data Connection

Start with [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) for detailed implementation steps.
