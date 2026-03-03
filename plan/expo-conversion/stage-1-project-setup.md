# Stage 1 — Project Setup & Authentication

> **Goal**: Working Expo app with Clerk authentication, Convex real-time backend, design system, and tab navigation shell.

---

## 1.1 — Project Initialization

### Create the Expo project

```bash
# From the raceday-app parent directory
npx create-expo-app@latest raceday-mobile --template tabs
cd raceday-mobile
```

### Install core dependencies

```bash
# Convex (same version as web)
npx expo install convex

# Clerk for Expo
npx expo install @clerk/clerk-expo expo-secure-store expo-web-browser expo-linking

# Navigation (Expo Router)
npx expo install expo-router expo-constants expo-status-bar

# Essentials
npx expo install react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated

# Images (replaces next/image)
npx expo install expo-image

# Icons (same as web)
npx expo install lucide-react-native react-native-svg

# Fonts (match web app)
npx expo install expo-font @expo-google-fonts/barlow @expo-google-fonts/barlow-condensed

# Utilities
npx expo install date-fns expo-haptics

# Toast notifications (replaces sonner)
npm install react-native-toast-message
```

---

## 1.2 — Environment Variables

Create `.env` at the root of `raceday-mobile/`:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx    # Same as web app
EXPO_PUBLIC_CONVEX_URL=https://xxx.convex.cloud   # Same as web app
```

> [!IMPORTANT]
> Use the EXACT same Clerk and Convex credentials as the web app. This ensures runners log into the same account on both platforms.

---

## 1.3 — Clerk Token Cache

```typescript
// lib/tokenCache.ts
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY_PREFIX = "clerk_";

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(`${TOKEN_KEY_PREFIX}${key}`);
    } catch (error) {
      console.error("Failed to get token from SecureStore:", error);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(`${TOKEN_KEY_PREFIX}${key}`, value);
    } catch (error) {
      console.error("Failed to save token to SecureStore:", error);
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`${TOKEN_KEY_PREFIX}${key}`);
    } catch (error) {
      console.error("Failed to clear token from SecureStore:", error);
    }
  },
};
```

---

## 1.4 — Clerk Provider

```typescript
// components/providers/ClerkProvider.tsx
import { ClerkProvider as ClerkProviderBase, ClerkLoaded } from "@clerk/clerk-expo";
import { tokenCache } from "@/lib/tokenCache";

interface Props {
  children: React.ReactNode;
}

export function ClerkProvider({ children }: Props) {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
  }

  return (
    <ClerkProviderBase publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        {children}
      </ClerkLoaded>
    </ClerkProviderBase>
  );
}
```

---

## 1.5 — Convex Provider

```typescript
// components/providers/ConvexProvider.tsx
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexReactClient(convexUrl);

interface Props {
  children: React.ReactNode;
}

export function ConvexProvider({ children }: Props) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

---

## 1.6 — Convex Directory Sharing

Symlink the Convex directory so the mobile app uses the same schema and generated types:

```bash
# From raceday-mobile/
ln -s ../raceday-app/convex ./convex
ln -s ../raceday-app/types ./types
```

Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/convex/*": ["./convex/*"]
    }
  }
}
```

---

## 1.7 — Design System Constants

### Colors & Theme

```typescript
// constants/theme.ts
export const colors = {
  // Core palette — exact match from web globals.css
  primary: "#f97316",
  secondary: "#fb923c",
  cta: "#22c55e",
  ctaHover: "#16a34a",
  background: "#1f2937",
  surface: "#374151",
  surfaceLight: "#4b5563",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",

  // Transparency
  white10: "rgba(255,255,255,0.1)",
  white5: "rgba(255,255,255,0.05)",
  white20: "rgba(255,255,255,0.2)",
  black40: "rgba(0,0,0,0.4)",
  black60: "rgba(0,0,0,0.6)",
  black80: "rgba(0,0,0,0.8)",

  // Semantic
  success: "#22c55e",
  paidBadge: "#22c55e",
  pendingBadge: "#f97316",
  cancelledBadge: "#ef4444",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
  "6xl": 48,
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 8,
  },
} as const;
```

### Font Configuration

```typescript
// constants/fonts.ts
export const fontFamily = {
  // Heading (Barlow Condensed)
  headingRegular: "BarlowCondensed_400Regular",
  headingMedium: "BarlowCondensed_500Medium",
  headingSemiBold: "BarlowCondensed_600SemiBold",
  headingBold: "BarlowCondensed_700Bold",
  headingExtraBold: "BarlowCondensed_800ExtraBold",
  headingBlack: "BarlowCondensed_900Black",

  // Body (Barlow)
  bodyLight: "Barlow_300Light",
  bodyRegular: "Barlow_400Regular",
  bodyMedium: "Barlow_500Medium",
  bodySemiBold: "Barlow_600SemiBold",
  bodyBold: "Barlow_700Bold",
  bodyExtraBold: "Barlow_800ExtraBold",
  bodyBlack: "Barlow_900Black",
} as const;
```

---

## 1.8 — Root Layout (Entry Point)

```typescript
// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_900Black,
} from "@expo-google-fonts/barlow-condensed";
import {
  Barlow_300Light,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  Barlow_900Black,
} from "@expo-google-fonts/barlow";
import * as SplashScreen from "expo-splash-screen";
import Toast from "react-native-toast-message";

import { ClerkProvider } from "@/components/providers/ClerkProvider";
import { ConvexProvider } from "@/components/providers/ConvexProvider";
import { colors } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
    Barlow_300Light,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_800ExtraBold,
    Barlow_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ClerkProvider>
      <ConvexProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        />
        <Toast />
      </ConvexProvider>
    </ClerkProvider>
  );
}
```

---

## 1.9 — Auth Check & Redirect

```typescript
// app/index.tsx
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { colors } from "@/constants/theme";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
```

---

## 1.10 — Login Screen

```typescript
// app/(auth)/login.tsx
import { useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from "react-native";
import { useOAuth, useSignIn } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, fontSize, spacing, borderRadius, shadows } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const syncUser = useMutation(api.users.syncUser);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive, signUp } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/"),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        // Sync user to Convex
        if (signUp?.emailAddress) {
          await syncUser({
            uid: signUp.createdUserId!,
            email: signUp.emailAddress,
            displayName: signUp.firstName
              ? `${signUp.firstName} ${signUp.lastName || ""}`.trim()
              : signUp.emailAddress.split("@")[0],
            photoURL: signUp.imageUrl || undefined,
          });
        }

        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("OAuth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>RACEDAY</Text>
          <Text style={styles.tagline}>YOUR RACE. YOUR TRACK.</Text>
        </View>

        {/* Login Button */}
        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Image
                source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>CONTINUE WITH GOOGLE</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: spacing["3xl"],
  },
  content: {
    alignItems: "center",
    gap: spacing["4xl"],
  },
  logoContainer: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logoText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize["6xl"],
    color: colors.primary,
    letterSpacing: -2,
    fontStyle: "italic",
  },
  tagline: {
    fontFamily: fontFamily.headingSemiBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing["3xl"],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.white10,
    width: "100%",
    ...shadows.md,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontFamily: fontFamily.headingBold,
    fontSize: fontSize.base,
    color: colors.text,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  disclaimer: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing["2xl"],
  },
});
```

---

## 1.11 — Tab Navigator

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Search, Calendar, Navigation, User } from "lucide-react-native";
import { colors, fontSize, spacing } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.white10,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: spacing.sm,
          paddingBottom: Platform.OS === "ios" ? spacing["3xl"] : spacing.md,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.headingBold,
          fontSize: fontSize.xs,
          letterSpacing: 1,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-events"
        options={{
          title: "My Events",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live",
          tabBarIcon: ({ color, size }) => <Navigation size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

---

## 1.12 — useAuth Hook (Mobile Version)

```typescript
// lib/hooks/useAuth.ts
import { useUser, useClerk } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export const useAuth = () => {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut } = useClerk();
  const convexUser = useQuery(api.users.current);

  const loading = !clerkLoaded || (!!clerkUser && convexUser === undefined);

  return {
    user: convexUser ?? null,
    clerkUser,
    loading,
    role: convexUser?.role || null,
    signOut: async () => {
      await signOut();
    },
  };
};
```

---

## 1.13 — Clerk Dashboard Configuration

Add these redirect URIs in the Clerk Dashboard:

| Environment | URI |
|---|---|
| Development | `exp://localhost:8081` |
| Development (tunnel) | `exp://YOUR_IP:8081` |
| Production | `raceday://` |
| Production (iOS) | `com.raceday.app://` |

---

## 1.14 — app.json Configuration

```json
{
  "expo": {
    "name": "RaceDay",
    "slug": "raceday",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "raceday",
    "icon": "./assets/images/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "cover",
      "backgroundColor": "#1f2937"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.raceday.app",
      "infoPlist": {
        "UIBackgroundModes": ["location", "fetch"]
      }
    },
    "android": {
      "package": "com.raceday.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#1f2937"
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-font"
    ]
  }
}
```

---

## Deliverables Checklist

- [ ] Expo project initialized with all dependencies
- [ ] `.env` configured with shared Clerk + Convex credentials
- [ ] Convex directory symlinked from web app
- [ ] Types directory symlinked from web app
- [ ] Clerk authentication flow (Google OAuth)
- [ ] Convex client connected and syncing user data
- [ ] Design system constants (colors, fonts, spacing, shadows)
- [ ] Barlow + Barlow Condensed fonts loading correctly
- [ ] Tab navigator with 4 tabs (Browse, My Events, Live, Profile)
- [ ] Auth redirect (login → tabs)
- [ ] Dark theme matching web app
- [ ] `useAuth` hook working (Clerk + Convex user)
- [ ] Runs on iOS Simulator and Android Emulator
