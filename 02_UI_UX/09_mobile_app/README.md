# EVONE Mobile App — Design Package

**Status:** proposed design, not approved and not implemented. Native app work is task **EV-085** (P1), which `03_Engineering/07_mobile_progressive.md` says to start only after a measured mobile need. Nothing here marks a task complete.

**Live design canvas:** https://claude.ai/artifact/GL7TLYFa7FjSqURsnKK1Hg (private; share from the page's Share menu).
**Blueprint summary page:** https://claude.ai/artifact/HEtRsajgXxTsfoMRuQ27YF

## What exists

| Canvas page | Contents |
|---|---|
| iOS app · Batch 1–8 | 145 iPhone screens (393×852) + foundations board + shared components |
| Android · Batch 1–8 | The same 145 screens adapted for Android (412×915) |
| Mobile flows v1 | Earlier 23-screen exploration (superseded by the batches) |
| Design system + Homepage | Web design system, desktop and mobile homepage from the master brief |

Every screen is a clickable prototype: press Play on any frame. Screens link to each other through the tab bar and in-screen actions.

## Visual direction

Taken from the owner's reference images (Nov 2026): dark cinematic surfaces, thin wide-spaced **EVONE** wordmark, frosted-glass panels over soft silver light, white pill primary buttons, and a floating tab bar with a central ⚡ Charging button.

## Files in this folder

1. [`01_mobile_design_system.md`](01_mobile_design_system.md) — tokens, type, glass recipe, components
2. [`02_screen_inventory.md`](02_screen_inventory.md) — all 145 screens with iOS and Android file names
3. [`03_mobile_user_flows.md`](03_mobile_user_flows.md) — journeys mapped to screen numbers
4. [`04_content_and_data_rules.md`](04_content_and_data_rules.md) — honesty, privacy, consent and payment rules shown in the designs
5. [`05_android_adaptations.md`](05_android_adaptations.md) — what differs on Android
6. [`06_open_decisions.md`](06_open_decisions.md) — conflicts with approved docs and items needing an owner decision

Engineering side: [`../../03_Engineering/08_mobile_app_stack.md`](../../03_Engineering/08_mobile_app_stack.md).

## Known gaps

- Car images are a drawn placeholder component (`IosCar`); licensed photography is needed.
- All vehicles, prices, dealers, counts and articles are **sample content**.
- Screens were not reviewed rendered on device; check spacing at 360 px and with large text.
- Tablet and landscape layouts are not designed.
