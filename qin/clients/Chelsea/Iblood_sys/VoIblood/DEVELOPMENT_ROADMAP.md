# iBlood Development Roadmap

## 📍 Current Status
**Foundation v1.0.0** - Frontend UI/UX complete with placeholder data

### What's Built ✅
- Landing page with all sections
- Authentication system (Login/Signup)
- Dashboard with 6 core modules
- Design system and theming
- Navigation and layout structure
- Role-based access control framework
- Documentation

### What's Next 🚀

---

## Phase 1: Backend Setup (Week 1-2)

### 1.1 Project Setup
- [ ] Initialize Node.js project
- [ ] Set up Express server
- [ ] Configure environment variables
- [ ] Set up TypeScript support
- [ ] Configure CORS and middleware
- [ ] Set up error handling

**Files to Create**:
```
backend/
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── cors.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── donors.ts
│   │   ├── inventory.ts
│   │   └── requests.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Donor.ts
│   │   ├── BloodUnit.ts
│   │   └── Request.ts
│   └── controllers/
│       ├── authController.ts
│       ├── donorController.ts
│       ├── inventoryController.ts
│       └── requestController.ts
├── package.json
└── tsconfig.json
```

### 1.2 Database Setup
- [ ] Choose database (MongoDB Atlas or PostgreSQL)
- [ ] Create database and collections/tables
- [ ] Set up connection pooling
- [ ] Create migration scripts
- [ ] Implement query builders/ORM

**MongoDB Collections**:
```javascript
// Users
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "fullName", "passwordHash", "role"],
      properties: {
        _id: { bsonType: "objectId" },
        email: { bsonType: "string" },
        fullName: { bsonType: "string" },
        passwordHash: { bsonType: "string" },
        role: { enum: ["admin", "staff", "hospital"] },
        organizationId: { bsonType: "objectId" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
})

// Donors
db.createCollection("donors")

// Inventory
db.createCollection("inventory")

// Requests
db.createCollection("requests")
```

---

## Phase 2: Authentication API (Week 1-2)

### 2.1 User Registration
- [ ] Create `/api/auth/register` endpoint
- [ ] Hash passwords with bcrypt
- [ ] Validate email uniqueness
- [ ] Send confirmation email (future)
- [ ] Implement rate limiting

**Endpoint**: `POST /api/auth/register`
```json
{
  "email": "john@hospital.com",
  "fullName": "John Doe",
  "password": "secure_password",
  "organizationName": "City Blood Bank",
  "role": "admin"
}
```

### 2.2 User Login
- [ ] Create `/api/auth/login` endpoint
- [ ] Verify credentials
- [ ] Generate JWT token
- [ ] Set secure cookies
- [ ] Return user data

**Endpoint**: `POST /api/auth/login`
```json
{
  "email": "john@hospital.com",
  "password": "secure_password"
}
```

### 2.3 Token Management
- [ ] Create `/api/auth/refresh` endpoint
- [ ] Implement token validation middleware
- [ ] Add token expiry logic
- [ ] Create JWT signing/verification
- [ ] Implement logout

### 2.4 Frontend Integration
- [ ] Update login form to call API
- [ ] Store JWT token securely
- [ ] Update logout functionality
- [ ] Add API request interceptor
- [ ] Implement automatic token refresh

**Update `/app/auth/login/page.tsx`**:
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    const data = await response.json()
    if (response.ok) {
      login(data.user, data.token)
      router.push('/dashboard')
    } else {
      setError(data.message)
    }
  } catch (err) {
    setError('Login failed')
  }
}
```

---

## Phase 3: Core Module APIs (Week 2-3)

### 3.1 Donor Management API

**Endpoints**:
```
GET    /api/donors              # List all donors
GET    /api/donors/:id          # Get donor details
POST   /api/donors              # Create donor
PUT    /api/donors/:id          # Update donor
DELETE /api/donors/:id          # Delete donor
GET    /api/donors/search       # Search donors
```

**Implementation Steps**:
- [ ] Create donorController
- [ ] Implement all endpoints
- [ ] Add validation middleware
- [ ] Set up error handling
- [ ] Add permission checks

**Sample Implementation**:
```typescript
// src/controllers/donorController.ts

export async function createDonor(req: Request, res: Response) {
  try {
    // Validate request
    const { fullName, bloodGroup, rhFactor, contactInfo } = req.body
    
    // Check permissions
    if (!hasPermission(req.user, 'create_donor')) {
      return res.status(403).json({ message: 'Permission denied' })
    }
    
    // Create donor
    const donor = await Donor.create({
      ...req.body,
      organizationId: req.user.organizationId
    })
    
    res.status(201).json({ success: true, donor })
  } catch (err) {
    res.status(500).json({ message: 'Failed to create donor' })
  }
}
```

### 3.2 Blood Inventory API

**Endpoints**:
```
GET    /api/inventory           # List all units
GET    /api/inventory/:id       # Get unit details
POST   /api/inventory           # Record collection
PUT    /api/inventory/:id       # Update unit
DELETE /api/inventory/:id       # Delete unit
GET    /api/inventory/by-type   # Filter by blood type
GET    /api/inventory/alerts    # Get expiry alerts
```

### 3.3 Hospital Request API

**Endpoints**:
```
GET    /api/requests            # List requests
GET    /api/requests/:id        # Get request details
POST   /api/requests            # Create request
PUT    /api/requests/:id        # Update request
PUT    /api/requests/:id/approve # Approve request
PUT    /api/requests/:id/reject  # Reject request
```

### 3.4 Frontend API Integration

**Create API client**:
```typescript
// lib/api-client.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getAuthToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }
  
  return response.json()
}

// Usage
export const donorApi = {
  list: () => apiCall('/donors'),
  get: (id: string) => apiCall(`/donors/${id}`),
  create: (data) => apiCall('/donors', { method: 'POST', body: JSON.stringify(data) }),
}
```

**Update components to use API**:
```typescript
// app/dashboard/donors/page.tsx

export default function DonorsPage() {
  const [donors, setDonors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    async function loadDonors() {
      try {
        const data = await donorApi.list()
        setDonors(data.donors)
      } catch (err) {
        console.error('Failed to load donors')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDonors()
  }, [])
  
  // ... render with real data
}
```

---

## Phase 4: Advanced Features (Week 3-4)

### 4.1 Real-Time Notifications
- [ ] Set up Socket.io for WebSockets
- [ ] Implement notification system
- [ ] Create notification API
- [ ] Update UI for real-time updates
- [ ] Add sound/desktop notifications

**Events to Implement**:
- Blood unit expiry alerts
- Request status changes
- Low inventory alerts
- System maintenance notifications

### 4.2 File Upload (Cloudinary)
- [ ] Set up Cloudinary account
- [ ] Create upload API endpoint
- [ ] Implement frontend upload component
- [ ] Add image optimization
- [ ] Store URLs in database

### 4.3 Reporting & Export
- [ ] Implement report generation
- [ ] Create PDF export functionality
- [ ] Add CSV export
- [ ] Implement chart rendering
- [ ] Add email report scheduling

### 4.4 Advanced Validation
- [ ] Input sanitization
- [ ] Email validation
- [ ] Blood type validation
- [ ] Date validation
- [ ] Phone number formatting

---

## Phase 5: Monitoring & Optimization (Week 4)

### 5.1 Logging & Monitoring
- [ ] Set up logging (Winston or Pino)
- [ ] Implement audit logging
- [ ] Add error tracking (Sentry)
- [ ] Monitor API performance
- [ ] Create admin dashboard

### 5.2 Performance Optimization
- [ ] Implement caching (Redis)
- [ ] Optimize database queries
- [ ] Implement pagination
- [ ] Compress images
- [ ] Lazy load components

### 5.3 Testing
- [ ] Write unit tests (Jest)
- [ ] Write integration tests
- [ ] Write E2E tests (Playwright)
- [ ] Set up CI/CD pipeline
- [ ] Implement code coverage

---

## Phase 6: Security & Deployment (Week 5)

### 6.1 Security Hardening
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Set up API key management
- [ ] Implement request signing
- [ ] Add security headers

### 6.2 Production Deployment
- [ ] Set up environment variables
- [ ] Configure production database
- [ ] Deploy backend (Render/Railway)
- [ ] Deploy frontend (Vercel)
- [ ] Set up monitoring & alerts
- [ ] Configure backups

### 6.3 Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] User manual
- [ ] Admin guide

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Backend Setup | Week 1-2 | 🔄 Upcoming |
| 2. Auth API | Week 1-2 | 🔄 Upcoming |
| 3. Core APIs | Week 2-3 | 🔄 Upcoming |
| 4. Advanced Features | Week 3-4 | ⏳ Planned |
| 5. Optimization | Week 4 | ⏳ Planned |
| 6. Deployment | Week 5 | ⏳ Planned |

---

## Key Dependencies to Install

### Backend
```bash
npm install express cors dotenv mongoose bcrypt jsonwebtoken
npm install --save-dev typescript @types/node ts-node nodemon
```

### Frontend Updates
```bash
npm install swr axios socket.io-client
```

---

## Environment Variables Needed

```env
# Backend
DATABASE_URL=mongodb+srv://...
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=3001

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Next Immediate Steps

1. **Today**: Create backend project structure
2. **Tomorrow**: Set up database and authentication
3. **Day 3**: Implement core API endpoints
4. **Day 4**: Connect frontend to backend
5. **Day 5**: Test and deploy

---

## Questions to Answer Before Starting

1. Which database? (MongoDB, PostgreSQL, or Supabase)
2. Which hosting? (Render, Railway, AWS)
3. Need Cloudinary for file uploads?
4. Need real-time notifications? (WebSocket)
5. Email service needed? (SendGrid, Mailgun)

---

**Version**: 1.0.0  
**Last Updated**: March 21, 2024
