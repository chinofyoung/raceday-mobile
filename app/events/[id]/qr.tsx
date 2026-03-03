import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuery } from "convex/react";
import * as Brightness from "expo-brightness";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Share2, Info, CheckCircle2 } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator, Platform } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

/**
 * Race Pass Screen (Stage 4)
 * Premium QR pass for kit collection and event entry.
 */
export default function QRPassScreen() {
    useKeepAwake();
    const { id, regId } = useLocalSearchParams<{ id: string; regId: string }>();
    const { user, isLoaded: isAuthLoaded } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Fetch registrations
    const userRegistrations = useQuery(
        api.registrations.getByUserId,
        user?._id ? { userId: user._id as Id<"users"> } : "skip"
    );

    const reg = userRegistrations?.find((r: any) => r._id === regId || r.eventId === id);
    const event = reg?.event;
    const category = event?.categories?.find((c: any) => c.id === reg?.categoryId);

    // Auto-brightness for scanability
    useEffect(() => {
        let originalBrightness: number | null = null;
        (async () => {
            try {
                const { status } = await Brightness.requestPermissionsAsync();
                if (status === "granted") {
                    originalBrightness = await Brightness.getBrightnessAsync();
                    await Brightness.setBrightnessAsync(1);
                }
            } catch (e) { }
        })();

        return () => {
            if (originalBrightness !== null) {
                Brightness.setBrightnessAsync(originalBrightness).catch(() => { });
            }
        };
    }, []);

    if (!isAuthLoaded || (user && !reg)) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!reg || !event) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Race pass not found.</Text>
            </View>
        );
    }

    const participantName = reg.registrationData?.participantInfo?.name || user?.displayName || "Runner";

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(Spacing.lg, insets.top) }]}>
                <Pressable onPress={() => router.back()} style={styles.iconButton}>
                    <ArrowLeft size={24} color={Colors.white} />
                </Pressable>
                <Text style={styles.headerTitle}>RACE PASS</Text>
                <Pressable style={styles.iconButton}>
                    <Share2 size={20} color={Colors.white} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInUp.delay(200)} style={styles.card}>
                    {/* Status Badge */}
                    <View style={[styles.statusBadge, reg.status === "paid" ? styles.statusPaid : styles.statusPending]}>
                        <Text style={styles.statusText}>
                            {reg.status === "paid" ? "CONFIRMED" : reg.status.toUpperCase()}
                        </Text>
                    </View>

                    <Text style={styles.eventName}>{event.name}</Text>

                    <View style={styles.divider} />

                    {/* Bib Number */}
                    {reg.raceNumber && (
                        <View style={styles.bibSection}>
                            <Text style={styles.bibLabel}>RACE NUMBER</Text>
                            <Text style={styles.bibValue}>#{reg.raceNumber}</Text>
                        </View>
                    )}

                    {/* QR Code */}
                    <Animated.View entering={ZoomIn.delay(400)} style={styles.qrWrapper}>
                        <View style={styles.qrBackground}>
                            <QRCode
                                value={reg._id}
                                size={200}
                                backgroundColor={Colors.white}
                                color={Colors.black}
                            />
                        </View>
                        <Text style={styles.qrHint}>REF: {reg._id.substring(0, 8)}...</Text>
                    </Animated.View>

                    {/* Details */}
                    <View style={styles.detailsGrid}>
                        <DetailItem label="RUNNER" value={participantName} />
                        <DetailItem label="CATEGORY" value={category?.name || "—"} />
                        <DetailItem label="DISTANCE" value={`${category?.distance || ""}${category?.distanceUnit || ""}`} />
                        <DetailItem label="STATUS" value={reg.raceKitClaimed ? "CLAIMED" : "PENDING"} highlight={!reg.raceKitClaimed} />
                    </View>

                    {/* Claim Status Footer */}
                    <View style={[styles.kitBanner, reg.raceKitClaimed ? styles.kitClaimed : styles.kitPending]}>
                        {reg.raceKitClaimed ? (
                            <CheckCircle2 size={16} color={Colors.cta} />
                        ) : (
                            <Info size={16} color={Colors.primary} />
                        )}
                        <Text style={styles.kitBannerText}>
                            {reg.raceKitClaimed ? "RACE KIT COLLECTED" : "PRESENT THIS AT KIT CLAIM"}
                        </Text>
                    </View>
                </Animated.View>

                <Text style={styles.footerHint}>
                    Brightness has been increased for better scanning.
                </Text>
            </ScrollView>
        </View>
    );
}

function DetailItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, highlight && { color: Colors.primary }]}>{value}</Text>
        </View>
    );
}

// Supporting Component
const ScrollView = require("react-native").ScrollView;

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
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
        backgroundColor: Colors.background,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    headerTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.white,
        letterSpacing: 2,
    },
    scrollContent: {
        padding: Spacing.xl,
        alignItems: "center",
        paddingBottom: 60,
    },
    card: {
        backgroundColor: Colors.surface,
        width: "100%",
        borderRadius: Radius["2xl"],
        padding: Spacing.xl,
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    statusBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        borderRadius: Radius.full,
        marginBottom: Spacing.lg,
    },
    statusPaid: {
        backgroundColor: Colors.cta + "20",
    },
    statusPending: {
        backgroundColor: Colors.primary + "20",
    },
    statusText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 10,
        color: Colors.white,
        letterSpacing: 1,
    },
    eventName: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.white,
        textTransform: "uppercase",
        textAlign: "center",
        marginBottom: Spacing.lg,
        letterSpacing: -0.5,
    },
    divider: {
        height: 1,
        width: "100%",
        backgroundColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    bibSection: {
        alignItems: "center",
        marginBottom: Spacing.xl,
    },
    bibLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 9,
        color: Colors.textDim,
        letterSpacing: 2,
    },
    bibValue: {
        fontFamily: "BarlowCondensed_800ExtraBold",
        fontSize: FontSize["4xl"],
        color: Colors.primary,
        letterSpacing: -1,
    },
    qrWrapper: {
        alignItems: "center",
        marginBottom: Spacing["2xl"],
    },
    qrBackground: {
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        borderRadius: Radius.xl,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    qrHint: {
        fontFamily: "SpaceMono_400Regular",
        fontSize: 8,
        color: Colors.textDim,
        marginTop: Spacing.md,
    },
    detailsGrid: {
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    detailItem: {
        width: "47%",
        gap: 2,
    },
    detailLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 8,
        color: Colors.textDim,
        letterSpacing: 1,
    },
    detailValue: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.sm,
        color: Colors.white,
        textTransform: "uppercase",
    },
    kitBanner: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: Spacing.md,
        borderRadius: Radius.lg,
    },
    kitClaimed: {
        backgroundColor: Colors.cta + "15",
    },
    kitPending: {
        backgroundColor: Colors.primary + "15",
    },
    kitBannerText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 10,
        color: Colors.white,
        letterSpacing: 0.5,
    },
    footerHint: {
        fontFamily: "Barlow_400Regular",
        fontSize: 10,
        color: Colors.textDim,
        marginTop: Spacing.xl,
        textAlign: "center",
    },
    errorText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.base,
        color: Colors.textDim,
    },
});
