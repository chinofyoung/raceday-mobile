# Stage 2 — Event Discovery & Detail

> **Goal**: Runners can browse all published events, search/filter, and view full event details including categories, timeline, route maps, and announcements.

---

## 2.1 — Browse Events Screen

Converts the web's events discovery page (`(marketing)/events/page.tsx`) + `EventCard.tsx`.

### Screen: Browse Events Tab

```typescript
// app/(tabs)/index.tsx
import { useState, useCallback } from "react";
import { View, FlatList, TextInput, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EventCard } from "@/components/events/EventCard";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { Search } from "lucide-react-native";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EventCardSkeleton } from "@/components/events/EventCardSkeleton";

export default function BrowseEventsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { results, status, loadMore } = usePaginatedQuery(
    api.events.list,
    { status: "published" },
    { initialNumItems: 10 }
  );

  const filteredEvents = results?.filter(event =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleRefresh = useCallback(() => {
    // Convex auto-refreshes, but we can trigger UI refresh
  }, []);

  return (
    <View style={styles.container}>
      <ScreenHeader title="DISCOVER EVENTS" subtitle="Find your next race" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events, locations..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      {/* Event List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <EventCard
            event={{ ...item, id: item._id }}
            onPress={() => router.push(`/event/${item._id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => status === "CanLoadMore" && loadMore(10)}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <View style={styles.skeletonList}>
              {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
            </View>
          ) : (
            <EmptyState
              icon={Search}
              title="No Events Found"
              message="Check back later for upcoming races"
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.white10,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["5xl"],
  },
  skeletonList: {
    gap: spacing.lg,
  },
});
```

---

## 2.2 — Event Card Component

Converts web `EventCard.tsx` to React Native:

```typescript
// components/events/EventCard.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Calendar, MapPin, Users, Tag, ArrowRight } from "lucide-react-native";
import { format } from "date-fns";
import { colors, spacing, fontSize, borderRadius, shadows } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { Badge } from "@/components/ui/Badge";
import { RaceEvent } from "@/types/event";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

interface EventCardProps {
  event: RaceEvent;
  onPress: () => void;
  index?: number; // For stagger animation
}

export function EventCard({ event, onPress, index = 0 }: EventCardProps) {
  const eventDate = event.date ? new Date(event.date) : null;
  const isValidDate = eventDate && !isNaN(eventDate.getTime());

  // Calculate price range
  const prices = event.categories?.map(c => c.price) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceDisplay = minPrice === maxPrice
    ? `₱${minPrice.toLocaleString()}`
    : `₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()}`;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Distance badges (up to 3)
  const categoryBadges = event.categories?.slice(0, 3) || [];

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.featuredImage }}
            style={styles.image}
            contentFit="cover"
            transition={300}
            placeholder={{ blurhash: "L6Pj0^jE.AyE_3t7t7R**0o#DgR4" }}
          />
          <View style={styles.imageOverlay} />

          {/* Category distance badges */}
          <View style={styles.distanceBadges}>
            {categoryBadges.map((cat, i) => (
              <View key={i} style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>
                  {cat.distance}{cat.distanceUnit}
                </Text>
              </View>
            ))}
            {(event.categories?.length || 0) > 3 && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>
                  +{event.categories!.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.eventName} numberOfLines={2}>
            {event.name}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.primary} />
              <Text style={styles.metaText}>
                {isValidDate ? format(eventDate, "MMM d, yyyy") : "TBD"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.primary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {event.location?.name || "TBA"}
              </Text>
            </View>
          </View>

          {/* Price & CTA */}
          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Tag size={14} color={colors.cta} />
              <Text style={styles.priceText}>{priceDisplay}</Text>
            </View>
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>View</Text>
              <ArrowRight size={14} color={colors.primary} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${colors.surface}66`, // 40% opacity
    borderRadius: borderRadius["2xl"],
    borderWidth: 1,
    borderColor: colors.white5,
    overflow: "hidden",
    ...shadows.md,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    aspectRatio: 16 / 9,
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Gradient from bottom
    backgroundColor: "transparent",
    // Use a linear gradient via react-native-linear-gradient if needed
  },
  distanceBadges: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    gap: spacing.xs,
  },
  distanceBadge: {
    backgroundColor: colors.black40,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  distanceBadgeText: {
    fontFamily: fontFamily.headingBold,
    fontSize: 9,
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eventName: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.xl,
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: -0.5,
    lineHeight: fontSize.xl * 1.2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white5,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  priceText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.base,
    color: colors.text,
    fontStyle: "italic",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  ctaText: {
    fontFamily: fontFamily.headingBold,
    fontSize: fontSize.xs,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
```

---

## 2.3 — Event Detail Screen

Converts `EventDetailClient.tsx` into a native ScrollView with all sections:

```typescript
// app/event/[id].tsx
import { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/hooks/useAuth";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";

// Components
import { EventHero } from "@/components/events/EventHero";
import { EventInfo } from "@/components/events/EventInfo";
import { EventCategories } from "@/components/events/EventCategories";
import { EventTimeline } from "@/components/events/EventTimeline";
import { EventAnnouncements } from "@/components/events/EventAnnouncements";
import { EventRouteMap } from "@/components/events/EventRouteMap";
import { StickyRegisterButton } from "@/components/events/StickyRegisterButton";
import { DetailSkeleton } from "@/components/events/DetailSkeleton";
import { ArrowLeft } from "lucide-react-native";

const SECTIONS = ["info", "categories", "timeline", "route", "announcements"] as const;

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const registrations = useQuery(
    api.registrations.getByUserId,
    user?._id ? { userId: user._id as Id<"users"> } : "skip"
  );
  const announcements = useQuery(
    api.announcements.listByEvent,
    id ? { eventId: id as Id<"events"> } : "skip"
  );

  const userRegistration = registrations?.find(
    r => r.eventId === id && (r.status === "paid" || r.status === "pending")
  );

  const [activeSection, setActiveSection] = useState<string>("info");
  const [activeRouteCategoryIndex, setActiveRouteCategoryIndex] = useState(0);

  if (!event) {
    return <DetailSkeleton />;
  }

  const raceEvent = { ...event, id: event._id };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EventHero
          event={raceEvent}
          userRegistration={userRegistration}
          onBack={() => router.back()}
        />

        {/* Section Navigation Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionNav}
          contentContainerStyle={styles.sectionNavContent}
        >
          {SECTIONS.map(section => (
            <Pressable
              key={section}
              style={[
                styles.sectionPill,
                activeSection === section && styles.sectionPillActive,
              ]}
              onPress={() => setActiveSection(section)}
            >
              <Text style={[
                styles.sectionPillText,
                activeSection === section && styles.sectionPillTextActive,
              ]}>
                {section}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Sections */}
        <View style={styles.sections}>
          <EventInfo event={raceEvent} />
          <EventCategories event={raceEvent} />
          <EventTimeline event={raceEvent} />
          <EventRouteMap
            event={raceEvent}
            activeIndex={activeRouteCategoryIndex}
            onChangeIndex={setActiveRouteCategoryIndex}
          />
          <EventAnnouncements announcements={announcements || []} />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <StickyRegisterButton
        event={raceEvent}
        isRegistered={!!userRegistration}
        registrationStatus={userRegistration?.status}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for sticky CTA
  },
  sectionNav: {
    marginTop: spacing.lg,
  },
  sectionNavContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sectionPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white5,
  },
  sectionPillActive: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: `${colors.primary}4D`,
  },
  sectionPillText: {
    fontFamily: fontFamily.headingBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionPillTextActive: {
    color: colors.primary,
  },
  sections: {
    paddingHorizontal: spacing.lg,
    gap: spacing["4xl"],
    marginTop: spacing["2xl"],
  },
});
```

---

## 2.4 — Event Hero Component

```typescript
// components/events/EventHero.tsx
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Calendar, MapPin } from "lucide-react-native";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_WIDTH * 0.7; // Aspect ratio

interface EventHeroProps {
  event: any;
  userRegistration?: any;
  onBack: () => void;
}

export function EventHero({ event, userRegistration, onBack }: EventHeroProps) {
  const insets = useSafeAreaInsets();
  const eventDate = new Date(event.date);
  const isValidDate = !isNaN(eventDate.getTime());

  return (
    <View style={[styles.container, { height: HERO_HEIGHT }]}>
      <Image
        source={{ uri: event.featuredImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />

      {/* Gradient overlays */}
      <LinearGradient
        colors={["transparent", `${colors.background}66`, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.2)" }]} />

      {/* Back button */}
      <Pressable
        onPress={onBack}
        style={[styles.backButton, { top: insets.top + spacing.md }]}
      >
        <ArrowLeft size={20} color={colors.text} />
      </Pressable>

      {/* Bottom content */}
      <View style={styles.bottomContent}>
        {/* Badges */}
        <View style={styles.badgeRow}>
          <Badge
            label="Registration Open"
            color={colors.cta}
          />
          {userRegistration && (
            <Badge
              label={userRegistration.status === "paid" ? "Registered" : "Pending"}
              color={userRegistration.status === "paid" ? "#22c55e" : "#f97316"}
            />
          )}
        </View>

        {/* Event Name */}
        <Text style={styles.eventName} numberOfLines={3}>
          {event.name}
        </Text>

        {/* Date & Location */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={18} color={colors.primary} />
            <Text style={styles.metaText}>
              {isValidDate ? format(eventDate, "MMMM d, yyyy") : "TBD"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MapPin size={18} color={colors.cta} />
            <Text style={styles.metaText}>
              {event.location?.name || "TBA"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  backButton: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.black40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  eventName: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize["4xl"],
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: -1,
    lineHeight: fontSize["4xl"] * 1.05,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.sm,
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
```

---

## 2.5 — Sub-component Conversion Guide

Each web component maps to a mobile equivalent:

| Web Component | Mobile Component | Key Differences |
|---|---|---|
| `EventInfo.tsx` | `EventInfo.tsx` | `<p>` → `<Text>`, no `dangerouslySetInnerHTML`, plain text |
| `EventCategories.tsx` | `EventCategories.tsx` | Horizontal `FlatList` cards, price display, inclusions list |
| `EventTimeline.tsx` | `EventTimeline.tsx` | Vertical timeline with dots, `FlatList` or `map()` |
| `EventRoute.tsx` | `EventRouteMap.tsx` | **`react-native-maps`** instead of Leaflet |
| `EventAnnouncements.tsx` | `EventAnnouncements.tsx` | Cards in a `FlatList`, `date-fns` for timestamps |
| `MobileStickyCTA.tsx` | `StickyRegisterButton.tsx` | `position: absolute` at bottom with `SafeAreaView` |

---

## 2.6 — Event Card Skeleton

```typescript
// components/events/EventCardSkeleton.tsx
import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withRepeat, withTiming } from "react-native-reanimated";
import { colors, spacing, borderRadius } from "@/constants/theme";

export function EventCardSkeleton() {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(withTiming(0.3, { duration: 1000 }), -1, true),
  }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.image, animatedStyle]} />
      <View style={styles.content}>
        <Animated.View style={[styles.title, animatedStyle]} />
        <View style={styles.metaRow}>
          <Animated.View style={[styles.metaShort, animatedStyle]} />
          <Animated.View style={[styles.metaShort, animatedStyle]} />
        </View>
        <View style={styles.footer}>
          <Animated.View style={[styles.price, animatedStyle]} />
          <Animated.View style={[styles.button, animatedStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${colors.surface}66`,
    borderRadius: borderRadius["2xl"],
    borderWidth: 1,
    borderColor: colors.white5,
    overflow: "hidden",
  },
  image: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    height: 24,
    width: "80%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  metaShort: {
    height: 16,
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white5,
  },
  price: {
    height: 20,
    width: 80,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  button: {
    height: 32,
    width: 60,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
});
```

---

## 2.7 — Shared UI Components

### Badge

```typescript
// components/ui/Badge.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";

interface BadgeProps {
  label: string;
  color?: string;
  variant?: "filled" | "outline";
}

export function Badge({ label, color = colors.primary, variant = "filled" }: BadgeProps) {
  return (
    <View style={[
      styles.badge,
      variant === "filled"
        ? { backgroundColor: color }
        : { borderWidth: 1, borderColor: `${color}4D`, backgroundColor: `${color}1A` },
    ]}>
      <Text style={[
        styles.text,
        { color: variant === "filled" ? "#fff" : color },
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  text: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
```

### Screen Header

```typescript
// components/ui/ScreenHeader.tsx
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, fontSize } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize["3xl"],
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
```

---

## Deliverables Checklist

- [ ] Browse Events tab with FlatList + search
- [ ] Event card component matching web design (image, name, date, location, price, categories)
- [ ] Event card skeleton loading animation
- [ ] Event detail screen with ScrollView sections
- [ ] Event hero with featured image, gradient, back button
- [ ] Event info section (description, date, location)
- [ ] Event categories section (distance cards with price, inclusions)
- [ ] Event timeline (vertical timeline view)
- [ ] Event route map placeholder (full implementation in Stage 4)
- [ ] Event announcements list (real-time via Convex subscription)
- [ ] Section navigation pills
- [ ] Sticky register CTA button at bottom
- [ ] Empty states when no events found
- [ ] Pull-to-refresh on events list
- [ ] Pagination (load more on scroll)
- [ ] Badge and ScreenHeader shared UI components
- [ ] Stagger animations on card load (FadeInDown)
- [ ] Haptic feedback on card press
