import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

export default function Index() {
    const { isSignedIn, isLoaded } = useAuth();
    if (!isLoaded) return null;
    return isSignedIn ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
