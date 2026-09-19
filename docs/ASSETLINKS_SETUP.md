# Digital Asset Links Setup & TWA Verification Guide

Digital Asset Links (`assetlinks.json`) establish a secure, cryptographically verified link between your web domain (e.g., `https://kisansahay.vercel.app`) and your Android TWA application (`com.kisansahay.app`). 

When properly configured:
- The browser URL bar disappears completely in Android.
- Your web app runs as a 100% immersive, native-like fullscreen Android app without browser framing.
- Android seamlessly handles deep links and web intent filters directly into KisanSahay.

---

## 1. Finding Your SHA-256 Fingerprint

You will need the **SHA-256 certificate fingerprint** from two sources:
1. **Your Local Keystore** (used during local debug/release testing).
2. **Google Play App Signing Key** (used once uploaded to Google Play Console).

### Method A: Extracting from Local Release Keystore

Run the following `keytool` command in your terminal:

```bash
keytool -list -v -keystore twa/android.keystore -alias kisansahay
```

When prompted, enter your keystore password. Look for the output line starting with `SHA256:`:
```text
Certificate fingerprints:
  SHA1:   E5:2A:...
  SHA256: 14:6D:E9:7F:0F:52:EA:CB:5C:30:E4:E1:D0:0E:0F:87:64:80:44:B6:5C:83:A2:3B:5D:F0:4B:39:E7:5F:F1:68
```
Copy the full 32-pair hexadecimal string.

### Method B: Extracting from Google Play Console (Google Play App Signing)

If you have enabled Google Play App Signing (mandatory for all new apps):
1. Open the [Google Play Console](https://play.google.com/console).
2. Select **KisanSahay**.
3. In the left navigation menu, go to **Release** > **Setup** > **App Integrity**.
4. Under **App signing key certificate**, locate **SHA-256 certificate fingerprint**.
5. Copy this fingerprint. Both the local upload key and the Google Play signing key can be included in `assetlinks.json`.

---

## 2. Updating `public/.well-known/assetlinks.json`

Open `public/.well-known/assetlinks.json` and insert your fingerprint(s):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.kisansahay.app",
      "sha256_cert_fingerprints": [
        "14:6D:E9:7F:0F:52:EA:CB:5C:30:E4:E1:D0:0E:0F:87:64:80:44:B6:5C:83:A2:3B:5D:F0:4B:39:E7:5F:F1:68",
        "YOUR_GOOGLE_PLAY_APP_SIGNING_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

Always mirror any changes to `public copy/.well-known/assetlinks.json` to maintain workspace parity:
```bash
cp public/.well-known/assetlinks.json "public copy/.well-known/assetlinks.json"
```

---

## 3. Server Configuration & MIME Type

The `assetlinks.json` file must be accessible via HTTPS at:
`https://<YOUR_DOMAIN>/.well-known/assetlinks.json`

Requirements:
- **HTTP Status**: Must return `200 OK`.
- **Content-Type**: `application/json`.
- **Redirects**: No HTTP redirects (301 or 302).
- **HTTPS**: SSL certificate must be valid.

In our project, `vercel.json` already contains the custom header configuration:
```json
{
  "source": "/.well-known/assetlinks.json",
  "headers": [
    {
      "key": "Content-Type",
      "value": "application/json"
    },
    {
      "key": "Cache-Control",
      "value": "public, max-age=86400"
    }
  ]
}
```

---

## 4. Verification with Google Digital Asset Links Tool

You can verify that your configuration is valid before submitting to Google Play:

1. **Google Asset Links Statement List API**:
   ```bash
   curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://kisansahay.vercel.app&relation=delegate_permission/common.handle_all_urls"
   ```
2. **Peter's Asset Link Tool (Online Validator)**:
   Visit: `https://assetlinks.io/` or Google's Asset Link tool at `https://developers.google.com/digital-asset-links/tools/generator`.
3. **On-Device ADB Verification**:
   Connect an Android device via USB and check logcat while opening the TWA:
   ```bash
   adb logcat -s "VerificationOrigin" -s "TWAProvider"
   ```
   A successful validation outputs:
   `Verification succeeded for package: com.kisansahay.app`
