# Clerk Webhook Events Selection Guide

## Which Events to Select

Based on the webhook handler implementation, select these events in the Clerk Dashboard:

### ✅ Required Events (Subscription Category)

Under the **`subscription`** category, select:

1. **`subscription.created`** ✅
   - Triggered when a new subscription is created
   - Sets up user with subscription info and credit limit

2. **`subscription.updated`** ✅
   - Triggered when subscription properties change
   - Updates subscription info and credit limits

3. **`subscription.active`** ✅
   - Triggered when subscription becomes active
   - Ensures credits are set correctly when subscription activates

4. **`subscription.pastDue`** (Optional but recommended)
   - Triggered when subscription becomes past due
   - Updates subscription status (doesn't change credits)

### ✅ Required Events (SubscriptionItem Category)

Under the **`subscriptionItem`** category, select:

1. **`subscriptionItem.created`** ✅
   - Triggered when a new subscription item is created
   - Sets up credits for new subscriptions

2. **`subscriptionItem.active`** ✅
   - Triggered when subscription item becomes active
   - Resets credits when subscription activates

3. **`subscriptionItem.ended`** ✅
   - **IMPORTANT**: This handles subscription renewals!
   - When a subscription period ends, this event fires
   - Resets monthly credits for the new billing period

4. **`subscriptionItem.canceled`** ✅
   - Triggered when subscription is canceled
   - Downgrades user to free plan (10 credits/month)

### ❌ Optional Events (Not Required)

These events are handled but not critical:

- `subscriptionItem.updated` - Not needed (we use `subscription.updated`)
- `subscriptionItem.abandoned` - Not needed
- `subscriptionItem.incomplete` - Not needed
- `subscriptionItem.pastDue` - Not needed (we use `subscription.pastDue`)
- `subscriptionItem.upcoming` - Not needed
- `subscriptionItem.freeTrialEnding` - Not needed (but you could add support for this)

## Summary Checklist

### Subscription Events:
- [x] `subscription.created`
- [x] `subscription.updated`
- [x] `subscription.active`
- [ ] `subscription.pastDue` (optional)

### SubscriptionItem Events:
- [x] `subscriptionItem.created`
- [x] `subscriptionItem.active`
- [x] `subscriptionItem.ended` ⭐ **Most important for renewals**
- [x] `subscriptionItem.canceled`

## How Each Event Works

### `subscription.created` / `subscription.updated` / `subscription.active`
- Updates user's subscription info
- Sets `monthly_credit_limit` to 1000 for paid plans, 10 for free
- Resets credits to the new limit

### `subscriptionItem.created` / `subscriptionItem.active`
- Similar to subscription events
- Ensures credits are set when subscription item is created/activated

### `subscriptionItem.ended` ⭐
- **This is the key event for renewals**
- When a subscription billing period ends, this fires
- Resets monthly credits to the limit
- This happens automatically when Clerk processes the renewal

### `subscriptionItem.canceled`
- Downgrades user to free plan
- Sets `monthly_credit_limit` to 10
- Keeps current credits (they'll get 10 next month)

### `subscription.pastDue`
- Updates subscription status to "past_due"
- Doesn't change credit limits or credits
- Useful for tracking payment issues

## Important Notes

1. **Renewals**: Clerk doesn't have a `subscription.renewed` event. Instead, renewals are handled through:
   - `subscriptionItem.ended` (when old period ends)
   - `subscriptionItem.created` or `subscriptionItem.active` (when new period starts)

2. **Credit Reset**: Credits are reset in two scenarios:
   - When subscription changes (created/updated/active)
   - When subscription period ends (`subscriptionItem.ended`)

3. **Monthly Reset**: The database function `check_and_decrement_credits()` also handles automatic monthly resets, so even if webhooks fail, credits will reset at the start of each month.

## Testing

After selecting these events:

1. **Test subscription creation**: Subscribe a user → Should get 1000 credits
2. **Test renewal**: Wait for subscription period to end → Credits should reset
3. **Test cancellation**: Cancel subscription → Should downgrade to 10 credits/month

