import { type TokenCache } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const createTokenCache = (): TokenCache => {
    return {
        getToken: async (key: string) => {
            try {
                const value = await SecureStore.getItemAsync(key);
                return value;
            } catch (error) {
                console.error("TokenCache getToken error:", error);
                await SecureStore.deleteItemAsync(key);
                return null;
            }
        },
        saveToken: async (key: string, token: string) => {
            try {
                await SecureStore.setItemAsync(key, token);
            } catch (error) {
                console.error("TokenCache saveToken error:", error);
            }
        },
    };
};

// SecureStore is only available natively — fallback for web
export const tokenCache = Platform.OS !== "web" ? createTokenCache() : undefined;
