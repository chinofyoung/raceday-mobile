import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePaginatedQuery } from "convex/react";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowRight, Calendar, MapPin, Search, Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Browse Events Screen (Landing Tab)
 * Allows runners to discover and explore upcoming race events.
 */
export default function BrowseScreen() {
  const { isLoaded } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch published events from Convex with pagination
  const { results, status, loadMore } = usePaginatedQuery(
    api.events.list,
    { search: searchDebounced, status: "published" } as any,
    { initialNumItems: 10 }
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const renderEventCard = ({ item: event }: { item: any }) => {
    const eventDate = new Date(event.date);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: "/events/[id]",
            params: { id: event._id }
          });
        }}
      >
        <Image
          source={{ uri: event.featuredImage || undefined }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {event.name}
          </Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaRow}>
              <Calendar size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{format(eventDate, "MMMM d, yyyy")}</Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={14} color={Colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {event.location?.name || "Location TBA"}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.registrationInfo}>
              <Users size={14} color={Colors.primary} />
              <Text style={styles.registrationText}>
                {event.categories?.length || 0} Categories
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>From </Text>
              <Text style={styles.priceValue}>
                ₱{Math.min(...(event.categories?.map((c: any) => c.price) || [0]))}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.arrowContainer}>
          <ArrowRight size={16} color={Colors.white} />
        </View>
      </Pressable>
    );
  };

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(Spacing.lg, insets.top) }]}>
        <Text style={styles.headerTitle}>DISCOVER</Text>
        <Text style={styles.headerSubtitle}>Find your next race</Text>

        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={Colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Events List */}
      <FlatList
        data={results}
        renderItem={renderEventCard}
        keyExtractor={(item) => item._id}
        onEndReached={() => status === "CanLoadMore" && loadMore(10)}
        onEndReachedThreshold={0.5}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Search size={48} color={Colors.surfaceLight} />
            <Text style={styles.emptyTitle}>No Events Found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
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
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Barlow_400Regular",
    fontSize: FontSize.base,
    color: Colors.text,
    height: "100%",
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.md,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: Colors.primary,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceLight,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize.lg,
    color: Colors.text,
    textTransform: "uppercase",
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  cardMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontFamily: "Barlow_400Regular",
    fontSize: FontSize.sm,
    color: Colors.textDim,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  registrationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  registrationText: {
    fontFamily: "BarlowCondensed_600SemiBold",
    fontSize: FontSize.xs,
    color: Colors.primary,
    textTransform: "uppercase",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceLabel: {
    fontFamily: "Barlow_400Regular",
    fontSize: 10,
    color: Colors.textDim,
  },
  priceValue: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize.md,
    color: Colors.text,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize.xl,
    color: Colors.text,
    textTransform: "uppercase",
  },
  emptySubtitle: {
    fontFamily: "Barlow_400Regular",
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
});
