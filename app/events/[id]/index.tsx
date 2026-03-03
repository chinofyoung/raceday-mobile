import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function EventDetailScreen() {
    const { id, regId } = useLocalSearchParams<{ id: string; regId: string }>();
    const { user } = useCurrentUser();
    const router = useRouter();

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
                        <Text style={styles.backText}>← Back</Text>
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
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>LOCATION</Text>
                            <Text style={styles.infoValue}>{event.location?.name || "TBA"}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>CATEGORY</Text>
                            <Text style={styles.infoValue}>{category?.name || "—"}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>RACE #</Text>
                            <Text style={[styles.infoValue, styles.primaryText]}>
                                {reg.raceNumber || "TBA"}
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
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
                            <Text style={styles.qrIcon}>🎫</Text>
                            <View>
                                <Text style={styles.qrButtonTitle}>VIEW RACE PASS</Text>
                                <Text style={styles.qrButtonSubtitle}>
                                    Show QR code at the kit claim booth
                                </Text>
                            </View>
                        </Pressable>
                    )}

                    {/* Timeline */}
                    {event.timeline && event.timeline.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>RACE DAY TIMELINE</Text>
                            {event.timeline
                                .sort((a: any, b: any) => a.order - b.order)
                                .map((item: any, i: number) => (
                                    <View key={item.id || i} style={styles.timelineItem}>
                                        <View style={styles.timelineDot} />
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
                    )}

                    {/* Category Details */}
                    {category && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>CATEGORY DETAILS</Text>
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
                                    {category.inclusions.map((item: string, i: number) => (
                                        <Text key={i} style={styles.inclusionItem}>
                                            • {item}
                                        </Text>
                                    ))}
                                </View>
                            )}
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
                            <Text style={styles.liveIcon}>📍</Text>
                            <Text style={styles.liveButtonText}>GO TO LIVE TRACK</Text>
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
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    backButton: {
        position: "absolute",
        top: 56,
        left: Spacing.lg,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
    },
    backText: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.sm,
        color: Colors.white,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    heroInfo: {
        position: "absolute",
        bottom: Spacing.xl,
        left: Spacing.xl,
        right: Spacing.xl,
    },
    heroTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["3xl"],
        color: Colors.white,
        textTransform: "uppercase",
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    heroDate: {
        fontFamily: "Barlow_500Medium",
        fontSize: FontSize.base,
        color: "rgba(255,255,255,0.8)",
        marginTop: 6,
    },
    content: {
        padding: Spacing.xl,
        gap: Spacing.xl,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
    },
    infoCard: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 4,
    },
    infoLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 9,
        color: Colors.textDim,
        letterSpacing: 1.5,
    },
    infoValue: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.md,
        color: Colors.text,
        textTransform: "uppercase",
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
        backgroundColor: Colors.cta + "15",
        borderWidth: 1,
        borderColor: Colors.cta + "30",
        padding: Spacing.xl,
        borderRadius: Radius.xl,
        gap: Spacing.lg,
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
        gap: Spacing.md,
    },
    sectionTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xs,
        color: Colors.textDim,
        letterSpacing: 2,
        marginBottom: Spacing.xs,
    },
    timelineItem: {
        flexDirection: "row",
        gap: Spacing.md,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        marginTop: 5,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: Spacing.lg,
        borderLeftWidth: 0,
    },
    timelineTime: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.sm,
        color: Colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    timelineActivity: {
        fontFamily: "Barlow_600SemiBold",
        fontSize: FontSize.base,
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
        paddingVertical: Spacing.sm,
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
        marginTop: Spacing.sm,
        gap: 6,
    },
    inclusionItem: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        paddingLeft: Spacing.sm,
    },
    liveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        gap: Spacing.md,
        marginBottom: Spacing["3xl"],
    },
    liveIcon: {
        fontSize: 20,
    },
    liveButtonText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.md,
        color: Colors.white,
        letterSpacing: 1,
    },
});
