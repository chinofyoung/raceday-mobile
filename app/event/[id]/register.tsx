import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ChevronRight, ChevronLeft, Check,
    User, Users, Award, Info, CreditCard
} from "lucide-react-native";
import { useState, useMemo } from "react";
import {
    StyleSheet, Text, View, Pressable,
    ScrollView, TextInput, ActivityIndicator,
    Alert, KeyboardAvoidingView, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";

const STEPS = ["Type", "Category", "Details", "Review"];

export default function RegisterScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isLoaded: isAuthLoaded } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form State
    const [registrationType, setRegistrationType] = useState<"self" | "proxy">("self");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [formData, setFormData] = useState<{
        name: string;
        email: string;
        phone: string;
        tShirtSize: "XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL";
        emergencyContactName: string;
        emergencyContactPhone: string;
    }>({
        name: user?.displayName || "",
        email: user?.email || "",
        phone: user?.phone || "",
        tShirtSize: (user?.tShirtSize as any) || "M",
        emergencyContactName: user?.emergencyContact?.name || "",
        emergencyContactPhone: user?.emergencyContact?.phone || "",
    });

    // Data
    const event = useQuery(api.events.getById, { id: id as Id<"events"> });
    const createRegistration = useMutation(api.registrations.create);

    const selectedCategory = useMemo(() =>
        event?.categories?.find((c: any) => c.id === selectedCategoryId),
        [event, selectedCategoryId]
    );

    const nextStep = () => {
        if (currentStep === 1 && !selectedCategoryId) {
            Alert.alert("Required", "Please select a category to continue.");
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const prevStep = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const handleSubmit = async () => {
        if (!user || !event) return;
        setLoading(true);
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const payload = {
                eventId: event._id,
                categoryId: selectedCategoryId,
                userId: user._id,
                isProxy: registrationType === "proxy",
                registrationData: {
                    participantInfo: {
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        tShirtSize: formData.tShirtSize,
                        emergencyContact: {
                            name: formData.emergencyContactName,
                            phone: formData.emergencyContactPhone,
                        }
                    }
                },
                totalPrice: selectedCategory?.price || 0,
            };

            const registrationId = await createRegistration(payload);

            // In a real production app, we would now redirect to a payment gateway
            // Since we're in the conversion stage, we'll simulate success for now 
            // or redirect to a "Pending Payment" screen.
            Alert.alert(
                "Registration Submitted",
                "Your registration is pending payment. You will receive an email with payment instructions.",
                [{ text: "OK", onPress: () => router.push("/(tabs)/my-events") }]
            );
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to submit registration");
        } finally {
            setLoading(false);
        }
    };

    if (!event || !isAuthLoaded) {
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
                <Pressable onPress={() => router.back()} style={styles.closeButton}>
                    <ChevronLeft size={24} color={Colors.white} />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>REGISTRATION</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{event.name}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress Pills */}
            <View style={styles.progressContainer}>
                {STEPS.map((step, i) => (
                    <View key={step} style={styles.progressStep}>
                        <View style={[
                            styles.progressPill,
                            i <= currentStep && styles.progressPillActive,
                            i < currentStep && styles.progressPillCompleted
                        ]}>
                            {i < currentStep ? (
                                <Check size={12} color={Colors.white} />
                            ) : (
                                <Text style={[styles.progressText, i === currentStep && styles.progressTextActive]}>
                                    {i + 1}
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.stepLabel, i === currentStep && styles.stepLabelActive]}>
                            {step}
                        </Text>
                    </View>
                ))}
            </View>

            <ScrollView
                style={styles.formContent}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {currentStep === 0 && (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Who are you registering?</Text>
                        <Pressable
                            style={[styles.optionCard, registrationType === "self" && styles.optionCardActive]}
                            onPress={() => setRegistrationType("self")}
                        >
                            <View style={[styles.optionIcon, registrationType === "self" && styles.optionIconActive]}>
                                <User size={24} color={registrationType === "self" ? Colors.white : Colors.textMuted} />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={styles.optionTitle}>Register Myself</Text>
                                <Text style={styles.optionDesc}>I will be participating in this race.</Text>
                            </View>
                            {registrationType === "self" && <Check size={20} color={Colors.primary} />}
                        </Pressable>

                        <Pressable
                            style={[styles.optionCard, registrationType === "proxy" && styles.optionCardActive]}
                            onPress={() => setRegistrationType("proxy")}
                        >
                            <View style={[styles.optionIcon, registrationType === "proxy" && styles.optionIconActive]}>
                                <Users size={24} color={registrationType === "proxy" ? Colors.white : Colors.textMuted} />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={styles.optionTitle}>Register Someone Else</Text>
                                <Text style={styles.optionDesc}>I am registering a friend or family member.</Text>
                            </View>
                            {registrationType === "proxy" && <Check size={20} color={Colors.primary} />}
                        </Pressable>
                    </Animated.View>
                )}

                {currentStep === 1 && (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Select race category</Text>
                        {event.categories?.map((cat: any) => (
                            <Pressable
                                key={cat.id}
                                style={[styles.categoryCard, selectedCategoryId === cat.id && styles.categoryCardActive]}
                                onPress={() => setSelectedCategoryId(cat.id)}
                            >
                                <View style={styles.categoryInfo}>
                                    <Text style={styles.categoryName}>{cat.name}</Text>
                                    <View style={styles.categoryMeta}>
                                        <Text style={styles.categoryDist}>{cat.distance}{cat.distanceUnit}</Text>
                                        <Text style={styles.dot}>•</Text>
                                        <Text style={styles.categoryMetaText}>Gun Start: {cat.gunStartTime}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.catPrice, selectedCategoryId === cat.id && styles.catPriceActive]}>
                                    ₱{cat.price}
                                </Text>
                            </Pressable>
                        ))}
                    </Animated.View>
                )}

                {currentStep === 2 && (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Participant Details</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>FULL NAME</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={t => setFormData(p => ({ ...p, name: t }))}
                                placeholder="Juan Dela Cruz"
                                placeholderTextColor={Colors.textDim}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.email}
                                onChangeText={t => setFormData(p => ({ ...p, email: t }))}
                                placeholder="juan@example.com"
                                placeholderTextColor={Colors.textDim}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>PHONE</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.phone}
                                    onChangeText={t => setFormData(p => ({ ...p, phone: t }))}
                                    placeholder="09123456789"
                                    placeholderTextColor={Colors.textDim}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View style={[styles.inputGroup, { width: 100 }]}>
                                <Text style={styles.inputLabel}>SHIRT SIZE</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.tShirtSize}
                                    onChangeText={t => setFormData(p => ({ ...p, tShirtSize: t.toUpperCase() as any }))}
                                    placeholder="M"
                                    placeholderTextColor={Colors.textDim}
                                    maxLength={3}
                                />
                            </View>
                        </View>

                        <Text style={[styles.stepTitle, { marginTop: Spacing.xl }]}>Emergency Contact</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>CONTACT NAME</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.emergencyContactName}
                                onChangeText={t => setFormData(p => ({ ...p, emergencyContactName: t }))}
                                placeholder="Name"
                                placeholderTextColor={Colors.textDim}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>CONTACT PHONE</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.emergencyContactPhone}
                                onChangeText={t => setFormData(p => ({ ...p, emergencyContactPhone: t }))}
                                placeholder="Phone"
                                placeholderTextColor={Colors.textDim}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </Animated.View>
                )}

                {currentStep === 3 && (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Review Registration</Text>

                        <View style={styles.reviewCard}>
                            <ReviewRow label="Event" value={event.name} />
                            <ReviewRow label="Category" value={selectedCategory?.name || ""} />
                            <ReviewRow label="Participant" value={formData.name} />
                            <ReviewRow label="Contact" value={formData.phone} />
                            <ReviewRow label="Size" value={formData.tShirtSize} />
                            <View style={styles.divider} />
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                                <Text style={styles.totalValue}>₱{selectedCategory?.price || 0}</Text>
                            </View>
                        </View>

                        <View style={styles.noteBox}>
                            <Info size={16} color={Colors.textDim} />
                            <Text style={styles.noteText}>
                                By clicking submit, you agree to the race terms and conditions.
                            </Text>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Navigation Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(Spacing.xl, insets.bottom) }]}>
                <Pressable
                    style={[styles.backBtn, currentStep === 0 && { opacity: 0 }]}
                    onPress={prevStep}
                    disabled={currentStep === 0 || loading}
                >
                    <ChevronLeft size={20} color={Colors.text} />
                    <Text style={styles.backBtnText}>PREVIOUS</Text>
                </Pressable>

                {currentStep === STEPS.length - 1 ? (
                    <Pressable
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>SUBMIT & PAY</Text>
                                <CreditCard size={18} color={Colors.white} />
                            </>
                        )}
                    </Pressable>
                ) : (
                    <Pressable style={styles.nextBtn} onPress={nextStep}>
                        <Text style={styles.nextBtnText}>NEXT STEP</Text>
                        <ChevronRight size={18} color={Colors.white} />
                    </Pressable>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{label}</Text>
            <Text style={styles.reviewValue}>{value}</Text>
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
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    headerInfo: {
        alignItems: "center",
        flex: 1,
    },
    headerTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.white,
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.xs,
        color: Colors.textDim,
        marginTop: 2,
        maxWidth: 200,
    },
    progressContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: Spacing["2xl"],
        paddingVertical: Spacing.xl,
        backgroundColor: Colors.surface + "50",
    },
    progressStep: {
        alignItems: "center",
        gap: 6,
    },
    progressPill: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    progressPillActive: {
        borderColor: Colors.primary,
        backgroundColor: "transparent",
        transform: [{ scale: 1.1 }],
    },
    progressPillCompleted: {
        backgroundColor: Colors.cta,
        borderColor: Colors.cta,
    },
    progressText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 10,
        color: Colors.textDim,
    },
    progressTextActive: {
        color: Colors.primary,
    },
    stepLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 8,
        color: Colors.textDim,
        textTransform: "uppercase",
    },
    stepLabelActive: {
        color: Colors.text,
    },
    formContent: {
        flex: 1,
    },
    stepContainer: {
        padding: Spacing.xl,
        gap: Spacing.lg,
    },
    stepTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.white,
        textTransform: "uppercase",
        marginBottom: Spacing.sm,
    },
    optionCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.xl,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.lg,
    },
    optionCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "08",
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: Radius.lg,
        backgroundColor: Colors.surfaceLight,
        alignItems: "center",
        justifyContent: "center",
    },
    optionIconActive: {
        backgroundColor: Colors.primary,
    },
    optionInfo: {
        flex: 1,
    },
    optionTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.white,
    },
    optionDesc: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textDim,
        marginTop: 2,
    },
    categoryCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    categoryCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "08",
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.white,
    },
    categoryMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
    },
    categoryDist: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    dot: {
        color: Colors.textDim,
        fontSize: 10,
    },
    categoryMetaText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.xs,
        color: Colors.textDim,
    },
    catPrice: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.white,
    },
    catPriceActive: {
        color: Colors.primary,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 10,
        color: Colors.textDim,
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
    inputRow: {
        flexDirection: "row",
        gap: Spacing.md,
    },
    reviewCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    reviewRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    reviewLabel: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textDim,
    },
    reviewValue: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.sm,
        color: Colors.white,
        textTransform: "uppercase",
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.sm,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.md,
        color: Colors.primary,
        letterSpacing: 1,
    },
    totalValue: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["2xl"],
        color: Colors.white,
    },
    noteBox: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.sm,
    },
    noteText: {
        fontFamily: "Barlow_400Regular",
        fontSize: 11,
        color: Colors.textDim,
        lineHeight: 16,
        flex: 1,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.background,
        padding: Spacing.xl,
        flexDirection: "row",
        gap: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.md,
    },
    backBtnText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    nextBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 52,
    },
    nextBtnText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.white,
        letterSpacing: 0.5,
    },
    submitBtn: {
        flex: 1,
        backgroundColor: Colors.cta,
        borderRadius: Radius.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 52,
    },
    submitBtnText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.white,
        letterSpacing: 1,
    },
});
