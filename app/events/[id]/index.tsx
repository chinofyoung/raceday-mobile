import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EventDetailScreen() {
    const { id, regId } = useLocalSearchParams<{ id: string; regId: string }>();
    const { user } = useCurrentUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const registrations = useQuery(
        api.registrations.getByUserId,
        user ? { userId: user._id as Id<"users"> } : "skip"
    );

    const reg = registrations?.find((r: any) => r._id === regId || r.eventId === id);
    const event = reg?.event;

    if (!event) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading event...</Text>
                </View>
            </View>
        );
    }

    const eventDate = new Date(event.date);
    const category = event.categories?.find((c: any) => c.id === reg.categoryId);

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Image */}
                <View style={styles.heroContainer}>
                    <Image
                        source={{ uri: event.featuredImage || undefined }}
                        style={styles.heroImage}
                        contentFit="cover"
                        transition={300}
                    />
                    <View style={styles.heroOverlay} />

                    {/* Back Button */}
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={Colors.white} />
                    </Pressable>

                    {/* Hero Info */}
                    <View style={styles.heroInfo}>
                        <Text style={styles.heroTitle}>{event.name}</Text>
                        <Text style={styles.heroDate}>
                            {format(eventDate, "EEEE, MMMM d, yyyy")}
                        </Text>
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Quick Info Grid */}
                    <View style={styles.infoGrid}>
                        <View style={[styles.infoCard, styles.fullWidthCard]}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="location" size={16} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>LOCATION</Text>
                                <Text style={styles.infoValue} numberOfLines={2}>{event.location?.name || "TBA"}</Text>
                            </View>
                        </View>
                        <View style={[styles.infoCard, styles.fullWidthCard]}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="medal" size={16} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>CATEGORY</Text>
                                <Text style={styles.infoValue} numberOfLines={2}>{category?.name || "—"}</Text>
                            </View>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="file-tray-full" size={16} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>RACE #</Text>
                                <Text style={[styles.infoValue, styles.primaryText]}>
                                    {reg.raceNumber || "TBA"}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="checkmark-circle" size={16} color={reg.status === "paid" ? Colors.cta : Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>STATUS</Text>
                                <Text
                                    style={[
                                        styles.infoValue,
                                        reg.status === "paid" ? styles.ctaText : styles.primaryText,
                                    ]}
                                >
                                    {reg.status === "paid" ? "CONFIRMED" : reg.status?.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Race Kit QR Button */}
                    {reg.status === "paid" && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.qrButton,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={() =>
                                router.push(`/events/${id}/qr?regId=${reg._id}`)
                            }
                        >
                            <View style={styles.qrIconBadge}>
                                <Ionicons name="qr-code" size={24} color={Colors.cta} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.qrButtonTitle}>VIEW RACE PASS</Text>
                                <Text style={styles.qrButtonSubtitle}>
                                    Show QR code at the kit claim booth
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.cta} />
                        </Pressable>
                    )}

                    {/* Timeline */}
                    {event.timeline && event.timeline.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>RACE DAY TIMELINE</Text>
                            <View style={styles.cardContainer}>
                                {event.timeline
                                    .sort((a: any, b: any) => a.order - b.order)
                                    .map((item: any, i: number) => (
                                        <View key={item.id || i} style={styles.timelineItem}>
                                            <View style={styles.timelineIndicators}>
                                                <View style={styles.timelineDot} />
                                                {i < event.timeline.length - 1 && <View style={styles.timelineLine} />}
                                            </View>
                                            <View style={styles.timelineContent}>
                                                <Text style={styles.timelineTime}>{item.time}</Text>
                                                <Text style={styles.timelineActivity}>{item.activity}</Text>
                                                {item.description && (
                                                    <Text style={styles.timelineDesc}>{item.description}</Text>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                            </View>
                        </View>
                    )}

                    {/* Category Details */}
                    {category && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>CATEGORY DETAILS</Text>
                            <View style={styles.cardContainer}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Distance</Text>
                                    <Text style={styles.detailValue}>
                                        {category.distance} {category.distanceUnit}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Assembly</Text>
                                    <Text style={styles.detailValue}>{category.assemblyTime}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Gun Start</Text>
                                    <Text style={styles.detailValue}>{category.gunStartTime}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Cut-off</Text>
                                    <Text style={styles.detailValue}>{category.cutOffTime}</Text>
                                </View>
                                {category.inclusions && category.inclusions.length > 0 && (
                                    <View style={styles.inclusionsContainer}>
                                        <Text style={styles.detailLabel}>Inclusions</Text>
                                        <View style={styles.inclusionsList}>
                                            {category.inclusions.map((item: string, i: number) => (
                                                <View key={i} style={styles.inclusionBadge}>
                                                    <Text style={styles.inclusionText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Live Track Button */}
                    {event.isLiveTrackingEnabled && reg.status === "paid" && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.liveButton,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={() => router.push("/(tabs)/live")}
                        >
                            <Ionicons name="navigate" size={20} color={Colors.white} />
                            <Text style={styles.liveButtonText}>LAUNCH LIVE TRACKER</Text>
                            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
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
    heroContainer: {
        height: 280,
        position: "relative",
    },
    heroImage: {
        width: "100%",
        height: "100%",
        backgroundColor: Colors.surface,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    backButton: {
        position: "absolute",
        top: 56,
        left: Spacing.lg,
        backgroundColor: "rgba(0,0,0,0.3)",
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    backText: {
        display: "none",
    },
    heroInfo: {
        position: "absolute",
        bottom: Spacing.xl,
        left: Spacing.xl,
        right: Spacing.xl,
    },
    heroTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["4xl"],
        color: Colors.white,
        textTransform: "uppercase",
        letterSpacing: -0.8,
        lineHeight: 38,
    },
    heroDate: {
        fontFamily: "Barlow_500Medium",
        fontSize: FontSize.md,
        color: "rgba(255,255,255,0.9)",
        marginTop: 4,
    },
    content: {
        padding: Spacing.xl,
        gap: Spacing["2xl"],
        paddingBottom: 40,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.md,
    },
    infoCard: {
        width: "47.5%",
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    fullWidthCard: {
        width: "100%",
    },
    infoIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
    },
    infoLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 11,
        color: Colors.textMuted,
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    infoValue: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.text,
        textTransform: "uppercase",
        marginTop: -2,
    },
    primaryText: {
        color: Colors.primary,
    },
    ctaText: {
        color: Colors.cta,
    },
    qrButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.cta + "10",
        borderWidth: 1,
        borderColor: Colors.cta + "30",
        padding: Spacing.lg,
        borderRadius: Radius.xl,
        gap: Spacing.lg,
    },
    qrIconBadge: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.cta + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    qrIcon: {
        fontSize: 32,
    },
    qrButtonTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.cta,
        letterSpacing: 0.5,
    },
    qrButtonSubtitle: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginTop: 2,
    },
    section: {
        gap: Spacing.lg,
    },
    sectionTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        letterSpacing: 1.5,
        marginBottom: Spacing.xs,
        textTransform: "uppercase",
    },
    cardContainer: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    timelineItem: {
        flexDirection: "row",
        gap: Spacing.lg,
    },
    timelineIndicators: {
        alignItems: "center",
        width: 12,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
        zIndex: 1,
    },
    timelineLine: {
        flex: 1,
        width: 2,
        backgroundColor: Colors.border,
        marginVertical: -4,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: Spacing.xl,
    },
    timelineTime: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    timelineActivity: {
        fontFamily: "Barlow_700Bold",
        fontSize: FontSize.md,
        color: Colors.text,
        marginTop: 2,
    },
    timelineDesc: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginTop: 4,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    detailLabel: {
        fontFamily: "Barlow_500Medium",
        fontSize: FontSize.base,
        color: Colors.textMuted,
    },
    detailValue: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.base,
        color: Colors.text,
        textTransform: "uppercase",
    },
    inclusionsContainer: {
        marginTop: Spacing.xl,
        gap: Spacing.md,
    },
    inclusionsList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.xs,
    },
    inclusionBadge: {
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inclusionText: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.xs,
        color: Colors.text,
        textTransform: "uppercase",
    },
    liveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.primary,
        padding: Spacing.xl,
        borderRadius: Radius.xl,
        gap: Spacing.lg,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    liveButtonText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.white,
        letterSpacing: 1,
    },
});
