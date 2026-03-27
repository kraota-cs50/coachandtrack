# CoachAndTrack — Project Status
**Last updated:** 2026-03-27
**Repo:** github.com/kraota-cs50/coachandtrack
**Branch:** master

---

## Site Overview

Static HTML/CSS/JS fitness coaching marketplace. No framework — pure HTML files served as-is (Netlify or similar). Dark design system with orange accent.

**Live pages:**

| File | Purpose |
|------|---------|
| `index.html` | Main landing page (~2200+ lines) |
| `about-us.html` | Founder + team page |
| `become-a-coach.html` | Coach application page |
| `contact.html` | Contact form |
| `faq.html` | FAQ page |
| `welcome.html` | Post-payment onboarding (noindex) |
| `coaches/veronica-mosquera.html` | Veronica's profile |
| `coaches/rolando-corzo.html` | Rolando's profile |
| `coaches/coach-template.html` | Reusable template ({{PLACEHOLDERS}}) |
| `programs/strength-foundation-day1.html` | Free sample program |
| `programs/nutrition-plan-week1.html` | Free sample nutrition plan |

---

## Coaches

### Veronica Mosquera
- **Specialty:** Strength & Nutrition Coach
- **Photo:** `/images/veronica-mosquera.jpg`
- **Profile:** `/coaches/veronica-mosquera.html`
- **Status:** Live — 2 programs (Strength Foundation, Nutrition Reset)
- **Languages:** EN / ES

### Rolando Corzo
- **Specialty:** Strength & Performance Coach
- **Photo:** `/images/rolando-headshot.jpg` (hero card + profile)
- **Profile:** `/coaches/rolando-corzo.html`
- **Intro video:** Mux — playback ID `7T01DmCNYFZINf9dUK4YfPcREMLLAMEUAgQkJML7ec3U`
- **Status:** Live — programs coming soon
- **Certifications:** ISSA Personal Trainer, Corrective Exercise, Strength & Conditioning, Glute Specialist, Nutritionist
- **Languages:** EN / ES

---

## Video Infrastructure

| Field | Value |
|-------|-------|
| Provider | Mux |
| Asset ID | `ZbwBZAxtWhJK0001FzAMB3Lh5YiBARFBp2tzRKWryyQp4` |
| Playback ID | `7T01DmCNYFZINf9dUK4YfPcREMLLAMEUAgQkJML7ec3U` |
| Status | `ready` |
| Source file | `All-Docs/Rolando Corzo/Rolando Photos/Rolanco_Presentation.mp4` |
| Embed | `https://player.mux.com/{playback_id}` |

Mux credentials stored in `.env` (gitignored). Token ID/Secret also in Netlify environment variables.

---

## Payments (Stripe)

- Pro ($14/mo) and Elite ($29/mo) buttons are currently **disabled "Coming Soon"** placeholders
- No live Stripe links in the codebase yet
- When Stripe is activated: success URL must be configured in **Stripe Dashboard** (not as URL param)
- Success URL target: `https://coachandtrack.com/welcome.html`
- Code comment added above both buttons as a reminder

---

## Analytics

- Google Analytics: `G-MGRQKRPPXV` (gtag.js, in `index.html`)

---

## Design System

| Token | Value |
|-------|-------|
| `--dark` | `#0D0D14` |
| `--orange` | `#F97316` |
| `--green` | `#22C55E` |
| `--dark-card` | `#13131E` |
| `--dark-elevated` | `#1A1A2E` |
| `--border` | `#2A2A3E` |
| `--text` | `#F3F4F6` |
| `--text-muted` | `#94A3B8` |
| `--text-dim` | `#64748B` |
| `--radius` | `16px` |

**Fonts:** Bebas Neue (headings) + DM Sans (body) via Google Fonts

---

## Known Issues / To Do

- [ ] Activate Stripe Pro + Elite payment links
- [ ] Add more coaches (template ready at `coaches/coach-template.html`)
- [ ] Build out full program library (currently 2 free samples)
- [ ] Veronica intro video — not yet on Mux (only Rolando's uploaded)
- [ ] App mockup section in index.html uses placeholder UI — not a real app yet
- [ ] welcome.html links to program pages that are stubs

---

## File Inventory

```
fitpro-app/
├── index.html
├── about-us.html
├── become-a-coach.html
├── contact.html
├── faq.html
├── welcome.html
├── .gitignore          (excludes .env, node_modules, mux-upload.js)
├── .env                (gitignored — Mux credentials)
├── mux-upload.js       (gitignored — Mux direct upload helper)
├── package.json        (node deps: @mux/mux-node, dotenv)
├── coaches/
│   ├── veronica-mosquera.html
│   ├── rolando-corzo.html
│   └── coach-template.html
├── programs/
│   ├── strength-foundation-day1.html
│   └── nutrition-plan-week1.html
├── images/
│   ├── veronica-mosquera.jpg
│   ├── rolando-corzo.jpg
│   └── rolando-headshot.jpg
├── docs/
│   └── PROJECT_STATUS.md   ← this file
└── All-Docs/               (source assets — not deployed)
```
