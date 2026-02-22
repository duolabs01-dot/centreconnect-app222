# CentreConnect Deployment Guide

## Deploy to Production (Vercel)

### 1. Prepare for Deployment

Ensure all tests pass locally:
```bash
npm run build
```

If build succeeds, you're ready to deploy!

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial CentreConnect deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/centreconnect.git
git push -u origin main
```

### 3. Deploy on Vercel

1. Go to https://vercel.com
2. Sign up or log in
3. Click "Add New" > "Project"
4. Import your GitHub repository
5. Configure project:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. **DO NOT DEPLOY YET** - add environment variables first

### 4. Add Environment Variables

In Vercel project settings > Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
```

**For all three environments:** Production, Preview, Development

### 5. Deploy

Click "Deploy"

Vercel will:
- Install dependencies
- Build your Next.js app  
- Deploy to production
- Give you a live URL (e.g., centreconnect.vercel.app)

### 6. Update Supabase Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration:

Add these redirect URLs:
- https://your-app.vercel.app/**
- https://your-app.vercel.app/auth/callback

### 7. Test Production Site

Visit your live URL and test:
- Landing page loads
- Login works
- Register works
- All portals accessible

### 8. Custom Domain (Optional)

1. Purchase domain (e.g., centreconnect.co.za)
2. In Vercel project > Settings > Domains
3. Add your custom domain
4. Configure DNS as per Vercel instructions
5. Wait for DNS propagation (up to 48 hours)
6. Update NEXT_PUBLIC_APP_URL environment variable

### 9. Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Platform admin account created
- [ ] Test all user flows (parent, ecd, admin)
- [ ] Custom domain configured (if using)
- [ ] Email templates customized in Supabase
- [ ] Storage buckets configured correctly
- [ ] Analytics setup (Google Analytics, etc.)
- [ ] Error tracking configured (optional: Sentry)
- [ ] Backup strategy in place

### 10. Monitoring

**Vercel Dashboard:**
- Monitor deployments
- Check build logs
- View analytics

**Supabase Dashboard:**
- Monitor database usage
- Check API logs
- Review storage usage

### 11. Ongoing Maintenance

**Weekly:**
- Check error logs
- Monitor user signups
- Review application submissions

**Monthly:**
- Database backups
- Security updates
- Performance review

### 12. Scaling Considerations

**When you reach 50-100 centres:**
- Upgrade Supabase to Pro plan (R400/month)
- Consider CDN optimization
- Review database indexes

**When you reach 500+ centres:**
- Consider dedicated Supabase instance
- Implement caching strategy
- Add monitoring/alerting

## Troubleshooting Production Issues

**Build fails:**
- Check build logs in Vercel
- Ensure all dependencies in package.json
- Verify TypeScript has no errors

**"Module not found" errors:**
- Check import paths are correct
- Ensure all files committed to git
- Verify dependencies installed

**Database connection fails:**
- Check environment variables
- Verify Supabase project not paused
- Check API keys are correct

**Users can't login:**
- Verify redirect URLs in Supabase
- Check auth is configured
- Review browser console errors

## Support

For deployment issues:
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support

For CentreConnect specific issues:
- Technical: jabulani@centreconnect.co.za
