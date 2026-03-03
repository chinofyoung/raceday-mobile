# Stage 7 — Build, Assets & Store Submission

> **Goal**: Configure EAS Build, create app icons/splash screens, set up OTA updates, and prepare for iOS App Store and Google Play Store submission.

---

## 7.1 — App Icons & Splash Screen

### Required Assets

| Asset | Size | Usage |
|---|---|---|
| `icon.png` | 1024 × 1024px | Universal app icon |
| `adaptive-icon.png` | 1024 × 1024px | Android 8+ foreground layer |
| `splash.png` | 1284 × 2778px | Launch screen image |
| `favicon.png` | 48 × 48px | Web (if applicable) |

### Design Specifications

The icon should follow the RaceDay brand:
- **Background**: `#1f2937` (dark gray)
- **Foreground**: Stylized "R" or running figure in `#f97316` (primary orange)
- **Style**: Bold, italic, geometric — matching the "font-black italic uppercase" vibe
- **Safe zone**: For adaptive icons, keep foreground within the center 72% (366 × 366 safe area within 512 × 512 layer)

### Splash Screen

- **Background color**: `#1f2937`
- **Logo**: RaceDay wordmark centered
- **Style**: Minimal, logo + tagline "YOUR RACE. YOUR TRACK."

### app.json config (already in Stage 1, refined here):

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "cover",
      "backgroundColor": "#1f2937"
    },
    "ios": {
      "icon": "./assets/images/icon.png",
      "supportsTablet": false,
      "bundleIdentifier": "com.raceday.app",
      "buildNumber": "1",
      "infoPlist": {
        "UIBackgroundModes": ["location", "fetch", "remote-notification"],
        "NSLocationAlwaysAndWhenInUseUsageDescription": "RaceDay tracks your location during races to share live progress with friends and family.",
        "NSLocationWhenInUseUsageDescription": "RaceDay uses your location to show your position on the race map."
      }
    },
    "android": {
      "icon": "./assets/images/icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#1f2937"
      },
      "package": "com.raceday.app",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ]
    }
  }
}
```

---

## 7.2 — EAS Build Configuration

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### eas.json

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account-key.json",
        "track": "internal"
      }
    }
  }
}
```

### Build Commands

```bash
# Development build (for testing with dev client)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (for internal testers)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## 7.3 — OTA Updates (expo-updates)

### Install

```bash
npx expo install expo-updates
```

### app.json addition

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "url": "https://u.expo.dev/YOUR_PROJECT_ID",
      "fallbackToCacheTimeout": 5000,
      "checkAutomatically": "ON_LOAD"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### Update Check on Launch

```typescript
// lib/updates.ts
import * as Updates from "expo-updates";
import { Alert } from "react-native";

export async function checkForUpdates() {
  if (__DEV__) return; // Skip in dev mode

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        "Update Available",
        "A new version of RaceDay is ready. Restart to apply?",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Restart",
            onPress: () => Updates.reloadAsync(),
          },
        ]
      );
    }
  } catch (error) {
    console.warn("Update check failed:", error);
  }
}
```

### Publish OTA Update

```bash
# Deploy JS-only changes without rebuilding the binary
eas update --branch production --message "Bug fix: fixed QR brightness"
```

---

## 7.4 — Store Listing Info

### iOS App Store

| Field | Value |
|---|---|
| **App Name** | RaceDay |
| **Subtitle** | Your Race. Your Track. |
| **Category** | Health & Fitness |
| **Secondary Category** | Sports |
| **Support URL** | https://raceday.ph/support |
| **Privacy Policy URL** | https://raceday.ph/privacy |
| **Description** | RaceDay is your companion for running events. Browse upcoming races, register with ease, track your position live during the race, and keep your digital race pass handy — all in one app. |
| **Keywords** | running, race, marathon, fun run, GPS tracker, live tracking, event registration, QR pass, race kit |
| **Content Rating** | 4+ |

### Google Play Store

| Field | Value |
|---|---|
| **App Name** | RaceDay |
| **Short Description** | Browse, register, and track your running races live. |
| **Full Description** | (Same as above, extended) |
| **Category** | Health & Fitness |
| **Content Rating** | Everyone |
| **Tags** | Sports, Running, Fitness |

### Background Location Justification

> [!IMPORTANT]
> Both Apple and Google require explicit justification when using background location.

**Apple App Review Justification:**
> "RaceDay uses background location to provide live GPS tracking during running races and fun runs. This feature is only activated when the runner explicitly starts tracking for an active race event. Background location enables the user's friends, family, and event organizers to see the runner's real-time position on the race map, even when the phone screen is locked during the race. Location tracking automatically stops when the user ends their race session. Users are informed about this behavior before activating tracking, and they must grant explicit background location permission."

**Google Play Location Declaration:**
> Feature: Live Race Tracking
> Usage: Prominent disclosure in-app explaining background location is used only during active race events. Users tap START to begin and STOP to end tracking. A persistent foreground notification displays while tracking is active.

---

## 7.5 — Screenshots for Store Listings

Create screenshots for these screens:
1. **Browse Events** — Showing event cards with images
2. **Event Detail** — Hero image + categories
3. **Live Tracking** — Map with runner markers and GPX route
4. **QR Race Pass** — Full QR code display
5. **My Events** — Registered events list

### Device Sizes Required

| Platform | Device | Resolution |
|---|---|---|
| iOS | iPhone 15 Pro Max | 1290 × 2796 |
| iOS | iPhone SE (3rd) | 750 × 1334 |
| iOS | iPad Pro 12.9" | 2048 × 2732 |
| Android | Phone | 1080 × 1920 |
| Android | Tablet 7" | 1200 × 1920 |
| Android | Tablet 10" | 1600 × 2560 |

---

## 7.6 — Pre-Launch Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console.log/warn in production code
- [ ] Error boundaries wrap all screens
- [ ] Offline states handled (Convex reconnection)

### Testing
- [ ] Tested on iOS simulator (iPhone 15 Pro)
- [ ] Tested on iOS physical device
- [ ] Tested on Android emulator (Pixel 7)
- [ ] Tested on Android physical device
- [ ] Tested with slow network (throttled)
- [ ] Tested with no network (offline QR still works)
- [ ] Tested background tracking with screen locked
- [ ] Tested push notification tap → deep link
- [ ] Tested fresh install login flow
- [ ] Tested re-login after sign out

### Performance
- [ ] App loads in < 2 seconds (splash → main screen)
- [ ] Event list scrolls at 60fps
- [ ] Map renders smoothly with 50+ markers
- [ ] Background tracking doesn't drain > 5% battery/hour
- [ ] Images cached after first load

### Security
- [ ] Clerk tokens stored in SecureStore (not AsyncStorage)
- [ ] Convex auth middleware enforces access control
- [ ] No sensitive data logged in production
- [ ] API keys in .env, not hardcoded

### Store Compliance
- [ ] Privacy policy URL accessible
- [ ] Background location permission includes usage description
- [ ] App review justification prepared
- [ ] App screenshots captured for all required device sizes
- [ ] Version and build numbers incremented

---

## 7.7 — Post-Launch Monitoring

| What | Tool |
|---|---|
| Crash reporting | Sentry or `expo-error-recovery` |
| Analytics | Expo Analytics or Mixpanel |
| OTA updates | EAS Update dashboard |
| Store reviews | App Store Connect / Google Play Console |
| Build status | EAS Build dashboard |

---

## Deliverables Checklist

- [ ] App icon (1024×1024) and adaptive icon created
- [ ] Splash screen matching RaceDay brand
- [ ] `eas.json` configured (dev, preview, production profiles)
- [ ] Development build runs on physical device
- [ ] Preview build shared with internal testers
- [ ] Production build created for both platforms
- [ ] `expo-updates` configured for OTA
- [ ] Store listing metadata prepared
- [ ] Background location justification written
- [ ] Screenshots captured for all required sizes
- [ ] Pre-launch checklist completed
- [ ] iOS build submitted to App Store Connect
- [ ] Android build submitted to Google Play Console
