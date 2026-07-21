# Security Specification: Orkut Secure Firebase Hardening

## 1. Data Invariants & Access Control Matrices

* **Profiles (`/profiles/{profileId}`)**:
  * Read: Anyone can read profiles.
  * Create/Update: A user can only create or update their own profile (matching profileId or if authenticating/writing authenticated user metadata). Since profileId corresponds to user state, we allow write access to profileId if `request.auth.uid == profileId` or for demo fallbacks.
* **Scraps (`/scraps/{scrapId}`)**:
  * Read: Anyone can read scraps.
  * Create: Authenticated users can create scraps, ensuring the `fromId` matches `request.auth.uid`.
  * Update: Only allowed if incrementing likes or shares, or if owner update.
  * Delete: Allowed by creator (`fromId`) or recipient (`toId`).
* **Testimonials (`/testimonials/{testimonialId}`)**:
  * Read: Anyone can read testimonials content (though they can be client-side encrypted).
  * Create: Authenticated users can create testimonials, ensuring `fromId` matches `request.auth.uid`.
  * Update: Only allowed if owner updates or liking.
* **Joined Communities (`/joined_communities/{userId}`)**:
  * Read: Anyone can read joined communities.
  * Write: A user can only write/update their own `joined_communities` document.

## 2. The "Dirty Dozen" Malicious Payloads

1. **Self-Appointing Administrator Profile:** Writing a profile with `isAdmin: true` or trying to update another user's username.
2. **Profile Spoofing / Account Hijack:** Creating a profile document for `jane_doe` when authenticated as `john_doe`.
3. **Ghost Profile Creation:** Creating a profile document with an extremely large payload name to exhaust resources.
4. **Scrap From Field Impersonation:** Creating a scrap with `fromId: "orkut"` while authenticated as `victim123`.
5. **No-Authentication Scrap:** Creating a scrap without being logged in.
6. **Toxic ID Poisoning:** Writing a scrap ID containing massive injection strings to corrupt querying systems.
7. **Testimonial Content Hijacking:** Modifying someone else's existing testimonial content without permission.
8. **Malicious Array Bloating:** Adding thousands of fake ids into a user's `joined_communities` array to crash clients.
9. **Tampered Timestamp Spoofing:** Submitting a local client-timed `createdAt: "2000-01-01"` to falsify event sequencing.
10. **Shadow Field injection on Album:** Creating an album with `isSecretInvisibleDraft: true` when it's not defined in the schema.
11. **Malicious Album Takeover:** Deleting another user's album from the database.
12. **Blind Scrap Listing Exploit:** Querying scraps collection blindly while bypassing logical identity checks.

---

## 3. Test Cases (Rule Logic Verification)

Our security rules located in `firestore.rules` will be validated to reject these exact payloads and enforce database sanity under all access paths.
