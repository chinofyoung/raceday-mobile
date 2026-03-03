import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Calendar, MapPin, Clock, Info, CheckCircle,
    ChevronRight, ArrowLeft, Share2, Award, Zap
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";

/**
 * Event Detail Screen (Stage 2)
 * Comprehensive view of a race event with discovery and registration options.
 */
export default function EventDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isLoaded: isAuthLoaded } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Fetch event details
    const event = useQuery(api.events.getById, { id: id as Id<"events"> });

    // Check if user is already registered
    const userRegistrations = useQuery(
        api.registrations.getByUserId,
        user?._id ? { userId: user._id as Id<"users"> } : "skip"
    );
    const registration = userRegistrations?.find(r => r.eventId === id);
    const isRegistered = !!registration;

    if (!event || !isAuthLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const eventDate = new Date(event.date);
    const lowestPrice = Math.min(...(event.categories?.map((c: any) => c.price) || [0]));

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
            >
                {/* Hero Section */}
                <View style={styles.hero}>
                    <Image
                        source={{ uri: event.featuredImage || undefined }}
                        style={styles.heroImage}
                        contentFit="cover"
                    />
                    <View style={styles.heroOverlay} />

                    <Pressable
                        style={[styles.backButton, { top: Math.max(20, insets.top) }]}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft size={20} color={Colors.white} />
                    </Pressable>

                    <Pressable
                        style={[styles.shareButton, { top: Math.max(20, insets.top) }]}
                        onPress={() => {/* Share logic */ }}
                    >
                        <Share2 size={18} color={Colors.white} />
                    </Pressable>

                    <View style={styles.heroContent}>
                        <Animated.View entering={FadeInUp.delay(200)}>
                            <Text style={styles.eventTitle}>{event.name}</Text>
                            <View style={styles.heroMeta}>
                                <View style={styles.metaBadge}>
                                    <Calendar size={12} color={Colors.primary} />
                                    <Text style={styles.metaBadgeText}>{format(eventDate, "MMM d, yyyy")}</Text>
                                </View>
                                <View style={styles.metaBadge}>
                                    <MapPin size={12} color={Colors.primary} />
                                    <Text style={styles.metaBadgeText} numberOfLines={1}>
                                        {event.location?.name || "TBA"}
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Status Alert if Registered */}
                    {isRegistered && (
                        <Animated.View entering={FadeIn.delay(400)} style={styles.statusAlert}>
                            <CheckCircle size={20} color={Colors.cta} />
                            <View>
                                <Text style={styles.statusAlertTitle}>YOU ARE REGISTERED!</Text>
                                <Text style={styles.statusAlertText}>
                                    Your bib # is {registration.raceNumber || "TBA"}
                                </Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Description Section */}
                    <Section title="ABOUT THE RACE" icon={<Info size={16} color={Colors.primary} />}>
                        <Text style={styles.descriptionText}>{event.description}</Text>
                    </Section>

                    {/* Race Categories Section */}
                    <Section title="CATEGORIES & PRICING" icon={<Award size={16} color={Colors.primary} />}>
                        <View style={styles.categoryList}>
                            {event.categories?.map((cat: any, index: number) => (
                                <View key={cat.id || index} style={styles.categoryCard}>
                                    <View style={styles.categoryCardHeader}>
                                        <Text style={styles.categoryName}>{cat.name}</Text>
                                        <Text style={styles.categoryPrice}>₱{cat.price}</Text>
                                    </View>
                                    <View style={styles.categoryMeta}>
                                        <View style={styles.metaSmall}>
                                            <Clock size={12} color={Colors.textDim} />
                                            <Text style={styles.metaSmallText}>Start: {cat.gunStartTime}</Text>
                                        </View>
                                        <View style={styles.metaSmall}>
                                            <Zap size={12} color={Colors.textDim} />
                                            <Text style={styles.metaSmallText}>{cat.distance}{cat.distanceUnit}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Section>

                    {/* Timeline Section */}
                    {event.timeline && event.timeline.length > 0 && (
                        <Section title="EVENT SCHEDULE" icon={<Clock size={16} color={Colors.primary} />}>
                            <View style={styles.timeline}>
                                {event.timeline.sort((a: any, b: any) => a.order - b.order).map((item: any, i: number) => (
                                    <View key={item.id || i} style={styles.timelineItem}>
                                        <Text style={styles.timelineTime}>{item.time}</Text>
                                        <View style={styles.timelineConnector}>
                                            <View style={styles.timelineDot} />
                                            {i < event.timeline.length - 1 && <View style={styles.timelineLine} />}
                                        </View>
                                        <View style={styles.timelineContent}>
                                            <Text style={styles.timelineActivity}>{item.activity}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </Section>
                    )}
                </View>
            </ScrollView>

            {/* Sticky Bottom Action */}
            <View style={[styles.bottomAction, { paddingBottom: Math.max(Spacing.xl, insets.bottom) }]}>
                {isRegistered ? (
                    <Pressable
                        style={styles.primaryButton}
                        onPress={() => router.push({ pathname: "/(tabs)/my-events" })}
                    >
                        <Text style={styles.primaryButtonText}>VIEW MY REGISTRATION</Text>
                        <ChevronRight size={18} color={Colors.white} />
                    </Pressable>
                ) : (
                    <View style={styles.registrationContainer}>
                        <View style={styles.priceInfo}>
                            <Text style={styles.priceLabel}>Starting from</Text>
                            <Text style={styles.priceTotal}>₱{lowestPrice}</Text>
                        </View>
                        <Pressable
                            style={styles.registerButton}
                            onPress={() => router.push({ pathname: "/event/[id]/register", params: { id } })}
                        >
                            <Text style={styles.registerButtonText}>REGISTER NOW</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </View>
    );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                {icon}
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {children}
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
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
    },
    hero: {
        height: 340,
        width: "100%",
        position: "relative",
    },
    heroImage: {
        width: "100%",
        height: "100%",
        backgroundColor: Colors.surface,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(31, 41, 55, 0.4)",
    },
    backButton: {
        position: "absolute",
        left: Spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    shareButton: {
        position: "absolute",
        right: Spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    heroContent: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: Spacing.xl,
        paddingBottom: Spacing["2xl"],
    },
    eventTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["3xl"],
        color: Colors.white,
        textTransform: "uppercase",
        letterSpacing: -1,
        lineHeight: 32,
    },
    heroMeta: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    metaBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        borderRadius: Radius.full,
        maxWidth: 200,
    },
    metaBadgeText: {
        fontFamily: "Barlow_500Medium",
        fontSize: FontSize.xs,
        color: Colors.white,
    },
    content: {
        padding: Spacing.xl,
        gap: Spacing["2xl"],
    },
    statusAlert: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        backgroundColor: Colors.cta + "15",
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.cta + "30",
    },
    statusAlertTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.md,
        color: Colors.cta,
        letterSpacing: 0.5,
    },
    statusAlertText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
    },
    section: {
        gap: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingBottom: Spacing.sm,
    },
    sectionTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.sm,
        color: Colors.textDim,
        letterSpacing: 2,
        textTransform: "uppercase",
    },
    descriptionText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.base,
        color: Colors.textMuted,
        lineHeight: 22,
    },
    categoryList: {
        gap: Spacing.md,
    },
    categoryCard: {
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    categoryCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    categoryName: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.text,
        textTransform: "uppercase",
    },
    categoryPrice: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.primary,
    },
    categoryMeta: {
        flexDirection: "row",
        gap: Spacing.lg,
    },
    metaSmall: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    metaSmallText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.xs,
        color: Colors.textDim,
    },
    timeline: {
        gap: 0,
    },
    timelineItem: {
        flexDirection: "row",
        gap: Spacing.lg,
    },
    timelineTime: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.sm,
        color: Colors.primary,
        width: 60,
        textAlign: "right",
    },
    timelineConnector: {
        alignItems: "center",
        width: 10,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        marginTop: 4,
    },
    timelineLine: {
        flex: 1,
        width: 2,
        backgroundColor: Colors.border,
        marginVertical: 4,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: Spacing.xl,
    },
    timelineActivity: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.base,
        color: Colors.text,
        marginTop: 0,
    },
    bottomAction: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.background,
        paddingTop: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    registrationContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    priceInfo: {
        gap: 2,
    },
    priceLabel: {
        fontFamily: "Barlow_400Regular",
        fontSize: 10,
        color: Colors.textDim,
        textTransform: "uppercase",
    },
    priceTotal: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.text,
    },
    registerButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing["2xl"],
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
    },
    registerButtonText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.white,
        letterSpacing: 0.5,
    },
    primaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.surface,
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    primaryButtonText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.white,
        letterSpacing: 0.5,
    },
});
