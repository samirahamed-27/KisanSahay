# KisanSahay — Apple App Store Submission Guide (Capacitor iOS)

This guide provides end-to-end instructions for packaging and publishing the **KisanSahay** application to the **Apple App Store** using the Capacitor iOS runtime.

---

## 1. Prerequisites

1. **Apple Developer Account**:
   - Enroll in the [Apple Developer Program](https://developer.apple.com/programs/).
   - Annual membership fee: **$99 USD/year**.
   - Required to generate provisioning profiles and distribute to the App Store and TestFlight.
2. **Mac with macOS & Xcode**:
   - Xcode 15 or 16 installed from the Mac App Store.
   - Command Line Tools installed (`xcode-select --install`).
   - CocoaPods installed (`sudo gem install cocoapods` or `brew install cocoapods`).

---

## 2. Capacitor Project Setup

Capacitor is already configured in the KisanSahay workspace:
- Core configuration: `capacitor.config.json`
- Application ID: `com.kisansahay.app`
- App Name: `KisanSahay`
- Web Directory: `public`

### Initializing & Syncing the iOS Project

Run the following commands on a Mac with CocoaPods installed:

```bash
# 1. Add iOS platform (generates ios/ directory and Pods)
npx cap add ios

# 2. Sync web assets (copies public/ directory to iOS native project)
npx cap sync

# 3. Open the project in Xcode
npx cap open ios
```

> [!NOTE]
> Each time you make updates to HTML, CSS, or JS in `public/`, run `npx cap sync` to copy changes into the native iOS bundle.

---

## 3. Configuring Xcode Project Settings

When Xcode opens `ios/App/App.xcworkspace`:

1. **Select the Project Target**:
   - Click on `App` in the top-left Project Navigator.
   - Select the `App` target under **Targets**.
2. **Signing & Capabilities**:
   - Navigate to the **Signing & Capabilities** tab.
   - Check **Automatically manage signing**.
   - In the **Team** dropdown, select your Apple Developer Team.
   - Verify the **Bundle Identifier**: `com.kisansahay.app`.
3. **App Icons & Launch Screen**:
   - In Xcode Navigator, open `App/App/Assets.xcassets/AppIcon.appiconset`.
   - Place the 1024×1024 App Store icon (available at `public/icons/icon-512.png` or generated master asset).
   - Configure splash screen color in `LaunchScreen.storyboard` matching `#0a0f1a`.
4. **Info.plist Privacy Permissions**:
   - Open `Info.plist` and add appropriate permission descriptions:
     - `NSLocationWhenInUseUsageDescription`: "KisanSahay uses your location to identify your state and district for relevant regional agricultural subsidies and loans."
     - `NSMicrophoneUsageDescription`: "KisanSahay uses the microphone to enable voice-assisted navigation and search for Indian farmers."

---

## 4. App Store Connect Listing

Log in to [App Store Connect](https://appstoreconnect.apple.com):

1. **Create New App**:
   - Platform: **iOS**
   - Name: `KisanSahay: Farmer Schemes`
   - Primary Language: **English (U.S.)** or **Hindi**
   - Bundle ID: Select `com.kisansahay.app`
   - SKU: `KISANSAHAY-IOS-001`
   - User Access: Full Access
2. **App Information & Category**:
   - Primary Category: **Finance** or **Utilities**
   - Secondary Category: **Reference**
3. **Pricing and Availability**:
   - Price: **Free** (0.00 USD)
   - Availability: India (and worldwide if desired)
4. **App Privacy (Nutrition Labels)**:
   - Data Used to Track You: **None**
   - Data Linked to You: **None**
   - Data Not Linked to You: Location (Coarse/District level, functionality only).

---

## 5. App Store Screenshots & Metadata

Upload screenshots for mandatory display sizes:
- **6.7" iPhone Display** (iPhone 16 Pro Max / 15 Pro Max): 1290 × 2796 pixels or 1320 × 2868 pixels.
- **5.5" iPhone Display** (iPhone 8 Plus): 1242 × 2208 pixels.
- **12.9" iPad Pro Display** (if enabling iPad support): 2048 × 2732 pixels.

Recommended Screenshot Progression:
1. **Screen 1**: "Discover 670+ Government Farmer Schemes & Subsidies" (Home view with category cards).
2. **Screen 2**: "Instant 3-Step Eligibility Check" (Multi-step farmer questionnaire).
3. **Screen 3**: "All-India Regional Loan Coverage" (Schemes view with 36-state selector).
4. **Screen 4**: "Encrypted Vault & Smart EMI Tracker" (Document Vault and active loans).

---

## 6. Archiving, TestFlight & App Review Submission

1. In Xcode, select **Any iOS Device (arm64)** as the build target in the top toolbar.
2. From the menu bar, choose **Product** > **Archive**.
3. Once the archive completes, Xcode's **Organizer** window will open.
4. Click **Distribute App** > **App Store Connect** > **Upload**.
5. Select default options for app thinning and bitcode, then click **Upload**.
6. **TestFlight Internal Testing**:
   - Once processing finishes in App Store Connect (10–15 minutes), invite internal testers via TestFlight to test on physical iPhones.
7. **Submit for Review**:
   - In App Store Connect under the iOS App version, select the uploaded build.
   - Complete review contact info and testing demo instructions.
   - Click **Add for Review** $\rightarrow$ **Submit to App Review**.
   - Apple App Review typically takes 24–48 hours. Once approved, your status will change to **Ready for Sale**!
