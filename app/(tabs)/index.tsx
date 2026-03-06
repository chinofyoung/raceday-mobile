import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EventsScreen() {
  const { user, isLoaded } = useCurrentUser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // ... (keep previous logic)
  const registrations = useQuery(
    api.registrations.getByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  const { upcoming, past } = useMemo(() => {
    if (!registrations) return { upcoming: [], past: [] };
    const now = Date.now();
    return {
      upcoming: registrations.filter((r: any) => r.event && r.event.date > now),
      past: registrations.filter((r: any) => r.event && r.event.date <= now),
    };
  }, [registrations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  if (!isLoaded || registrations === undefined) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MY EVENTS</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  const renderEventCard = ({ item: reg }: { item: any }) => {
    const event = reg.event;
    if (!event) return null;

    const eventDate = new Date(event.date);
    const category = event.categories?.find((c: any) => c.id === reg.categoryId);
    const isPast = event.date <= Date.now();

    return (
      <Pressable
        style={({ pressed }) => [
          styles.eventCard,
          isPast && styles.eventCardPast,
          pressed && styles.cardPressed,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/events/${reg.eventId}?regId=${reg._id}`);
        }}
      >
        <Image
          source={{ uri: event.featuredImage || undefined }}
          style={styles.eventImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.imageOverlay} />

        <View style={styles.badgeContainer}>
          <View
            style={[
              styles.statusBadge,
              reg.status === "paid" ? styles.badgePaid : styles.badgePending,
            ]}
          >
            <Text style={styles.badgeText}>
              {reg.status === "paid" ? "CONFIRMED" : "PENDING"}
            </Text>
          </View>
          {reg.raceKitClaimed && (
            <View style={styles.kitBadge}>
              <Text style={styles.badgeText}>KIT ✓</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.eventName} numberOfLines={2}>
            {event.name}
          </Text>

          <View style={styles.eventMeta}>
            <Text style={styles.metaText}>
              📅 {format(eventDate, "MMM d, yyyy")}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              📍 {event.location?.name || "TBA"}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            {category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{category.name}</Text>
              </View>
            )}
            {reg.raceNumber && (
              <Text style={styles.raceNumber}>#{reg.raceNumber}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const sections = [
    ...(upcoming.length > 0
      ? [{ type: "header" as const, title: "UPCOMING" }]
      : []),
    ...upcoming.map((r: any) => ({ type: "event" as const, data: r })),
    ...(past.length > 0
      ? [{ type: "header" as const, title: "PAST EVENTS" }]
      : []),
    ...past.map((r: any) => ({ type: "event" as const, data: r })),
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(Spacing.lg, insets.top) }]}>
        <Text style={styles.headerTitle}>MY EVENTS</Text>
        <Text style={styles.headerSubtitle}>
          {registrations.length} registered event{registrations.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {registrations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏅</Text>
          <Text style={styles.emptyTitle}>No Events Yet</Text>
          <Text style={styles.emptyText}>
            Register for events on raceday.com to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, i) =>
            item.type === "header" ? `header-${item.title}` : `event-${item.data._id}`
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Text style={styles.sectionHeader}>{item.title}</Text>
              );
            }
            return renderEventCard({ item: item.data });
          }}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 110 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize["3xl"],
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: "Barlow_400Regular",
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: "Barlow_400Regular",
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionHeader: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardPast: {
    opacity: 0.7,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  eventImage: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.surfaceLight,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  badgeContainer: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  badgePaid: {
    backgroundColor: "rgba(34, 197, 94, 0.85)",
  },
  badgePending: {
    backgroundColor: "rgba(249, 115, 22, 0.85)",
  },
  kitBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.85)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  eventName: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize.xl,
    color: Colors.text,
    textTransform: "uppercase",
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  eventMeta: {
    gap: 4,
  },
  metaText: {
    fontFamily: "Barlow_500Medium",
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + "20",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  categoryText: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize.xs,
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  raceNumber: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize.xl,
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize["2xl"],
    color: Colors.text,
    textTransform: "uppercase",
  },
  emptyText: {
    fontFamily: "Barlow_400Regular",
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
