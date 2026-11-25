# Mobile App Stack (iOS and Android)

Extends `TECH_STACK.md` (Mobile: React Native + Expo, later) and `07_mobile_progressive.md`. **Decided** = named in existing docs. **Suggested** = proposal to fill a gap; record the choice in an ADR before use. Designs: `02_UI_UX/09_mobile_app/`.

## Core

| Tool | Role | Status |
|---|---|---|
| React Native + Expo (managed) | One codebase for iOS and Android | Decided |
| TypeScript (strict) | Same as the monorepo | Decided |
| expo-router | File-based navigation, deep links | Decided |
| `apps/mobile` in pnpm + Turborepo | Lives beside web and api | Decided |
| `packages/contracts` (Zod) | Same validation on the phone as on the API | Decided |
| `packages/sdk` | Generated typed client; no direct fetches | Decided |
| NestJS API `/api/v1` | Same backend; no mobile-only server | Decided |
| Separate native UI components | Web `@evone/ui` is not reused; tokens are copied as values | Decided |

## Features

| Tool | Role | Status |
|---|---|---|
| Clerk Expo SDK | Sign-in with the same JWT the API verifies | Suggested (Clerk is the EV-005 spike) |
| expo-secure-store | Tokens in Keychain / Keystore | Decided (secure credentials) |
| expo-location | Chargers near me; handles denial | Decided (native permissions) |
| react-native-maps | Charging map | Decided (native maps); library suggested |
| expo-notifications + Expo Push | Enquiry replies, listing review, orders | Decided (notifications); service suggested |
| expo-image, expo-image-picker | Galleries and sell-flow photos via R2 presigned uploads | Suggested |
| Razorpay React Native SDK | Accessory checkout only, if store rules allow | Suggested |
| TanStack Query | Caching, retries, offline-aware fetching | Suggested |
| React Hook Form + zodResolver | Forms validated by shared schemas | Suggested |
| Reanimated, Gesture Handler, @gorhom/bottom-sheet | Sheets, gestures, smooth navigation | Suggested |
| expo-font | Manrope, Inter, Michroma (licence check) | Suggested |
| NetInfo | Offline banner and safe retries | Suggested |
| Sentry React Native | Crash reporting with PII scrubbing | Decided (crash reporting); tool suggested |
| PostHog React Native | Data-minimised analytics | Suggested |

## Build and release

| Item | Notes | Status |
|---|---|---|
| EAS Build / Submit / Update | Cloud builds, store submission, over-the-air JS fixes | Suggested |
| Expo Dev Client | Test native modules (maps, push) | Suggested |
| GitHub Actions | Lint, typecheck, tests, EAS build per PR | Suggested |
| Jest + RN Testing Library, Maestro | Unit and device end-to-end tests | Suggested |
| Environment config | `app.config.ts` + EAS env per dev / staging / prod; no secrets in the bundle | Suggested |

## Store and platform requirements

- Apple Developer and Google Play Console accounts.
- In-app account deletion (Apple requirement; matches CORE-02).
- Apple privacy manifest and Google Play Data Safety form.
- Privacy policy and support URLs.
- Sign in with Apple must be offered on iOS if Google sign-in is offered.
- Check store payment rules before shipping accessory checkout (physical goods normally use the app's own payment provider).

## Backend work needed before the app ships

- Accept the app as a token audience / authorised party in API auth.
- Device push-token table and a sender in the BullMQ worker.
- Deep-link routes (`/used-evs/[slug]`, `/evs/...`) with Universal Links and Android App Links.

## Not in scope

Tablet layouts, offline caching of private data, live charger status without a provider contract, vehicle checkout.
