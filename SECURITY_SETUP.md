# Production security setup

## 1. Deploy the Firestore rules

Install Firebase CLI, sign in, then from this repository run:

```bash
firebase use pinaki-1fe56
firebase deploy --only firestore:rules
```

The included `firestore.rules` prevents customers from reading other customers' profile, order, and payment data.

## 2. Create the one authorised admin record

1. Sign in once with the intended admin email in Firebase Authentication.
2. Copy that user's **UID** in Firebase Console → Authentication → Users.
3. In Firestore, create exactly this document: `admins/<UID>`.
4. Add fields such as `email`, `name`, `role: "admin"`, and `createdAt`.

The browser code never stores an admin password. Do not create admin documents from the website.

## 3. Before accepting online payments

Use a server-side payment provider integration (for example Razorpay) and webhook verification. A QR image alone cannot prove that a payment was received.

## 4. Before live courier tracking

Use a server-side courier provider integration and store only the returned tracking reference/status. Do not expose courier API credentials in frontend JavaScript.
