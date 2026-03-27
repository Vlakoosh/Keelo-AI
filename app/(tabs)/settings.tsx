import { Switch, Text, View } from "react-native";

import { PageHeader } from "@/components/page-header";
import { useAppTheme } from "@/theme/theme-provider";

export default function SettingsScreen() {
  const { mode, setMode, theme } = useAppTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <PageHeader title="Settings" />
      <View className="px-5 pt-5">
        <View
          className="rounded-card px-4 py-4"
          style={{ backgroundColor: theme.tertiary, borderWidth: 1, borderColor: theme.quaternary }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-semibold" style={{ color: theme.text }}>
                Light Theme
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.muted }}>
                Toggle between dark and light
              </Text>
            </View>
            <Switch
              value={mode === "light"}
              onValueChange={(value) => setMode(value ? "light" : "dark")}
              trackColor={{ false: theme.quaternary, true: theme.secondary }}
              thumbColor={mode === "light" ? theme.surface : theme.surface2}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
