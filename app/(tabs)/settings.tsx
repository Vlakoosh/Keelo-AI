import { Switch, Text, View } from "react-native";

import { PageHeader } from "@/components/page-header";
import { Tile } from "@/components/ui";
import { useAppTheme } from "@/theme/theme-provider";

export default function SettingsScreen() {
  const { mode, setMode, theme } = useAppTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader title="Settings" />
      <View className="px-5 pt-5">
        <Tile className="px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-semibold" style={{ color: theme.text }}>
                Light Theme
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                Toggle between dark and light
              </Text>
            </View>
            <Switch
              value={mode === "light"}
              onValueChange={(value) => setMode(value ? "light" : "dark")}
              trackColor={{ false: theme.cardMuted, true: theme.primaryAccent }}
              thumbColor={theme.card}
            />
          </View>
        </Tile>
      </View>
    </View>
  );
}
