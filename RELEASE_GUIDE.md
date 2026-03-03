# RaceDay Mobile — Release & Deployment Guide

This guide provides instructions for building, deploying, and maintaining the RaceDay mobile application.

---

## 1. Prerequisites

- **EAS CLI**: Install and log in.
  ```bash
  npm install -g eas-cli
  eas login
  ```
- **Environment Secrets**: Add these to your project on [expo.dev](https://expo.dev):
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `EXPO_PUBLIC_CONVEX_URL`

---

## 2. Building the App

### Development (Physical Device Testing)
To test on your own device with full debugging:
```bash
eas build --profile development --platform all
```

### Preview (Internal Sharing)
Generates an APK/IPA for your team:
```bash
eas build --profile preview --platform all
```

### Production (App Store / Play Store)
Final binaries for submission:
```bash
eas build --profile production --platform all
```

---

## 3. Over-The-Air (OTA) Updates

Deploy bug fixes or UI tweaks instantly without waiting for app store reviews.

```bash
eas update --branch production --message "Fixed profile sync and updated icons"
```

---

## 4. Submission Checklist

### iOS (App Store Connect)
- **Bundle ID**: `com.raceday.mobile` (configured in `app.json`)
- **Location Justification**: Ensure the justification in `stage-7-build-release.md` is included in your "App Review Information."

### Android (Google Play Console)
- **Package Name**: `com.raceday.mobile`
- **Location Declaration**: Fill out the "Location Permissions" form in the Play Console using the provided justification.

---

## 5. Maintenance

- **Convex**: Monitoring your backend usage on the Convex dashboard.
- **Clerk**: Managing your user base via the Clerk dashboard.
- **EAS**: Tracking build logs and OTA performance on the Expo dashboard.

---

**Happy Racing! 🏃‍♂️💨**
