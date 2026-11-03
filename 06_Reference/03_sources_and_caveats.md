# External Sources, Documentation and Caveats

**Last manual check:** 2026-11-03. Links are references for implementation review; they do not constitute legal signoff. Read official current versions and partner contracts before production.

## Primary technical sources
- Google Places supported place types, including `electric_vehicle_charging_station`: https://developers.google.com/maps/documentation/places/web-service/place-types
- Google Places API RPC fields `EVChargeOptions` and `ConnectorAggregation` including optional availability timestamp/count: https://developers.google.com/maps/documentation/places/web-service/reference/rpc/google.maps.places.v1
- Prisma ORM PostGIS extension (newer Prisma versions; pin versions): https://www.prisma.io/docs/orm/extensions/postgis
- Next.js official documentation: https://nextjs.org/docs
- NestJS official docs: https://docs.nestjs.com/
- PostgreSQL/PostGIS: https://postgis.net/documentation/
- Razorpay: https://razorpay.com/docs/payments/
- Expo: https://docs.expo.dev/
- Cloudflare R2: https://developers.cloudflare.com/r2/

## India privacy and regulated finance sources
- MeitY DPDP Rules 2025, enforcement timeline and notifications: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025%3B
- RBI (Digital Lending) Directions, 2025 text (RBI document mirrored via financial industry association): https://www.fidcindia.org.in/wp-content/uploads/2025/05/RBI-DIGITAL-LENDING-DIRECTIONS-08-05-25.pdf
- Govt of India insurance regulations listing, including IRDAI Insurance Web Aggregators Regulations: https://financialservices.gov.in/insurance-act-1938-and-insurance-regulatory-and-development-authority-act-1999

## Boundaries and disclaimers
- The image `assets/approved_ui_reference.png` is generated concept art. It shows decorative sample prices, badges and platform metrics; none are verified or endorsed as live facts.
- EVONE is a *working brand name*. Trademark/domain status, corporation existence, third-party partnerships and regulatory permissions were **not** verified in this project pack.
- Cost estimates and deadlines are planning hypotheses. No user/revenue/market metrics assumed.
- Real-time charger availability is a per-source optional field, subject to freshness, rights and coverage; default status unknown.
- Finance and insurance lead business models can trigger significant regulation. Consult qualified India counsel and contracted partners before displaying comparisons or selling leads.
- Battery condition is never inferred accurately from age/mileage alone.
- External links/technical versions will change; pin tested dependencies, update this file after decisions.
