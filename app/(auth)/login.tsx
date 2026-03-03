import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { useOAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const { startOAuthFlow: startGoogleOAuth } = useOAuth({
        strategy: "oauth_google",
    });

    const handleGoogleLogin = useCallback(async () => {
        try {
            const { createdSessionId, setActive } = await startGoogleOAuth({
                redirectUrl: Linking.createURL("/"),
            });
            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
            }
        } catch (err) {
            console.error("OAuth error:", err);
        }
    }, [startGoogleOAuth]);

    return (
        <View style={styles.container}>
            {/* Hero */}
            <View style={styles.heroSection}>
                <Image
                    source={require("../../assets/images/logo.png")}
                    style={styles.logoImage}
                    contentFit="contain"
                />
                <Text style={styles.subtitle}>Your Race Companion</Text>
            </View>

            {/* Features */}
            <View style={styles.featuresSection}>
                <View style={styles.featureRow}>
                    <View style={styles.featureIconContainer}>
                        <Feather name="map-pin" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Live Tracking</Text>
                        <Text style={styles.featureDesc}>
                            Share your race progress in real-time
                        </Text>
                    </View>
                </View>
                <View style={styles.featureRow}>
                    <View style={styles.featureIconContainer}>
                        <Feather name="smartphone" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Digital Race Pass</Text>
                        <Text style={styles.featureDesc}>
                            Show your QR code at kit claim booths
                        </Text>
                    </View>
                </View>
                <View style={styles.featureRow}>
                    <View style={styles.featureIconContainer}>
                        <Feather name="award" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>My Events</Text>
                        <Text style={styles.featureDesc}>
                            View all your registered races
                        </Text>
                    </View>
                </View>
            </View>

            {/* Login Button */}
            <View style={styles.loginSection}>
                <Pressable
                    style={({ pressed }) => [
                        styles.googleButton,
                        pressed && styles.buttonPressed,
                    ]}
                    onPress={handleGoogleLogin}
                >
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </Pressable>

                <Text style={styles.disclaimer}>
                    By continuing, you agree to RaceDay's Terms of Service
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing["3xl"],
        justifyContent: "center",
    },
    heroSection: {
        alignItems: "center",
        marginBottom: Spacing["4xl"],
    },
    logoImage: {
        width: 270,
        height: 80,
    },
    title: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["4xl"],
        color: Colors.text,
        letterSpacing: -1,
        textTransform: "uppercase",
    },
    subtitle: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.md,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    featuresSection: {
        marginBottom: Spacing["4xl"],
        gap: Spacing.xl,
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.lg,
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.lg,
        color: Colors.text,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    featureDesc: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginTop: 2,
    },
    loginSection: {
        gap: Spacing.lg,
    },
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.white,
        paddingVertical: Spacing.lg,
        borderRadius: Radius.lg,
        gap: Spacing.md,
    },
    buttonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    googleIcon: {
        fontSize: 20,
        fontWeight: "700",
        color: "#4285F4",
    },
    googleButtonText: {
        fontFamily: "Barlow_600SemiBold",
        fontSize: FontSize.md,
        color: Colors.black,
    },
    disclaimer: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.xs,
        color: Colors.textDim,
        textAlign: "center",
    },
});
