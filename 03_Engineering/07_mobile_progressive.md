# Mobile App Strategy and PWA Sequencing

## Decision
Launch mobile-responsive Next.js website first. Only build native Expo app when retention, notifications or measured mobile journey pain justify it. Native app uses same NestJS API/SDK but separate native UI primitives. Do not share shadcn web UI with React Native.

## MVP web mobile screens
Hero/search; used listings; details; Sell EV draft; catalogue/details/compare; accessories/cart/checkout; savings; charger map/list; journal; finance consent; account. Test 360px and 390px, low network quality, keyboard overlays, sticky CTAs, denied location.

## PWA option
Add installable PWA behavior after baseline SEO/CWV. Offline pages may cache public content only within content/provider license constraints; never cache private finance leads or charging 'live' status for offline display as current.

## Expo future structure
`apps/mobile` expo-router, secure credentials, shared contracts/SDK, React Native navigation, native maps and permissions, platform-specific notifications, crash reporting. Mobile checkout/payment flow must be validated against store billing/platform policy for the exact categories; physical goods/services generally differ from digital goods rules, but obtain current guidance before shipping.

## Trigger to build
Evidence: meaningful returning mobile audience, push notifications improve lead response, browser limitations materially hurt enquiry completion, and capacity for separate app store review/support.
