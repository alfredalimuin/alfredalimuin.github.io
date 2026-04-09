# GHL Practice Scenario — AlphaClean Pro

**Business:** Local residential cleaning company  
**Goal:** Automate lead capture, follow-up, and booking

---

## 1. Sub-Account Setup
- Create a sub-account for "AlphaClean Pro"
- Set up business info, timezone, logo
- Add a test phone number (Twilio / LC Phone)

---

## 2. Pipeline
**Name:** Booking Pipeline  
**Stages:**
1. New Lead
2. Contacted
3. Appointment Set
4. Confirmed
5. Job Complete
6. Review Requested

---

## 3. Lead Capture (Funnel)
- Build a funnel with 2 steps: Opt-in Page → Thank You Page
- Opt-in form fields:
  - First Name
  - Phone
  - Email
  - Service Needed (dropdown):
    1. Standard Cleaning
    2. Deep Cleaning
    3. Move-In Cleaning
    4. Move-Out Cleaning
    5. Recurring / Weekly
    6. Office / Commercial
    7. Other — I'll explain
- Submit button text: **"Get My Free Estimate →"**
- On submit → redirect to Thank You page

---

## 4. Core Automation — "New Lead Follow-Up"
**Trigger:** Form submitted

| Step | Delay | Action |
|------|-------|--------|
| 1 | Immediately | SMS: "Hi [Name], thanks for reaching out to AlphaClean Pro! We'll call you shortly to book your free estimate." |
| 2 | Immediately | Send email with service overview |
| 3 | Immediately | Move contact to **New Lead** stage |
| 4 | +2 min | Internal notification to assign to a user |
| 5 | +1 hour | If no reply → follow-up SMS |
| 6 | +24 hours | If still no reply → final follow-up SMS |

---

## 5. Appointment Booking
- Set up a **Calendar** in GHL
- Send calendar link via automation or embed on Thank You page
- When booked → move contact to **Appointment Set** stage

---

## 6. Appointment Reminder Automation
**Trigger:** Appointment scheduled

| Step | Timing | Action |
|------|--------|--------|
| 1 | 24 hrs before | SMS reminder + confirm/cancel link |
| 2 | 1 hr before | Final SMS reminder |
| 3 | If no-show | Move to no-show stage → trigger re-booking SMS |

---

## 7. Post-Job Review Request
**Trigger:** Contact moved to "Job Complete" stage

| Step | Delay | Action |
|------|-------|--------|
| 1 | Wait 2 hours | — |
| 2 | — | Email: "Thanks for choosing AlphaClean Pro! We'd love your feedback — [Google Review Link]" |

---

## Stretch Goals
- Missed call text-back automation
- Re-engagement campaign for leads cold after 7 days
- Reporting dashboard for pipeline conversion
- Webhook → send contact data to Google Sheet via Make/Zapier
