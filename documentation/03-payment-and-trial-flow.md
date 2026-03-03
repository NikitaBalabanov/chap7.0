# Payment & Trial Flow

## Branches After Form Submit

```mermaid
flowchart TD
  A["Submit on Step 5"] --> B["createUser/createTrialUser"]
  B --> C{"trial?"}
  C -->|yes| D["completeOnboarding(userId, true)"]
  C -->|no| E{"partner response?"}
  E -->|yes| F["Clear storage + redirect to vielen-dank"]
  E -->|no| G["Stripe doPayment(amount)"]
  G --> H{"paymentIntent status"}
  H -->|succeeded| I["invoice + welcome email + completeOnboarding"]
  H -->|processing| J["Wait for webhook finalization"]
  I --> K["Clear storage + redirect"]
  J --> K
  D --> K
```

## Stripe Scenario

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant CF as Cloud Functions
  participant ST as Stripe

  U->>FE: Clicks pay
  FE->>CF: createPaymentIntent(amount, userId, courses)
  CF-->>FE: clientSecret
  FE->>ST: confirmPayment(elements)
  ST-->>FE: paymentIntent(status)
  alt succeeded
    FE->>CF: handlePurchaseAndInvoice
    FE->>CF: sendWebWelcomeEmail
    FE->>CF: complete-onboarding
  else processing
    FE-->>FE: waits for server-side finalization
  end
  FE-->>U: redirect to vielen-dank
```

## Error Handling and Safeguards

- Payment errors are shown in `#error_message_payment`.
- The submit button is switched to loading state and disabled.
- After success, key data is cleared (`clearLocalStorageAfterPayment()`) to prevent reuse of stale state.
