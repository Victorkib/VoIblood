# iBlood Authentication Setup Guide

Complete guide to setting up authentication with Supabase and MongoDB.

---

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [MongoDB Setup](#2-mongodb-setup)
3. [OAuth Providers Setup](#3-oauth-providers-setup)
4. [Environment Variables](#4-environment-variables)
5. [Testing Authentication](#5-testing-authentication)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Supabase Setup

### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign In"
3. Sign up with GitHub, Google, or email

### Step 2: Create New Project

1. Click "New Project" in the dashboard
2. Fill in:
   - **Name**: `iblood` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
3. Click "Create new project"
4. Wait 2-3 minutes for setup to complete

### Step 3: Get API Keys

1. Go to **Settings** (gear icon in sidebar)
2. Click **API**
3. Copy these values to your `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 4: Configure Email Auth

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (enabled by default)
3. Configure email templates:
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation email if desired

### Step 5: Set Up User Metadata Fields

1. Go to **Authentication** → **Users**
2. Click "Add user" to test
3. User metadata will automatically store:
   - `full_name`
   - `organization_name`
   - `role`
   - `avatar_url`

---

## 2. MongoDB Setup

### Step 1: Create MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Click "Try Free" or "Sign In"
3. Sign up with email or SSO

### Step 2: Create Cluster

1. Click "Build a Database"
2. Choose **FREE** tier (M0)
3. Select:
   - **Cloud Provider**: AWS, Google Cloud, or Azure
   - **Region**: Closest to your users
4. Click "Create Cluster"
5. Wait 3-5 minutes for cluster creation

### Step 3: Create Database User

1. Click **Database Access** in sidebar
2. Click "Add New Database User"
3. Choose **Password** authentication
4. Create username and password (save these!)
5. Set user privileges to **Read and write to any database**
6. Click "Add User"

### Step 4: Configure Network Access

1. Click **Network Access** in sidebar
2. Click "Add IP Address"
3. For development, click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### Step 5: Get Connection String

1. Click **Database** in sidebar
2. Click "Connect" on your cluster
3. Choose **Connect your application**
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `iblood`
7. Add to `.env.local` as `DATABASE_URL`

Example:
```
mongodb+srv://myuser:MyPassword123@cluster0.abc123.mongodb.net/iblood?retryWrites=true&w=majority
```

---

## 3. OAuth Providers Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
6. Copy **Client ID** and **Client Secret**
7. In Supabase Dashboard → **Authentication** → **Providers** → **Google**
8. Paste Client ID and Secret
9. Enable provider

### Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to **OAuth2** settings
4. Add redirect URI: `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client Secret**
6. In Supabase Dashboard → **Authentication** → **Providers** → **Discord**
7. Paste Client ID and Secret
8. Enable provider

### GitHub OAuth

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: iBlood
   - **Homepage URL**: `http://localhost:3000` (for dev)
   - **Authorization callback URL**: `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
4. Copy **Client ID**
5. Generate new **Client Secret**
6. In Supabase Dashboard → **Authentication** → **Providers** → **GitHub**
7. Paste Client ID and Secret
8. Enable provider

---

## 4. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MongoDB Configuration
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/iblood

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

---

## 5. Testing Authentication

### Test Email/Password Signup

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/auth/signup`
3. Fill in the form:
   - Full Name: Test User
   - Email: test@example.com
   - Organization: Test Hospital
   - Role: Staff
   - Password: test123456
4. Click "Create Account"
5. Check your email for confirmation link (if enabled)
6. Sign in with credentials

### Test OAuth Login

1. Go to `http://localhost:3000/auth/login`
2. Click on Google, Discord, or GitHub button
3. Authorize the application
4. You should be redirected to `/dashboard`

### Verify User in Database

1. Check MongoDB:
   ```bash
   # Using MongoDB Compass or Atlas UI
   # Database: iblood
   # Collection: users
   ```
2. You should see the user document with:
   - `supabaseId`
   - `email`
   - `fullName`
   - `role`
   - `createdAt`

---

## 6. Troubleshooting

### "Missing Supabase environment variables"

- Check `.env.local` exists in project root
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart dev server after adding environment variables

### "MongoDB connection error"

- Verify `DATABASE_URL` is correct
- Check MongoDB cluster is running
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify database user credentials

### "OAuth login failed"

- Check redirect URIs in OAuth provider settings
- Verify Supabase has the correct callback URL configured
- Ensure OAuth provider is enabled in Supabase Dashboard

### "User already exists"

- User may have signed up with OAuth previously
- Try signing in instead of signing up
- Check Supabase Authentication → Users

### "Session expired" or "Not authenticated"

- Clear browser cookies
- Check cookie settings in browser dev tools
- Verify `NEXT_PUBLIC_APP_URL` matches your domain

### Email not received

- Check spam folder
- In Supabase, go to **Authentication** → **Email Templates**
- For development, you can disable email confirmation:
  - **Authentication** → **Providers** → **Email**
  - Disable "Confirm email"

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Next.js Authentication Guide](https://nextjs.org/docs/authentication)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

---

## Support

For issues or questions:
1. Check this guide first
2. Review Supabase dashboard logs
3. Check Next.js console output
4. Review MongoDB Atlas logs

---

**Last Updated**: March 21, 2026
**Version**: 1.0.0
