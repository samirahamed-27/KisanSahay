# KisanSahay — Google Play Store Submission Guide (Trusted Web Activity - TWA)

This guide provides end-to-end instructions for packaging the KisanSahay Progressive Web App into an Android App Bundle (`.aab`) using Bubblewrap (Trusted Web Activity) and publishing it on the Google Play Store.

---

## 1. Prerequisites

1. **Google Play Developer Account**:
   - Register at [Google Play Console](https://play.google.com/console/signup).
   - One-time registration fee: **$25 USD**.
   - Complete identity verification (PAN card / Aadhaar / Passport and address proof).
2. **Deployed Production Domain with HTTPS**:
   - The web app must be live on a secure HTTPS domain (e.g., `https://kisansahay.vercel.app`).
   - Digital Asset Links requires valid SSL/TLS certificates.
3. **Local Build Tools** (for running `bubblewrap build`):
   - **Java Development Kit (JDK 17)**: Install via Homebrew `brew install openjdk@17` or download from [Adoptium Temurin](https://adoptium.net/).
   - **Android SDK Command-Line Tools**: Installed via Android Studio or command-line SDK manager.
   - **Bubblewrap CLI**: Already installed globally (`npm install -g @bubblewrap/cli`).

---

## 2. Generating the Android Keystore

Before building your production Android App Bundle, create an encrypted release keystore:

```bash
cd twa
keytool -genkeypair -v -keystore android.keystore -alias kisansahay -keyalg RSA -keysize 2048 -validity 10000
```

> [!CAUTION]
> Store `android.keystore` and its passwords in a secure password manager. If you lose this keystore, you cannot push app updates to Google Play.

Extract the SHA-256 fingerprint from your keystore:
```bash
keytool -list -v -keystore android.keystore -alias kisansahay -storepass <YOUR_PASSWORD>
```
Copy the SHA-256 fingerprint and paste it into `public/.well-known/assetlinks.json` (see [docs/ASSETLINKS_SETUP.md](ASSETLINKS_SETUP.md)).

---

## 3. Building the Android App Bundle (AAB)

Run Bubblewrap inside the `twa/` directory:

```bash
cd twa
bubblewrap build
```

When prompted:
1. Provide the path to `android.keystore` (e.g., `./android.keystore`).
2. Enter the keystore password and key alias (`kisansahay`).
3. Bubblewrap will compile the project using Gradle and produce:
   `app-release-bundle.aab` (in `twa/` or `twa/app/build/outputs/bundle/release/app-release.aab`).

---

## 4. Google Play Console Listing Setup

### A. App Details
- **App Name**: `KisanSahay: Farmer Schemes & Loans` (Limit: 30 chars)
- **Short Description (English)**: `Check agricultural schemes, get loan checklists, and manage farmer EMIs easily.` (Limit: 80 chars)
- **Short Description (Hindi / हिन्दी)**: `कृषि योजनाओं की पात्रता जांचें, ऋण चेकलिस्ट पाएं और किस्तों का हिसाब रखें।`
- **Full Description (English & Hindi)**:
  ```
  KisanSahay (किसान सहाय) is a dedicated agricultural finance and government welfare scheme portal built for Indian farmers.

  Key Features:
  🌾 670+ Central & State Government Agricultural Schemes (KCC, MISS, PM-Kisan, PMFBY, AIF).
  🚜 All-India State Selector: Discover regional cooperative bank loans across all 28 States & 8 UTs.
  📋 3-Step Eligibility Questionnaire: Instant recommendations tailored to your land, crop, and profile.
  🔒 Encrypted Farmer Document Vault: Safeguard land records (Khasra/Khatauni), Aadhaar, and bank passbook.
  📊 Smart EMI & Loan Tracker: Keep track of payment schedules, monthly interest, and subsidized benefits.
  🗣️ Multilingual Voice Assistant: Full support across 15 Indian languages with voice input.
  📶 Offline PWA Support: Access vital scheme details even with low or zero rural connectivity.
  ```

### B. Graphic Assets
- **App Icon**: 512 × 512 PNG (32-bit, up to 1 MB, no alpha transparency). Available at `public/icons/icon-512.png`.
- **Feature Graphic**: 1024 × 500 JPG or PNG (Banner depicting farming motif and KisanSahay branding).
- **Phone Screenshots**: Minimum 4 screenshots (1080 × 2400 or 1080 × 1920) showing:
  1. Home View with Scheme Categories and Live Speed Monitor.
  2. Multi-Step Farmer Qualification Questionnaire.
  3. Government Schemes Explorer with All-India State Selector.
  4. Encrypted Farmer Document Vault & EMI Tracker.
- **7-inch & 10-inch Tablet Screenshots**: Recommended for wider device compatibility.

---

## 5. App Content & Policy Questionnaires

Complete the mandatory declarations in **Policy and programs** > **App content**:
1. **Privacy Policy**: Provide a valid URL (e.g., `https://kisansahay.vercel.app/privacy.html`).
2. **Ads**: Select **No**, my app does not contain ads.
3. **App Access**: Select **All functionality is available without special access restrictions**.
4. **Content Rating**:
   - Category: Utility / Reference / Finance.
   - Complete IARC questionnaire (No violence, no user-to-user unrestricted chat, no gambling).
   - Result: PEGI 3 / Everyone / General.
5. **Target Audience**: Select **18 and above**.
6. **Financial Features**: Select **Personal financial management / Informational**. Note: KisanSahay does not issue loans directly; it acts as an informational eligibility directory for official Government of India schemes.
7. **Government Apps Policy**: Declare that KisanSahay provides public informational links to official government sources (`agricoop.gov.in`, `pmkisan.gov.in`, `rbi.org.in`). Include an in-app disclaimer.
8. **Data Safety Form**:
   - Encryption in transit: Yes (HTTPS).
   - User profile data (Name, Farm Size): Stored locally in encrypted local storage/browser indexedDB.
   - Financial Info (Loans entered by user): Optional, stored locally for loan tracking.
   - Account deletion request URL: Provide website URL.

---

## 6. Uploading the AAB & Publishing

1. In Play Console, navigate to **Production** (or **Closed testing** first).
2. Click **Create new release**.
3. Enable **Google Play App Signing**.
4. Upload `app-release-bundle.aab`.
5. Enter Release Name: `1.0.0 (Initial Production Release)`.
6. Enter Release Notes in Hindi and English:
   ```
   KisanSahay 1.0.0 — प्रारम्भिक विमोचन (Initial Release)
   • 670+ कृषि एवं ऋण योजनाएं (670+ Agricultural & Loan Schemes)
   • 15 भारतीय भाषाओं में समर्थन (15 Indian Languages Support)
   • किसान दस्तावेज़ वॉल्ट और ईएमआई ट्रैकर (Document Vault & EMI Tracker)
   ```
7. Click **Next**, review any warnings, and click **Start rollout to Production**.
8. The app will undergo Google Play Review (typically 1 to 3 working days). Once approved, KisanSahay will be live on Google Play Store!
