# Payment Gateway Setup Guide

This guide explains how to configure the payment gateways (Stripe and Paystack) for the CBT Platform.

## 1. Environment Variables

Ensure the following variables are set in your backend `.env` file:

```env
# Stripe (USD Payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Paystack (NGN Payments)
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
```

## 2. Stripe Setup

1.  **API Keys**: Log in to your [Stripe Dashboard](https://dashboard.stripe.com/) and copy your Secret Key.
2.  **Webhooks**:
    *   Install the Stripe CLI or use the dashboard to create a webhook.
    *   The endpoint should be: `https://your-api.com/api/payments/stripe/webhook`.
    *   Subscribe to the `checkout.session.completed` event.
    *   Copy the Signing Secret to `STRIPE_WEBHOOK_SECRET`.

## 3. Paystack Setup

1.  **API Keys**: Log in to your [Paystack Dashboard](https://dashboard.paystack.com/) under Settings > API Keys & Webhooks.
2.  **Webhooks**:
    *   Set the Webhook URL to: `https://your-api.com/api/payments/paystack/webhook`.
    *   Paystack will automatically send events for successful charges.

## 4. Multi-Currency Logic

*   The platform uses **Paystack** for transactions in **Naira (NGN)**.
*   The platform uses **Stripe** for transactions in **US Dollars (USD)**.
*   The `PricingPage` allows users to toggle between currencies, and the backend routes automatically route to the correct provider based on the plan's currency configuration.

## 5. Referral Rewards

When a school subscribes via a referral link:
*   The system detects the referral code from the subscription session.
*   Upon successful payment, the referring school's balance is automatically credited (as defined in `src/routes/payments.ts`).
