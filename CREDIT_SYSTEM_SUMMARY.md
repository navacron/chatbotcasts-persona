# Credit System Implementation Summary

## What Was Implemented

### 1. Database Schema (`scripts/030_setup_clerk_subscription_credits.sql`)

**New columns in `users` table:**
- `clerk_subscription_id` - Clerk subscription ID
- `clerk_plan_id` - Plan slug (e.g., "free", "pro")
- `subscription_status` - Status (active, canceled, etc.)
- `monthly_credit_limit` - Monthly credit limit (10 or 1000)
- `credits_used_this_month` - Credits used in current month
- `last_credit_reset` - Timestamp of last monthly reset

**New table: `credit_usage_log`**
- Tracks individual credit deductions
- Links to conversations
- Useful for analytics

**New database functions:**
- `check_and_decrement_credits(user_id, credits_needed)` - Checks and decrements credits
- `get_available_credits(user_id)` - Returns available credits (handles monthly reset)
- `increment_credits(user_id, amount)` - Adds credits (for refunds)

### 2. API Updates

**`POST /api/addUpdateConversation`**
- ✅ Checks credits before creating conversation
- ✅ Decrements 1 credit if available
- ✅ Returns error if insufficient credits
- ✅ Logs credit usage
- ✅ Refunds credit if conversation creation fails

**`GET /api/credits`** (NEW)
- Returns user's credit status
- Shows available credits, monthly limit, plan info

### 3. Webhook Handlers

**`POST /api/webhooks/clerk-subscription`** (NEW)
- Handles subscription events from Clerk
- Updates user subscription info
- Sets credit limits based on plan
- Handles subscription renewals (resets credits)
- Handles cancellations (downgrades to free)

### 4. Credit Limits

- **Free users**: 10 credits/month
- **Subscribed users**: 1000 credits/month
- **Monthly reset**: Automatic at start of each month
- **Per conversation**: 1 credit

## Setup Checklist

### Database
- [ ] Run `scripts/030_setup_clerk_subscription_credits.sql` in Supabase

### Clerk Dashboard
- [ ] Enable Billing in Clerk Dashboard
- [ ] Create subscription plans (e.g., "Pro", "Premium")
- [ ] Note the plan slugs/IDs
- [ ] Set up webhook for subscription events:
  - URL: `https://yourdomain.com/api/webhooks/clerk-subscription`
  - Events: `subscription.created`, `subscription.updated`, `subscription.renewed`, `subscription.canceled`, `subscription.deleted`

### Environment Variables
- [ ] `CLERK_WEBHOOK_SECRET` is set (can use same as user webhook)

### Testing
- [ ] Test free user credit limit (10 conversations)
- [ ] Test subscription upgrade (should get 1000 credits)
- [ ] Test subscription renewal (credits should reset)
- [ ] Test credit check when creating conversation

## How Credits Work

1. **User signs up** → Gets 10 free credits
2. **User subscribes** → Gets 1000 credits (via webhook)
3. **User creates conversation** → 1 credit deducted
4. **Monthly reset** → Credits reset to monthly limit automatically
5. **Subscription renews** → Credits reset to limit (via webhook)

## No Additional Clerk Tables Needed

You don't need to create additional tables in Clerk. The system uses:
- Clerk's built-in subscription system
- Your database to track credits and usage
- Webhooks to sync subscription status

The `clerk_plan_id` stores the plan slug from Clerk (e.g., "pro", "premium"), which you define when creating plans in Clerk Dashboard.

