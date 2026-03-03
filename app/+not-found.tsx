import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🏃</Text>
      <Text style={styles.title}>Page Not Found</Text>
      <Text style={styles.desc}>This screen doesn't exist.</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.buttonText}>GO TO EVENTS</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize["2xl"],
    color: Colors.text,
    textTransform: "uppercase",
  },
  desc: {
    fontFamily: "Barlow_400Regular",
    fontSize: FontSize.base,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    marginTop: Spacing["3xl"],
  },
  buttonText: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: FontSize.base,
    color: Colors.white,
    letterSpacing: 1,
  },
});
