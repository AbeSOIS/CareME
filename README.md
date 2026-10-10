# Care Me — digital counselling platform (prototype)

A frontend-only, runnable prototype of the Ministry's **Care Me** platform. It has three areas in one responsive web app:

- **Public and Beneficiary**
- **Counsellor Portal**
- **Administration Portal**

Everything runs in the browser. There is no backend: a mock REST API persists data to `localStorage`.

> **All people, cases and contact details are fabricated.** The only real figures are the Kalutara January–June 2026 district totals, taken from the progress deck.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`), then production build |
| `npm test` | Vitest: domain rules, mock-API integration tests, translation parity |
| `npm run lint` | oxlint (with `jsx-a11y`) |
| `npm run i18n:check` | Every `t('…')` key used in `src/` exists, and `si`/`ta` match `en` |

**Reset demo data** is in the footer. It wipes every `careme:*` key and re-seeds. Seeded times are relative to *now*, so there are always upcoming slots, and Nimali always has a session starting within about 10 minutes.

## Demo accounts

All passwords are `Demo@1234`. The demo one-time code (OTP / MFA) is `123456` and is shown on screen.

| Account | Role | Good for |
| --- | --- | --- |
| `nimali@example.lk` | Beneficiary | Joining the session room; late cancellation of the session within 24 h; self-assessment history |
| `sanduni@example.lk` | Beneficiary | All 8 of 8 sessions used, so booking is blocked |
| `0770000103` | Beneficiary (minor, 16) | Parent or caregiver consent is on file |
| `dilini@careme.gov.lk` | Counsellor, and **Emergency Officer this week** | Case records, Forms A/B/Assessment, alert queue, handover |
| `tharshini@careme.gov.lk` | Counsellor (Tamil / Sinhala / English) | Next week's Emergency Officer |
| `ruwan@careme.gov.lk` | Counsellor (Sinhala + sign language) | Sign-language search |
| `admin@careme.gov.lk` | Administrator (MFA required) | Every admin page |
| `analyst@careme.gov.lk` | Analyst (Dashboard Officer / Counselling Unit) | Dashboard and reports only |

**Anonymous use.** Without logging in, you can take self-assessments, read resources, search and book, and raise an emergency alert.

Booking anonymously creates the beneficiary record at that point (FR-010), plus a *guest* session in that browser tab so you can manage the booking. Create an account with the same mobile number to come back later.

## Things to try

- **Language.** The interface defaults to Sinhala. Switch with **සිංහල / தமிழ் / English** in the header; the whole UI and `<html lang>` change.
- **Anonymous self-assessment.** Results are shown on screen only. Nothing is written to storage (covered by a test).
- **Fallback when there is no counsellor.** Search **Vavuniya + Tamil**. You'll see:
  1. the earliest *remote* Tamil counsellor;
  2. other languages, offered only if you confirm you can use them;
  3. a callback or waitlist request, plus emergency numbers.
- **Booking rules:**
  - Session cap: as Sanduni, the 9th session is blocked.
  - Late cancellation: Nimali's session within 24 h asks for explicit confirmation and is recorded as a *late cancellation* that counts towards the cap. Changing the time inside the notice period is blocked.
  - No-show: a confirmed session not joined within 15 minutes is marked missed.
- **Minors.** Book anonymously with a date of birth under 18. The parent / caregiver consent step is required, and there is a "no safe caregiver" path that notifies safeguarding.
- **Emergency.** Raise an alert from `/emergency` (the phone number is optional). Then:
  1. Log in as Dilini and open **Emergency alerts**.
  2. **Acknowledge**, **Escalate** and **Record outcome**.
  3. Unacknowledged alerts escalate automatically every 10 minutes.
  4. Once escalated, the person who raised the alert is shown 119.
- **Counsellor.** Open **Clients and cases → Nimali** to see:
  - Screening (Form A), with skip logic;
  - Intake (Form B, C–F), with dated Intake and Follow-up rating scales compared side by side;
  - the Assessment form;
  - notes, referrals (outbound), follow-ups and the progress chart.

  Under **Referrals → Record an external referral**, a duplicate check runs first. You can then link an existing person or create one *pending registration*.
- **Dashboard.** Auto-refreshes every 15 minutes, has an on-demand **Refresh now** button and a *Last refreshed* timestamp, and filters by district, gender, age group and period.
- **Reports.** The Monthly progress report (Kalutara, deck layout), Operational, Management, Group session and Emergency alert reports. **CSV export is real** (UTF-8 with a BOM so Sinhala and Tamil open in Excel). Excel and PDF are stubbed.
- **Role guards.** As a beneficiary, open `/admin/users` and you get a 403. The mock API enforces the same rules (for example, admins never receive clinical notes).

## Architecture

```
src/
  config/      defaults.ts (placeholder settings), assessments.ts (self-assessment tools), forms.ts (Form A/B/Assessment fields in si/ta/en)
  data/        seed.ts (fabricated demo DB), stats.ts (dashboard records), districts / DS divisions, Kalutara deck figures, resources
  domain/      pure, unit-tested rules: bookingRules, slots, alerts, permissions, scoring, age
  services/    storage.ts (localStorage), mockApi.ts (axios adapter + router), handlers/* (mock REST API), api.ts (typed client), exportCsv.ts
  store/       zustand: auth, appointments, cases, alerts, ui, settings
  i18n/        en.json, si.json, ta.json (1020 keys each)
  components/  ui/ (Button, Input, Select, Modal, Tabs, Badge, DataTable…), layout/, forms/, charts/, feature/
  pages/       public/, beneficiary/, counsellor/, admin/
  routes/      router.tsx, RequireRole.tsx
```

### Swapping in a real API

Every request goes through the axios instance in `services/mockApi.ts`. Set `VITE_API_BASE_URL` and the mock adapter is skipped, so the same `services/api.ts` calls hit the real REST API (ARC-004). The mock handlers in `services/handlers/` document the expected endpoints and payloads.

### Privacy

- Personal data (`beneficiaries`) and clinical records (`cases`) are separate collections, linked by ID (DAT-008).
- The beneficiary record is created only at booking or during a session (FR-010).
- Anonymous self-assessments never leave component state.
- Notifications use minimal content (FR-063): no names, no clinical detail.
- The session room has no recording, and no media is captured.
- Fonts are bundled locally (`@fontsource`), so no third-party font CDN is used.
- The login token lives in `sessionStorage`: closing the tab signs you out. Idle timeout is 15 minutes, with a 60-second warning.

### Design system

- **Colour.** One `brand` scale (blue) defined in `src/styles/index.css`. `brand-700` is the
  primary action and `brand-600` the focus ring; `brand-500` is for charts only, never text on
  white. Semantic tones map onto Tailwind's stock `green` / `amber` / `red`, and red is reserved
  for emergency and destructive actions. Every tone is paired with an icon or label, never colour
  alone. All pairs are verified against WCAG AA in both themes.
- **Type.** Eight semantic tokens — `display`, `h1`, `h2`, `h3`, `lead`, `body`, `body-sm`,
  `caption` — used instead of raw `text-xs … text-5xl`. Sizes are fluid (`clamp`) and in `rem`, so
  browser zoom still works at 200%. `text-xs` is removed from the build entirely
  (`--text-xs: initial`), so it cannot be used by accident.
- **The floor is a Latin floor.** 14px (`text-caption`) is the minimum for **Latin** text. Sinhala
  and Tamil glyphs have a much larger apparent size at the same point size, so under `:lang(si)` /
  `:lang(ta)` the whole scale steps down: body is 15px and captions are 13px. Those are the same
  *apparent* size as 16px and 14px Latin, not a smaller one.
- **Sinhala and Tamil.** The `:lang()` blocks set **custom properties only** — never `font-size`
  directly, because `:lang` matches every descendant and a `font-size` there would hit every
  heading too and flatten the hierarchy. Line height increases so vowel signs are never clipped,
  and weight 700 maps to the real 600 face: Noto Sans Sinhala/Tamil ship 400/600 only, so asking
  for 700 would synthesise a smeared bold. A `:lang(en)` block restores the Latin scale for English
  content embedded in a Sinhala or Tamil page (assessment items, untranslated resources).
- **Form controls are pinned to 16px in every language** via a separate `--text-control` token that
  the `:lang` blocks deliberately do not override — Safari on iOS zooms the page whenever a focused
  field is under 16px.
- **Theme and language are applied before first paint** by a small inline script in `index.html`,
  so dark mode does not flash light and Sinhala does not render one frame at Latin heading sizes.

### Accessibility (WCAG 2.2 target)

- Visible focus rings; touch targets of at least 44px (40px only in dense staff tables); a skip link.
- Every input has a label; errors are linked with `aria-describedby`.
- ARIA tabs with arrow-key navigation; native `<dialog>` modals that return focus to the opener.
- Rating scales are native radio groups.
- Charts have a legend and a data-table view, and use a CVD-validated palette with separate dark-mode steps.
- `prefers-reduced-motion` is respected; dark mode is available.
- Layouts are checked at 360, 390, 768 and 1280px with no horizontal page scroll.

## Requirement map (main IDs)

| Area | Requirements | Where |
| --- | --- | --- |
| Auth, MFA, OTP, lockout, recovery, idle timeout, devices | FR-001–008 | `pages/public/{Login,Register,Recover,Security}Page`, `hooks/useIdleTimeout`, `handlers/auth.ts` |
| Anonymous access, record created at booking | FR-009/010 | `handlers/booking.ts` (`POST /appointments`) |
| Profile, notifications, consent, erasure, language | FR-011–015 | `pages/beneficiary/*`, `LanguageSwitcher` |
| Search, availability, book / cancel / reschedule, reassignment, no-show | FR-016–023 | `CounsellorSearchPage`, `BookingPage`, `MyAppointmentsPage`, `domain/bookingRules.ts` |
| Self-assessments | FR-024–030 | `config/assessments.ts`, `SelfAssessmentRunner` |
| Client tools (Forms A, B, Assessment) | FR-031, FR-068 | `components/forms/*`, `config/forms.ts` |
| Session room shell (no recording) | FR-033/034, NFR-013 | `SessionRoomPage` |
| Group sessions (capacity, enrolment, attendance) | FR-037–041 | `pages/admin/GroupsPage` |
| Resource centre and publishing | FR-045–050, FR-078 | `ResourcesPage`, `admin/ContentPage` |
| Emergency: roster, routing, ack, escalation, outcome, handover, anonymous phone | FR-051–059, FR-083 | `EmergencyPage`, `AlertsPage`, `AlertPanel`, `admin/RosterPage`, `domain/alerts.ts` |
| Minimal-content notifications | FR-063 | `NotificationsMenu`, `booking.previewSms` |
| Counsellor portal: availability, accept / reject, notes, case record, referrals, follow-ups | FR-064–073 | `pages/counsellor/*` |
| Admin: accounts, counsellor profiles, roles, settings, audit | FR-074–083 | `pages/admin/*` |
| No-slot routing, minors, maintenance notice | FR-084–086 | `CounsellorSearchPage`, `ConsentGate`, `MaintenanceBanner` |
| Reports and dashboard | REP-001–009 | `admin/DashboardPage`, `admin/ReportsPage`, `handlers/reports.ts` |

## Open items needing Ministry input

These are **placeholders** in this prototype. The bid document's Annexes 3–6 contain no content.

- **Annex 3 — client tools.** Self-assessments use public-domain sample instruments: PSS-10, GAD-7, PHQ-9 and WHO-5. Item text is English only until validated translations are supplied. PHQ-9 item 9 triggers the emergency call-to-action.
- **Annex 4 — permission matrix.** A draft least-privilege default is in `domain/permissions.ts` and can be edited in **Roles and permissions**.
- **Assessment form wording.** The Sinhala text was read from the scan. The English and Tamil wording are draft translations awaiting verification.
- **Annex 5 — notification catalogue and dashboard indicators.** Not specified; sensible defaults are used.
- **Annex 6 — retention, consent wording, minor procedure and safeguarding route.**
  - The minor threshold is under 18.
  - Consent wording is versioned `draft-0.1`.
  - How a guardian's authority is confirmed is offered as a choice of options.
- **Configurable values.** All are placeholders, editable in **System settings**: idle timeout 15 min, lockout after 5 attempts, escalation 10 min, cancellation notice 24 h, no-show 15 min, group capacity default 12 / maximum 30.
- **Emergency numbers.** 119, 1926 and 1990 need confirming.
- **Translations.** Sinhala and Tamil UI strings are drafts for native-speaker review.
- **Kalutara deck inconsistencies:**
  - The individual-counselling total row says M 135 / F 243, but the rows themselves sum to M 147 / F 254 (401 in total). Row values are used.
  - Beruwala's awareness categories sum to 36 against a printed total of 32. Two categories were trimmed so the 165 total holds.
  - The deck has no monthly split or age groups, so both are fabricated.

## Out of scope in this prototype

- A real backend, real-time audio and video, and SMS / email / push delivery
- Native mobile apps
- Mood tracking and journaling (FR-042–044)
- Working text chat (only a session-room placeholder)
- File sharing
- Real Excel and PDF export
- Creating custom roles
