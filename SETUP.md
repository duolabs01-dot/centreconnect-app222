# CentreConnect Setup Guide

## Complete Installation Instructions

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- Git (optional)

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- Supabase client libraries
- UI components (Radix UI)
- Form handling (React Hook Form + Zod)
- And more...

### 3. Setup Supabase

#### 3.1 Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - Name: centreconnect-production
   - Database Password: (generate strong password and save it)
   - Region: Select closest to South Africa
4. Click "Create Project" (takes ~2 minutes)

#### 3.2 Run Database Migration
1. In Supabase Dashboard, go to SQL Editor
2. Click "New Query"
3. Copy the ENTIRE contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Verify: Go to "Table Editor" - you should see 15 tables

#### 3.3 Configure Storage Buckets
Go to Storage > Create new bucket:

**Bucket 1: ecd-media**
- Name: `ecd-media`
- Public: Yes (check the box)
- File size limit: 5242880 (5MB)
- Allowed MIME types: `image/jpeg,image/png,image/webp`

**Bucket 2: child-documents**
- Name: `child-documents`
- Public: No
- File size limit: 10485760 (10MB)
- Allowed MIME types: `image/jpeg,image/png,application/pdf`

**Bucket 3: application-documents**
- Name: `application-documents`
- Public: No
- File size limit: 10485760 (10MB)
- Allowed MIME types: `image/jpeg,image/png,application/pdf`

#### 3.4 Get API Keys
1. Go to Settings > API
2. Copy these values:
   - **Project URL** (looks like: https://xxx.supabase.co)
   - **anon/public key** (starts with eyJ...)
   - **service_role key** (starts with eyJ..., KEEP THIS SECRET!)

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3010
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=notifications@centreconnect.co.za
SMTP_PASS=your-smtp-password
SMTP_FROM=notifications@centreconnect.co.za
```

**IMPORTANT:** Never commit `.env.local` to git!

### 5. Create Platform Admin User

#### 5.1 Create Auth User
1. In Supabase Dashboard > Authentication > Users
2. Click "Add user" > "Create new user"
3. Fill in:
   - Email: admin@centreconnect.co.za
   - Password: (generate strong password)
   - Email Confirm: Toggle ON (to skip email verification)
4. Click "Create user"
5. **COPY THE USER ID** (you'll need it next)

#### 5.2 Insert Admin Profile
Go to SQL Editor and run this (replace USER_ID_HERE with actual ID):

```sql
INSERT INTO user_profiles (id, role, full_name, phone)
VALUES ('USER_ID_HERE', 'platform_admin', 'Platform Admin', '+27123456789');
```

### 6. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3010

You should see the CentreConnect landing page!

### 7. Test the Platform

#### 7.1 Login as Admin
- Go to http://localhost:3010/login
- Email: admin@centreconnect.co.za
- Password: (your admin password)
- Should redirect to /admin/dashboard

#### 7.2 Create Test Centre
- In admin dashboard, create a new ECD centre
- Fill in all required information
- Invite an ECD admin (use your email)

#### 7.3 Register as Parent
- Logout
- Go to /register
- Create a parent account
- Add a child profile
- Browse directory

### 8. Troubleshooting

**"Failed to fetch"**
- Check that Supabase project is running (not paused)
- Verify environment variables are correct
- Check browser console for specific error

**"RLS policy violation"**
- Ensure you ran the complete SQL migration
- Check user role is set correctly in user_profiles table

**"Storage upload failed"**
- Verify storage buckets exist
- Check bucket permissions (public vs private)
- Ensure file size is under limit

### 9. Next Steps

Once everything works locally:
- See DEPLOYMENT.md for production deployment
- Customize branding and content
- Add your logo to /public/logo.jpeg
- Test all user flows thoroughly

## Support

Technical questions: jabulani@centreconnect.co.za
Business questions: mandlenkosi@centreconnect.co.za
