import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import * as Brightness from "expo-brightness";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function QRPassScreen() {
    useKeepAwake();

    const { id, regId } = useLocalSearchParams<{ id: string; regId: string }>();
    const { user } = useCurrentUser();
    const router = useRouter();

    const registrations = useQuery(
        api.registrations.getByUserId,
        user ? { userId: user._id as Id<"users"> } : "skip"
    );

    const reg = registrations?.find((r: any) => r._id === regId || r.eventId === id);
    const event = reg?.event;
    const category = event?.categories?.find((c: any) => c.id === reg?.categoryId);

    // Max brightness for easy scanning
    useEffect(() => {
        let originalBrightness: number | null = null;

        (async () => {
            try {
                const { status } = await Brightness.requestPermissionsAsync();
                if (status === "granted") {
                    originalBrightness = await Brightness.getBrightnessAsync();
                    await Brightness.setBrightnessAsync(1);
                }
            } catch (e) {
                // Brightness control not available, that's ok
            }
        })();

        return () => {
            if (originalBrightness !== null) {
                Brightness.setBrightnessAsync(originalBrightness).catch(() => { });
            }
        };
    }, []);

    if (!reg || !event) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading pass...</Text>
                </View>
            </View>
        );
    }

    const qrValue = reg._id;
    const participantName =
        reg.registrationData?.participantInfo?.name ||
        user?.displayName ||
        "Runner";

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Back</Text>
                </Pressable>
                <Text style={styles.headerTitle}>RACE PASS</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Pass Card */}
            <View style={styles.passCard}>
                {/* Event Name */}
                <Text style={styles.eventName}>{event.name}</Text>

                {/* Race Number */}
                {reg.raceNumber && (
                    <View style={styles.raceNumberContainer}>
                        <Text style={styles.raceNumberLabel}>RACE NUMBER</Text>
                        <Text style={styles.raceNumber}>#{reg.raceNumber}</Text>
                    </View>
                )}

                {/* QR Code */}
                <View style={styles.qrContainer}>
                    <QRCode
                        value={qrValue}
                        size={220}
                        backgroundColor={Colors.white}
                        color={Colors.black}
                    />
                </View>

                {/* Runner Info */}
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>RUNNER</Text>
                        <Text style={styles.infoValue}>{participantName}</Text>
                    </View>
                    {category && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>CATEGORY</Text>
                            <Text style={styles.infoValue}>{category.name}</Text>
                        </View>
                    )}
                </View>

                {/* Kit Status */}
                <View
                    style={[
                        styles.kitStatus,
                        reg.raceKitClaimed ? styles.kitClaimed : styles.kitPending,
                    ]}
                >
                    <Text style={styles.kitStatusText}>
                        {reg.raceKitClaimed
                            ? "✅ RACE KIT COLLECTED"
                            : "📦 SHOW THIS QR AT KIT CLAIM BOOTH"}
                    </Text>
                </View>
            </View>

            <Text style={styles.hint}>
                Screen will stay awake while viewing this pass
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: "center",
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
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 56,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
        width: "100%",
    },
    backButton: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
    },
    backText: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        textTransform: "uppercase",
    },
    headerTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.text,
        letterSpacing: 1,
    },
    passCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius["2xl"],
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing["3xl"],
        alignItems: "center",
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.lg,
        gap: Spacing.xl,
        width: "90%",
        maxWidth: 400,
    },
    eventName: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["2xl"],
        color: Colors.text,
        textTransform: "uppercase",
        textAlign: "center",
        letterSpacing: -0.5,
        lineHeight: 28,
    },
    raceNumberContainer: {
        alignItems: "center",
        gap: 4,
    },
    raceNumberLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 9,
        color: Colors.textDim,
        letterSpacing: 2,
    },
    raceNumber: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["4xl"],
        color: Colors.primary,
        letterSpacing: -1,
    },
    qrContainer: {
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        borderRadius: Radius.xl,
    },
    infoSection: {
        width: "100%",
        gap: Spacing.sm,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    infoLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.xs,
        color: Colors.textDim,
        letterSpacing: 1,
    },
    infoValue: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.text,
        textTransform: "uppercase",
    },
    kitStatus: {
        width: "100%",
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        alignItems: "center",
    },
    kitClaimed: {
        backgroundColor: Colors.cta + "20",
        borderWidth: 1,
        borderColor: Colors.cta + "30",
    },
    kitPending: {
        backgroundColor: Colors.primary + "15",
        borderWidth: 1,
        borderColor: Colors.primary + "25",
    },
    kitStatusText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.sm,
        color: Colors.text,
        letterSpacing: 0.5,
    },
    hint: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.xs,
        color: Colors.textDim,
        marginTop: Spacing.xl,
    },
});
