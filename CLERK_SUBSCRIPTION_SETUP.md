# Clerk Subscription & Credit System Setup

This guide explains how to set up the credit system with Clerk subscriptions for your application.

## Overview

- **Free users**: 10 credits per month
- **Subscribed users**: 1000 credits per month
- **Each conversation creation**: Costs 1 credit
- **Monthly reset**: Credits reset automatically at the start of each month
- **Subscription renewals**: Credits are automatically added on renewal

## Database Setup

### Step 1: Run Migration Scripts

Run these SQL scripts in your Supabase SQL Editor (in order):

1. **`scripts/030_setup_clerk_subscription_credits.sql`**
   - Creates subscription tracking columns
   - Creates credit usage log table
   - Creates credit management functions
   - Sets up monthly credit limits

This migration will:
- Add `clerk_subscription_id`, `clerk_plan_id`, `subscription_status` columns
- Add `monthly_credit_limit`, `credits_used_this_month`, `last_credit_reset` columns
- Create `credit_usage_log` table to track individual credit deductions
- Create functions: `check_and_decrement_credits()`, `get_available_credits()`, `increment_credits()`

## Clerk Dashboard Setup

### Step 2: Enable Clerk Billing

1. Go to [Clerk Dashboard → Billing Settings](https://dashboard.clerk.com/~/billing/settings)
2. Enable Billing for your application
3. Set up your payment gateway (Clerk development gateway for testing, or your Stripe account for production)

### Step 3: Create Subscription Plans

1. Go to [Clerk Dashboard → Subscription Plans](https://dashboard.clerk.com/~/billing/plans)
2. Select **"Plans for Users"** tab
3. Click **"Add Plan"**
4. Create your subscription plan (e.g., "Pro", "Premium")
5. Set pricing and billing period
6. **Note the Plan ID/Slug** - you'll need this (it's usually the plan name in lowercase)

**Important**: The plan slug/ID is what will be stored in `clerk_plan_id`. Make sure it's something meaningful like `"pro"`, `"premium"`, etc.

### Step 4: Set Up Subscription Webhook

1. Go to [Clerk Dashboard → Webhooks](https://dashboard.clerk.com/~/webhooks)
2. Click **"Add Endpoint"** (or edit existing webhook)
3. Add endpoint URL: `https://yourdomain.com/api/webhooks/clerk-subscription`
4. Select these events:
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.renewed`
   - ✅ `subscription.canceled`
   - ✅ `subscription.deleted`
5. Copy the **Signing Secret**
6. Add to your `.env.local`:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

**Note**: You can use the same webhook secret as your user webhook, or create a separate webhook endpoint.

## How It Works

### Credit System

1. **Free Users**:
   - `monthly_credit_limit = 10`
   - `clerk_plan_id = "free"`
   - Get 10 credits at the start of each month

2. **Subscribed Users**:
   - `monthly_credit_limit = 1000`
   - `clerk_plan_id = [plan slug from Clerk]`
   - Get 1000 credits at the start of each month

3. **Credit Deduction**:
   - When a user creates a conversation, the API checks if they have credits
   - If yes: Decrements 1 credit and creates the conversation
   - If no: Returns error with remaining credits

4. **Monthly Reset**:
   - Credits automatically reset at the start of each month
   - The `check_and_decrement_credits()` function handles this automatically
   - Users get their full monthly limit at the start of each month

### Subscription Events

The webhook handler (`/api/webhooks/clerk-subscription`) handles:

- **`subscription.created`** / **`subscription.updated`**:
  - Updates user's subscription info
  - Sets `monthly_credit_limit` to 1000 for paid plans, 10 for free
  - Resets credits to the new limit

- **`subscription.renewed`**:
  - Resets monthly credits to the limit
  - Resets `credits_used_this_month` to 0

- **`subscription.canceled`** / **`subscription.deleted`**:
  - Downgrades user to free plan
  - Sets `monthly_credit_limit` to 10
  - Keeps current credits (they'll get 10 next month)

## API Endpoints

### `POST /api/addUpdateConversation`
- Checks if user has credits before creating conversation
- Decrements 1 credit if available
- Returns error if insufficient credits
- Logs credit usage in `credit_usage_log` table

### `GET /api/credits`
- Returns user's current credit status
- Shows available credits, monthly limit, plan info
- Handles monthly reset automatically

## Testing

### Test Free User
1. Sign up with a new account (free plan)
2. Check credits: `GET /api/credits` should show 10 credits
3. Create 10 conversations (should work)
4. Try to create 11th conversation (should fail with "Insufficient credits")

### Test Subscribed User
1. Subscribe to a plan via Clerk
2. Check credits: `GET /api/credits` should show 1000 credits
3. Create conversations (should work up to 1000)

### Test Monthly Reset
1. Use all credits for a user
2. Wait until next month (or manually update `last_credit_reset` in database)
3. Try to create a conversation - credits should be reset

## Database Tables

### `users` table (new columns):
- `clerk_subscription_id` - Clerk subscription ID
- `clerk_plan_id` - Plan slug (e.g., "free", "pro", "premium")
- `subscription_status` - Status (active, canceled, past_due, etc.)
- `monthly_credit_limit` - Monthly credit limit (10 or 1000)
- `credits_used_this_month` - Credits used in current month
- `last_credit_reset` - Timestamp of last monthly reset

### `credit_usage_log` table (new):
- Tracks individual credit deductions
- Links to conversations
- Useful for analytics and debugging

## Database Functions

### `check_and_decrement_credits(user_id, credits_needed)`
- Checks if user has enough credits
- Handles monthly reset automatically
- Decrements credits if available
- Returns `true` if successful, `false` if insufficient credits

### `get_available_credits(user_id)`
- Returns available credits for user
- Handles monthly reset automatically
- Accounts for monthly limit and usage

### `increment_credits(user_id, amount)`
- Adds credits to user account
- Used for refunds or manual credit additions

## Troubleshooting

### Credits not resetting monthly
- Check `last_credit_reset` timestamp in database
- The function automatically resets at the start of each month
- You can manually reset by updating `last_credit_reset` to a past date

### Subscription not updating credits
- Check webhook logs in Vercel
- Verify webhook endpoint is configured correctly
- Check that `CLERK_WEBHOOK_SECRET` is set correctly
- Verify subscription events are selected in Clerk Dashboard

### User has wrong credit limit
- Check `clerk_plan_id` in database
- Verify subscription webhook is receiving events
- Manually update if needed:
  ```sql
  UPDATE public.users
  SET monthly_credit_limit = 1000, clerk_plan_id = 'pro'
  WHERE id = 'user_...';
  ```

## Manual Credit Management

### Add credits manually:
```sql
SELECT public.increment_credits('user_...', 100);
```

### Check available credits:
```sql
SELECT public.get_available_credits('user_...');
```

### Reset monthly credits:
```sql
UPDATE public.users
SET 
  credits = monthly_credit_limit,
  credits_used_this_month = 0,
  last_credit_reset = NOW()
WHERE id = 'user_...';
```

