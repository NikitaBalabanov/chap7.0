# API & Integrations

## Main Backend Endpoints

- `GET /getConfigData?document=pricing`
- `GET /getConfigData?document=courses`
- `GET /getConfigData?document=healthInsuranceProviders`
- `GET /getConfigData?document=healthInsuranceProviders&view=keys`
- `GET /getConfigData?document=healthInsurancePartners`
- `GET /getConfigData?document=namePrefixes`
- `GET /getWebflowStory?slug=onboarding-survey&draft=true`
- `GET /getWebflowStory?slug=health-contraindications&draft=true`
- `POST /createUser`
- `POST /complete-onboarding`

The base API URL is defined in `modules/config.js`.

## Cloud Functions Used Separately

- `createPaymentIntent`
- `handlePurchaseAndInvoice`
- `sendWebWelcomeEmail`

These endpoints are used in `modules/stripe.js`.

## Stripe Integration

- Stripe SDK is loaded dynamically (`https://js.stripe.com/v3/`).
- `Payment Element` is used with a backend-provided `clientSecret`.
- Payment is confirmed via `stripe.confirmPayment({ redirect: "if_required" })`.

## Webflow Integration

- The script works on top of Webflow DOM selectors.
- UI state is partially controlled by CSS classes on `body`.
- Some text content is loaded from the Webflow Story API.
