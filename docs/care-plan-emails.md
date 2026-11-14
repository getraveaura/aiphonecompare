# Care plan emails

Approved 2026-11-14. Send from timothy@aiphonecompare.com. Do not send the offer email until the day-60 report is ready. The welcome email is sent automatically by `apc-stripe-webhook` after a successful Care or Care Plus checkout.

Payment links (also in `src/lib/offers.mjs`):

- Care, $199/month: https://buy.stripe.com/fZu14naLV2M5bxefUu9ws04
- Care Plus, $299/month: https://buy.stripe.com/dRm7sLg6f72l0SAgYy9ws05
- Billing portal (cancel anytime, at period end): https://billing.stripe.com/p/login/dRmdR9aLVbiB7gY8s29ws00

## 1. Offer, sent with the day-60 results report

Subject: Your 60-day results, and an optional next step

```
Hi [First name],

Your 60-day results are in, and the included fine-tuning window ends this week. You keep the account, the script, and the reports either way.

If you'd like me to keep reviewing your calls each month, tightening what the assistant says, and checking that you're still on a fair plan, there's an optional care plan for $199/month (Care Plus, with a mid-month review and an optional 20-minute call, is $299/month). You can cancel anytime. Your receptionist bill is still paid directly to [vendor], with no markup from us.

If you want Care, start here: https://buy.stripe.com/fZu14naLV2M5bxefUu9ws04
If you want Care Plus, start here: https://buy.stripe.com/dRm7sLg6f72l0SAgYy9ws05

To keep going, add timothy@aiphonecompare.com as a user in your [vendor] dashboard so I can view calls and update the script. Billing access is not needed.

If you're all set on your own, that's completely fine — just say the word if you ever want a hand later.

Timothy
aiphonecompare.com
```

## 2. Welcome, sent after the first care-plan payment

The live copy lives in `supabase/functions/apc-stripe-webhook/index.ts` (`careEmail`). If that send fails, send this manually from timothy@ and record the Resend id on the lead.

Subject: You're on the care plan — here's how the month works

```
Hi [First name],

Welcome, and thank you. You're on the monthly [Care / Care Plus] plan at [$199 / $299]/month. We received [amount] for the first month. Your receipt comes separately from Stripe. You can cancel anytime; billing then stops at the end of the month you've paid for.

If you haven't already, please add timothy@aiphonecompare.com as a user in your vendor dashboard, with access to view calls and edit the script. I don't need billing access.

Each month I'll review a sample of your calls, update the script if something should change, check your plan and price, and email you a short report with your missed-call and booking numbers.[ Care Plus only: Mid-month I'll do a second review, and we can have a 20-minute call if you'd like one.] If anything comes up in between, email me here — I reply within one business day.

Cancel anytime in the Stripe billing portal (https://billing.stripe.com/p/login/dRmdR9aLVbiB7gY8s29ws00) or by emailing me. Terms: https://aiphonecompare.com/refunds/#care-plan

Glad to keep this going with you,
Timothy
aiphonecompare.com
```
