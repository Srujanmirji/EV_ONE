# Formula Specifications: EV Savings and EMI

## Purpose
Provide transparent financial *estimates*, not false guarantees. Calculation engine is deterministic, independently unit-tested and reused by website/API/mobile. Money calculations use decimal arithmetic, rounding only at display boundary.

## Inputs and validation
- `monthlyKm`: positive number; for UI suggest 100–10,000, allow 0 with a no-driving result if useful.
- `fuelPriceInrPerLitre` >0, `iceKmPerLitre` >0.
- `evKwhPerKm` >0 (if UI takes kWh/100km, divide by 100 exactly).
- `electricityInrPerKwh` ≥0.
- Optional public charging share `p ∈ [0,1]`, home tariff `Th`, public tariff `Tp`, charging loss `loss ∈ [0,1)`.
- Optional ICE vs EV purchase price delta, maintenance deltas, depreciation **separate** from energy savings.

## Equations
```text
iceMonthlyLitres = monthlyKm / iceKmPerLitre
iceMonthlyCostInr = iceMonthlyLitres * fuelPriceInrPerLitre
weightedTariffInrKwh = (1 - p) * homeTariff + p * publicTariff
billedEvKwh = monthlyKm * evKwhPerKm / (1 - chargingLossFraction)
evMonthlyCostInr = billedEvKwh * weightedTariffInrKwh
monthlyEnergySavingsInr = iceMonthlyCostInr - evMonthlyCostInr
annualEnergySavingsInr = monthlyEnergySavingsInr * 12
paybackMonths = ceil(positivePurchasePriceDeltaInr / positiveMonthlyNetSavingsInr)
```
Only calculate payback if net monthly savings >0; if not display “No break-even within this scenario.” Optional monthly maintenance savings must be itemized separately from base energy calculation.

## Verified example
At 1,000 km/month, 15 km/L ICE, ₹100/L fuel, 0.15 kWh/km EV and ₹8/kWh with 0% charging loss: ICE ₹6,666.67/month; EV ₹1,200/month; energy savings ₹5,466.67/month; annual energy savings ₹65,600.00 (calculated before display rounding). With an EV purchase premium of ₹2 lakh and no other differences, payback `ceil(200000/5466.666...) = 37` months. All assumptions illustrative.

## EMI formula
For principal `P` INR, nominal annual rate `r`% and `n` monthly payments, monthly rate `i = r / 1200`:
```text
EMI = P * i * (1+i)^n / ((1+i)^n - 1)
if i == 0: EMI = P / n
```
Reject negative principal/rate, `n≤0`; set upper reasonable bounds and disclose processing fees, APR and partner rate uncertainty. Never call estimate a binding offer.

## Test cases
1. Standard example above matches expected output before/display after rounding.
2. Zero monthly kilometres → zero energy cost; payback N/A.
3. 100% public charging (p=1) → public tariff used.
4. EV electricity cost > ICE fuel cost → negative energy savings shown honestly.
5. Zero EV premium → 0-month simplistic payback, explained.
6. Negative purchase delta → “EV cheaper up front”; no misleading payback.
7. Zero-interest EMI yields P/n; standard interest matches independent finance calculator to stated precision.
8. Invalid unit text or division by zero rejected.
9. Rounding from ₹ to paise consistent; no floating-point accumulation errors.

## EV-048 implementation boundary

The pure engine and `POST /calculators/ev-savings` implement the base energy equations with the existing single effective electricity tariff contract. Input bounds and six-decimal precision are enforced by shared Zod schemas. Values are converted to millionths and computed with BigInt rational arithmetic, then each output rounds once to paise (halves away from zero). Annual costs and savings use unrounded monthly values. Payback uses exact savings and returns null if its integer month count is unsafe to represent. A zero premium means no upfront premium to recover; a negative premium is cheaper up front, not a negative payback.

Home/public mixing and charging-loss/maintenance/financing parameters remain outside this base endpoint. Callers supply an effective tariff; outputs list exclusions. Full validation bounds and rounding semantics are in `API_CONTRACT.md`. Calculator UI is EV-049; homepage teaser is EV-050.
