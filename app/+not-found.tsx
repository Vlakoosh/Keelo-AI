import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

import { useAppTheme } from "@/theme/theme-provider";

export default function NotFoundScreen() {
  const { theme } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Not found", headerShown: true }} />
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.canvas }}>
        <Text className="text-2xl font-semibold" style={{ color: theme.text }}>Page not found</Text>
        <Link href="/today" className="mt-4 text-base" style={{ color: theme.textMuted }}>
          Return to dashboard
        </Link>
      </View>
    </>
  );
}
