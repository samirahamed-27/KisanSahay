# KisanSahay — Complete Mobile App Build Prompt

> **This file is a self-contained, copy-paste prompt** for any AI coding assistant
> (Cursor, Claude, ChatGPT, Gemini, etc.) or a developer to build the **KisanSahay**
> native mobile app. Everything needed — architecture, data, APIs, features, and
> store submission — is documented here.

---

## Project Overview

**KisanSahay** is an accessible agricultural finance and government scheme portal
for Indian farmers. It supports 15 Indian languages, offline use, voice input/TTS,
multi-user profiles, a secure document vault, AI chatbot, soil fertility analysis,
loan management, and 500+ government schemes.

**Goal:** Convert the existing PWA web app into a **React Native + Expo** mobile app
that works on **Android** and **iOS**, connects to the existing Node.js backend,
stores all data locally on the device, and is publishable to the **Google Play Store**
and **Apple App Store**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Framework | **React Native** with **Expo SDK 51+** |
| Navigation | **React Navigation v6** (Stack + Bottom Tab) |
| State Management | **Zustand** |
| Local Database | **expo-sqlite** |
| Offline Storage | **@react-native-async-storage/async-storage** |
| Backend API | Existing **Node.js / Express** server |
| AI Chatbot | **Google Gemini 1.5 Flash API** |
| Voice Input | **expo-speech** + **@react-native-voice/voice** |
| TTS | **expo-speech** + backend /api/tts/synthesize |
| Push Notifications | **expo-notifications** |
| Camera/Docs | **expo-camera** + **expo-document-picker** |
| Biometrics | **expo-local-authentication** |
| Location | **expo-location** |
| Charts | **react-native-gifted-charts** |
| Styling | **StyleSheet** API + **react-native-paper** |
| Icons | **@expo/vector-icons** (MaterialCommunityIcons) |
| QR Code | **react-native-qrcode-svg** |
| HTTP Client | **axios** |

---

## Existing Codebase Structure

```
KisanSahay/
+-- public/
|   +-- index.html            (136 KB - full UI markup)
|   +-- app.js                (214 KB - ALL frontend logic, 5623 lines)
|   +-- styles.css            (172 KB - full styling)
|   +-- multiuser.js          (24 KB - multi-user profile logic)
|   +-- voice_input.js        (22 KB - voice recognition logic)
|   +-- different_languages.js(129 KB - 15 language translations)
|   +-- schemes_data.js       (2.3 MB - 500+ schemes dataset)
|   +-- categories_data.js    (39 KB - scheme categories)
|   +-- manifest.json         (PWA manifest)
|   +-- sw.js                 (Service Worker)
+-- src/
|   +-- data/
|   |   +-- schemesDatabase.json      (2.3 MB - 500+ schemes)
|   |   +-- cropsData.json            (36 KB - 63 crops)
|   |   +-- soilAgriData.json         (16 KB - soil types)
|   |   +-- dynamicSoilFertility.json (35 KB - fertility by region)
|   |   +-- cropTrendsData.json       (8 KB - crop price trends)
|   |   +-- landPricesData.json       (8.8 KB - land prices)
|   |   +-- multiuserProfiles.json    (17 KB - user profiles store)
|   |   +-- notifications.json        (notification templates)
|   |   +-- stagedSchemes.json        (review queue)
|   |   +-- userDocumentsVault.json   (encrypted vault store)
|   +-- controllers/
|   +-- services/
|   +-- routes/apiRoutes.js   (All 11 API groups)
|   +-- middleware/
+-- server.js                 (Express server, Port 3000)
+-- capacitor.config.json     (appId: com.kisansahay.app)
+-- package.json
+-- vercel.json
```

---

## Backend API Reference (All 11 Groups)

Base URL: http://localhost:3000/api (dev) or deployed URL (prod)

### 1. Scheme Recommendations
```
POST /api/recommend
Body: {
  state: "Uttar Pradesh",
  landArea: 2.5,
  cropType: "wheat",
  gender: "Male",
  age: 35,
  income: 150000,
  residence: "Rural",
  disability: "No",
  minority: "No",
  loanAmount: 50000
}
Response: { schemes: [...ranked list] }
```

### 2. Schemes Catalog
```
GET  /api/schemes              - all 500+ schemes
GET  /api/schemes/:id          - single scheme detail
GET  /api/schemes/review-queue - schemes pending review
POST /api/schemes/review-action - approve/reject scheme
```

### 3. Crops Catalog
```
GET /api/crops - 63 curated crops with soil/season/price info
```

### 4. Location Intelligence and Soil Fertility
```
GET /api/context/location       - detect state/district from IP
GET /api/soil-fertility?state=X&district=Y - soil NPK, pH, moisture
```

### 5. Farmer Document Vault
```
POST /api/vault/save     Body: { password, documents: [...] }
POST /api/vault/unlock   Body: { password }
POST /api/vault/reset    Body: { password, newPassword }
GET  /api/vault/status   - is vault initialized?
```

### 6. Sahay AI Assistant
```
POST /api/assistant/chat
Body: { message: "PM-KISAN eligibility?", lang: "hi", history: [...] }
Response: { reply: "...", sources: [...] }
```

### 7. Multi-User Authentication and Profile Sandboxing
```
POST /api/auth/send-otp          Body: { phone: "9XXXXXXXXX" }
POST /api/auth/verify-otp        Body: { phone, otp }
GET  /api/users/profiles         - list profiles
POST /api/users/profiles         - create profile
POST /api/users/switch-profile   Body: { profileId }
DELETE /api/users/profiles/:id
```

### 8. Notifications and Push
```
GET  /api/notifications                - get all notifications
POST /api/notifications/:id/read       - mark read
POST /api/notifications/read-all       - mark all read
POST /api/notifications/push-subscription - register device for push
```

### 9. Text-to-Speech
```
POST /api/tts/synthesize
Body: { text: "...", lang: "hi", speed: 1.0 }
Response: { audioUrl: "..." } or audio stream
```

### 10. Ingestion
```
POST /api/ingest/refresh - re-scrape and update schemes database
```

### 11. Loans CRUD (in server.js directly)
```
GET    /loans          - all loans
POST   /loans          - add loan
PUT    /loans/:id      - update loan
DELETE /loans/:id      - delete loan
GET    /loans/summary  - totals: borrowed, paid, due, EMI
```

---

## External APIs You Need

### 1. Google Gemini API (AI Chatbot) - FREE
- Get key: https://aistudio.google.com/app/apikey
- Free tier: 60 requests/minute
- Env variable: GEMINI_API_KEY=your_key_here
- SDK: npm install @google/generative-ai
- Model to use: gemini-1.5-flash

### 2. Google Maps / Geocoding API (Location)
- Get key: https://console.cloud.google.com -> APIs & Services -> Maps SDK
- Free: 28,000 requests/month
- Env variable: GOOGLE_MAPS_API_KEY=your_key_here
- Add to app.json android and ios config sections

### 3. Firebase Cloud Messaging (Push Notifications)
- Get key: https://console.firebase.google.com -> Project Settings -> Cloud Messaging
- Env variables: FIREBASE_SERVER_KEY, FIREBASE_PROJECT_ID
- Simpler option: Use Expo Push Service (no Firebase needed)

### 4. Fast2SMS API (OTP SMS - India, cheapest option)
- Get key: https://www.fast2sms.com -> API
- Cost: Rs 0.20-0.30 per SMS
- Env variable: FAST2SMS_API_KEY=your_key
- Endpoint: POST https://www.fast2sms.com/dev/bulkV2
  Headers: authorization: YOUR_API_KEY
  Body: { route: "otp", variables_values: "123456", numbers: "9XXXXXXXXX" }

### 5. Twilio SMS (Alternative to Fast2SMS, international)
- Get keys: https://console.twilio.com -> Account Info
- Env variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
- SDK: npm install twilio (backend only)
- Cost: Rs 0.60 per SMS

---

## All 14 Features to Build

### 1. Home Screen (Dashboard)
- Greeting with farmer name and language
- Loan summary cards: Total Borrowed, Total Paid, Total Due, Monthly EMI
- Top-ranked scheme recommendation for the farmer
- Recent notifications (2-3 items)
- Quick action buttons: Voice Search, AI Chat, Soil Analysis
- Animated stats with skeleton loaders

### 2. Schemes Screen
Data source: src/data/schemesDatabase.json (2.3 MB, 500+ schemes)

Each scheme object:
```json
{
  "id": "pm-kisan-001",
  "name": "PM-KISAN",
  "fullName": "Pradhan Mantri Kisan Samman Nidhi",
  "category": "income_support",
  "ministry": "Ministry of Agriculture",
  "benefit": "Rs 6,000/year in 3 installments",
  "eligibility": {},
  "documents": [],
  "applicationUrl": "https://pmkisan.gov.in",
  "state": "All India",
  "deadline": "2025-03-31",
  "tags": ["income", "direct_benefit", "all_farmers"]
}
```

Features:
- Full-text search across 500+ schemes
- Filter by State, Category, Benefit Type, Eligibility
- Category chips: KCC Loans, PM-KISAN, AIF, PMFBY, Soil Health
- Scheme detail with TTS read-aloud and Apply button
- Bookmark/Save to favorites in AsyncStorage
- Share via WhatsApp deep link
- Full offline access (data bundled in app)

### 3. Loan Management Screen
Data source: /loans REST API + local SQLite cache

Loan object:
```json
{
  "id": "loan_001",
  "schemeName": "KCC - Kisan Credit Card",
  "principalAmount": 100000,
  "interestRate": 7,
  "tenureMonths": 36,
  "paidAmount": 30000,
  "nextEmiDate": "2025-02-01",
  "status": "active",
  "bank": "SBI",
  "startDate": "2022-01-01"
}
```

Features:
- Tab switch: Active / Ended / All Loans
- Summary: Borrowed, Paid, Due, Monthly EMI
- Progress bar per loan (percent paid)
- Add/Edit/Delete loan form
- EMI calculator modal
- Due date reminders via push notification
- Debt safety indicator (green/yellow/red)

### 4. Farmer Profile Screen
Profile fields:
```json
{
  "name": "Ramesh Kumar",
  "phone": "9XXXXXXXXX",
  "state": "Uttar Pradesh",
  "district": "Varanasi",
  "landArea": 2.5,
  "landUnit": "acres",
  "cropType": "wheat",
  "gender": "Male",
  "age": 35,
  "income": 150000,
  "residence": "Rural",
  "disability": "No",
  "minority": "No",
  "bankAccount": true,
  "aadhaarLinked": true
}
```

Features:
- Edit form with all fields
- State + District pickers from location data
- Crop picker from 63 crops (cropsData.json)
- Land unit converter (acres, bigha, hectares, guntha)
- Qualification checklist for scheme eligibility
- Auto-fill from GPS location

### 5. Document Vault Screen
API: /api/vault/*

Features:
- Three unlock methods: Word password, 4-digit PIN, Pattern (3x3 grid)
- Add/view/delete documents: Aadhaar, PAN, KCC, Land records, Bank passbook, Caste certificate, Disability certificate
- Camera integration (expo-camera) to scan docs
- Document picker (expo-document-picker) for PDFs
- Biometric lock option (expo-local-authentication)
- All documents encrypted before storage (AES-256)

### 6. Sahay AI Chat Screen
API: POST /api/assistant/chat -> Gemini 1.5 Flash

Features:
- WhatsApp-style chat UI
- Sends message + farmer profile context to Gemini
- AI answers questions about schemes, eligibility, loans, deadlines
- Shows source schemes as tappable chips
- Language-aware responses
- Voice input + TTS output
- Chat history in AsyncStorage (last 50 messages)
- Predefined quick questions:
  - "Am I eligible for PM-KISAN?"
  - "What is KCC interest rate?"
  - "Best scheme for my farm size?"

### 7. Voice Input
Package: @react-native-voice/voice + expo-speech

Features:
- Tap-to-speak interface
- Supports all 15 Indian languages
- Converts speech to text for search or form fill
- Voice commands: "Show wheat schemes", "Add loan 50000 rupees"
- Visual waveform animation while listening

### 8. Text-to-Speech (TTS)
Package: expo-speech (on-device, free)
Fallback: POST /api/tts/synthesize

Features:
- Read scheme details aloud
- Speed control: 0.5x, 1.0x, 1.5x, 2.0x
- Language-matched voice
- Stop/Pause/Resume controls
- Accessible for low-literacy farmers

### 9. Soil Fertility Analysis Screen
Data: src/data/dynamicSoilFertility.json + soilAgriData.json
API: GET /api/soil-fertility?state=X&district=Y

Soil data structure:
```json
{
  "state": "Uttar Pradesh",
  "district": "Varanasi",
  "pH": 7.2,
  "nitrogen": "Medium",
  "phosphorus": "Low",
  "potassium": "High",
  "moisture": "Moderate",
  "organicCarbon": "Low",
  "recommendedCrops": ["wheat", "sugarcane", "mustard"],
  "fertilizerAdvice": "Apply 120 kg N, 60 kg P2O5 per hectare"
}
```

Features:
- District-level soil profile
- Color-coded NPK indicators
- Crop recommendations based on soil
- Fertilizer dosage calculator
- Link to soil health card application

### 10. Notifications Screen
API: GET /api/notifications + expo-notifications

Notification types:
- EMI due reminders (3 days before)
- New scheme alerts matching farmer profile
- Application deadline warnings
- Scheme approval status updates

Features:
- Read/unread state
- Swipe to dismiss
- Mark all as read
- Deep link on tap
- Background push + scheduled local notifications

### 11. Multi-Language Support (15 Languages)
Data: public/different_languages.js (129 KB)

Languages:
- Hindi (hi), English (en), Marathi (mr), Tamil (ta), Telugu (te)
- Bengali (bn), Gujarati (gu), Kannada (kn), Odia (or), Punjabi (pa)
- Malayalam (ml), Assamese (as), Urdu (ur), Rajasthani (raj), Bhojpuri (bh)

Implementation:
- Extract all keys from different_languages.js into separate JSON files
- Use react-i18next for translation hooks
- Language selector modal with flag icons
- Persist selected language in AsyncStorage
- RTL support for Urdu

### 12. Multi-User Profiles
API: /api/users/* + /api/auth/*

Features:
- Up to 5 farmer profiles per device (family members)
- OTP phone verification to add new profile
- Profile avatar with initials and color
- Quick switch via PIN or biometric
- Each profile has separate loans, saved schemes, vault, settings

### 13. Crop Price Trends
Data: src/data/cropTrendsData.json + landPricesData.json

Features:
- Line chart per crop (react-native-gifted-charts)
- MSP vs market price comparison
- Price drop alerts

### 14. Settings Screen
Features:
- Language picker
- Theme: Light / Dark / Auto
- Font size: Small / Medium / Large (accessibility)
- Notification preferences
- Clear cache, About app, Privacy policy
- Rate app (opens Play Store)

---

## React Native App Folder Structure to Create

```
KisanSahay-App/
+-- app.json
+-- App.tsx
+-- babel.config.js
+-- tsconfig.json
+-- .env                        (API keys - DO NOT COMMIT)
+-- .env.example
+-- src/
|   +-- navigation/
|   |   +-- RootNavigator.tsx
|   |   +-- TabNavigator.tsx
|   |   +-- types.ts
|   +-- screens/
|   |   +-- HomeScreen.tsx
|   |   +-- SchemesScreen.tsx
|   |   +-- SchemeDetailScreen.tsx
|   |   +-- LoansScreen.tsx
|   |   +-- AddLoanScreen.tsx
|   |   +-- ProfileScreen.tsx
|   |   +-- VaultScreen.tsx
|   |   +-- AIChatScreen.tsx
|   |   +-- SoilScreen.tsx
|   |   +-- NotificationsScreen.tsx
|   |   +-- SettingsScreen.tsx
|   |   +-- LanguageScreen.tsx
|   |   +-- SwitchProfileScreen.tsx
|   |   +-- OnboardingScreen.tsx
|   +-- components/
|   |   +-- SchemeCard.tsx
|   |   +-- LoanCard.tsx
|   |   +-- SummaryStats.tsx
|   |   +-- VoiceButton.tsx
|   |   +-- TTSButton.tsx
|   |   +-- PatternLock.tsx
|   |   +-- PinInput.tsx
|   |   +-- NotificationBell.tsx
|   |   +-- LanguagePicker.tsx
|   |   +-- EmiCalculator.tsx
|   |   +-- DebtSafetyMeter.tsx
|   |   +-- LoadingSkeleton.tsx
|   +-- store/
|   |   +-- authStore.ts
|   |   +-- loanStore.ts
|   |   +-- schemeStore.ts
|   |   +-- profileStore.ts
|   |   +-- settingsStore.ts
|   +-- services/
|   |   +-- api.ts
|   |   +-- database.ts
|   |   +-- notifications.ts
|   |   +-- storage.ts
|   |   +-- encryption.ts
|   +-- data/                   (copy from src/data/)
|   |   +-- schemesDatabase.json
|   |   +-- cropsData.json
|   |   +-- soilAgriData.json
|   |   +-- dynamicSoilFertility.json
|   |   +-- cropTrendsData.json
|   |   +-- landPricesData.json
|   +-- i18n/
|   |   +-- index.ts
|   |   +-- translations/
|   |       +-- en.json, hi.json, mr.json, ta.json, te.json
|   |       +-- bn.json, gu.json, kn.json, or.json, pa.json
|   |       +-- ml.json, as.json, ur.json, raj.json, bh.json
|   +-- hooks/
|   |   +-- useVoiceInput.ts
|   |   +-- useTTS.ts
|   |   +-- useSchemes.ts
|   |   +-- useLoans.ts
|   |   +-- useSoilData.ts
|   +-- theme/
|   |   +-- colors.ts
|   |   +-- typography.ts
|   |   +-- theme.ts
|   +-- utils/
|       +-- formatCurrency.ts
|       +-- emiCalculator.ts
|       +-- unitConverter.ts
|       +-- validators.ts
+-- assets/
|   +-- icon.png          (1024x1024 - green tractor on field)
|   +-- splash.png
|   +-- adaptive-icon.png
|   +-- favicon.png
+-- scripts/
    +-- extract-translations.js
```

---

## .env File Template

```env
# Backend API URL
API_BASE_URL=http://your-server-domain.com/api

# Google Gemini AI (FREE at https://aistudio.google.com)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Maps (for location auto-detect)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# SMS for OTP - Option A: Fast2SMS (India, cheaper - RECOMMENDED)
FAST2SMS_API_KEY=your_fast2sms_api_key

# SMS for OTP - Option B: Twilio (international)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+1XXXXXXXXXX

# Firebase Push Notifications
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVER_KEY=your_server_key

# Encryption key for Document Vault (32 random characters)
VAULT_ENCRYPTION_SALT=a_random_32_char_string_here
```

---

## Expo app.json Configuration

```json
{
  "expo": {
    "name": "KisanSahay",
    "slug": "kisansahay",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0a0f1a"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.kisansahay.app",
      "buildNumber": "1",
      "config": {
        "googleMapsApiKey": "YOUR_IOS_MAPS_KEY"
      },
      "infoPlist": {
        "NSMicrophoneUsageDescription": "KisanSahay needs microphone for voice search",
        "NSSpeechRecognitionUsageDescription": "KisanSahay needs speech recognition for voice commands",
        "NSCameraUsageDescription": "KisanSahay needs camera to scan documents",
        "NSPhotoLibraryUsageDescription": "KisanSahay needs photo library to save documents",
        "NSLocationWhenInUseUsageDescription": "KisanSahay uses location to show schemes for your state"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#16a34a"
      },
      "package": "com.kisansahay.app",
      "versionCode": 1,
      "permissions": [
        "RECORD_AUDIO", "CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "RECEIVE_BOOT_COMPLETED",
        "VIBRATE", "POST_NOTIFICATIONS"
      ],
      "config": {
        "googleMaps": { "apiKey": "YOUR_ANDROID_MAPS_KEY" }
      }
    },
    "plugins": [
      "expo-notifications",
      "expo-location",
      "expo-camera",
      ["@react-native-voice/voice", {
        "microphonePermission": "Allow KisanSahay to access the microphone",
        "speechRecognitionPermission": "Allow KisanSahay to recognize speech"
      }]
    ],
    "extra": {
      "eas": { "projectId": "your-eas-project-id" }
    }
  }
}
```

---

## Build and Publish Instructions

### Step 1: Setup
```bash
npx create-expo-app KisanSahay-App --template blank-typescript
cd KisanSahay-App
npx expo install expo-sqlite @react-native-async-storage/async-storage \
  expo-notifications expo-location expo-camera expo-speech \
  expo-local-authentication expo-document-picker \
  @react-native-voice/voice react-native-gifted-charts \
  react-native-qrcode-svg @react-navigation/native \
  @react-navigation/bottom-tabs @react-navigation/stack \
  zustand axios react-i18next i18next \
  react-native-paper @expo/vector-icons
```

### Step 2: Copy Data Files
```bash
cp ../src/data/*.json src/data/
```

### Step 3: Extract Translations
```bash
node scripts/extract-translations.js
```

### Step 4: Run in Dev
```bash
npx expo start
# Press 'a' for Android emulator, 'i' for iOS simulator
# Scan QR with Expo Go app on your phone
```

### Step 5: Build for Production
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
eas build --platform ios --profile production
```

### Step 6: Submit to Play Store
```bash
eas submit --platform android
# Requires: Google Play Developer account (Rs 1,750 one-time fee)
```

### Step 7: Submit to App Store
```bash
eas submit --platform ios
# Requires: Apple Developer account ($99/year)
```

---

## Design System

### Colors
```typescript
export const Colors = {
  primary: '#16a34a',       // KisanSahay green
  primaryDark: '#15803d',
  primaryLight: '#86efac',
  background: '#0a0f1a',    // Dark navy
  surface: '#111827',
  surfaceLight: '#1f2937',
  border: '#374151',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  gold: '#fbbf24',
}
```

### Typography
Use 'Outfit' font via @expo-google-fonts/outfit package.

---

## Data to Store On Device

| Data | Size | Storage Method |
|---|---|---|
| 500+ Schemes | 2.3 MB | Bundled JSON asset |
| 63 Crops | 36 KB | Bundled JSON asset |
| Soil Fertility | 35 KB | Bundled JSON asset |
| Crop Trends | 8 KB | Bundled JSON asset |
| Land Prices | 8.8 KB | Bundled JSON asset |
| Loans | Variable | expo-sqlite |
| User Profiles | Variable | AsyncStorage |
| Translations (15 lang) | ~500 KB | Bundled JSON |
| Vault Documents | Variable | AsyncStorage + AES-256 encryption |
| Chat History | Variable | AsyncStorage |
| Notifications | Variable | AsyncStorage |
| Farmer Profile | Small | AsyncStorage |
| Settings | Small | AsyncStorage |

---

## Acceptance Criteria

- App opens in under 2 seconds
- Works 100% offline for schemes, soil, crops, existing loans
- All 15 languages work and persist
- Voice input works in Hindi and English
- TTS reads scheme details aloud
- Vault locks/unlocks with word, PIN, and pattern
- Loans can be added/edited/deleted with live summary update
- AI Chat responds in under 3 seconds on WiFi
- Push notifications arrive for EMI reminders
- Passes Play Store policy review
- App icon and splash match KisanSahay branding (green + white)
- Minimum Android: 8.0 (API 26)
- Minimum iOS: 15

---

## Privacy Policy Required

Before Play Store or App Store submission, create a privacy policy at:
https://your-domain.com/privacy

Include:
- What data you collect: name, phone, farm data
- How it is stored: locally on device, encrypted vault
- No data sold to third parties
- Contact email for data deletion requests

---

## App Store Metadata

- App ID: com.kisansahay.app
- Developer: KisanSahay Team
- Category: Finance / Agriculture
- Target audience: Indian farmers (18-70 years)
- Languages: Hindi, English + 13 Indian regional languages
- Content rating: Everyone

---

Generated from KisanSahay PWA codebase. September 2026.
