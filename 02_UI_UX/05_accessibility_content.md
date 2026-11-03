# Accessibility, Copywriting, and Content Rules

## Accessibility
- Target WCAG 2.2 AA; manual keyboard navigation and visible focus states.
- All interactive elements semantic and labelled, min touch target ~44×44px recommended.
- Images have accurate alt text; decorative hero media can be `alt=""`; no data is conveyed solely through colour.
- Results/filter update announcements via `aria-live` judiciously; avoid noisy screen-reader updates.
- Form errors attached to inputs, summary shown on submit failure, help text available before validation.
- Motion respect `prefers-reduced-motion`; no forced auto-playing hero audio/video.
- Map offers full list alternative; location permission optional.
- Glass surfaces must remain readable; avoid text over uncontrolled image contrast.

## Content voice
Premium, clear, factual. No hype that implies guarantees. Preferred: “View seller details,” “Estimated savings,” “Manufacturer-claimed range,” “Availability not provided,” “Request a quote.” Avoid: “100% certified,” “Guaranteed 500 km,” “Instant loan approved,” “Live chargers everywhere,” unless genuinely supported and compliant.

## System copy examples
- Empty listings: “No EVs match these filters yet. Try a wider budget or another city.”
- Pending listing: “Submitted for review. We'll notify you when it's published or needs changes.”
- Battery badge disclosure: “Battery inspected on [date] by [provider]. Open report for test method.”
- Charging unknown: “Connector information available. Current availability was not provided by this operator.”
- Calculator caveat: “Estimated energy cost difference only. Actual results depend on charging mix, efficiency, driving conditions and other ownership costs.”
- Partner consent: “I agree that EVONE may share my contact details and selected vehicle with [named partner] to respond to this [loan/insurance] enquiry. I can withdraw future contact permission.”
- Payment pending: “Your payment is being confirmed. Please don't pay again until order status updates.”

## Localization
India-first: INR ₹, km, kWh, kW, city names, PIN codes and `en-IN` number formatting. Future support for Kannada/Hindi via localization-ready keys rather than literal strings in components. Never translate OEM technical standards inaccurately.

## Content source integrity
Each editorial and catalogue claim should record source URL, date checked, writer/reviewer and status. Use rights-cleared images; do not download/reuse third-party OEM editorial images without license. Distinguish sponsored content and independent editorial if monetized.
