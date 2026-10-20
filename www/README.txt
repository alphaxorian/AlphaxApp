ALPHAX EXTENSIONS - PROFESSIONAL UI 1.3

- Official logo appears only on the 2.5 second splash screen.
- Gold, Diamond and Prime plan selector uses included image assets.
- Added compact Back buttons for popup navigation.
- Added Visit Website, Support and Subscribe links.
- Valid UTR submission opens a persistent pending-processing screen.
- Processing status is NOT payment approval; UTR is not sent to a server.
- The plan options currently use the existing configured amount ₹2,249; update per-plan pricing if plans have different prices.

Extract the ZIP and load the extracted folder using your browser's supported extension installation method.

SECURITY NOTES
- A runtime SHA-256 integrity guard checks popup.js, popup.html, and popup.css before the content script opens the UI.
- If one of those packaged files differs from this build, the UI is disabled.
- This is basic tamper detection, not cryptographic protection against a determined person who can edit the extension and its checks.
- JavaScript shipped to a browser cannot be made impossible to read or modify. For stronger enforcement, put sensitive logic and licensing decisions on a server.
- For official distribution, publish through the Chrome Web Store and protect the developer account with strong two-step verification.


PLATFORM LOGO FIX V2
- Recalculated the packaged popup integrity hashes so the integrity gate matches these exact files.
- Improved 11-platform identification using hostname, URL, page title, branding/logo attributes, navigation labels, and SPA DOM updates.
- Floating logo remains limited to a detected platform's WinGo section.
- Some sites use opaque URLs, canvas-only interfaces, or cross-origin frames; those require the exact platform URL/DOM signals to guarantee detection.


PAYMENT REQUEST SUBMISSION UPDATE (2026-10-15)
- UTR submit now signs in anonymously through Firebase Auth REST and attempts to create a Pending document in Firestore payments.
- Firestore creates the payments collection automatically when the first document is successfully saved; do not create a fake/manual collection document.
- Requires Anonymous Authentication enabled, published Firestore rules from the companion Admin ZIP, and internet access.
- The admin must still deploy the callable Cloud Functions before approve/reject can issue a license.
- This package has not been tested against your live Firebase project from this environment. Test with a controlled request before public use.
