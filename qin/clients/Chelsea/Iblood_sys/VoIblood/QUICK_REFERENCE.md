# iBlood - Quick Reference Guide

## 🚀 Start Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Open browser
# http://localhost:3000
```

---

## 📍 Navigation Map

| URL | Purpose | Component |
|-----|---------|-----------|
| `/` | Landing page | `app/page.tsx` |
| `/auth/login` | User login | `app/auth/login/page.tsx` |
| `/auth/signup` | User registration | `app/auth/signup/page.tsx` |
| `/dashboard` | Dashboard home | `app/dashboard/page.tsx` |
| `/dashboard/donors` | Donor management | `app/dashboard/donors/page.tsx` |
| `/dashboard/inventory` | Blood inventory | `app/dashboard/inventory/page.tsx` |
| `/dashboard/expiry` | Expiry monitoring | `app/dashboard/expiry/page.tsx` |
| `/dashboard/requests` | Hospital requests | `app/dashboard/requests/page.tsx` |
| `/dashboard/reports` | Reports & analytics | `app/dashboard/reports/page.tsx` |
| `/dashboard/settings` | User settings | `app/dashboard/settings/page.tsx` |

---

## 🔐 Authentication Usage

### Use Auth Context
```typescript
import { useAuth } from '@/components/auth/auth-provider'

export function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.fullName}</p>}
      <button onClick={logout}>Sign Out</button>
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
  
  return <div>Admin Content</div>
}
```

### Protect Routes
```typescript
import { ProtectedRoute } from '@/components/auth/protected-route'

export function Page() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  )
}
```

---

## 🎨 UI Components

### Button
```typescript
import { Button } from '@/components/ui/button'

<Button>Click me</Button>
<Button variant="outline">Outline</Button>
<Button size="lg">Large</Button>
<Button disabled>Disabled</Button>
```

### Input
```typescript
import { Input } from '@/components/ui/input'

<Input type="text" placeholder="Enter text" />
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
```

### Card
```typescript
import { Card } from '@/components/ui/card'

<Card className="p-6">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

### Field Group
```typescript
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'

<FieldGroup>
  <Field>
    <FieldLabel>Email</FieldLabel>
    <Input type="email" />
  </Field>
</FieldGroup>
```

---

## 🎯 Key Files to Edit

### Add New Page
1. Create file: `app/dashboard/[module]/page.tsx`
2. Add navigation link in `components/dashboard/sidebar.tsx`
3. Import components and build UI

### Add New Component
1. Create file: `components/[category]/[name].tsx`
2. Export as default or named export
3. Use in pages

### Update Styles
1. Edit `app/globals.css` for global styles
2. Use Tailwind classes in components
3. Use design tokens for colors (e.g., `text-primary`)

### Add Auth-Protected Route
1. Wrap component with `<ProtectedRoute>`
2. Use `usePermission()` hook
3. Check user role before rendering

---

## 📊 User Roles & Permissions

### Admin
```typescript
permission.isAdmin()        // true
permission.can('manage_users')
permission.can('approve_requests')
```

### Staff
```typescript
permission.isStaff()        // true
permission.can('create_donor')
permission.can('manage_inventory')
```

### Hospital
```typescript
permission.isHospital()     // true
permission.can('create_requests')
permission.can('view_own_requests')
```

---

## 🎨 Design Tokens

### Colors
```css
/* Primary - Medical Red */
color: var(--primary)              /* #C23030 */
color: var(--primary-foreground)   /* White */

/* Secondary - Ocean Blue */
color: var(--secondary)            /* #2563EB */
color: var(--secondary-foreground) /* White */

/* Accent - Teal */
color: var(--accent)               /* #1D9B9B */
color: var(--accent-foreground)    /* White */

/* Neutral */
color: var(--background)           /* Background color */
color: var(--foreground)           /* Text color */
color: var(--muted)                /* Muted color */
color: var(--border)               /* Border color */
```

### In Tailwind
```html
<div class="bg-primary text-primary-foreground">
<div class="text-secondary">
<div class="bg-accent/10">
```

---

## 📋 Form Patterns

### Simple Form
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function MyForm() {
  const [data, setData] = useState({ name: '', email: '' })
  
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value })
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    console.log(data)
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="name"
        value={data.name}
        onChange={handleChange}
        placeholder="Name"
      />
      <Input
        name="email"
        type="email"
        value={data.email}
        onChange={handleChange}
        placeholder="Email"
      />
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

---

## 📊 Table Pattern

```typescript
<div className="overflow-x-auto">
  <table className="w-full">
    <thead className="bg-secondary/5 border-b border-border">
      <tr>
        <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
        <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      {items.map((item) => (
        <tr key={item.id} className="hover:bg-secondary/5">
          <td className="px-6 py-4 text-sm">{item.name}</td>
          <td className="px-6 py-4 text-sm">{item.email}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 🔄 Common Patterns

### Conditional Rendering
```typescript
{isAdmin && <AdminControls />}
{!isLoading ? <Content /> : <Spinner />}
```

### Dynamic Classes
```typescript
className={`p-4 rounded ${
  isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary/5'
}`}
```

### Grid Layouts
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item.id}>{item.name}</Card>
  ))}
</div>
```

---

## 🧪 Testing Data

### Mock Donor
```typescript
{
  id: "1",
  fullName: "John Donor",
  bloodGroup: "O",
  rhFactor: "Positive",
  contactInfo: "555-0101",
  lastDonationDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  eligibilityStatus: true
}
```

### Mock Blood Unit
```typescript
{
  id: "BLU-100001",
  bloodGroup: "O",
  rhFactor: "Positive",
  collectionDate: new Date("2024-03-10"),
  expiryDate: new Date("2024-04-10"),
  status: "available",
  quantity: 450
}
```

### Mock Request
```typescript
{
  id: "REQ-2024-1001",
  hospitalName: "City Hospital",
  bloodType: "O+",
  quantity: 3,
  status: "pending",
  requestDate: new Date()
}
```

---

## 📚 Important Imports

```typescript
// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

// Auth
import { useAuth } from '@/components/auth/auth-provider'
import { usePermission } from '@/hooks/use-permission'
import { ProtectedRoute } from '@/components/auth/protected-route'

// Auth Utilities
import { hasPermission, hasRole, getCurrentUser } from '@/lib/auth'

// Icons
import { Heart, Users, Package, AlertCircle } from 'lucide-react'

// Next.js
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
```

---

## 🐛 Debugging Tips

### Console Logs
```typescript
console.log('[v0] Auth state:', { user, isAuthenticated })
console.log('[v0] Permission check:', permission.can('manage_users'))
console.log('[v0] Form data:', data)
```

### Check LocalStorage
```typescript
// In browser console
localStorage.getItem('auth_session')
localStorage.removeItem('auth_session')  // Clear auth
```

### View Component Props
```typescript
console.log('Component props:', { ...props })
```

---

## 🚨 Common Issues & Solutions

### Issue: "useAuth must be used within AuthProvider"
**Solution**: Make sure your component is wrapped with `<AuthProvider>` in `layout.tsx`

### Issue: "Module not found"
**Solution**: Check file path and use `@/` alias (configured in `tsconfig.json`)

### Issue: Styles not applying
**Solution**: 
1. Clear cache: `rm -rf .next`
2. Restart dev server
3. Check class names in Tailwind output

### Issue: TypeScript errors
**Solution**: 
1. Check type definitions
2. Use `type` for type-only imports
3. Run `pnpm type-check`

---

## 💡 Best Practices

1. **Always use design tokens** - `text-primary` not `text-red-600`
2. **Keep components small** - Split large components
3. **Use TypeScript** - Add proper types
4. **Follow naming** - Use kebab-case for files
5. **Add comments** - Explain complex logic
6. **Use proper semantics** - Correct HTML elements
7. **Test on mobile** - Responsive first
8. **Check accessibility** - Use proper labels

---

## 🔗 Useful Links

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com
- **Lucide Icons**: https://lucide.dev

---

## 📝 File Naming Conventions

```
Pages:        page.tsx
Components:   ComponentName.tsx
Hooks:        use-hook-name.ts
Utilities:    utility-name.ts
Types:        Use inline or in separate types/ folder
Styles:       Use Tailwind, no separate CSS files
```

---

## 🚀 Deployment

### Build for Production
```bash
pnpm build
pnpm start
```

### Deploy to Vercel
```bash
# If connected to Git
git push origin main
# Auto-deploys to Vercel

# Or use Vercel CLI
npx vercel deploy
```

### Environment Variables
```bash
# Create .env.local
NEXT_PUBLIC_API_URL=your_api_url
```

---

## 📞 Quick Help

- **Looking for X component?** Check `components/ui/`
- **Need a page template?** Check `app/dashboard/` examples
- **How do I add a route?** Create folder in `app/`
- **Want to add a hook?** Create file in `hooks/`
- **Need auth?** Use `useAuth()` and `usePermission()`

---

**Last Updated**: March 21, 2024  
**Version**: 1.0.0  

For detailed docs, see `IMPLEMENTATION_GUIDE.md`
