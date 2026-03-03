import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
    const { signOut } = useAuth();
    const { user: clerkUser } = useUser();
    const { user } = useCurrentUser();

    const handleSignOut = () => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: () => signOut(),
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>SETTINGS</Text>
            </View>

            <View style={styles.content}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {clerkUser?.imageUrl ? (
                        <Image
                            source={{ uri: clerkUser.imageUrl }}
                            style={styles.avatar}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                                {user?.displayName?.[0]?.toUpperCase() || "?"}
                            </Text>
                        </View>
                    )}

                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                            {user?.displayName || clerkUser?.fullName || "Runner"}
                        </Text>
                        <Text style={styles.profileEmail}>
                            {user?.email || clerkUser?.emailAddresses?.[0]?.emailAddress || ""}
                        </Text>
                        {user?.role && (
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>
                        Registration & payments are managed on the web at raceday.com
                    </Text>
                </View>

                {/* Sign Out */}
                <Pressable
                    style={({ pressed }) => [
                        styles.signOutButton,
                        pressed && styles.buttonPressed,
                    ]}
                    onPress={handleSignOut}
                >
                    <Text style={styles.signOutText}>SIGN OUT</Text>
                </Pressable>

                {/* App Version */}
                <Text style={styles.versionText}>RaceDay Mobile v1.0.0</Text>
            </View>
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
    content: {
        flex: 1,
        padding: Spacing.xl,
        gap: Spacing.xl,
    },
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        padding: Spacing.xl,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.lg,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    avatarPlaceholder: {
        backgroundColor: Colors.primary + "30",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.primary,
    },
    profileInfo: {
        flex: 1,
        gap: 4,
    },
    profileName: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.text,
        textTransform: "uppercase",
        letterSpacing: -0.3,
    },
    profileEmail: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
    },
    roleBadge: {
        alignSelf: "flex-start",
        backgroundColor: Colors.primary + "20",
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        marginTop: 4,
    },
    roleText: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 9,
        color: Colors.primary,
        letterSpacing: 1,
    },
    infoSection: {
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    infoLabel: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        textAlign: "center",
        lineHeight: 20,
    },
    signOutButton: {
        backgroundColor: Colors.danger + "15",
        borderWidth: 1,
        borderColor: Colors.danger + "30",
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        alignItems: "center",
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    signOutText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.danger,
        letterSpacing: 1,
    },
    versionText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.xs,
        color: Colors.textDim,
        textAlign: "center",
        marginTop: "auto",
    },
});
