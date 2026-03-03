import * as Updates from "expo-updates";
import { Alert } from "react-native";

/**
 * OTA update checker (Stage 7)
 * Ensures runners have the latest features without full store updates.
 */
export async function checkForUpdates() {
    if (__DEV__) return; // Skip in dev mode

    try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
            await Updates.fetchUpdateAsync();

            Alert.alert(
                "Update Available",
                "A new version of RaceDay is ready. Restart to apply the latest improvements?",
                [
                    { text: "Later", style: "cancel" },
                    {
                        text: "Restart Now",
                        onPress: () => Updates.reloadAsync(),
                    },
                ]
            );
        }
    } catch (error) {
        // Fail silently in prod (not critical, can check next launch)
        console.warn("Update check failed:", error);
    }
}
