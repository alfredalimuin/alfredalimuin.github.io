# Reset Challenge — n8n Workflow Guide

## Overview

Two workflows to build in n8n:

| # | Workflow | Trigger | Purpose |
|---|---|---|---|
| 1 | **Checkout Session Creator** | Webhook (POST from funnel page) | Creates Stripe Checkout Session, returns URL |
| 2 | **Post-Payment Handler** | Webhook (Stripe event) | Sends welcome email + saves to Google Sheets |

---

## WORKFLOW 1: Checkout Session Creator

### Purpose
The funnel page POSTs `{ name, email }` to this webhook. n8n calls Stripe to create a Checkout Session and returns `{ url }` back to the page, which then redirects the user.

---

### Nodes

#### Node 1 — Webhook
- **Type:** Webhook
- **HTTP Method:** POST
- **Path:** `reset-challenge-checkout`
- **Response Mode:** Using 'Respond to Webhook' node
- Copy the **Production URL** — paste it into `reset-challenge-checkout.html` as `N8N_CHECKOUT_WEBHOOK`

---

#### Node 2 — HTTP Request (Create Stripe Checkout Session)
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://api.stripe.com/v1/checkout/sessions`
- **Authentication:** Header Auth
  - Header Name: `Authorization`
  - Header Value: `Bearer YOUR_STRIPE_SECRET_KEY`
- **Send Body:** ON
- **Body Content Type:** Form (application/x-www-form-urlencoded)
- **Body Parameters:**

```
line_items[0][price_data][currency]          = usd
line_items[0][price_data][product_data][name] = Reset Challenge — 30 Days
line_items[0][price_data][unit_amount]        = 3000
line_items[0][quantity]                       = 1
mode                                          = payment
customer_email                                = {{ $json.body.email }}
metadata[name]                                = {{ $json.body.name }}
metadata[email]                               = {{ $json.body.email }}
success_url                                   = YOUR_HOSTED_URL/reset-challenge-success.html
cancel_url                                    = YOUR_HOSTED_URL/reset-challenge-checkout.html
```

> Replace `YOUR_HOSTED_URL` with your GitHub Pages URL or wherever the HTML files are hosted.

---

#### Node 3 — Respond to Webhook
- **Type:** Respond to Webhook
- **Respond With:** JSON
- **Response Body:**
```json
{
  "url": "{{ $json.url }}"
}
```

---

### Flow
```
Webhook → HTTP Request (Stripe) → Respond to Webhook
```

---

## WORKFLOW 2: Post-Payment Handler

### Purpose
Stripe sends a `checkout.session.completed` event to this webhook after payment. n8n sends a welcome email and logs the customer in Google Sheets.

---

### Step 0 — Register Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL:** your n8n webhook URL (Node 1 below — copy Production URL first)
4. **Events to listen to:** `checkout.session.completed`
5. After saving, click **Reveal** under **Signing secret** — copy `whsec_...`
6. Store this as a credential in n8n or use it in the verification step

---

### Nodes

#### Node 1 — Webhook
- **Type:** Webhook
- **HTTP Method:** POST
- **Path:** `stripe-payment`
- **Response Mode:** Respond Immediately (200 OK)
- Copy the **Production URL** → paste into Stripe Dashboard as the endpoint URL

---

#### Node 2 — IF (Filter for completed payments)
- **Type:** IF
- **Condition:**
  - Value 1: `{{ $json.body.type }}`
  - Operation: `equals`
  - Value 2: `checkout.session.completed`

- Connect **True** branch to Node 3
- Connect **False** branch to a No-op (do nothing)

---

#### Node 3 — Set (Extract customer data)
- **Type:** Set
- **Fields to Set:**
  - `customerName` → `{{ $json.body.data.object.metadata.name }}`
  - `customerEmail` → `{{ $json.body.data.object.customer_details.email }}`
  - `amountPaid` → `{{ $json.body.data.object.amount_total / 100 }}`
  - `paymentDate` → `{{ new Date().toLocaleDateString('en-US') }}`

---

#### Node 4 — Gmail (Send Welcome Email)
- **Type:** Gmail
- **Credential:** Connect your Gmail account via OAuth
- **To:** `{{ $json.customerEmail }}`
- **Subject:** `You're in! Welcome to the Reset Challenge`
- **Email Type:** HTML
- **Message:**
```html
<div style="font-family: Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #090E1A; color: #ffffff; padding: 40px 32px; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.35); color: #F59E0B; font-size: 11px; font-weight: 600; letter-spacing: 2px; padding: 8px 16px; border-radius: 100px; text-transform: uppercase; margin-bottom: 20px;">Payment Confirmed</div>
    <h1 style="font-size: 28px; font-weight: 900; margin: 0;">Welcome, {{ $json.customerName }}! 🔥</h1>
  </div>

  <p style="font-size: 16px; color: #94A3B8; line-height: 1.75; margin-bottom: 24px;">
    You're officially part of the <strong style="color: #F59E0B;">Reset Challenge</strong> — 30 days to transform your body and mind. Your journey starts now.
  </p>

  <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin-bottom: 28px;">
    <p style="font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #475569; margin-bottom: 16px;">What happens next</p>
    <p style="font-size: 14px; color: #CBD5E1; line-height: 1.7; margin: 0;">
      1. Join the private community using the link below<br>
      2. Download your Day 1 workout guide<br>
      3. Show up every single day for 30 days
    </p>
  </div>

  <div style="text-align: center; margin-bottom: 28px;">
    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); color: #ffffff; font-size: 16px; font-weight: 700; padding: 16px 36px; border-radius: 100px; text-decoration: none;">Access the Program</a>
  </div>

  <p style="font-size: 13px; color: #475569; text-align: center;">
    Questions? Reply to this email and we'll help you out.<br>
    <strong style="color: #64748B;">Payment: ${{ $json.amountPaid }} · {{ $json.paymentDate }}</strong>
  </p>
</div>
```

---

#### Node 5 — Google Sheets (Log the customer)
- **Type:** Google Sheets
- **Credential:** Connect Google account via OAuth
- **Operation:** Append Row
- **Spreadsheet:** Select your Google Sheet
- **Sheet:** Sheet1
- **Columns to Map:**
  - `Full Name` → `{{ $json.customerName }}`
  - `Email` → `{{ $json.customerEmail }}`
  - `Amount Paid` → `{{ $json.amountPaid }}`
  - `Date` → `{{ $json.paymentDate }}`
  - `Status` → `Paid`

> Set up your Google Sheet with these column headers first:
> `Full Name | Email | Amount Paid | Date | Status`

---

### Flow
```
Webhook → IF (checkout.session.completed?)
              ↓ TRUE
          Set (extract data)
              ↓
          Gmail (welcome email)
              ↓
          Google Sheets (log row)
```

---

## Testing the Full Flow

1. Open `reset-challenge-checkout.html` in browser
2. Enter test name + email
3. You'll be redirected to Stripe Checkout sandbox
4. Use Stripe test card: **4242 4242 4242 4242** · any future date · any CVC
5. After payment → redirected to `reset-challenge-success.html`
6. In n8n: check Workflow 2 executions — should show green
7. Check inbox for welcome email
8. Check Google Sheet for new row

---

## Stripe Test Card Numbers

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires 3D Secure |

Expiry: any future date · CVC: any 3 digits · ZIP: any 5 digits
