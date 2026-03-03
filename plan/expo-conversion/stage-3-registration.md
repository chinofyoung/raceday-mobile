# Stage 3 — Registration & My Events

> **Goal**: Runners can register for events through a multi-step form, view their registrations, and access race passes.

---

## 3.1 — Registration Flow (Multi-Step Form)

Converts the web's 5-step registration form (`RegistrationForm.tsx`, `Step0Who.tsx` through `Step4Review.tsx`).

### Registration Steps

| Step | Web Component | Mobile Component | Purpose |
|---|---|---|---|
| 0 | `Step0Who.tsx` | `StepWho.tsx` | Self or proxy registration |
| 1 | `Step1Category.tsx` | `StepCategory.tsx` | Choose race category |
| 2 | `Step2Details.tsx` | `StepDetails.tsx` | Personal info, T-shirt size, emergency contact |
| 3 | `Step3Vanity.tsx` | `StepVanity.tsx` | Vanity race number (optional) |
| 4 | `Step4Review.tsx` | `StepReview.tsx` | Review & submit |

### Screen: Registration Flow

```typescript
// app/event/[id]/register.tsx
import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/hooks/useAuth";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { ArrowLeft, ArrowRight, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";

// Step components
import { StepWho } from "@/components/registration/StepWho";
import { StepCategory } from "@/components/registration/StepCategory";
import { StepDetails } from "@/components/registration/StepDetails";
import { StepVanity } from "@/components/registration/StepVanity";
import { StepReview } from "@/components/registration/StepReview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STEPS = ["Who", "Category", "Details", "Vanity", "Review"];

export default function RegistrationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const createRegistration = useMutation(api.registrations.create);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    isProxy: false,
    categoryId: "",
    participantInfo: {
      name: user?.displayName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      gender: user?.gender || "",
      birthDate: user?.birthDate || "",
      tShirtSize: user?.tShirtSize || "",
      emergencyContact: user?.emergencyContact || { name: "", phone: "", relationship: "" },
    },
    vanityNumber: null as string | null,
    totalPrice: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!user || !event) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const regId = await createRegistration({
        eventId: id as Id<"events">,
        categoryId: formData.categoryId,
        userId: user._id as Id<"users">,
        isProxy: formData.isProxy,
        registrationData: {
          participantInfo: formData.participantInfo,
          vanityNumber: formData.vanityNumber,
        },
        totalPrice: formData.totalPrice,
      });

      // Navigate to success or payment
      router.replace(`/(tabs)/my-events`);
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) return null;

  const raceEvent = { ...event, id: event._id };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepWho
            formData={formData}
            onUpdate={(data) => setFormData(prev => ({ ...prev, ...data }))}
            user={user}
          />
        );
      case 1:
        return (
          <StepCategory
            event={raceEvent}
            formData={formData}
            onUpdate={(data) => setFormData(prev => ({ ...prev, ...data }))}
          />
        );
      case 2:
        return (
          <StepDetails
            formData={formData}
            onUpdate={(data) => setFormData(prev => ({
              ...prev,
              participantInfo: { ...prev.participantInfo, ...data },
            }))}
          />
        );
      case 3:
        return (
          <StepVanity
            event={raceEvent}
            formData={formData}
            onUpdate={(data) => setFormData(prev => ({ ...prev, ...data }))}
          />
        );
      case 4:
        return (
          <StepReview
            event={raceEvent}
            formData={formData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>REGISTER</Text>
          <Text style={styles.headerSubtitle}>
            Step {currentStep + 1} of {STEPS.length} — {STEPS[currentStep]}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= currentStep && styles.progressDotActive,
              i < currentStep && styles.progressDotComplete,
            ]}
          >
            {i < currentStep && <Check size={10} color="#fff" />}
          </View>
        ))}
        <View style={styles.progressLine}>
          <View
            style={[
              styles.progressLineFill,
              { width: `${(currentStep / (STEPS.length - 1)) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Step Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.navigationBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {currentStep > 0 && (
          <Pressable
            onPress={prevStep}
            style={styles.prevButton}
          >
            <ArrowLeft size={18} color={colors.text} />
            <Text style={styles.prevButtonText}>BACK</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {currentStep < STEPS.length - 1 ? (
          <Pressable
            onPress={nextStep}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>NEXT</Text>
            <ArrowRight size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? "SUBMITTING..." : "REGISTER"}
            </Text>
            <Check size={18} color="#fff" />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.white5,
  },
  backButton: {
    width: 40, height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white10,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, gap: 2 },
  headerTitleText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.xl,
    color: colors.text,
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: fontFamily.headingSemiBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    position: "relative",
  },
  progressDot: {
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.white10,
    alignItems: "center", justifyContent: "center",
    zIndex: 1,
  },
  progressDotActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}33`,
  },
  progressDotComplete: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  progressLine: {
    position: "absolute",
    left: 36, right: 36,
    height: 2,
    backgroundColor: colors.white10,
    top: "50%",
  },
  progressLineFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing["4xl"],
  },
  navigationBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white5,
    backgroundColor: colors.background,
  },
  prevButton: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  prevButtonText: {
    fontFamily: fontFamily.headingBold,
    fontSize: fontSize.sm, color: colors.text,
    textTransform: "uppercase", letterSpacing: 1,
  },
  nextButton: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md, paddingHorizontal: spacing["2xl"],
    borderRadius: borderRadius.lg,
  },
  nextButtonText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.base, color: "#fff",
    textTransform: "uppercase", letterSpacing: 1, fontStyle: "italic",
  },
  submitButton: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.cta,
    paddingVertical: spacing.md, paddingHorizontal: spacing["2xl"],
    borderRadius: borderRadius.lg,
  },
  submitButtonText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.base, color: "#fff",
    textTransform: "uppercase", letterSpacing: 1, fontStyle: "italic",
  },
});
```

---

## 3.2 — Step Components Guide

### StepWho — Self or Proxy

```typescript
// components/registration/StepWho.tsx
// Two large selectable cards: "Register Myself" vs "Register Someone Else"
// Matches web Step0Who.tsx logic
// Uses Pressable cards with radio indicator
```

### StepCategory — Choose Race Distance

```typescript
// components/registration/StepCategory.tsx
// Horizontal or vertical FlatList of category cards
// Shows: name, distance, price, inclusions, max participants
// Selected card highlighted with primary border
// Checks api.registrations.checkExisting to prevent duplicate registration
```

### StepDetails — Personal Information

```typescript
// components/registration/StepDetails.tsx
// Form fields: name, email, phone, gender picker, birth date picker
// T-shirt/singlet size picker (segmented control)
// Emergency contact section
// Uses TextInput with our custom Input component
// Date picker: @react-native-community/datetimepicker
```

### StepVanity — Premium Race Number

```typescript
// components/registration/StepVanity.tsx
// Only shown if event.vanityRaceNumber.enabled
// Number input with validation (max digits)
// Price display for premium upgrade
// Skip option
```

### StepReview — Summary & Submit

```typescript
// components/registration/StepReview.tsx
// Displays all selected info in a read-only summary
// Event name, category, participant details
// Price breakdown
// Terms checkbox
// Submit button triggers handleSubmit in parent
```

---

## 3.3 — My Events Tab

Converts `RunnerView.tsx` + `RunnerEventCard.tsx`:

```typescript
// app/(tabs)/my-events.tsx
import { useMemo } from "react";
import { View, Text, SectionList, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/hooks/useAuth";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { MyEventCard } from "@/components/events/MyEventCard";
import { EventCardSkeleton } from "@/components/events/EventCardSkeleton";
import { colors, spacing, fontSize } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { Calendar } from "lucide-react-native";

export default function MyEventsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const registrations = useQuery(
    api.registrations.getByUserId,
    user?._id ? { userId: user._id as Id<"users"> } : "skip"
  );

  const sections = useMemo(() => {
    if (!registrations) return [];

    const now = new Date();
    const upcoming = registrations
      .filter(r => r.event && new Date(r.event.date) >= now && r.event.status !== "completed")
      .sort((a, b) => new Date(a.event!.date).getTime() - new Date(b.event!.date).getTime());

    const past = registrations
      .filter(r => r.event && (new Date(r.event.date) < now || r.event.status === "completed"))
      .sort((a, b) => new Date(b.event!.date).getTime() - new Date(a.event!.date).getTime());

    const result = [];
    if (upcoming.length) result.push({ title: "Upcoming Events", data: upcoming });
    if (past.length) result.push({ title: "Past Events", data: past, isPast: true });
    return result;
  }, [registrations]);

  if (registrations === undefined) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="MY EVENTS" subtitle="Your registered races" />
        <View style={styles.loadingList}>
          {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="MY EVENTS" subtitle="Your registered races" />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        renderItem={({ item, section }) => (
          <MyEventCard
            registration={item}
            isPast={!!(section as any).isPast}
            onPress={() => router.push(`/event/${item.eventId}`)}
            onQRPress={() => router.push(`/qr/${item._id}`)}
            onLivePress={() => router.push(`/event/${item.eventId}/live`)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        SectionSeparatorComponent={() => <View style={{ height: spacing["2xl"] }} />}
        ListEmptyComponent={
          <EmptyState
            icon={Calendar}
            title="No Events Yet"
            message="Browse events and register for your next race!"
            actionLabel="Browse Events"
            onAction={() => router.push("/(tabs)")}
          />
        }
        refreshControl={
          <RefreshControl refreshing={false} tintColor={colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingList: { padding: spacing.lg, gap: spacing.lg },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing["5xl"] },
  sectionTitle: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.lg,
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
});
```

---

## 3.4 — My Event Card Component

Converts `RunnerEventCard.tsx`:

```typescript
// components/events/MyEventCard.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { MapPin, Trophy, Package, QrCode, Activity } from "lucide-react-native";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { colors, spacing, fontSize, borderRadius, shadows } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

interface MyEventCardProps {
  registration: any;
  isPast?: boolean;
  onPress: () => void;
  onQRPress: () => void;
  onLivePress: () => void;
}

export function MyEventCard({ registration: reg, isPast, onPress, onQRPress, onLivePress }: MyEventCardProps) {
  const categoryName = reg.event?.categories?.find(
    (c: any) => c.id === reg.categoryId
  )?.name || reg.categoryId;

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          isPast && styles.cardPast,
        ]}
      >
        {/* Event Image */}
        <View style={styles.imageContainer}>
          {reg.event?.featuredImage ? (
            <Image
              source={{ uri: reg.event.featuredImage }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {reg.event?.name?.[0] || "?"}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.eventName} numberOfLines={2}>{reg.event?.name}</Text>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <Badge
              label={reg.status}
              color={reg.status === "paid" ? colors.success : colors.pendingBadge}
            />
            {reg.status === "paid" && (
              <Badge
                label={reg.raceKitClaimed ? "Kit Collected" : "Kit Pending"}
                color={reg.raceKitClaimed ? colors.cta : colors.textMuted}
                variant={reg.raceKitClaimed ? "filled" : "outline"}
              />
            )}
          </View>

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={12} color={colors.cta} />
              <Text style={styles.metaText} numberOfLines={1}>
                {reg.event?.location?.name || "TBD"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Trophy size={12} color={colors.primary} />
              <Text style={styles.metaText}>{categoryName}</Text>
            </View>
            {reg.raceNumber && (
              <View style={styles.raceNumberBadge}>
                <Text style={styles.raceNumberHash}>#</Text>
                <Text style={styles.raceNumberText}>{reg.raceNumber}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {!isPast && reg.status === "paid" && (
            <View style={styles.actionRow}>
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onQRPress(); }}
                style={styles.qrButton}
              >
                <QrCode size={14} color="#fff" />
                <Text style={styles.qrButtonText}>VIEW PASS</Text>
              </Pressable>

              {reg.event?.isLiveTrackingEnabled && (
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); onLivePress(); }}
                  style={styles.liveButton}
                >
                  <Activity size={14} color={colors.primary} />
                  <Text style={styles.liveButtonText}>LIVE</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: `${colors.surface}66`,
    borderRadius: borderRadius["2xl"],
    borderWidth: 1,
    borderColor: colors.white5,
    overflow: "hidden",
    ...shadows.sm,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardPast: { opacity: 0.7 },
  imageContainer: {
    width: 100,
    minHeight: 130,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%", height: "100%",
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  imagePlaceholderText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize["2xl"],
    color: colors.white10,
    fontStyle: "italic",
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  eventName: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.md,
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: -0.3,
    lineHeight: fontSize.md * 1.15,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metaItem: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: `${colors.background}80`,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.white5,
  },
  metaText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    fontStyle: "italic",
  },
  raceNumberBadge: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: `${colors.primary}33`,
  },
  raceNumberHash: {
    fontFamily: fontFamily.headingBlack,
    fontSize: 10, color: colors.primary,
  },
  raceNumberText: {
    fontFamily: fontFamily.headingBold,
    fontSize: 10, color: colors.text,
  },
  actionRow: {
    flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs,
  },
  qrButton: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.cta,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  qrButtonText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: 10, color: "#fff",
    textTransform: "uppercase", letterSpacing: 1, fontStyle: "italic",
  },
  liveButton: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    borderWidth: 1, borderColor: `${colors.primary}4D`,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  liveButtonText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: 10, color: colors.primary,
    textTransform: "uppercase", letterSpacing: 1, fontStyle: "italic",
  },
});
```

---

## 3.5 — Custom Form Input

```typescript
// components/ui/Input.tsx
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white10,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.danger,
  },
});
```

---

## 3.6 — Empty State Component

```typescript
// components/ui/EmptyState.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { LucideIcon } from "lucide-react-native";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["4xl"],
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.xl,
    color: colors.text,
    textTransform: "uppercase",
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
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
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

## Deliverables Checklist

- [ ] Multi-step registration flow (5 steps matching web)
- [ ] Step Who: Self/proxy selection cards
- [ ] Step Category: Category selection with price + inclusions + capacity
- [ ] Step Details: Personal info form (name, email, phone, gender, birth date, T-shirt, emergency)
- [ ] Step Vanity: Optional vanity race number input
- [ ] Step Review: Summary with price breakdown + submit
- [ ] Progress bar with step indicators
- [ ] Keyboard-aware form scrolling
- [ ] My Events tab with SectionList (upcoming vs past)
- [ ] My Event Card matching web RunnerEventCard design
- [ ] Quick actions: View Pass, Live, Details buttons
- [ ] Registration status badges (paid/pending, kit collected/pending)
- [ ] Race number display on cards
- [ ] Empty states with illustrations and CTAs
- [ ] Haptic feedback on step navigation and submission
- [ ] Form validation (required fields, email format)
- [ ] Custom Input component matching web `.input` class
