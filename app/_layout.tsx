// 1
import { api } from "@/convex/_generated/api";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { tokenCache } from "@/lib/tokenCache";
import "@/lib/tracking/backgroundTask";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import {
  Barlow_300Light,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from "@expo-google-fonts/barlow";
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from "@expo-google-fonts/barlow-condensed";
import { ConvexReactClient, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { useCurrentUser } from "../lib/hooks/useCurrentUser";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

function AuthCheck() {
  const { user, isLoaded: isUserLoaded } = useCurrentUser();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const updatePushToken = useMutation(api.users.updatePushToken);

  useEffect(() => {
    if (isUserLoaded && user) {
      // Register for push notifications
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          updatePushToken({ expoPushToken: token }).catch((err: any) =>
            console.error("Failed to update push token:", err)
          );
        }
      });

      // Handle notification tapping (deep linking)
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data as any;
        if (data?.announcementId) {
          // In a real app, we'd navigate to the announcement detail
          // For now, we'll just go to the events list
          router.push("/(tabs)");
        }
      });

      return () => subscription.remove();
    }
  }, [isUserLoaded, user]);

  useEffect(() => {
    if (!isAuthLoaded) return;

    const currentGroup = segments[0];
    if (!currentGroup) return;

    if (!isSignedIn && currentGroup !== "(auth)") {
      router.replace("/(auth)/login");
    } else if (isSignedIn && currentGroup === "(auth)") {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isAuthLoaded, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Barlow_300Light,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ClerkLoaded>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="events" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <AuthCheck />
          <StatusBar style="light" />
        </ClerkLoaded>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
