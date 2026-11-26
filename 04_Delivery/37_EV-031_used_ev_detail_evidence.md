# EV-031 — Used EV detail evidence

The listing card opens `/used-evs/[slug]`. The server uses the generated SDK to read published detail and related listings. A route layout checks listing visibility before streaming so direct requests for missing listings return HTTP 404. The detail uses EVONE’s 60/40 layout above 768px and a fixed contact action at 768px and below.

The detail displays the asking price in INR, seller-declared condition and vehicle details, individual seller type, and catalogue specifications with individual citations, review dates and a range test standard when supplied. Unknown specs render as an em dash. The canonical URL uses the returned slug. Demo pages retain noindex and omit vehicle structured data. For non-demo listings, structured data uses the returned vehicle and asking price fields.

## Verification

| Command | Result |
| --- | --- |
| `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build` | Passed |
| `pnpm --filter @evone/web test:e2e` | 256 passed, 4 existing viewport skips. The detail, enquiry link, axe checks and HTTP 404 passed at 375, 768, 1280 and 1920px. |
| `pnpm test:integration` | 256 passed (52 database and 204 API/queue). |
| `git diff --check` | Passed |

Database checks used disposable PostgreSQL 18 and Redis on loopback. The local database used all migrations except the PostGIS extension setup. The web suite used installed Chrome through `PW_CHROMIUM_EXECUTABLE`. Screenshots show the existing synthetic used-listing fixture through the real API. A separate Chromium keyboard pass used reduced motion and checked focus visibility, viewport overflow and focus transfer to the contact section. A loopback fixture returned HTTP 503 once and then served the demo listing after the Retry action.

- [390px mobile](evidence/EV-031/ev031-used-ev-detail-390.png)
- [1280px desktop](evidence/EV-031/ev031-used-ev-detail-1280.png)

## Open acceptance items

The public listing endpoint returns ordered photo descriptions. Displaying the photos requires a public media URL contract and approved delivery path. The page shows the gallery’s unavailable state and the seller’s descriptions. The Enquire link focuses the seller contact section, where the current availability is explained. Enquiry submission belongs to EV-034.

EV-031 stays open while photo delivery is unavailable and EV-029 remains in progress pending live Clerk acceptance. The API contract is unchanged.
