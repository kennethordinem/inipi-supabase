# Cron Job Setup for Auto-Release System

## Overview

The system has an auto-release cron job that needs to run **every hour** to:
- ✅ Release **gusmester spots** 3 hours before sessions (no points)
- ✅ Release **guest spots** based on employee preferences (3h or 24h before, with points)

## Cron Endpoint

**URL:** `https://your-domain.com/api/cron/auto-release-guest-spots`  
**Method:** `GET` or `POST`  
**Schedule:** Every hour (`0 * * * *`)

## Security

The endpoint is protected by a `CRON_SECRET` environment variable. The cron service must send:

```
Authorization: Bearer YOUR_CRON_SECRET
```

## Setup Options

### Option 1: EasyCron (Recommended - Free & Reliable)

1. Go to [easycron.com](https://www.easycron.com)
2. Sign up for free account
3. Create new cron job:
   - **URL:** `https://devinipi.ordinem.dk/api/cron/auto-release-guest-spots`
   - **Cron Expression:** `0 * * * *` (every hour)
   - **HTTP Method:** `GET`
   - **Custom Headers:**
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```
   - **Timeout:** 30 seconds
4. Save and enable

### Option 2: Cron-job.org (Free Alternative)

1. Go to [cron-job.org](https://cron-job.org)
2. Sign up for free account
3. Create new cron job:
   - **Title:** "INIPI Auto-Release Spots"
   - **URL:** `https://devinipi.ordinem.dk/api/cron/auto-release-guest-spots`
   - **Schedule:** Every hour (`0 * * * *`)
   - **Request Method:** `GET`
   - **Headers:**
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```
4. Save and enable

### Option 3: Server Crontab (If you have SSH access)

1. SSH into your Coolify server
2. Edit crontab: `crontab -e`
3. Add this line:
   ```bash
   0 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://devinipi.ordinem.dk/api/cron/auto-release-guest-spots
   ```
4. Save and exit

### Option 4: Coolify Scheduled Task (If available)

Check if Coolify has a scheduled tasks feature:
1. Go to your Coolify project settings
2. Look for "Scheduled Tasks" or "Cron Jobs"
3. Add:
   - **Command:** `curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/auto-release-guest-spots`
   - **Schedule:** `0 * * * *`

## Environment Variables

Add to your Coolify environment variables:

```env
CRON_SECRET=your-random-secret-key-here
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

Or use: `https://generate-secret.vercel.app/32`

## Testing

### Manual Test (Without Auth)

Temporarily disable auth check in `/app/api/cron/auto-release-guest-spots/route.ts`:

```typescript
// Comment out this block temporarily
// if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
//   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// }
```

Then visit: `https://devinipi.ordinem.dk/api/cron/auto-release-guest-spots`

You should see:
```json
{
  "success": true,
  "releasedCount": 0,
  "released": [],
  "timestamp": "2026-01-10T..."
}
```

**Re-enable auth after testing!**

### Test With Auth

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://devinipi.ordinem.dk/api/cron/auto-release-guest-spots
```

## Monitoring

### Check Logs

In Coolify, check your application logs for:
```
[Auto-Release] Released gusmester spot for Session Name (no points)
[Auto-Release] Released guest spot for Employee Name on Session Name (150 points)
```

### Check Database

Run this in Supabase SQL Editor to see recent releases:

```sql
-- Check recently released spots
SELECT 
  gs.id,
  gs.spot_type,
  gs.status,
  s.name as session_name,
  s.date,
  s.time,
  e.name as employee_name
FROM guest_spots gs
JOIN sessions s ON gs.session_id = s.id
LEFT JOIN employees e ON gs.host_employee_id = e.id
WHERE gs.status = 'released_to_public'
  AND gs.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY gs.updated_at DESC;
```

### Check Points History

```sql
-- Check recent auto-release points
SELECT 
  ph.employee_id,
  e.name,
  ph.points,
  ph.reason,
  ph.created_at
FROM points_history ph
JOIN employees e ON ph.employee_id = e.id
WHERE ph.reason LIKE '%Auto-release%'
  AND ph.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ph.created_at DESC;
```

## How It Works

### Gusmester Spots (Always 3 Hours)

1. Cron runs every hour
2. Finds all `gusmester_spot` with status `reserved_for_host`
3. Checks if session starts in ≤ 3 hours
4. Changes status to `released_to_public`
5. **No points awarded** (automatic release)

### Guest Spots (Based on Employee Preference)

1. Cron runs every hour
2. Checks each employee's `auto_release_preference`:
   - `3_hours` → Release 3 hours before
   - `24_hours` → Release 24 hours before
   - `manual` → No auto-release
3. Finds matching `guest_spot` with status `reserved_for_host`
4. Changes status to `released_to_public`
5. **Awards 150 points** to employee

## Troubleshooting

### Spots Not Releasing

1. **Check cron is running:**
   - Visit your cron service dashboard
   - Verify last execution time
   - Check for errors

2. **Check endpoint response:**
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://devinipi.ordinem.dk/api/cron/auto-release-guest-spots
   ```

3. **Check database:**
   ```sql
   -- Find spots that should be released
   SELECT 
     gs.id,
     gs.spot_type,
     gs.status,
     s.name,
     s.date,
     s.time,
     s.start_time,
     NOW() + INTERVAL '3 hours' as threshold
   FROM guest_spots gs
   JOIN sessions s ON gs.session_id = s.id
   WHERE gs.status = 'reserved_for_host'
     AND s.start_time <= NOW() + INTERVAL '3 hours'
     AND s.start_time >= NOW()
   ORDER BY s.start_time;
   ```

4. **Check logs:**
   - Coolify application logs
   - Look for `[Auto-Release]` messages

### Unauthorized Error

- Verify `CRON_SECRET` is set in Coolify environment variables
- Verify cron service is sending correct `Authorization` header
- Check header format: `Bearer YOUR_SECRET` (note the space)

### No Spots Found

- Verify sessions exist in the future
- Check `guest_spots` table has spots with `reserved_for_host` status
- Verify employee `auto_release_preference` is set correctly

## Current Status

❌ **NOT CONFIGURED** - Cron job exists but is not scheduled

**Next Steps:**
1. Add `CRON_SECRET` to Coolify environment variables
2. Set up external cron service (EasyCron recommended)
3. Test the endpoint
4. Monitor logs for first release

## Quick Start

1. **Generate secret:**
   ```bash
   openssl rand -base64 32
   ```

2. **Add to Coolify:**
   - Go to your INIPI project in Coolify
   - Environment Variables
   - Add: `CRON_SECRET=<your-generated-secret>`
   - Redeploy

3. **Set up EasyCron:**
   - Sign up at easycron.com
   - Create job with URL and secret
   - Enable

4. **Test:**
   - Wait for next hour
   - Check logs in Coolify
   - Verify spots are releasing

---

**Created:** 2026-01-10  
**Status:** Pending Setup
