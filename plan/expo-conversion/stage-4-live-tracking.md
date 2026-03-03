# Stage 4 — Live Tracking (Background GPS + Native Maps)

> **Goal**: Background GPS tracking that works when the phone is locked, with a live native map showing all runners, GPX route overlay, and station markers. This is the **primary killer feature** of the native app.

---

## Why Native > Browser for Live Tracking

| Feature | Browser (`navigator.geolocation`) | Native (`expo-location`) |
|---|---|---|
| Screen locked | ❌ Stops | ✅ Continues |
| App backgrounded | ❌ Throttled/stopped | ✅ Full background task |
| iOS Safari | ❌ Aggressively killed | ✅ Background mode |
| Android | ❌ Tab suspended | ✅ Foreground service |
| Battery awareness | ❌ None | ✅ Distance/time intervals |

---

## 4.1 — Dependencies

```bash
# Background location
npx expo install expo-location expo-task-manager

# Maps
npx expo install react-native-maps

# Async storage (for tracking context in background task)
npx expo install @react-native-async-storage/async-storage
```

---

## 4.2 — Permissions Configuration

### app.json plugins:

```json
{
  "plugins": [
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermission": "RaceDay needs your location to share your race progress with friends and family during the event.",
        "locationAlwaysPermission": "RaceDay needs background location to track your race progress even when the phone is locked.",
        "locationWhenInUsePermission": "RaceDay needs your location to show your position on the race map.",
        "isAndroidBackgroundLocationEnabled": true,
        "isAndroidForegroundServiceEnabled": true
      }
    ]
  ]
}
```

### iOS Info.plist (auto-configured):
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `NSLocationWhenInUseUsageDescription`
- `UIBackgroundModes: ["location"]`

### Android manifest (auto-configured):
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`
- `FOREGROUND_SERVICE`

---

## 4.3 — Background Location Task

```typescript
// lib/tracking/backgroundTask.ts
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const BACKGROUND_LOCATION_TASK = "raceday-background-location";

// Calculate bearing between two coordinate points
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

// This runs EVEN WHEN APP IS CLOSED
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[BackgroundLocation] Task error:", error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latest = locations[locations.length - 1];

    if (!latest) return;

    try {
      // Retrieve stored tracking context
      const contextStr = await AsyncStorage.getItem("tracking_context");
      if (!contextStr) return;

      const { userId, eventId, convexUrl, clerkToken, lastLat, lastLng } = JSON.parse(contextStr);

      const newLat = latest.coords.latitude;
      const newLng = latest.coords.longitude;

      // Calculate bearing
      let bearing = latest.coords.heading ?? 0;
      if (lastLat && lastLng) {
        bearing = calculateBearing(lastLat, lastLng, newLat, newLng);
      }

      // Send to Convex via HTTP action
      const response = await fetch(`${convexUrl}/api/tracking/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({
          userId,
          eventId,
          lat: newLat,
          lng: newLng,
          bearing,
        }),
      });

      if (response.ok) {
        // Update last known position for bearing calculation
        await AsyncStorage.setItem("tracking_context", JSON.stringify({
          userId, eventId, convexUrl, clerkToken,
          lastLat: newLat,
          lastLng: newLng,
        }));
      }
    } catch (err) {
      console.error("[BackgroundLocation] Update failed:", err);
    }
  }
});
```

---

## 4.4 — Tracking Service

```typescript
// lib/tracking/trackingService.ts
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKGROUND_LOCATION_TASK } from "./backgroundTask";

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  return background === "granted";
}

export async function startBackgroundTracking(params: {
  userId: string;
  eventId: string;
  convexUrl: string;
  clerkToken: string;
}): Promise<void> {
  // Store tracking context for background task
  await AsyncStorage.setItem("tracking_context", JSON.stringify({
    ...params,
    lastLat: null,
    lastLng: null,
  }));

  // Start background location updates
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 15,        // meters — matches web app threshold
    timeInterval: 15000,          // ms — matches web app's 15-second interval
    showsBackgroundLocationIndicator: true, // iOS blue bar
    foregroundService: {
      notificationTitle: "RaceDay Live Tracking",
      notificationBody: "Your race is being tracked 🏃",
      notificationColor: "#f97316", // Primary orange
    },
    // Battery-conscious settings
    deferredUpdatesDistance: 10,
    deferredUpdatesInterval: 10000,
    activityType: Location.ActivityType.Fitness,
  });
}

export async function stopBackgroundTracking(): Promise<void> {
  const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isTracking) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
  await AsyncStorage.removeItem("tracking_context");
}

export async function isTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}
```

---

## 4.5 — Convex HTTP Action (Backend Addition)

> [!IMPORTANT]
> This is the **only backend change** needed for the entire conversion. Background tasks can't use React hooks, so we need a simple HTTP endpoint.

```typescript
// convex/http.ts — extend existing file
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/tracking/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Verify authorization
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response("Unauthorized", { status: 401 });
      }

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return new Response("Unauthorized", { status: 401 });
      }

      const body = await request.json();
      const { userId, eventId, lat, lng, bearing } = body;

      if (!userId || !eventId || lat === undefined || lng === undefined) {
        return new Response("Missing required fields", { status: 400 });
      }

      await ctx.runMutation(api.tracking.update, {
        userId,
        eventId,
        lat,
        lng,
        bearing: bearing ?? undefined,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Tracking HTTP update failed:", error);
      return new Response("Internal error", { status: 500 });
    }
  }),
});

export default http;
```

---

## 4.6 — GPX Parser

```typescript
// lib/tracking/gpxParser.ts
export interface GpxPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export async function parseGPXFromUrl(url: string): Promise<GpxPoint[]> {
  try {
    const response = await fetch(url);
    const gpxString = await response.text();
    return parseGPXString(gpxString);
  } catch (error) {
    console.error("Error fetching/parsing GPX:", error);
    return [];
  }
}

export function parseGPXString(gpxString: string): GpxPoint[] {
  const points: GpxPoint[] = [];

  // Match <trkpt lat="..." lon="...">
  const regex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([^]*?)<\/trkpt>/gi;
  let match;

  while ((match = regex.exec(gpxString)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    // Try to extract elevation
    const eleMatch = match[3]?.match(/<ele>([^<]+)<\/ele>/);
    const elevation = eleMatch ? parseFloat(eleMatch[1]) : undefined;

    if (!isNaN(lat) && !isNaN(lng)) {
      points.push({ latitude: lat, longitude: lng, elevation });
    }
  }

  // Fallback: try simpler regex if no matches
  if (points.length === 0) {
    const simpleRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
    while ((match = simpleRegex.exec(gpxString)) !== null) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ latitude: lat, longitude: lng });
      }
    }
  }

  return points;
}
```

---

## 4.7 — Live Tracking Screen

```typescript
// app/event/[id]/live.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { colors, spacing, fontSize, borderRadius, shadows } from "@/constants/theme";
import { fontFamily } from "@/constants/fonts";
import { ArrowLeft, Play, Square, Navigation, Activity, Loader2 } from "lucide-react-native";
import { Badge } from "@/components/ui/Badge";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { parseGPXFromUrl } from "@/lib/tracking/gpxParser";
import {
  requestLocationPermissions,
  startBackgroundTracking,
  stopBackgroundTracking,
  isTrackingActive,
} from "@/lib/tracking/trackingService";

// Station marker colors (same as web)
const STATION_COLORS = {
  water: "#3b82f6",
  aid: "#f59e0b",
  first_aid: "#ef4444",
};

const STATION_LABELS = {
  water: "💧",
  aid: "🏥",
  first_aid: "➕",
};

// Dark map style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

export default function LiveTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { getToken } = useClerkAuth();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const liveTrackers = useQuery(api.tracking.listByEvent, {
    eventId: id as Id<"events">,
  }) || [];

  const startTrackingMutation = useMutation(api.tracking.start);
  const stopTrackingMutation = useMutation(api.tracking.stop);

  // Check user access
  const registrations = useQuery(
    api.registrations.getByUserId,
    user?._id ? { userId: user._id as Id<"users"> } : "skip"
  );
  const hasAccess = user
    ? user._id === event?.organizerId ||
      registrations?.some(r => r.eventId === id && r.status === "paid")
    : false;

  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gpxRoute, setGpxRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  const category = event?.categories?.[activeCategoryIndex];
  const gpxUrl = category?.routeMap?.gpxFileUrl;
  const stations = category?.stations || [];
  const allStations = event?.categories?.flatMap(c => c.stations || []) || [];
  const uniqueStations = [...new Map(allStations.map(s => [s.id, s])).values()];

  // Load GPX route
  useEffect(() => {
    if (gpxUrl) {
      parseGPXFromUrl(gpxUrl).then(points => {
        if (points.length > 0) setGpxRoute(points);
      });
    }
  }, [gpxUrl]);

  // Check if tracking was previously active
  useEffect(() => {
    isTrackingActive().then(active => setTracking(active));
  }, []);

  const handleStartTracking = useCallback(async () => {
    if (!user || !event) return;
    setLoading(true);

    try {
      const permGranted = await requestLocationPermissions();
      if (!permGranted) {
        Alert.alert(
          "Location Permission Required",
          "RaceDay needs location access (including background) to track your race. Please enable it in Settings.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // Get initial position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Start tracking in Convex
      await startTrackingMutation({
        eventId: id as Id<"events">,
        categoryId: category?.id,
        userId: user._id as Id<"users">,
        displayName: user.displayName || user.email?.split("@")[0] || "Runner",
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        bearing: position.coords.heading ?? 0,
      });

      // Get Clerk token for background HTTP requests
      const token = await getToken({ template: "convex" });

      // Start background location updates
      await startBackgroundTracking({
        userId: user._id,
        eventId: id,
        convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL!,
        clerkToken: token || "",
      });

      setTracking(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Failed to start tracking:", err);
      Alert.alert("Error", "Failed to start tracking. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, event, id, category, startTrackingMutation, getToken]);

  const handleStopTracking = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      await stopBackgroundTracking();
      await stopTrackingMutation({
        eventId: id as Id<"events">,
        userId: user._id as Id<"users">,
      });

      setTracking(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err) {
      console.error("Failed to stop tracking:", err);
    } finally {
      setLoading(false);
    }
  }, [user, id, stopTrackingMutation]);

  if (!event) return null;

  // Map initial region
  const initialRegion = gpxRoute.length > 0
    ? {
        latitude: gpxRoute[Math.floor(gpxRoute.length / 2)].latitude,
        longitude: gpxRoute[Math.floor(gpxRoute.length / 2)].longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }
    : event.location?.coordinates
    ? {
        latitude: event.location.coordinates.lat,
        longitude: event.location.coordinates.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 14.5491,
        longitude: 121.045,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{event.name}</Text>
          <Badge label="Live" color={colors.primary} />
        </View>
        <Pressable
          onPress={tracking ? handleStopTracking : handleStartTracking}
          disabled={loading}
          style={[
            styles.trackButton,
            tracking ? styles.trackButtonStop : styles.trackButtonStart,
          ]}
        >
          {loading ? (
            <Loader2 size={16} color="#fff" />
          ) : tracking ? (
            <>
              <Square size={14} color="#fff" fill="#fff" />
              <Text style={styles.trackButtonText}>STOP</Text>
            </>
          ) : (
            <>
              <Navigation size={14} color="#fff" />
              <Text style={styles.trackButtonText}>START</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Category selector */}
      {event.categories && event.categories.length > 1 && (
        <View style={styles.categorySelector}>
          {event.categories.map((cat, i) => (
            <Pressable
              key={i}
              onPress={() => setActiveCategoryIndex(i)}
              style={[
                styles.categoryPill,
                activeCategoryIndex === i && styles.categoryPillActive,
              ]}
            >
              <Text style={[
                styles.categoryPillText,
                activeCategoryIndex === i && styles.categoryPillTextActive,
              ]}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        provider={PROVIDER_DEFAULT}
        customMapStyle={darkMapStyle}
        showsUserLocation={tracking}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* GPX Route */}
        {gpxRoute.length > 0 && (
          <Polyline
            coordinates={gpxRoute}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        {/* Start marker */}
        {gpxRoute.length > 0 && (
          <Marker
            coordinate={gpxRoute[0]}
            title="Race Start"
            pinColor={colors.cta}
          />
        )}

        {/* Finish marker */}
        {gpxRoute.length > 1 && (
          <Marker
            coordinate={gpxRoute[gpxRoute.length - 1]}
            title="Race Finish"
            pinColor={colors.background}
          />
        )}

        {/* Station markers */}
        {uniqueStations.map(station => (
          <Marker
            key={station.id}
            coordinate={{
              latitude: station.coordinates.lat,
              longitude: station.coordinates.lng,
            }}
            title={station.label}
            description={station.type.replace("_", " ")}
            pinColor={STATION_COLORS[station.type]}
          />
        ))}

        {/* Live runner markers */}
        {liveTrackers.map(tracker => {
          const isMe = tracker.userId === user?._id;
          return (
            <Marker
              key={tracker.userId}
              coordinate={{ latitude: tracker.lat, longitude: tracker.lng }}
              title={`${tracker.displayName}${isMe ? " (You)" : ""}`}
              rotation={tracker.bearing || 0}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
            >
              <View style={[
                styles.runnerMarker,
                { backgroundColor: isMe ? colors.cta : colors.info },
              ]}>
                <Text style={styles.runnerMarkerText}>
                  {tracker.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Active Runners Overlay */}
      <View style={[styles.runnersOverlay, { bottom: insets.bottom + spacing.lg }]}>
        <View style={styles.runnersCard}>
          <View style={styles.avatarRow}>
            {liveTrackers.slice(0, 3).map((t, i) => (
              <View
                key={t.userId}
                style={[
                  styles.avatar,
                  { marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i },
                  { borderColor: t.userId === user?._id ? colors.cta : colors.info },
                ]}
              >
                <Text style={styles.avatarText}>
                  {t.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.runnersText}>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.headingBlack }}>
              {liveTrackers.length}
            </Text>
            {" "}Active Runner{liveTrackers.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.white5,
    backgroundColor: `${colors.background}F2`,
    zIndex: 10,
  },
  backButton: {
    width: 36, height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white10,
    alignItems: "center", justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.lg,
    color: colors.text,
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: -0.5,
    flex: 1,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  trackButtonStart: { backgroundColor: colors.primary },
  trackButtonStop: { backgroundColor: colors.danger },
  trackButtonText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.xs,
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontStyle: "italic",
  },
  categorySelector: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.background}F2`,
    zIndex: 10,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white5,
  },
  categoryPillActive: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: `${colors.primary}4D`,
  },
  categoryPillText: {
    fontFamily: fontFamily.headingBold,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  categoryPillTextActive: { color: colors.primary },
  map: { flex: 1 },
  runnerMarker: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  runnerMarkerText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: 11,
    color: "#fff",
  },
  runnersOverlay: {
    position: "absolute",
    left: spacing.lg,
  },
  runnersCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.black80,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.white10,
    ...shadows.xl,
  },
  avatarRow: { flexDirection: "row" },
  avatar: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: `${colors.primary}33`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: 10,
    color: "#fff",
  },
  runnersText: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.sm,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
});
```

---

## 4.8 — Battery & Performance

| Concern | Mitigation |
|---|---|
| Battery drain | `distanceInterval: 15m` prevents updates while stationary |
| Update frequency | 15-second minimum matches web; GPS hardware efficient |
| Data usage | Each update ~100 bytes; 4-hour race ≈ 100KB total |
| iOS background | `expo-location` handles all UIBackgroundModes |
| Android kill | Foreground service notification prevents termination |
| Token expiry | Clerk tokens valid ~1 hour; refresh on foreground resume |

---

## 4.9 — Auto-Resume Tracking

When the app returns to foreground, check if tracking is still active:

```typescript
// In live tracking screen or app root
import { AppState, AppStateStatus } from "react-native";

useEffect(() => {
  const handleAppState = async (state: AppStateStatus) => {
    if (state === "active") {
      const active = await isTrackingActive();
      setTracking(active);

      // Refresh Clerk token for background task
      if (active) {
        const token = await getToken({ template: "convex" });
        const contextStr = await AsyncStorage.getItem("tracking_context");
        if (contextStr && token) {
          const context = JSON.parse(contextStr);
          context.clerkToken = token;
          await AsyncStorage.setItem("tracking_context", JSON.stringify(context));
        }
      }
    }
  };

  const sub = AppState.addEventListener("change", handleAppState);
  return () => sub.remove();
}, []);
```

---

## Deliverables Checklist

- [ ] Background location tracking works with screen locked
- [ ] Foreground service notification on Android
- [ ] iOS blue location indicator
- [ ] Location permissions requested with clear messaging
- [ ] Convex HTTP action for background updates (`/api/tracking/update`)
- [ ] Start/stop tracking buttons with loading state
- [ ] Native MapView with dark theme
- [ ] GPX route overlay as Polyline
- [ ] Start/finish markers on route
- [ ] Station markers (water, aid, first aid) with colored pins
- [ ] Real-time runner markers via Convex subscription
- [ ] Current user highlighted in green, others in blue
- [ ] Active runners count overlay
- [ ] Category selector for multi-distance events
- [ ] GPX parser utility
- [ ] Auto-resume tracking on app foreground
- [ ] Token refresh for long-running background tasks
- [ ] Battery-conscious update intervals (15m distance, 15s time)
- [ ] Haptic feedback on start/stop
