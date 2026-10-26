# Payment setup

This guide covers test-mode payment configuration. Live money is disabled unless the explicit safety gates and compliance approvals are complete.

## Safety gates

The API selects `PAYMENT_PROVIDER=dodo`, `razorpay`, or `sandbox`. Keep these defaults for development:

```text
PAYMENT_PROVIDER=sandbox
PAYMENT_MODE=test
LIVE_PAYMENTS_ENABLED=false
```

When `LIVE_PAYMENTS_ENABLED` is not `true`, startup rejects `rzp_live_*` and `dodo_live_*` keys. Do not bypass this check.

## Sandbox

The sandbox adapter is deterministic and offline:

```text
PAYMENT_PROVIDER=sandbox
SANDBOX_PAYMENT_SECRET=<local-development-secret>
```

Use the web simulator only with a local test secret. It signs checkout payloads with HMAC-SHA256 and is not a bank or card processor.

## Razorpay Test Mode

1. Create a Razorpay account and complete the provider's required organization verification.
2. Create Test Mode API credentials.
3. Configure:

   ```text
   PAYMENT_PROVIDER=razorpay
   PAYMENT_MODE=test
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=<test-secret>
   RAZORPAY_WEBHOOK_SECRET=<test-webhook-secret>
   LIVE_PAYMENTS_ENABLED=false
   ```

4. Configure the provider webhook URL:

   ```text
   https://<api-host>/api/webhooks/razorpay
   ```

5. Use the raw request body and `X-Razorpay-Signature` verification. Never parse and reserialize the body before verification.
6. Subscribe to captured, failed, refund, and dispute events needed by the reconciliation process.

## Dodo Payments

1. Create a Dodo Payments account and complete provider onboarding, legal-entity, KYC, settlement, and webhook requirements.
2. Configure test credentials:

   ```text
   PAYMENT_PROVIDER=dodo
   PAYMENT_MODE=test
   DODO_PAYMENTS_API_KEY=<test-key>
   DODO_PAYMENTS_WEBHOOK_SECRET=<webhook-secret>
   LIVE_PAYMENTS_ENABLED=false
   ```

3. Configure:

   ```text
   https://<api-host>/api/webhooks/dodo
   ```

4. Verify Standard Webhooks using `webhook-id`, `webhook-timestamp`, and `webhook-signature`.
5. Test succeeded, failed, refund, and dispute events, including duplicate delivery and out-of-order delivery.

## Production activation checklist

Before setting `LIVE_PAYMENTS_ENABLED=true`:

- Provider production KYC and legal review are complete.
- Organization eligibility, donation disclosures, refund policy, and support channels are published.
- INR settlement bank account and reconciliation owner are approved.
- Webhook endpoint is HTTPS, monitored, rate-limited, and backed by raw-body signature verification.
- Secrets are in a managed secret store, not `.env` committed to source control.
- Test-mode amount/currency mismatch, forged signature, replay, refund, and dispute tests pass in CI.
- Finance and compliance owners approve the change.

Payment provider success never alone proves educational impact. Impact remains a separate reviewed state.
