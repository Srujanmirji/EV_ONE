# Android Adaptations

One React Native + Expo codebase builds both apps. The Android screens (`And…` files) were converted from the iOS designs by script and then adjusted. Flows, links, interactions and data rules are identical.

| Area | iOS | Android |
|---|---|---|
| Frame | 393×852, notch and home indicator | 412×915, 40 px status bar, 24 px gesture bar |
| Navigation | Floating rounded tab bar, underline on active tab | Full-width glass navigation bar, pill indicator behind active icon, rounded-square ⚡ button |
| Back | Chevron, edge swipe | Arrow, system back gesture or button |
| Dialogs | iOS alert, centred text, side-by-side buttons | Material 3: 28 px corners, left-aligned title and body, text buttons right-aligned |
| Action sheets | iOS action sheet (Directions) | Material bottom sheet with drag handle and icon rows |
| Sign in | Email, phone OTP, Google, Apple | Email, phone OTP, Google (Apple hidden) |
| Biometrics | Face ID | Fingerprint unlock |
| OTP | Autofill from Messages | SMS code read with permission |
| Maps | Apple Maps first | Google Maps first |
| Payment | Razorpay (UPI, card, netbanking, EMI) | Same; UPI apps named (GPay, PhonePe, Paytm) |
| Accessibility | Dynamic Type, Reduce Motion | Font size, Remove animations |
| Touch | ≥ 44 pt | ≥ 48 dp; ripple on press in code |

## Implementation notes

- Use the platform's own back handling (React Navigation handles Android back).
- Request `POST_NOTIFICATIONS` on Android 13+ at the same moment the iOS design shows the notification explainer (screen 12).
- Draw edge-to-edge and pad for system bars with safe-area insets.
- Not yet designed: tablets, foldables, landscape, Material You dynamic colour (not planned; EVONE keeps its own palette).
