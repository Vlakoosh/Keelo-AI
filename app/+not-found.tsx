import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found", headerShown: true }} />
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-2xl font-semibold text-text">Page not found</Text>
        <Link href="/today" className="mt-4 text-base text-muted">
          Return to dashboard
        </Link>
      </View>
    </>
  );
}
