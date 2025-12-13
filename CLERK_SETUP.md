# Clerk User Sync Setup Guide

This guide explains how to set up automatic user synchronization from Clerk to your Supabase database, and how to handle email reconciliation for existing users.

## Overview

When users sign up via Clerk, their information needs to be stored in the `public.users` table so that:
- Conversations can be created and linked to users
- Personas can be created and linked to users
- Billing history can be tracked
- All user-related data is properly associated

## Setup Steps

### 1. Run Database Migrations

Run these migration scripts in order in your Supabase SQL Editor:

1. **021_break_auth_users_fk_and_update_persona.sql** - Breaks FK from users.id to auth.users.id
2. **022_reconcile_existing_user_email.sql** - Prepares for email reconciliation
3. **023_update_rls_for_clerk.sql** - Updates RLS policies for Clerk

### 2. Set Up Clerk Webhook

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** in the sidebar
3. Click **Add Endpoint**
4. Enter your webhook URL: `https://yourdomain.com/api/webhooks/clerk`
5. Select these events:
   - `user.created`
   - `user.updated`
6. Copy the **Signing Secret** (starts with `whsec_...`)
7. Add it to your `.env.local`:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### 3. Environment Variables

Make sure your `.env.local` has:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Required for user sync

# Clerk Webhook
CLERK_WEBHOOK_SECRET=whsec_...
```

### 4. Deploy Your Application

The webhook endpoint (`/api/webhooks/clerk`) will automatically:
- Receive Clerk user creation/update events
- Sync users to `public.users` table
- Handle email reconciliation for existing users

## Email Reconciliation

### For Existing User: chatbotcasts@gmail.com

When you (or anyone) signs up with Clerk using an email that already exists in `public.users`:

1. **Automatic Reconciliation** (Recommended):
   - Sign up with Clerk using `chatbotcasts@gmail.com`
   - The webhook will detect the email match
   - It will automatically:
     - Update the existing user's ID to match the Clerk user ID
     - Update all related records (conversations, personas, billing_history)
     - Preserve all existing data

2. **Manual Reconciliation** (If automatic fails):
   ```sql
   -- Find the old user ID
   SELECT id, email FROM public.users WHERE email = 'chatbotcasts@gmail.com';
   
   -- Reconcile (replace OLD_USER_ID and NEW_CLERK_USER_ID)
   SELECT public.reconcile_user_email('OLD_USER_ID', 'NEW_CLERK_USER_ID');
   ```

### How It Works

The sync function (`lib/sync-clerk-user.ts`) handles reconciliation by:

1. Checking if a user with the same email exists
2. If found with different ID:
   - Updates the user record with the new Clerk user ID
   - Updates all foreign key references (conversations, personas, billing_history)
3. If found with same ID:
   - Just updates user information (email, name, avatar)
4. If not found:
   - Creates a new user record with 10 free credits

## User Sync Flow

### Automatic (Webhook)
1. User signs up with Clerk
2. Clerk sends webhook to `/api/webhooks/clerk`
3. Webhook handler calls `syncClerkUserToDatabase()`
4. User is created/updated in `public.users`

### Manual (Client-Side)
1. User signs in with Clerk
2. `UserSyncProvider` component detects authenticated user
3. Calls `/api/sync-user` endpoint
4. User is synced to database

Both methods ensure users exist in the database before they can create conversations.

## Testing

### Test New User Signup
1. Sign up with a new email via Clerk
2. Check Supabase `public.users` table - user should be created
3. Try creating a conversation - should work

### Test Email Reconciliation
1. Note the existing user ID for `chatbotcasts@gmail.com`:
   ```sql
   SELECT id, email FROM public.users WHERE email = 'chatbotcasts@gmail.com';
   ```
2. Sign up with Clerk using `chatbotcasts@gmail.com`
3. Check that:
   - The user ID was updated to the Clerk user ID
   - All conversations are still linked
   - All personas are still linked
   - Billing history is preserved

## Troubleshooting

### Users Not Syncing
- Check webhook logs in Clerk Dashboard
- Verify `CLERK_WEBHOOK_SECRET` is set correctly
- Check server logs for errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

### Email Reconciliation Not Working
- Check that the email matches exactly (case-sensitive)
- Verify the sync function is being called
- Check database logs for errors
- Use manual reconciliation function if needed

### RLS Policy Errors
- Ensure migration `023_update_rls_for_clerk.sql` was run
- Verify API routes use service role key when needed
- Check that Clerk user ID is being passed correctly

## API Routes

### `/api/webhooks/clerk` (POST)
- Receives Clerk webhook events
- Syncs users automatically
- Handles email reconciliation

### `/api/sync-user` (POST)
- Manually syncs current authenticated user
- Called by `UserSyncProvider` component
- Can be called from client-side after sign-in

## Security Notes

- Webhook endpoint verifies Svix signatures
- Service role key is only used server-side
- RLS policies are permissive but application code enforces auth
- All API routes verify Clerk authentication before operations


