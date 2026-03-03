import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMutation } from "convex/react";
import {
    ArrowLeft, Check, Camera,
    MapPin, ShieldAlert, Shirt,
    User, Phone, Calendar
} from "lucide-react-native";
import { useState } from "react";
import {
    StyleSheet, Text, View, ScrollView,
    TextInput, Pressable, Alert,
    ActivityIndicator, KeyboardAvoidingView,
    Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInRight } from "react-native-reanimated";

const SIZES = ["XS", "S", "M", "L", "XL", "2xl", "3xl"];

/**
 * Edit Profile Screen (Stage 5)
 * Comprehensive form for managing runner profile and apparel sizes.
 */
export default function EditProfileScreen() {
    const { user, isLoaded } = useAuth();
    const updateProfile = useMutation(api.users.updateProfile);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    // Form State
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [gender, setGender] = useState<any>(user?.gender || "");
    const [birthDate, setBirthDate] = useState(user?.birthDate || "");
    const [tShirtSize, setTShirtSize] = useState<any>(user?.tShirtSize || "");
    const [singletSize, setSingletSize] = useState<any>(user?.singletSize || "");

    // Address
    const [street, setStreet] = useState(user?.address?.street || "");
    const [city, setCity] = useState(user?.address?.city || "");
    const [province, setProvince] = useState(user?.address?.province || "");
    const [zipCode, setZipCode] = useState(user?.address?.zipCode || "");

    // Emergency
    const [eName, setEName] = useState(user?.emergencyContact?.name || "");
    const [eRelation, setERelation] = useState(user?.emergencyContact?.relationship || "");
    const [ePhone, setEPhone] = useState(user?.emergencyContact?.phone || "");

    const handleSave = async () => {
        if (!displayName) {
            Alert.alert("Required", "Display name is required.");
            return;
        }

        setLoading(true);
        try {
            // Calculate completion (simplified logic)
            const fields = [
                displayName, phone, gender, birthDate,
                tShirtSize, singletSize, street, city,
                province, zipCode, eName, eRelation, ePhone
            ];
            const filled = fields.filter(f => !!f).length;
            const completion = Math.round((filled / fields.length) * 100);

            await updateProfile({
                displayName,
                phone,
                gender,
                birthDate,
                tShirtSize,
                singletSize,
                profileCompletion: completion,
                address: {
                    street,
                    city,
                    province,
                    zipCode,
                    country: "Philippines"
                },
                emergencyContact: {
                    name: eName,
                    relationship: eRelation,
                    phone: ePhone
                },
                medicalConditions: user?.medicalConditions || ""
            });

            Alert.alert("Success", "Profile updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={[styles.header, { paddingTop: Math.max(Spacing.lg, insets.top) }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.white} />
                </Pressable>
                <Text style={styles.headerTitle}>EDIT PROFILE</Text>
                <Pressable
                    onPress={handleSave}
                    disabled={loading}
                    style={({ pressed }) => [
                        styles.saveButton,
                        pressed && { opacity: 0.7 }
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <Text style={styles.saveButtonText}>SAVE</Text>
                    )}
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <Animated.View entering={FadeInRight} style={styles.form}>

                    {/* Section: Personal Info */}
                    <Section label="PERSONAL INFO" icon={<User size={16} color={Colors.primary} />}>
                        <CustomInput
                            label="DISPLAY NAME"
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Juan Dela Cruz"
                        />
                        <CustomInput
                            label="PHONE NUMBER"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="09123456789"
                            keyboardType="phone-pad"
                        />
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>GENDER</Text>
                                <View style={styles.genderRow}>
                                    {["male", "female"].map(g => (
                                        <Pressable
                                            key={g}
                                            style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                                            onPress={() => setGender(g)}
                                        >
                                            <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                                                {g.toUpperCase()}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <CustomInput
                                    label="BIRTH DATE"
                                    value={birthDate}
                                    onChangeText={setBirthDate}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>
                        </View>
                    </Section>

                    {/* Section: Apparel */}
                    <Section label="APPAREL SIZES" icon={<Shirt size={16} color={Colors.primary} />}>
                        <Text style={styles.inputLabel}>T-SHIRT SIZE</Text>
                        <View style={styles.sizeRow}>
                            {SIZES.map(s => (
                                <Pressable
                                    key={s}
                                    style={[styles.sizeBtn, tShirtSize === s && styles.sizeBtnActive]}
                                    onPress={() => setTShirtSize(s)}
                                >
                                    <Text style={[styles.sizeText, tShirtSize === s && styles.sizeTextActive]}>
                                        {s}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>SINGLET SIZE</Text>
                        <View style={styles.sizeRow}>
                            {SIZES.map(s => (
                                <Pressable
                                    key={s}
                                    style={[styles.sizeBtn, singletSize === s && styles.sizeBtnActive]}
                                    onPress={() => setSingletSize(s)}
                                >
                                    <Text style={[styles.sizeText, singletSize === s && styles.sizeTextActive]}>
                                        {s}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Section>

                    {/* Section: Address */}
                    <Section label="ADDRESS" icon={<MapPin size={16} color={Colors.primary} />}>
                        <CustomInput label="STREET" value={street} onChangeText={setStreet} placeholder="123 Road St." />
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <CustomInput label="CITY" value={city} onChangeText={setCity} placeholder="Metro" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <CustomInput label="PROVINCE" value={province} onChangeText={setProvince} placeholder="Cavite" />
                            </View>
                        </View>
                    </Section>

                    {/* Section: Emergency */}
                    <Section label="EMERGENCY CONTACT" icon={<ShieldAlert size={16} color={Colors.danger} />}>
                        <CustomInput label="CONTACT NAME" value={eName} onChangeText={setEName} placeholder="Emergency Name" />
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <CustomInput label="RELATIONSHIP" value={eRelation} onChangeText={setERelation} placeholder="Spouse" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <CustomInput label="PHONE" value={ePhone} onChangeText={setEPhone} placeholder="0911..." keyboardType="phone-pad" />
                            </View>
                        </View>
                    </Section>

                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                {icon}
                <Text style={styles.sectionLabel}>{label}</Text>
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );
}

function CustomInput({ label, value, onChangeText, placeholder, keyboardType }: any) {
    return (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.textDim}
                keyboardType={keyboardType}
            />
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
    header: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
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
    saveButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 8,
        borderRadius: Radius.full,
        backgroundColor: "transparent",
    },
    saveButtonText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.primary,
        letterSpacing: 1,
    },
    form: {
        padding: Spacing.xl,
        gap: Spacing["2xl"],
    },
    section: {
        gap: Spacing.md,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingBottom: 8,
    },
    sectionLabel: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 10,
        color: Colors.textDim,
        letterSpacing: 2,
    },
    sectionContent: {
        gap: Spacing.md,
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 9,
        color: Colors.textMuted,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.base,
        color: Colors.white,
    },
    row: {
        flexDirection: "row",
        gap: Spacing.md,
    },
    genderRow: {
        flexDirection: "row",
        gap: 8,
    },
    genderBtn: {
        flex: 1,
        height: 48,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    genderBtnActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "10",
    },
    genderText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 12,
        color: Colors.textDim,
    },
    genderTextActive: {
        color: Colors.primary,
    },
    sizeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    sizeBtn: {
        width: 48,
        height: 36,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    sizeBtnActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    sizeText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 12,
        color: Colors.textDim,
    },
    sizeTextActive: {
        color: Colors.white,
    },
});
