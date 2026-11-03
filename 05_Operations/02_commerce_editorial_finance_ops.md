# Commerce, Editorial and Partner Lead Operations

## Accessories merchant operations
MVP merchant is EVONE or identified contracted merchant (define legal entity before checkout). Ops maintain SKU, tax class, availability, allowed serviceable PINs, stock count, packing/shipping, courier/tracking, cancellation and refund. Stock reconciliation at end of day; manual exception queue for payment mismatch, shipping issue or lost parcel. Product compatibility owner signs off model mapping.

## Finance/insurance partner operations
1. Partner diligence and **legal approval** of role/fees/consent language.
2. Assign partner ID, approved lead fields, encrypted delivery credentials, agreed status ACK and deletion/withdrawal rules.
3. Consumer reads purpose and opts in separately for loan or insurance.
4. Lead queued only if approved consent and partner status valid.
5. Dispatch via controlled adapter; log status, not full personal payload.
6. Support customer inquiries and opt-out; stop retries on withdrawal.
7. Finance dashboard restricted to named operations roles; audit exports.

Do not use phrases like “guaranteed loan”, “instant eligibility” or “insurance approved.” If lead fees or product comparisons are regulated, block launch until the appropriate authorization and contract structure are settled.

## Editorial operations
- Content planning: new EV launches, honest model comparisons, EV ownership tips, charging and policy explainers.
- Writer records OEM/regulator/source URL, review date, image license and factual reviewer before publication.
- Article statuses Draft → Review → Published → Archived. Corrections note date and substance; stale price/launch dates reviewed.
- Paid/sponsored content clearly disclosed; editorial ranking separate from ad deals.
- Avoid scraping articles in full or using OEM copyrighted images without rights.

## Catalogue data governance
Track variant release/update sources; field-level provenance for charging capability, range test cycle, price by region and date. Assign owner for monthly spec/price audits. Use 'Not confirmed' instead of plausible invented values.

## Charging data quality
Store provider mapping, timestamp, connector compatibility and source attribution. Reported station errors enter human review and are not automatically treated as official operator status. Missing live feeds render 'Availability not provided' until upgraded.
