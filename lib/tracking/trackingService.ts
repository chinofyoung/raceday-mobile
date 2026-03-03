import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { BACKGROUND_LOCATION_TASK } from "./backgroundTask";

export async function startBackgroundTracking(userId: string, eventId: string) {
    // Request permissions
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== "granted") throw new Error("Foreground permission denied");

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== "granted") throw new Error("Background permission denied");

    // Store tracking context for background task
    await AsyncStorage.setItem("tracking_context", JSON.stringify({ userId, eventId }));

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 15, // meters — matches web app threshold
        timeInterval: 15000,   // ms — matches web app's 15-second interval
        showsBackgroundLocationIndicator: true, // iOS blue bar
        foregroundService: {
            notificationTitle: "RaceDay Live Tracking",
            notificationBody: "Your race is being tracked 🏃",
            notificationColor: "#1f2937",
        },
    });
}

export async function stopBackgroundTracking() {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isTracking) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    await AsyncStorage.removeItem("tracking_context");
}

export async function isTrackingActive(): Promise<boolean> {
    return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
