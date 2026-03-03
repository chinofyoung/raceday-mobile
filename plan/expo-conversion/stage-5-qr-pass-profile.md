# Stage 5 — QR Pass & Profile Management

> **Goal**: Runners can display their race QR pass (full-screen, offline-capable) and manage their profile settings.

---

## 5.1 — QR Pass Screen

Converts the web's QR pass page. This is the **daily-use feature** — runners show this at the race kit claim booth.

### Dependencies

```bash
npx expo install react-native-qrcode-svg
npx expo install expo-keep-awake
npx expo install expo-brightness
```

### Screen: QR Pass

```typescript
// app/qr/[regId].tsx
import { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import QRCode from "react-native-qrcode-svg";
import { useKeepAwake } from "expo-keep-awake";
import * as Brightness from "expo-brightness";
import { colors, spacing, fontSize, borderRadius, shadows } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { ArrowLeft, Package, CheckCircle } from "lucide-react-native";
import { Badge } from "@/components/ui/Badge";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH - 80, 300);

export default function QRPassScreen() {
  const { regId } = useLocalSearchParams<{ regId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Keep screen awake while showing QR
  useKeepAwake();

  // Max brightness for easy scanning
  useEffect(() => {
    let originalBrightness: number | null = null;

    const setBrightness = async () => {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === "granted") {
          originalBrightness = await Brightness.getBrightnessAsync();
          await Brightness.setBrightnessAsync(1.0); // Max brightness
        }
      } catch (e) {
        console.warn("Brightness control not available:", e);
      }
    };

    setBrightness();

    return () => {
      // Restore original brightness on unmount
      if (originalBrightness !== null) {
        Brightness.setBrightnessAsync(originalBrightness).catch(() => {});
      }
    };
  }, []);

  const registration = useQuery(
    api.registrations.getById,
    regId ? { id: regId as Id<"registrations"> } : "skip"
  );

  const event = useQuery(
    api.events.getById,
    registration?.eventId ? { id: registration.eventId } : "skip"
  );

  if (!registration || !event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <View style={styles.qrSkeleton} />
          <View style={styles.textSkeleton} />
          <View style={styles.textSkeletonShort} />
        </View>
      </View>
    );
  }

  const category = event.categories?.find(c => c.id === registration.categoryId);
  const categoryName = category?.name || registration.categoryId;
  const participantName = (registration as any).registrationData?.participantInfo?.name || "Runner";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>RACE PASS</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* QR Card */}
      <Animated.View entering={SlideInUp.springify().delay(100)} style={styles.qrCard}>
        {/* Event Name */}
        <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
        <Text style={styles.categoryLabel}>{categoryName}</Text>

        {/* Race Number */}
        {registration.raceNumber && (
          <Animated.View entering={FadeIn.delay(300)} style={styles.raceNumberContainer}>
            <Text style={styles.raceNumberHash}>#</Text>
            <Text style={styles.raceNumber}>{registration.raceNumber}</Text>
          </Animated.View>
        )}

        {/* QR Code */}
        <Animated.View entering={FadeIn.delay(400)} style={styles.qrContainer}>
          <QRCode
            value={regId}
            size={QR_SIZE}
            backgroundColor={colors.background}
            color={colors.text}
            quietZone={10}
          />
        </Animated.View>

        {/* Runner Info */}
        <Text style={styles.runnerName}>{participantName}</Text>

        {/* Kit Status */}
        <View style={styles.kitStatus}>
          {registration.raceKitClaimed ? (
            <View style={styles.kitCollected}>
              <CheckCircle size={18} color={colors.cta} />
              <Text style={styles.kitCollectedText}>KIT COLLECTED</Text>
              {registration.raceKitClaimedAt && (
                <Text style={styles.kitCollectedDate}>
                  {new Date(registration.raceKitClaimedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.kitPending}>
              <Package size={18} color={colors.textMuted} />
              <Text style={styles.kitPendingText}>KIT PENDING</Text>
            </View>
          )}
        </View>

        {/* Status Badge */}
        <Badge
          label={registration.status === "paid" ? "Confirmed" : "Pending Payment"}
          color={registration.status === "paid" ? colors.cta : colors.pendingBadge}
        />
      </Animated.View>

      {/* Hint */}
      <Text style={styles.hint}>
        Show this QR code at the Race Kit Claim booth.{"\n"}
        Screen will stay on and at max brightness.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  qrSkeleton: {
    width: QR_SIZE,
    height: QR_SIZE,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
  },
  textSkeleton: {
    width: 200,
    height: 24,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  textSkeletonShort: {
    width: 120,
    height: 16,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36, height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white10,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.lg,
    color: colors.text,
    fontStyle: "italic",
    letterSpacing: 2,
  },
  qrCard: {
    backgroundColor: `${colors.surface}66`,
    borderRadius: borderRadius["3xl"],
    borderWidth: 1,
    borderColor: colors.white10,
    padding: spacing["2xl"],
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    alignItems: "center",
    gap: spacing.lg,
    ...shadows.xl,
  },
  eventName: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize["2xl"],
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: fontSize["2xl"] * 1.1,
  },
  categoryLabel: {
    fontFamily: fontFamily.headingSemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  raceNumberContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  raceNumberHash: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize["3xl"],
    color: colors.primary,
    fontStyle: "italic",
  },
  raceNumber: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize["5xl"],
    color: colors.text,
    fontStyle: "italic",
    letterSpacing: -2,
  },
  qrContainer: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.white10,
  },
  runnerName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.md,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kitStatus: {
    alignItems: "center",
  },
  kitCollected: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.cta}1A`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.cta}33`,
  },
  kitCollectedText: {
    fontFamily: fontFamily.headingBold,
    fontSize: fontSize.xs,
    color: colors.cta,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kitCollectedDate: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  kitPending: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  kitPendingText: {
    fontFamily: fontFamily.headingBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hint: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: spacing.xl,
    paddingHorizontal: spacing["3xl"],
    lineHeight: fontSize.sm * 1.6,
  },
});
```

> [!TIP]
> The QR code is generated **locally** from the registration ID — it works completely **offline**. No network connection needed to show the pass.

---

## 5.2 — Settings / Profile Screen

```typescript
// app/(tabs)/settings.tsx
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, fontSize, borderRadius, shadows } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  User, Mail, Phone, MapPin, Heart, Shield,
  LogOut, ChevronRight, Bell, Palette
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
  const { user, clerkUser, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await signOut();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  if (!user) return null;

  const profileItems = [
    {
      icon: User,
      label: "Display Name",
      value: user.displayName,
    },
    {
      icon: Mail,
      label: "Email",
      value: user.email,
    },
    {
      icon: Phone,
      label: "Phone",
      value: user.phone || "Not set",
      muted: !user.phone,
    },
    {
      icon: MapPin,
      label: "City",
      value: user.address?.city || "Not set",
      muted: !user.address?.city,
    },
    {
      icon: Heart,
      label: "Medical Conditions",
      value: user.medicalConditions || "None",
      muted: !user.medicalConditions,
    },
    {
      icon: Shield,
      label: "Emergency Contact",
      value: user.emergencyContact?.name || "Not set",
      muted: !user.emergencyContact?.name,
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title="PROFILE" subtitle="Your account settings" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing["4xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & Name Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user.displayName?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.email}>{user.email}</Text>

          {/* Profile Completion */}
          <View style={styles.completionContainer}>
            <View style={styles.completionBar}>
              <View
                style={[
                  styles.completionFill,
                  { width: `${user.profileCompletion || 0}%` },
                ]}
              />
            </View>
            <Text style={styles.completionText}>
              {user.profileCompletion || 0}% Complete
            </Text>
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERSONAL INFO</Text>
          {profileItems.map((item, i) => (
            <View key={i} style={styles.profileItem}>
              <item.icon size={18} color={colors.primary} />
              <View style={styles.profileItemContent}>
                <Text style={styles.profileItemLabel}>{item.label}</Text>
                <Text style={[
                  styles.profileItemValue,
                  item.muted && styles.profileItemMuted,
                ]}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>

          <Pressable style={styles.actionItem}>
            <Bell size={18} color={colors.textMuted} />
            <Text style={styles.actionText}>Notifications</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable style={styles.actionItem}>
            <Palette size={18} color={colors.textMuted} />
            <Text style={styles.actionText}>Appearance</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>

        {/* App Version */}
        <Text style={styles.version}>RaceDay v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, gap: spacing["2xl"] },
  profileCard: {
    alignItems: "center",
    backgroundColor: `${colors.surface}66`,
    borderRadius: borderRadius["2xl"],
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.white5,
    gap: spacing.sm,
    ...shadows.md,
  },
  avatarContainer: { marginBottom: spacing.sm },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.primary },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${colors.primary}33`,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: colors.primary,
  },
  avatarInitial: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize["3xl"],
    color: colors.primary,
    fontStyle: "italic",
  },
  displayName: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.xl,
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
  },
  email: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  completionContainer: { width: "100%", gap: spacing.xs, marginTop: spacing.sm },
  completionBar: {
    height: 6, borderRadius: 3,
    backgroundColor: colors.white10,
    overflow: "hidden",
  },
  completionFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  completionText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "right",
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 2,
    fontStyle: "italic",
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: `${colors.surface}66`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.white5,
  },
  profileItemContent: { flex: 1, gap: 2 },
  profileItemLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  profileItemValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.base,
    color: colors.text,
  },
  profileItemMuted: { color: colors.textMuted, fontStyle: "italic" },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: `${colors.surface}66`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.white5,
  },
  actionText: {
    flex: 1,
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.base,
    color: colors.text,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.danger}33`,
    backgroundColor: `${colors.danger}0D`,
  },
  signOutText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.sm,
    color: colors.danger,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontStyle: "italic",
  },
  version: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.xs,
    color: `${colors.textMuted}80`,
    textAlign: "center",
  },
});
```

---

## Deliverables Checklist

- [ ] QR Pass screen with full-screen QR code
- [ ] QR code generated locally from registration ID (offline-capable)
- [ ] Screen stays awake while QR is displayed (`expo-keep-awake`)
- [ ] Max brightness on QR screen (`expo-brightness`)
- [ ] Race number prominently displayed
- [ ] Runner name, category, and event name shown
- [ ] Kit claimed/pending status indicator
- [ ] Registration status badge (Confirmed/Pending)
- [ ] Entrance/exit animations (SlideInUp, FadeIn)
- [ ] Loading skeleton while data fetches
- [ ] Settings/Profile screen with user info display
- [ ] Avatar with photo or initial
- [ ] Profile completion progress bar
- [ ] Personal info list (name, email, phone, city, medical, emergency)
- [ ] Sign out with confirmation dialog
- [ ] App version display
- [ ] Haptic feedback on all interactions
