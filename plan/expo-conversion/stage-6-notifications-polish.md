# Stage 6 — Push Notifications & Polish

> **Goal**: Push notifications for race announcements, micro-animations, haptic feedback, error handling, and overall UX polish.

---

## 6.1 — Push Notifications

### Dependencies (already installed if following the companion plan)

```bash
npx expo install expo-notifications expo-device expo-constants
```

### Register Push Token on Login

```typescript
// lib/notifications/pushRegistration.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission not granted");
    return null;
  }

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("announcements", {
      name: "Race Announcements",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#f97316",
      sound: "default",
    });
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return token.data;
}
```

### Save Token to Convex on App Launch

```typescript
// In app/_layout.tsx or a dedicated hook
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { registerForPushNotifications } from "@/lib/notifications/pushRegistration";
import { useAuth } from "@/lib/hooks/useAuth";

function usePushNotificationSetup() {
  const { user } = useAuth();
  const updatePushToken = useMutation(api.users.updatePushToken);

  useEffect(() => {
    if (!user) return;

    const setup = async () => {
      const token = await registerForPushNotifications();
      if (token && token !== user.expoPushToken) {
        await updatePushToken({ expoPushToken: token });
      }
    };

    setup();
  }, [user?._id]);
}
```

### Handle Notification Taps (Deep Linking)

```typescript
// lib/notifications/notificationHandler.ts
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

export function setupNotificationResponseHandler() {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;

    // Navigate to relevant screen based on notification data
    if (data?.announcementId) {
      // Navigate to the event that has this announcement
      if (data?.eventId) {
        router.push(`/event/${data.eventId}`);
      }
    }
  });

  return subscription;
}
```

> [!NOTE]
> Push notification sending is already implemented in the Convex backend (`convex/announcements.ts` → `sendAnnouncementPushes`) and `convex/notifications.ts` → `sendPush`. The backend already handles:
> 1. Fetching registered users' Expo push tokens
> 2. Sending via the Expo Push API
> 3. Updating sent count
> No backend changes needed!

---

## 6.2 — Toast Message Configuration

```typescript
// lib/toast.ts
import Toast from "react-native-toast-message";

export function showSuccess(message: string) {
  Toast.show({
    type: "success",
    text1: message,
    position: "bottom",
    visibilityTime: 2500,
  });
}

export function showError(message: string) {
  Toast.show({
    type: "error",
    text1: message,
    position: "bottom",
    visibilityTime: 3500,
  });
}

export function showInfo(message: string) {
  Toast.show({
    type: "info",
    text1: message,
    position: "bottom",
    visibilityTime: 2500,
  });
}
```

### Custom Toast Config (matches RaceDay theme):

```typescript
// components/ui/ToastConfig.tsx
import { View, Text, StyleSheet } from "react-native";
import { Check, X, Info } from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";

export const toastConfig = {
  success: ({ text1 }: { text1: string }) => (
    <View style={[styles.toast, styles.successToast]}>
      <Check size={16} color={colors.cta} />
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  ),
  error: ({ text1 }: { text1: string }) => (
    <View style={[styles.toast, styles.errorToast]}>
      <X size={16} color={colors.danger} />
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  ),
  info: ({ text1 }: { text1: string }) => (
    <View style={[styles.toast, styles.infoToast]}>
      <Info size={16} color={colors.info} />
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  ),
};

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
  },
  successToast: {
    backgroundColor: `${colors.cta}1A`,
    borderColor: `${colors.cta}33`,
  },
  errorToast: {
    backgroundColor: `${colors.danger}1A`,
    borderColor: `${colors.danger}33`,
  },
  infoToast: {
    backgroundColor: `${colors.info}1A`,
    borderColor: `${colors.info}33`,
  },
  toastText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
});
```

---

## 6.3 — Error Boundary

```typescript
// components/ErrorBoundary.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AlertTriangle size={48} color={colors.warning} style={{ opacity: 0.5 }} />
          <Text style={styles.title}>SOMETHING WENT WRONG</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: undefined })}
            style={styles.retryButton}
          >
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["4xl"],
    gap: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.xl,
    color: colors.text,
    fontStyle: "italic",
    textAlign: "center",
  },
  message: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  retryText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.sm,
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontStyle: "italic",
  },
});
```

---

## 6.4 — Accessibility Checklist

| Requirement | Implementation |
|---|---|
| Touch targets ≥ 44pt | All buttons/pressables have min 44×44 |
| Screen reader labels | `accessibilityLabel` on all icons and buttons |
| Color not sole indicator | Badges have text AND color |
| Reduced motion | Check `AccessibilityInfo.isReduceMotionEnabled()` |
| Focus order | Logical tab order in forms |
| Contrast ratio | 4.5:1 minimum (dark theme already achieves this) |

### Reduced Motion Support

```typescript
// lib/hooks/useReducedMotion.ts
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);

  return reduced;
}
```

---

## 6.5 — Performance Optimizations

| Optimization | Technique |
|---|---|
| Image caching | `expo-image` with blurhash placeholders |
| List performance | `FlatList` with `getItemLayout`, `removeClippedSubviews` |
| Re-render prevention | `useQuery` placed at appropriate component level |
| Navigation | Lazy loading screens with `React.lazy` |
| Memory | `Image` recycling in lists via `recyclingKey` |
| Bundle size | Import only needed icons from `lucide-react-native` |

---

## 6.6 — Final Polish Checklist

### Visual Polish

- [ ] Loading skeletons on all data-dependent screens
- [ ] Pull-to-refresh on list screens
- [ ] Haptic feedback on all button presses (`expo-haptics`)
- [ ] Smooth page transitions (Expo Router animations)
- [ ] Entry animations on cards (stagger FadeInDown)
- [ ] Error boundaries with styled fallback
- [ ] Empty states with illustrations and CTAs
- [ ] Consistent use of design tokens (no hardcoded colors/fonts)

### Interaction Polish

- [ ] Pressable visual feedback (opacity + scale)
- [ ] Toast notifications for success/error/info
- [ ] Alert dialogs for destructive actions (sign out, cancel)
- [ ] Keyboard-aware form scrolling
- [ ] Safe area insets respected on all screens

### Dark Theme

- [ ] Consistent background colors (background → surface → white/5)
- [ ] Text contrast meets 4.5:1 WCAG
- [ ] Borders visible (white/10 or white/5)
- [ ] Status bar set to "light"

---

## Deliverables Checklist

- [ ] Push notification registration on app launch
- [ ] Expo push token saved to Convex user record
- [ ] Notification tap deep-links to relevant event
- [ ] Android notification channel configured
- [ ] Custom toast messages matching RaceDay theme
- [ ] Error boundary with retry button
- [ ] Accessibility: screen reader labels, 44pt touch targets
- [ ] Reduced motion support
- [ ] Performance: image caching, list optimization
- [ ] All visual polish items from checklist above
