import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/hooks/useAuth";
import { LatLng, parseGPX } from "@/lib/tracking/gpxParser";
import {
    isTrackingActive,
    startBackgroundTracking,
    stopBackgroundTracking
} from "@/lib/tracking/trackingService";
import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    ChevronRight,
    LocateFixed,
    Map as MapIcon, Navigation,
    Timer,
    Zap
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator, Alert,
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    Text, View
} from "react-native";
import Animated, {
    FadeInDown, FadeInUp,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let MapView: any, Marker: any, Polyline: any, PROVIDER_DEFAULT: any;

if (Platform.OS !== 'web') {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

const { width, height } = Dimensions.get("window");

/**
 * Live Tracking Screen (Stage 6)
 * Real-time map with runner positions and route visualization.
 */
export default function LiveScreen() {
    const { user, isLoaded: isUserLoaded } = useAuth();
    const mapRef = useRef<any>(null);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(null);
    const [gpxPoints, setGpxPoints] = useState<LatLng[]>([]);
    const [isSelectingEvent, setIsSelectingEvent] = useState(false);
    const [distance, setDistance] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [lastLocation, setLastLocation] = useState<any>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [isLoadingGpx, setIsLoadingGpx] = useState(false);
    const [isStatsExpanded, setIsStatsExpanded] = useState(true);

    // Fetch registrations
    const registrations = useQuery(
        api.registrations.getByUserId,
        user?._id ? { userId: user._id as Id<"users"> } : "skip"
    );

    const registeredEvents = useMemo(() => {
        if (!registrations) return [];
        return registrations
            .filter(r => r.event && r.status === "paid")
            .map(r => ({
                ...r.event,
                registrationId: r._id,
                categoryId: r.categoryId,
                paidAt: r.paidAt
            }));
    }, [registrations]);

    // Fetch all events with live tracking enabled
    const allLiveEvents = useQuery(api.events.listLiveEnabled) || [];

    const activeEvent = useMemo(() => {
        if (!selectedEventId) return null;

        const baseEvent = allLiveEvents.find(e => e._id === selectedEventId);
        if (!baseEvent) return null;

        // Check if this is a registered event to get the specific categoryId
        const registration = registeredEvents.find(re => re._id === selectedEventId);
        const categoryId = registration?.categoryId || baseEvent.categories?.[0]?.id;

        // Find the category to get stations
        let category = baseEvent.categories?.find((c: any) => c.id === categoryId);

        // Fallback: If no stations in selected category, but they exist in another category, 
        // we might want to show them anyway for context.
        const allStations = baseEvent.categories?.flatMap((c: any) => c.stations || []) || [];

        return {
            ...baseEvent,
            categoryId: (baseEvent as any).categoryId || baseEvent.categories?.[0]?.id,
            activeCategory: category,
            allStations: allStations
        };
    }, [allLiveEvents, selectedEventId]);

    // Reset selection when navigating to this tab if needed, 
    // but usually users want to stay on the map if they selected it.
    // Let's just ensure if they were mid-selection, it's clear.
    useFocusEffect(
        useCallback(() => {
            // Optional: Reset if you want them to always see the list first every time they click the tab
            // setSelectedEventId(null);
        }, [])
    );

    const groupedEvents = useMemo(() => {
        const registered = allLiveEvents.filter(ale => registeredEvents.some(re => re._id === ale._id));
        const others = allLiveEvents.filter(ale => !registeredEvents.some(re => re._id === ale._id));

        const list: any[] = [];
        if (registered.length > 0) {
            list.push({ type: "header", title: "YOUR REGISTERED EVENTS" });
            registered.forEach(e => list.push({ ...e, type: "event" }));
        }
        if (others.length > 0) {
            list.push({ type: "header", title: "OTHER LIVE EVENTS" });
            others.forEach(e => list.push({ ...e, type: "event" }));
        }
        return list;
    }, [allLiveEvents, registeredEvents]);

    // Handle GPX
    useEffect(() => {
        if (!activeEvent) return;
        const gpxUrl = activeEvent.activeCategory?.routeMap?.gpxFileUrl;

        if (gpxUrl) {
            setIsLoadingGpx(true);
            fetch(gpxUrl)
                .then(res => res.text())
                .then(text => {
                    const points = parseGPX(text);
                    setGpxPoints(points);
                    if (points.length > 0) {
                        setTimeout(() => {
                            mapRef.current?.fitToCoordinates(points, {
                                edgePadding: { top: 80, right: 50, bottom: 250, left: 50 },
                                animated: true,
                            });
                        }, 800);
                    }
                })
                .finally(() => setIsLoadingGpx(false));
        } else {
            setGpxPoints([]);
        }
    }, [activeEvent]);

    useEffect(() => {
        isTrackingActive().then(setIsTracking);
    }, []);

    // Live positions
    const liveTrackers = useQuery(
        api.tracking.listByEvent,
        activeEvent ? { eventId: activeEvent._id as Id<"events"> } : "skip"
    ) || [];

    const currentLocation = useMemo(() => {
        const self = liveTrackers.find((t: any) => t.userId === user?._id);
        return self ? { latitude: self.lat, longitude: self.lng } : null;
    }, [liveTrackers, user?._id]);

    // Timer Effect
    useEffect(() => {
        let interval: any;
        if (isTracking) {
            if (!startTime) setStartTime(Date.now());
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
            }, 1000);
        } else {
            setStartTime(null);
            setElapsedTime(0);
            setDistance(0);
            setLastLocation(null);
        }
        return () => clearInterval(interval);
    }, [isTracking, startTime]);

    // Distance Calculation Logic
    useEffect(() => {
        if (!isTracking || !currentLocation) return;

        if (lastLocation) {
            const d = calculateDistance(
                lastLocation.latitude,
                lastLocation.longitude,
                currentLocation.latitude,
                currentLocation.longitude
            );
            if (d > 0.005) { // 5 meter threshold to avoid GPS jitter
                setDistance(prev => prev + d);
            }
        }
        setLastLocation(currentLocation);
    }, [currentLocation, isTracking]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatPace = () => {
        if (distance === 0 || elapsedTime === 0) return "0'00\"";
        const totalMinutes = elapsedTime / 60;
        const paceMinPerKm = totalMinutes / distance;
        const mins = Math.floor(paceMinPerKm);
        const secs = Math.floor((paceMinPerKm - mins) * 60);
        return `${mins}'${secs.toString().padStart(2, '0')}\"`;
    };

    const handleToggleTracking = async () => {
        if (!user?._id || !activeEvent) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            if (isTracking) {
                await stopBackgroundTracking();
                setIsTracking(false);
            } else {
                await startBackgroundTracking(user._id as string, activeEvent._id as string);
                setIsTracking(true);
            }
        } catch (err: any) {
            Alert.alert("Tracking Error", err.message);
        }
    };

    const pulseStyle = useAnimatedStyle(() => {
        if (!isTracking) return { opacity: 0 };
        return {
            transform: [{ scale: withRepeat(withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1) }],
            opacity: withRepeat(withSequence(withTiming(0.8, { duration: 1000 }), withTiming(0.4, { duration: 1000 })), -1),
        };
    });

    const dashboardAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(isStatsExpanded ? 160 : 0, { duration: 300 }),
            opacity: withTiming(isStatsExpanded ? 1 : 0, { duration: 250 }),
            marginBottom: withTiming(isStatsExpanded ? Spacing.xl : 0, { duration: 300 }),
            overflow: "hidden",
        };
    });

    const StatItem = ({ icon, label, value, highlight }: any) => (
        <View style={styles.statItem}>
            <View style={styles.statItemHeader}>
                {icon}
                <Text style={styles.statItemLabel}>{label}</Text>
            </View>
            <Text style={[styles.statItemValue, highlight && styles.statHighlight]}>{value}</Text>
        </View>
    );

    if (!isUserLoaded || registrations === undefined) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!activeEvent) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: Math.max(Spacing.lg, insets.top) }]}>
                    <Text style={styles.headerTitle}>LIVE TRACKING</Text>
                    <Text style={styles.headerSubtitle}>Choose a race to view maps & stats</Text>
                </View>

                <FlatList
                    data={groupedEvents}
                    keyExtractor={(item, index) => item.type === 'header' ? `header-${index}` : item._id}
                    renderItem={({ item }) => {
                        if (item.type === 'header') {
                            return <Text style={styles.sectionHeader}>{item.title}</Text>;
                        }
                        return (
                            <Pressable
                                style={styles.eventCard}
                                onPress={() => {
                                    setSelectedEventId(item._id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <View style={styles.eventCardContent}>
                                    <View style={styles.eventCardHeader}>
                                        <Text style={styles.eventCardName}>{item.name}</Text>
                                        {registeredEvents.some(re => re._id === item._id) && (
                                            <View style={styles.registeredBadge}>
                                                <Text style={styles.registeredBadgeText}>REGISTERED</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.eventCardOrg}>{item.organizerName}</Text>
                                    <View style={styles.eventCardBadge}>
                                        <Text style={styles.eventCardBadgeText}>MAP READY</Text>
                                    </View>
                                </View>
                                <ChevronRight size={20} color={Colors.textMuted} />
                            </Pressable>
                        );
                    }}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MapIcon size={64} color={Colors.textDim} />
                            <Text style={styles.emptyTitle}>NO LIVE EVENTS</Text>
                            <Text style={styles.emptyText}>Check back later during race weekends!</Text>
                        </View>
                    }
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map View */}
            <View style={styles.mapWrapper}>
                {Platform.OS === 'web' ? (
                    <View style={styles.webPlaceholder}>
                        <MapIcon size={48} color={Colors.textDim} />
                        <Text style={styles.webPlaceholderText}>Map view is available on mobile.</Text>
                    </View>
                ) : (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_DEFAULT}
                        userInterfaceStyle="dark"
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                    >
                        {/* GPX Path */}
                        {gpxPoints.length > 0 && (
                            <Polyline
                                coordinates={gpxPoints}
                                strokeColor={Colors.primary}
                                strokeWidth={1.5}
                                lineDashPattern={[0]}
                            />
                        )}

                        {/* Station Markers */}
                        {(activeEvent?.activeCategory?.stations || activeEvent?.allStations)?.map((station: any) => (
                            <Marker
                                key={station.id}
                                coordinate={{
                                    latitude: station.coordinates.lat,
                                    longitude: station.coordinates.lng
                                }}
                                zIndex={20}
                            >
                                <View style={[styles.stationMarker, styles[`station_${station.type}` as keyof typeof styles] as any]}>
                                    {station.type === 'water' && <MapIcon size={10} color="white" />}
                                    {station.type === 'aid' && <Activity size={10} color="white" />}
                                    {station.type === 'first_aid' && <AlertCircle size={10} color="white" />}
                                </View>
                            </Marker>
                        ))}

                        {/* Runners */}
                        {liveTrackers.map((tracker: any) => (
                            <Marker
                                key={tracker.userId}
                                coordinate={{ latitude: tracker.lat, longitude: tracker.lng }}
                                flat={true}
                            >
                                <View style={[styles.markerContainer, tracker.userId === user?._id && styles.selfMarker]}>
                                    {tracker.userId === user?._id && (
                                        <Animated.View style={[styles.pulse, pulseStyle]} />
                                    )}
                                    <View style={styles.markerPoint} />
                                </View>
                            </Marker>
                        ))}
                    </MapView>
                )}

                {/* Floating Header */}
                <Animated.View entering={FadeInUp} style={[styles.floatingHeader, { top: insets.top + Spacing.md }]}>
                    <View style={styles.eventPicker}>
                        <Pressable
                            style={styles.backButton}
                            onPress={() => setSelectedEventId(null)}
                        >
                            <ArrowLeft size={18} color={Colors.textMuted} />
                        </Pressable>
                        <View style={styles.eventPickerLeft}>
                            <View>
                                <Text style={styles.pickerLabel}>{activeEvent?.organizerName}</Text>
                                <Text style={styles.pickerValue} numberOfLines={1}>{activeEvent?.name}</Text>
                            </View>
                        </View>
                        <Pressable
                            style={styles.pickerAction}
                            onPress={() => setSelectedEventId(null)}
                        >
                            <Text style={styles.pickerActionText}>SWITCH</Text>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* Tracking Dashboard */}
                <Animated.View
                    entering={FadeInDown}
                    style={[
                        styles.dashboard,
                        { paddingBottom: 60 + insets.bottom } // Further reduced to keep handle visible
                    ]}
                >
                    {/* Expand/Collapse Handle */}
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setIsStatsExpanded(!isStatsExpanded);
                        }}
                        style={styles.collapseHandle}
                    >
                        <View style={styles.handleBar} />
                    </Pressable>

                    <Animated.View style={[dashboardAnimatedStyle]}>
                        <View style={styles.statsRow}>
                            <StatItem icon={<Zap size={14} color={Colors.primary} />} label="PACE" value={formatPace()} highlight />
                            <StatItem icon={<LocateFixed size={14} color={Colors.cta} />} label="DIST" value={`${distance.toFixed(2)} km`} />
                            <StatItem icon={<Timer size={14} color={Colors.white} />} label="TIME" value={formatTime(elapsedTime)} />
                        </View>

                        <Pressable
                            onPress={handleToggleTracking}
                            style={({ pressed }) => [
                                styles.actionButton,
                                isTracking ? styles.buttonStop : styles.buttonStart,
                                { marginTop: Spacing.lg },
                                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                            ]}
                        >
                            {isTracking ? <LocateFixed size={20} color={Colors.white} /> : <Navigation size={20} color={Colors.white} />}
                            <Text style={styles.actionButtonText}>
                                {isTracking ? "STOP TRACKING" : "START LIVE TRACKING"}
                            </Text>
                        </Pressable>
                    </Animated.View>
                </Animated.View>
            </View>
        </View>
    );
}


const ChevronDown = ({ size, color }: any) => <ChevronRight size={size} color={color} style={{ transform: [{ rotate: "90deg" }] }} />;

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
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["3xl"],
        color: Colors.white,
        letterSpacing: -0.5,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing["3xl"],
    },
    emptyTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.white,
        marginTop: Spacing.xl,
        letterSpacing: 1,
    },
    emptyText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.base,
        color: Colors.textDim,
        textAlign: "center",
        marginTop: Spacing.md,
        lineHeight: 22,
    },
    browseButton: {
        marginTop: Spacing["2xl"],
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: Radius.full,
        backgroundColor: Colors.primary,
    },
    browseButtonText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.white,
        letterSpacing: 1,
    },
    mapWrapper: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    webPlaceholder: {
        flex: 1,
        backgroundColor: "#111",
        alignItems: "center",
        justifyContent: "center",
    },
    webPlaceholderText: {
        color: Colors.textDim,
        marginTop: 12,
    },
    floatingHeader: {
        position: "absolute",
        left: Spacing.xl,
        right: Spacing.xl,
    },
    eventPicker: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    eventPickerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    pickerLabel: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 9,
        color: Colors.textDim,
        letterSpacing: 1,
    },
    pickerValue: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.sm,
        color: Colors.white,
        textTransform: "uppercase",
    },
    pickerChevron: {
        padding: 4,
    },
    dashboard: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        backgroundColor: "rgba(31, 41, 55, 0.95)",
        borderTopLeftRadius: Radius["2xl"],
        borderTopRightRadius: Radius["2xl"],
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    collapseHandle: {
        width: "100%",
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.sm,
        marginTop: -Spacing.md,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.surfaceLight,
        opacity: 0.5,
    },
    statItem: {
        flex: 1,
        gap: 4,
    },
    statItemHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    statItemLabel: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: 10,
        color: Colors.textDim,
        letterSpacing: 1,
    },
    statItemValue: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xl,
        color: Colors.white,
    },
    statHighlight: {
        color: Colors.primary,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: Spacing.lg,
        borderRadius: Radius.xl,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonStart: {
        backgroundColor: Colors.primary,
    },
    buttonStop: {
        backgroundColor: Colors.danger,
        shadowColor: Colors.danger,
    },
    actionButtonText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.base,
        color: Colors.white,
        letterSpacing: 1,
    },
    markerContainer: {
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    selfMarker: {
        zIndex: 10,
    },
    pulse: {
        position: "absolute",
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: Colors.primary,
    },
    markerPoint: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
        borderWidth: 2,
        borderColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
    },
    stationMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    station_water: {
        backgroundColor: '#3b82f6',
    },
    station_aid: {
        backgroundColor: '#ef4444',
    },
    station_first_aid: {
        backgroundColor: '#10b981',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalContent: {
        width: '100%',
        maxHeight: '70%',
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.white,
        letterSpacing: 1,
    },
    modalClose: {
        fontFamily: "BarlowCondensed_600SemiBold",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
    },
    listContainer: {
        padding: Spacing.md,
    },
    eventItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        marginBottom: Spacing.sm,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    eventCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
    },
    eventCardContent: {
        flex: 1,
        gap: 4,
    },
    eventCardName: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.lg,
        color: Colors.white,
        textTransform: "uppercase",
    },
    eventCardOrg: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.xs,
        color: Colors.textDim,
    },
    eventCardBadge: {
        backgroundColor: "rgba(255, 69, 0, 0.1)",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: "flex-start",
        marginTop: 4,
    },
    eventCardBadgeText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 10,
        color: Colors.primary,
    },
    headerSubtitle: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.md,
        color: Colors.textMuted,
        marginTop: 4,
    },
    listContent: {
        padding: Spacing.lg,
    },
    backButton: {
        padding: Spacing.sm,
        marginRight: Spacing.sm,
    },
    pickerAction: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Radius.md,
    },
    pickerActionText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 10,
        color: Colors.white,
    },
    sectionHeader: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 12,
        color: Colors.textDim,
        letterSpacing: 1.5,
        marginTop: Spacing.xl,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.xs,
    },
    eventCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },
    registeredBadge: {
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "rgba(34, 197, 94, 0.3)",
    },
    registeredBadgeText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 9,
        color: "#22c55e",
    },
});
