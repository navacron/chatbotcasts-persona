# Step-by-Step Setup Guide: Clerk User Sync & Email Reconciliation

## Quick Summary

This guide will help you:
1. ✅ Set up automatic user creation in `public.users` when someone signs up via Clerk
2. ✅ Reconcile your existing `chatbotcasts@gmail.com` user when you sign up with Clerk

---

## Part 1: Database Setup

### Step 1: Run Migration Scripts

Run these SQL scripts in your Supabase SQL Editor (in order):

1. **`scripts/021_break_auth_users_fk_and_update_persona.sql`**
   - Breaks foreign key from `users.id` to `auth.users.id`
   - Updates `persona.user_id` to reference `users.id`

2. **`scripts/022_reconcile_existing_user_email.sql`**
   - Prepares database for email reconciliation
   - Creates helper function for manual reconciliation

3. **`scripts/023_update_rls_for_clerk.sql`**
   - Updates RLS policies to work with Clerk (instead of Supabase Auth)

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each script
3. Click "Run"
4. Verify no errors

---

## Part 2: Clerk Webhook Setup

### Step 2: Create Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Webhooks** in the left sidebar
4. Click **"Add Endpoint"**
5. Fill in:
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/clerk`
     - Replace `yourdomain.com` with your actual domain
     - For local testing: Use ngrok or similar tool
   - **Events to listen to**: Select:
     - ✅ `user.created`
     - ✅ `user.updated`
6. Click **"Create"**
7. **Copy the Signing Secret** (starts with `whsec_...`)

### Step 3: Add Webhook Secret to Environment

Add to your `.env.local`:

```bash
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
```

**Important:** Restart your dev server after adding this.

---

## Part 3: Environment Variables

### Step 4: Verify All Environment Variables

Your `.env.local` should have:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Required for user sync!
```

---

## Part 4: Email Reconciliation for chatbotcasts@gmail.com

### Step 5: Check Current User

Before signing up with Clerk, check your existing user:

```sql
SELECT id, email, display_name, created_at 
FROM public.users 
WHERE email = 'chatbotcasts@gmail.com';
```

**Note the `id` value** - you'll need this for verification.

### Step 6: Sign Up with Clerk

1. Go to your application
2. Click "Sign Up"
3. Use email: `chatbotcasts@gmail.com`
4. Complete the signup process

### Step 7: Verify Reconciliation

After signing up, check that reconciliation worked:

```sql
-- Should show the new Clerk user ID
SELECT id, email, display_name 
FROM public.users 
WHERE email = 'chatbotcasts@gmail.com';

-- Verify conversations are still linked
SELECT COUNT(*) as conversation_count
FROM public.conversations
WHERE user_id = (SELECT id FROM public.users WHERE email = 'chatbotcasts@gmail.com');

-- Verify personas are still linked
SELECT COUNT(*) as persona_count
FROM public.persona
WHERE user_id = (SELECT id FROM public.users WHERE email = 'chatbotcasts@gmail.com');
```

**What should happen:**
- ✅ User ID is updated to the Clerk user ID
- ✅ All conversations are still linked (count should match)
- ✅ All personas are still linked (count should match)
- ✅ Billing history is preserved

### Step 8: Test Conversation Creation

1. Try creating a new conversation
2. It should work without errors
3. The conversation should be linked to your user

---

## Part 5: Testing New User Signup

### Step 9: Test with New Email

1. Sign up with a **new email** (not existing in database)
2. Check `public.users` table - new user should be created
3. User should have:
   - ✅ 10 free credits
   - ✅ `subscription_tier = 'free'`
   - ✅ `subscription_status = 'active'`

---

## How It Works

### Automatic User Sync (Webhook)

```
User signs up with Clerk
    ↓
Clerk sends webhook to /api/webhooks/clerk
    ↓
Webhook handler verifies signature
    ↓
Calls syncClerkUserToDatabase()
    ↓
Checks if user exists by email
    ↓
If exists: Updates ID and all related records
If not: Creates new user with 10 credits
```

### Client-Side Sync (Fallback)

```
User signs in
    ↓
UserSyncProvider detects authenticated user
    ↓
Calls /api/sync-user
    ↓
Syncs user to database
```

### Email Reconciliation Flow

```
User signs up with existing email
    ↓
syncClerkUserToDatabase() finds user by email
    ↓
Updates user.id to Clerk user ID
    ↓
Updates all foreign keys:
  - conversations.user_id
  - persona.user_id
  - billing_history.user_id
    ↓
All data preserved and linked to new ID
```

---

## Troubleshooting

### Issue: Users not syncing

**Check:**
- ✅ Webhook is configured in Clerk Dashboard
- ✅ `CLERK_WEBHOOK_SECRET` is set correctly
- ✅ `SUPABASE_SERVICE_ROLE_KEY` is set
- ✅ Webhook URL is accessible (not localhost)
- ✅ Check Clerk webhook logs for errors

### Issue: Email reconciliation not working

**Check:**
- ✅ Email matches exactly (case-sensitive)
- ✅ User exists in `public.users` before signup
- ✅ Check server logs for sync errors
- ✅ Try manual reconciliation (see below)

**Manual Reconciliation:**
```sql
-- Find old and new IDs
SELECT id FROM public.users WHERE email = 'chatbotcasts@gmail.com';
-- Get Clerk user ID from Clerk Dashboard or after signup

-- Run reconciliation
SELECT public.reconcile_user_email('old-uuid', 'new-clerk-uuid');
```

### Issue: RLS policy errors

**Check:**
- ✅ Migration `023_update_rls_for_clerk.sql` was run
- ✅ API routes use service role key when needed
- ✅ Clerk user ID is being passed correctly

---

## Files Created

### Core Files
- `lib/sync-clerk-user.ts` - User sync utility function
- `app/api/webhooks/clerk/route.ts` - Clerk webhook handler
- `app/api/sync-user/route.ts` - Manual sync endpoint
- `components/user-sync-provider.tsx` - Auto-sync component

### Migration Scripts
- `scripts/021_break_auth_users_fk_and_update_persona.sql`
- `scripts/022_reconcile_existing_user_email.sql`
- `scripts/023_update_rls_for_clerk.sql`

### Documentation
- `CLERK_SETUP.md` - Detailed technical documentation
- `SETUP_STEPS.md` - This file (step-by-step guide)

---

## Next Steps

1. ✅ Run all migration scripts
2. ✅ Set up Clerk webhook
3. ✅ Add environment variables
4. ✅ Test new user signup
5. ✅ Test email reconciliation with chatbotcasts@gmail.com
6. ✅ Deploy to production
7. ✅ Update webhook URL to production domain

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review `CLERK_SETUP.md` for technical details
3. Check server logs for errors
4. Verify all environment variables are set correctly

