# INIPI Deployment Guide

Complete guide for deploying the INIPI sauna website to Coolify.

## Prerequisites

- Access to Clinio admin panel (to get clinic uniqueId)
- GitHub account
- Coolify server access
- Node.js 18+ installed locally for testing

## Step-by-Step Deployment

### 1. Get Clinic Unique ID from Clinio

1. Log into Clinio admin panel
2. Navigate to **Settings → Clinic Information**
3. Find and copy your **uniqueId** (format: alphanumeric string like `abc123def456`)
4. Keep this ID handy for the next step

### 2. Configure the Website

Edit `lib/clinio.ts` and replace the placeholder:

```typescript
// Find this line:
uniqueId: 'your-unique-id', // TODO: Replace with actual uniqueId

// Replace with your actual ID:
uniqueId: 'abc123def456', // Your clinic's actual uniqueId from Clinio
```

**Important:** This ID connects the website to your Clinio account. Without it, bookings won't work.

### 3. Test Locally (Optional but Recommended)

Before deploying, test the website locally:

```bash
cd /Users/kenneth/Desktop/GitHub\ Projects/inipi

# Install dependencies (if not already done)
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 in your browser and verify:
- ✅ Homepage loads
- ✅ Sessions page loads (might be empty if no sessions in Clinio)
- ✅ Login page loads
- ✅ You can create an account
- ✅ After login, dashboard loads

If everything works, proceed to deployment.

### 4. Create GitHub Repository

```bash
cd /Users/kenneth/Desktop/GitHub\ Projects/inipi

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: INIPI sauna website"

# Create GitHub repo (on github.com):
# - Go to https://github.com/new
# - Repository name: inipi (or your-client-name)
# - Make it Private
# - Don't add README, .gitignore, or license (we already have them)
# - Click "Create repository"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/inipi.git
git branch -M main
git push -u origin main
```

### 5. Deploy to Coolify

#### A. Create New Project in Coolify

1. Log into your Coolify dashboard
2. Click **+ New Resource**
3. Select **Public Repository**

#### B. Configure Project

**Repository Settings:**
- Git Repository URL: `https://github.com/YOUR_USERNAME/inipi`
- Branch: `main`
- Auto-deploy: ✅ Enabled (optional)

**Build Settings:**
- Build Pack: `Node.js`
- Node Version: `20` (or latest LTS)
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Port: `3000`

**Environment Variables:**
- None required (Firebase config is in code)

**Domain:**
- Add your custom domain: `inipi.dk` or `sauna.yourclinic.dk`
- Or use Coolify subdomain: `inipi.your-coolify-domain.com`

#### C. Deploy

1. Click **Deploy**
2. Wait for build to complete (2-3 minutes)
3. Check logs for any errors
4. Once deployed, click on the domain to open the website

### 6. Verify Deployment

Visit your deployed website and test:

1. **Homepage:** Should load with hero, about, and CTA sections
2. **Sessions:** Navigate to `/sessions` - should load (might be empty)
3. **Login:** Try creating an account
4. **Dashboard:** After login, check if dashboard loads
5. **Booking Flow:** If you have sessions in Clinio, try booking one

### 7. Configure DNS (If Using Custom Domain)

If using your own domain (e.g., `inipi.dk`):

1. Go to your domain registrar (e.g., Namecheap, GoDaddy)
2. Add DNS record:
   - Type: `A` or `CNAME`
   - Name: `@` (for root) or `sauna` (for subdomain)
   - Value: Your Coolify server IP or domain
   - TTL: `3600`
3. Wait for DNS propagation (5 minutes - 24 hours)

### 8. SSL Certificate (HTTPS)

Coolify should automatically provision SSL via Let's Encrypt:
- Wait 2-5 minutes after deployment
- Your site should be accessible via `https://`
- If not, check Coolify SSL settings

## Updating the Website

When you make changes to the code:

```bash
cd /Users/kenneth/Desktop/GitHub\ Projects/inipi

# Make your changes to files...

# Test locally
npm run dev

# Commit and push
git add .
git commit -m "Description of changes"
git push

# Coolify will auto-deploy (if enabled)
# Or manually trigger deploy in Coolify dashboard
```

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Check `package.json` has all dependencies
- Run `npm install` locally to verify

**Error: "Build command failed"**
- Check TypeScript errors: `npm run build` locally
- Fix errors and push again

### Website Loads but Sessions Don't Show

**Possible causes:**
1. Wrong `uniqueId` in `lib/clinio.ts`
   - Double-check it matches Clinio admin panel
2. No sessions created in Clinio
   - Log into Clinio and create test sessions
3. Firestore security rules blocking access
   - Check Clinio's Firestore rules allow public read of sessions

### Login Doesn't Work

**Possible causes:**
1. Firebase domain not whitelisted
   - In Firebase Console, add your domain to authorized domains
   - Go to: Authentication → Settings → Authorized domains
   - Add your Coolify domain
2. Wrong Firebase config
   - Don't modify `lib/firebase.ts` - it's preconfigured

### Booking Fails

**Check:**
1. User is logged in (check dashboard shows user info)
2. Session has available spots
3. Payment method is configured in Clinio (Stripe/Vipps)
4. Check browser console for errors

### SSL Certificate Issues

**If HTTPS not working:**
1. In Coolify, go to your project
2. Navigate to SSL/Certificates
3. Click "Generate Certificate"
4. Wait 2-5 minutes

## Performance Optimization (Optional)

After deployment, you can optimize:

1. **Add Images:**
   - Use Next.js `<Image>` component
   - Add sauna photos to `/public` folder
   - Update homepage hero section

2. **Enable Caching:**
   - Coolify handles this automatically
   - Next.js optimizes static assets

3. **Add Analytics:**
   - Google Analytics
   - Plausible (privacy-friendly)
   - Add tracking code to `app/layout.tsx`

## Monitoring

Keep an eye on:
- **Coolify Logs:** Check for runtime errors
- **Clinio Admin:** Monitor bookings/payments
- **User Feedback:** Test the full flow regularly

## Security Notes

- ✅ Firebase config is public (this is normal and safe)
- ✅ Clinio API handles authentication and authorization
- ✅ SSL/HTTPS is automatically handled by Coolify
- ✅ No API keys needed in environment variables

## Support

- **Website Issues:** Check `.cursorrules` for AI assistant instructions
- **Clinio Integration:** Refer to Clinio documentation
- **Coolify Issues:** Check Coolify docs or support

---

**Deployment Status Checklist:**
- [ ] Configured `uniqueId` in `lib/clinio.ts`
- [ ] Tested locally
- [ ] Pushed to GitHub
- [ ] Deployed on Coolify
- [ ] DNS configured (if custom domain)
- [ ] SSL/HTTPS working
- [ ] Tested login/registration
- [ ] Tested booking flow
- [ ] Verified with real user

**Estimated Time:** 30-60 minutes for first deployment

















