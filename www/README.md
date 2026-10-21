# ALPHAX Admin + Subscription Workflow Update

This package keeps the existing admin UI and adds the Firebase-backed payment review path.

## Flow
1. Extension user selects a plan, pays externally, and submits UTR.
2. The request is stored in Firestore with `Pending` status and is visible in the signed-in admin dashboard.
3. Admin independently checks the payment in the payment provider, then selects Approve or Reject.
4. Approval is handled by the secure callable Cloud Function `approvePayment`, which changes the request to `Approved` and creates an active license with activation and expiry dates. Rejection creates no license.
5. The extension checks status and shows the Subscription Done page only after approval; Verify calls `validateLicense`.

## Required one-time Firebase setup
1. In Firebase Authentication, enable **Anonymous** and **Email/Password** sign-in. Anonymous auth is used to associate an extension installation with its own payment requests.
2. Confirm the admin account has a Firestore document `admins/{ADMIN_UID}` with `role: "admin"`.
3. Publish `firestore.rules` from this package.
4. Deploy Cloud Functions from the `functions` folder using Firebase CLI in a supported computer/cloud environment: `firebase deploy --only functions`. The project may require the Blaze billing plan.
5. Host the admin files on HTTPS. Keep the existing `firebase-config.js` for project `alphax-admin123`.
6. Reload the unpacked extension from this ZIP after enabling the listed Firebase services.

## Important
- Admin must verify the transaction directly with the payment provider before approving. UTR format alone does not prove payment.
- The extension submits a request; it cannot approve itself. Firestore rules deny client-side updates to payment status. Only the admin-checked Cloud Functions can approve/reject.
- Plan validity is configured in `functions/index.js`: Gold 30 days, Diamond 30 days, Prime 30 days (as configured for this project). Adjust only if the actual plan terms change.
- Cloud Functions have not been deployed from this package. Until deployment and rules publication are complete, live approval/verification will not work.
- Test with a small controlled payment first. Add App Check/rate limiting before public launch.


## Extension submission pairing
Use the separate `AlphaXExtensions_Payment_Submission_Update.zip` alongside this Admin package. The extension sends a Pending request directly to Firebase Auth/Firestore REST APIs; no Cloudflare Worker change is required for this flow. The `payments` collection appears automatically after the first successful submission.

## Price and duplicate safeguards
The approval function accepts only Gold ₹1,969, Diamond ₹3,699, or Prime ₹5,649 and supports one or two distinct UTRs per request and reserves each normalized UTR in a deterministic `utrReservations` document within the same transaction as license issuance. Client access to this collection is denied by the included rules. Existing `licenses` documents are not migrated or deleted.

## Deployment caveat
These are prepared files, not a live deployment. Publish the included Firestore rules and deploy the Functions from a supported Firebase CLI environment before testing approval/rejection. Never upload a service-account private key into the extension or public web files.
