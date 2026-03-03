# Architecture

## Overview

The script implements a multi-step onboarding flow inside a Webflow page:

- collects survey answers and user data;
- recommends courses;
- creates a user in the backend;
- completes onboarding via trial, partner branch, or Stripe payment.

## Main Layers

- `ch7-script.js` - orchestration: form steps, validation, and step transitions.
- `modules/*` - domain-specific business logic.
- `localStorage` - shared client-side state between steps.
- Backend endpoints (`/webflowAPI` + cloud functions) - data, user creation, payment intent, and post-payment actions.

## Modules and Responsibilities

- `modules/healthProviders.js` - provider list, partner flag, KVNR field, and KVNR validation.
- `modules/onboarding.js` - survey rendering, answer collection, course recommendation, and summary.
- `modules/formHandlers.js` - form autosave, restoration, and submit flow.
- `modules/userCreation.js` - regular and trial user creation.
- `modules/stripe.js` - Stripe payment, invoice, welcome email, and `complete-onboarding`.
- `modules/pricing.js` - loading pricing/courses/contraindications/onboarding survey data.
- `modules/checkout.js` - checkout calculation and rendering.
- `modules/storage.js` - safe `localStorage` access.
- `modules/utils.js` - shared UI and utility helpers.


## Core Concepts

- The client-side source of truth is `localStorage`, not the DOM.
- Step transitions are centralized in `showStep()` and `onboardingHook()`.
- The form does not persist password in storage; password is read from the input only at submit time.
- The partner branch is determined by selected provider + valid KVNR.
