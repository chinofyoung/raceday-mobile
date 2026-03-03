import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/hooks/useAuth";
import { useClerk } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import {
    User, ChevronRight, Bell, Shield,
    HelpCircle, LogOut, Info, Shirt,
    MapPin, Phone, Calendar, Heart
} from "lucide-react-native";
import { useState } from "react";
import {
    Alert, Pressable, StyleSheet, Text,
    View, ScrollView, Switch, Platform,
    ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, FadeInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";

/**
 * Settings Screen (Stage 5)
 * Premium profile and app settings overview.
 */
export default function SettingsScreen() {
    const { user, isLoaded } = useAuth();
    const { signOut } = useClerk();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [notifications, setNotifications] = useState(true);

    const handleSignOut = () => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: () => signOut()
            },
        ]);
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
            <View style={[styles.header, { paddingTop: Math.max(Spacing.lg, insets.top) }]}>
                <Text style={styles.headerTitle}>SETTINGS</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
            >
                {/* Profile Card */}
                <Animated.View entering={FadeInUp.delay(100)} style={styles.profileSection}>
                    <Pressable
                        style={styles.profileCard}
                        onPress={() => router.push("/profile/edit" as any)}
                    >
                        {user?.photoURL ? (
                            <Image
                                source={{ uri: user.photoURL }}
                                style={styles.avatar}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <User size={32} color={Colors.primary} />
                            </View>
                        )}
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{user?.displayName || "Runner"}</Text>
                            <Text style={styles.profileEmail}>{user?.email}</Text>
                            <View style={styles.completionBadge}>
                                <View style={[styles.completionBar, { width: `${user?.profileCompletion || 0}%` }]} />
                                <Text style={styles.completionText}>{user?.profileCompletion || 0}% Profile Complete</Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color={Colors.textDim} />
                    </Pressable>
                </Animated.View>

                {/* Quick Stats */}
                <View style={styles.statsGrid}>
                    <StatBox label="Finished" value="12" icon={<Award size={16} color={Colors.primary} />} />
                    <StatBox label="Total KM" value="156" icon={<Zap size={16} color={Colors.cta} />} />
                </View>

                {/* Settings Groups */}
                <SettingsGroup title="ACCOUNT">
                    <SettingsItem
                        icon={<User size={20} color={Colors.textMuted} />}
                        label="Personal Information"
                        onPress={() => router.push("/profile/edit" as any)}
                    />
                    <SettingsItem
                        icon={<Shirt size={20} color={Colors.textMuted} />}
                        label="Apparel Sizes"
                        value={user?.tShirtSize || "Set size"}
                        onPress={() => router.push("/profile/edit" as any)}
                    />
                    <SettingsItem
                        icon={<MapPin size={20} color={Colors.textMuted} />}
                        label="Address"
                        value={user?.address?.city || "Set address"}
                        onPress={() => router.push("/profile/edit" as any)}
                    />
                    <SettingsItem
                        icon={<Heart size={20} color={Colors.textMuted} />}
                        label="Emergency Contact"
                        onPress={() => router.push("/profile/edit" as any)}
                    />
                </SettingsGroup>

                <SettingsGroup title="PREFERENCES">
                    <View style={styles.settingsItem}>
                        <View style={styles.itemLeft}>
                            <View style={styles.iconWrapper}>
                                <Bell size={20} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.itemLabel}>Notifications</Text>
                        </View>
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                            thumbColor={Colors.white}
                        />
                    </View>
                    <SettingsItem
                        icon={<Shield size={20} color={Colors.textMuted} />}
                        label="Privacy & Security"
                    />
                </SettingsGroup>

                <SettingsGroup title="SUPPORT">
                    <SettingsItem
                        icon={<HelpCircle size={20} color={Colors.textMuted} />}
                        label="Help Center"
                    />
                    <SettingsItem
                        icon={<Info size={20} color={Colors.textMuted} />}
                        label="About RaceDay"
                        value="v1.0.0"
                    />
                </SettingsGroup>

                <Pressable
                    style={({ pressed }) => [
                        styles.logoutButton,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={handleSignOut}
                >
                    <LogOut size={20} color={Colors.danger} />
                    <Text style={styles.logoutText}>SIGN OUT</Text>
                </Pressable>

                <Text style={styles.copyright}>© 2026 RACEDAY. ALL RIGHTS RESERVED.</Text>
            </ScrollView>
        </View>
    );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <View style={styles.statBox}>
            <View style={styles.statHeader}>
                {icon}
                <Text style={styles.statLabel}>{label}</Text>
            </View>
            <Text style={styles.statValue}>{value}</Text>
        </View>
    );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.group}>
            <Text style={styles.groupTitle}>{title}</Text>
            <View style={styles.groupContent}>
                {children}
            </View>
        </View>
    );
}

function SettingsItem({
    icon,
    label,
    value,
    onPress
}: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    onPress?: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.settingsItem,
                pressed && styles.itemPressed
            ]}
            onPress={onPress}
        >
            <View style={styles.itemLeft}>
                <View style={styles.iconWrapper}>
                    {icon}
                </View>
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <View style={styles.itemRight}>
                {value && <Text style={styles.itemValue}>{value}</Text>}
                <ChevronRight size={16} color={Colors.textDim} />
            </View>
        </Pressable>
    );
}

const Award = ({ size, color }: { size: number; color: string }) => <Info size={size} color={color} />;
const Zap = ({ size, color }: { size: number; color: string }) => <Info size={size} color={color} />;

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
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["3xl"],
        color: Colors.white,
        letterSpacing: -0.5,
    },
    profileSection: {
        padding: Spacing.xl,
    },
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        padding: Spacing.xl,
        borderRadius: Radius["2xl"],
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.lg,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    avatarPlaceholder: {
        backgroundColor: Colors.surfaceLight,
        alignItems: "center",
        justifyContent: "center",
    },
    profileInfo: {
        flex: 1,
        gap: 2,
    },
    profileName: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.white,
        textTransform: "uppercase",
    },
    profileEmail: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textDim,
    },
    completionBadge: {
        height: 16,
        backgroundColor: Colors.background,
        borderRadius: 8,
        marginTop: 8,
        overflow: "hidden",
        justifyContent: "center",
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    completionBar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: Colors.primary + "30",
    },
    completionText: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 8,
        color: Colors.primary,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    statsGrid: {
        flexDirection: "row",
        paddingHorizontal: Spacing.xl,
        gap: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    statBox: {
        flex: 1,
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 4,
    },
    statHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    statLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 10,
        color: Colors.textDim,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    statValue: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.white,
    },
    group: {
        marginBottom: Spacing.xl,
    },
    groupTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 11,
        color: Colors.textDim,
        letterSpacing: 2,
        paddingHorizontal: Spacing["2xl"],
        marginBottom: Spacing.md,
        textTransform: "uppercase",
    },
    groupContent: {
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    settingsItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    itemPressed: {
        backgroundColor: Colors.surfaceLight + "30",
    },
    itemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.lg,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.base,
        color: Colors.white,
    },
    itemRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    itemValue: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textDim,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: Spacing.xl,
        marginHorizontal: Spacing.xl,
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        backgroundColor: Colors.danger + "10",
        borderWidth: 1,
        borderColor: Colors.danger + "20",
    },
    logoutText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.danger,
        letterSpacing: 1,
    },
    copyright: {
        fontFamily: "BarlowCondensed_500Medium",
        fontSize: 9,
        color: Colors.textDim,
        textAlign: "center",
        marginTop: Spacing["2xl"],
        letterSpacing: 1,
    },
});
