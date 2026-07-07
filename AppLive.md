# AppLive.md — Google Play Go-Live Playbook

> Reusable checklist distilled from taking **LoanEase** (Expo / React Native managed app) live on
> Google Play. Especially covers the **Personal Loans / finance policy** gotchas. Copy this file
> into future apps and work top-to-bottom.

App context this was written from:
- Managed / CNG Expo app (no committed `android/` dir), EAS Build, local Android credentials.
- Category: **loan referral (finance)** → subject to Google Play **Personal Loans policy**.
- Region: **India** (`+91`), currency `₹` / `en-IN`.

---

## 0. Before you build — one-time account setup

- [ ] Google Play Console developer account created & identity/D-U-N-S verification done.
- [ ] App created in Play Console; **package name** locked (`com.loanease`) — can never change after first upload.
- [ ] EAS project linked (`extra.eas.projectId` in `app.json`, `owner` set).
- [ ] Signing decided: local keystore (`credentials.json` + `.jks`) **or** Play App Signing. Keep the keystore backed up — losing it means you can never update the app.
- [ ] `play-store-service-account.json` created (Play Console → Setup → API access) and referenced in `eas.json` `submit.production.android.serviceAccountKeyPath`. Without it you must upload the AAB manually.

---

## 1. Permissions — the #1 rejection cause for finance apps

Google Play's **Personal Loans policy prohibits** a set of Android permissions. The trap: you may
not declare them yourself — **dependencies auto-merge them into the manifest**. For us it was
`expo-file-system` injecting `READ/WRITE_EXTERNAL_STORAGE`.

- [ ] Audit the **merged** manifest, not just `app.json`. On a managed app, run a prebuild and inspect
      `android/app/src/main/AndroidManifest.xml`, or check the AAB.
- [ ] Strip prohibited permissions with a config plugin (see `mobile/plugins/withBlockedPermissions.js`).
      Uses `AndroidConfig.Permissions.withBlockedPermissions` → emits `tools:node="remove"`.
- [ ] Register the plugin in `app.json` → `expo.plugins`.
- [ ] Block the **full prohibited set defensively** (not just the one flagged today) so a future
      dependency bump can't silently reintroduce one:
  - `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
  - `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`
  - `READ_CONTACTS`
  - `ACCESS_FINE_LOCATION`
  - `READ_PHONE_NUMBERS`
  - `QUERY_ALL_PACKAGES`
- [ ] Keep only what you truly use. We keep biometric only (`USE_BIOMETRIC`, `USE_FINGERPRINT`).
- [ ] Reminder: scoped internal storage (`documentDirectory` / `cacheDirectory`) + the OS share sheet
      need **none** of the blocked permissions — CSV/PDF download+share works without them.

---

## 2. App config sanity (`mobile/app.json`)

- [ ] `version` (user-facing, e.g. `1.0.1`) bumped for the release.
- [ ] Android `package` and iOS `bundleIdentifier` correct and final.
- [ ] Icons/splash present: `icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png`.
- [ ] Permission usage strings set (e.g. Face ID description).
- [ ] `versionCode`: with `appVersionSource: remote` + `autoIncrement: true` (see `eas.json`) EAS
      manages it automatically. **First compliant build was versionCode 4** — every store upload needs
      a strictly higher versionCode than anything previously uploaded to any track.

---

## 3. Build & submit (`mobile/eas.json`)

- [ ] Production profile builds an **app-bundle** (`buildType: "app-bundle"`), not APK. Play requires AAB.
- [ ] `credentialsSource: local` → keystore comes from `credentials.json`. Keep it out of git.
- [ ] Build: `eas build --platform android --profile production`.
- [ ] Submit: `eas submit --platform android --profile production` (needs the service-account json),
      or upload the `.aab` manually in Play Console → Test and release.
- [ ] **Never commit a prebuild `android/` directory** on a managed app — it desyncs from `app.json`.

---

## 4. Store listing content (Play Console)

- [ ] App name, short + full description.
- [ ] **Screenshots**: phone + 7-inch tablet + 10-inch tablet (assets live in `mobile/store-assets/`;
      generated via `mobile/scripts/build-store-images.mjs` / `generate-icons.mjs`).
- [ ] Feature graphic (1024×500) + app icon (512×512).
- [ ] Privacy Policy URL (mandatory, doubly so for finance apps).
- [ ] **Data safety** form filled honestly (what data is collected, why, encryption in transit, deletion).
- [ ] Account deletion path declared — Play requires an in-app + web way to delete an account
      (we have `mobile/app/account/delete-account.tsx` + `/api/referrer/account/delete-account`).
- [ ] Content rating **IARC questionnaire** completed → generates the age rating. On publish you'll get an
      automated **IARC "Live Rating Notice"** email with a **Global Rating ID** — save it; it lets you
      reuse the rating on other IARC storefronts (Amazon, etc.) without re-doing the questionnaire.
      Re-do the questionnaire only if a change would alter your answers.
- [ ] Target audience & content, ads declaration, category, contact details.

---

## 5. Personal Loans / finance policy declaration

- [ ] Complete the **Financial features declaration** (Play Console → Policy → App content).
- [ ] Declare it's a **personal-loan-related** app and provide required disclosures
      (interest rates / APR range, fees, licensing where applicable).
- [ ] Ensure store listing + in-app copy don't overpromise ("instant loan", guaranteed approval, etc.).
- [ ] Confirm no prohibited permissions (see §1) — this is what got us rejected the first time.

---

## 6. Reviewer access — temporary login relaxation

Reviewers sign in with credentials you provide but **cannot receive an OTP/2FA code**. If login is
gated on OTP/2FA, review fails.

- [ ] Provide **test credentials** in Play Console → App access (username + password reviewer login).
- [ ] Temporarily bypass the mobile OTP/2FA step for review. In this project:
      `mobile/app/(auth)/login.tsx` → `handleEmailLogin` has the `requires2FA` redirect commented out and
      replaced with an unconditional `router.replace('/(tabs)')`, marked with
      `TEMP: OTP/2FA STEP DISABLED FOR GOOGLE PLAY STORE REVIEW`.
- [ ] ⚠️ **RE-ENABLE AFTER APPROVAL** — uncomment the `requires2FA` block, remove the unconditional
      redirect, rebuild + resubmit. (Tracked in memory `reenable-otp-after-playstore`.)
- [ ] Known backend gap to fix separately: `/auth/login` issues mobile tokens **before** 2FA is verified,
      so mobile bypasses 2FA even after the client revert. Enforce the 2FA step server-side like web does.

---

## 7. Publishing (Managed publishing)

- [ ] **Managed publishing ON** = changes queue and go live only when you press **Publish**. Gives you a
      controlled release moment.
- [ ] Review the "Changes ready to publish" list (release, countries/regions, store-listing edits).
- [ ] Adding a country (e.g. **India**) can show *"Affects other tracks"* — expected.
- [ ] Click **Publish N changes** to send live.

---

## 8. Clearing a rejection (if you were rejected)

Shipping the fixed build is **not enough** on its own:

- [ ] Upload the new, compliant AAB (higher versionCode).
- [ ] **Deactivate / remove the old non-compliant version codes in EVERY track**
      (Production, Internal, Closed, Open testing). Leftover flagged builds keep the rejection alive.
- [ ] Resubmit for review; respond to the policy notice if one requires acknowledgement.

---

## 9. Post-publish verification

- [ ] Publishing overview shows **Last published** with your date; no lingering "Changes ready to publish".
- [ ] Production track shows the correct release **In review → Live** (rating email ≠ policy approval —
      they're independent gates).
- [ ] IARC Live Rating Notice email received; Global Rating ID stored.
- [ ] Install from the live/internal-test link on a real device; smoke-test login and core flows.
- [ ] Reopen memory action items and close them (e.g. re-enable OTP).

---

## Quick "next app" TL;DR

1. Lock package name + signing + service account.
2. Strip prohibited permissions via a config plugin — audit the **merged** manifest.
3. Fill Data safety, Privacy Policy, IARC rating, Financial features declaration honestly.
4. Ship an **AAB** with an auto-incremented versionCode.
5. Give reviewers a password-only login; **re-enable OTP after approval**.
6. To clear a rejection: new build **and** deactivate old version codes in all tracks.
7. Managed publishing → review the change list → Publish.
