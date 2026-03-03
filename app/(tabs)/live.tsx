import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { LatLng, parseGPX } from "@/lib/tracking/gpxParser";
import { isTrackingActive, startBackgroundTracking, stopBackgroundTracking } from "@/lib/tracking/trackingService";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

let MapView: any, Marker: any, Polyline: any, PROVIDER_DEFAULT: any;

if (Platform.OS !== 'web') {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

export default function LiveScreen() {
    const { user, isLoaded: isUserLoaded } = useCurrentUser();
    const mapRef = useRef<any>(null);

    const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(null);
    const [gpxPoints, setGpxPoints] = useState<LatLng[]>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [isLoadingGpx, setIsLoadingGpx] = useState(false);

    // 1. Get user's registrations to find events to track
    const registrations = useQuery(
        api.registrations.getByUserId,
        user ? { userId: user._id as Id<"users"> } : "skip"
    );

    // 2. Identify the active or most relevant event
    const registeredEvents = useMemo(() => {
        if (!registrations) return [];
        return registrations
            .filter(r => r.event && r.status === "paid")
            .map(r => ({
                ...r.event,
                registrationId: r._id,
                categoryId: r.categoryId
            }));
    }, [registrations]);

    const activeEvent = useMemo(() => {
        if (selectedEventId) return registeredEvents.find(e => e._id === selectedEventId);
        if (registeredEvents.length === 0) return null;

        // Default to the event closest to today (or today's event)
        const now = Date.now();
        return registeredEvents.sort((a, b) => {
            const dateA = a.date ?? 0;
            const dateB = b.date ?? 0;
            return Math.abs(dateA - now) - Math.abs(dateB - now);
        })[0];
    }, [registeredEvents, selectedEventId]);

    // 3. Fetch and parse GPX for the active event/category
    useEffect(() => {
        if (!activeEvent) return;

        const category = activeEvent.categories?.find((c: any) => c.id === activeEvent.categoryId);
        const gpxUrl = category?.routeMap?.gpxFileUrl;

        if (gpxUrl) {
            setIsLoadingGpx(true);
            fetch(gpxUrl)
                .then(res => res.text())
                .then(text => {
                    const points = parseGPX(text);
                    setGpxPoints(points);

                    // Fit map to route after a short delay
                    if (points.length > 0) {
                        setTimeout(() => {
                            mapRef.current?.fitToCoordinates(points, {
                                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                                animated: true,
                            });
                        }, 500);
                    }
                })
                .catch(err => console.error("Failed to parse GPX:", err))
                .finally(() => setIsLoadingGpx(false));
        } else {
            setGpxPoints([]);
        }
    }, [activeEvent]);

    // 4. Initial check for tracking status
    useEffect(() => {
        isTrackingActive().then(setIsTracking);
    }, []);

    // 5. Real-time runner positions (Convex subscription)
    const liveTrackers = useQuery(
        api.tracking.listByEvent,
        activeEvent ? { eventId: activeEvent._id as Id<"events"> } : "skip"
    ) || [];

    const handleToggleTracking = async () => {
        if (!user || !activeEvent) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (isTracking) {
                await stopBackgroundTracking();
                setIsTracking(false);
                Alert.alert("Tracking Stopped", "Your location is no longer being shared.");
            } else {
                if (!activeEvent._id) throw new Error("Active event ID is missing");
                await startBackgroundTracking(user._id, activeEvent._id as string);
                setIsTracking(true);
                Alert.alert("Tracking Started", "Your live progress is now being shared with the race organizers and other runners.");
            }
        } catch (err: any) {
            Alert.alert("Tracking Error", err.message || "Failed to toggle tracking");
        }
    };

    if (!isUserLoaded || registrations === undefined) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading tracking data...</Text>
            </View>
        );
    }

    if (registeredEvents.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>LIVE TRACK</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📍</Text>
                    <Text style={styles.emptyTitle}>No Active Races</Text>
                    <Text style={styles.emptyText}>
                        You need to be registered for an event to use live tracking.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>LIVE TRACK</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {activeEvent?.name}
                    </Text>
                </View>

                <Pressable
                    style={[styles.trackingButton, isTracking && styles.trackingButtonActive]}
                    onPress={handleToggleTracking}
                >
                    <View style={[styles.dot, isTracking && styles.dotActive]} />
                    <Text style={styles.trackingButtonText}>
                        {isTracking ? "LIVE" : "START TRACKING"}
                    </Text>
                </Pressable>
            </View>

            <View style={styles.mapContainer}>
                {Platform.OS === 'web' ? (
                    <View style={styles.webPlaceholder}>
                        <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.webPlaceholderText}>Interactive map is only available on mobile devices.</Text>
                    </View>
                ) : (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_DEFAULT}
                        userInterfaceStyle="dark"
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                        initialRegion={activeEvent?.location?.coordinates ? {
                            latitude: activeEvent.location.coordinates.lat,
                            longitude: activeEvent.location.coordinates.lng,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        } : undefined}
                    >
                        {/* GPX Route */}
                        {gpxPoints.length > 0 && (
                            <Polyline
                                coordinates={gpxPoints}
                                strokeColor={Colors.primary}
                                strokeWidth={4}
                            />
                        )}

                        {/* Live Tracker Markers */}
                        {liveTrackers.map((tracker: any) => (
                            <Marker
                                key={tracker.userId}
                                coordinate={{ latitude: tracker.lat, longitude: tracker.lng }}
                                title={tracker.displayName}
                                flat={true}
                            >
                                <View style={[
                                    styles.markerContainer,
                                    tracker.userId === user?._id && styles.selfMarker
                                ]}>
                                    <View style={styles.markerDot} />
                                </View>
                            </Marker>
                        ))}
                    </MapView>
                )}

                {isLoadingGpx && (
                    <View style={styles.mapOverlay}>
                        <ActivityIndicator color={Colors.primary} />
                    </View>
                )}
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["3xl"],
        color: Colors.text,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginTop: 2,
        maxWidth: 180,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.md,
    },
    loadingText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.base,
        color: Colors.textMuted,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing["3xl"],
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: Spacing.xl,
    },
    emptyTitle: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize["2xl"],
        color: Colors.text,
        textTransform: "uppercase",
    },
    emptyText: {
        fontFamily: "Barlow_400Regular",
        fontSize: FontSize.base,
        color: Colors.textMuted,
        textAlign: "center",
        marginTop: Spacing.sm,
    },
    trackingButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    trackingButtonActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "10",
    },
    trackingButtonText: {
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: FontSize.xs,
        color: Colors.text,
        letterSpacing: 0.5,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.textMuted,
    },
    dotActive: {
        backgroundColor: Colors.primary,
    },
    mapContainer: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(31, 41, 55, 0.3)",
        alignItems: "center",
        justifyContent: "center",
    },
    markerContainer: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    selfMarker: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Colors.primary,
        borderColor: "white",
    },
    markerDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.primary,
    },
    webPlaceholder: {
        flex: 1,
        backgroundColor: "#111",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
    },
    webPlaceholderText: {
        color: Colors.textMuted,
        fontFamily: "Barlow_400Regular",
        fontSize: 16,
        textAlign: "center",
        marginTop: 16,
    }
});
