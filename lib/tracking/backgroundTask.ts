import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const BACKGROUND_LOCATION_TASK = "raceday-background-location";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

// Define the background task (runs even when app is closed)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error("Background location error:", error);
        return;
    }

    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const latest = locations[locations.length - 1];

        if (latest) {
            try {
                const contextStr = await AsyncStorage.getItem("tracking_context");
                if (!contextStr) return;

                const { userId, eventId } = JSON.parse(contextStr);

                // Send to Convex via HTTP action
                await fetch(`${CONVEX_URL}/api/tracking/update`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId,
                        eventId,
                        lat: latest.coords.latitude,
                        lng: latest.coords.longitude,
                        bearing: latest.coords.heading ?? undefined,
                    }),
                });
            } catch (err) {
                console.error("Failed to send background location:", err);
            }
        }
    }
});
