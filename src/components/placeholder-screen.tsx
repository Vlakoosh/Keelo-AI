import { Text, View } from "react-native";

import { EmptyState, Screen, Tile } from "@/components/ui";
import { useAppTheme } from "@/theme/theme-provider";

type PlaceholderScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
};

export function PlaceholderScreen({
  eyebrow,
  title,
  description,
  highlights,
}: PlaceholderScreenProps) {
  const { theme } = useAppTheme();

  return (
    <Screen safe>
      <View className="flex-1 gap-6 px-5 pb-8 pt-4">
        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase" style={{ color: theme.textMuted }}>
            {eyebrow}
          </Text>
          <Text className="text-4xl font-semibold leading-tight" style={{ color: theme.text }}>
            {title}
          </Text>
          <Text className="max-w-xl text-base leading-7" style={{ color: theme.textMuted }}>
            {description}
          </Text>
        </View>

        <Tile className="gap-3 p-5">
          <Text className="text-lg font-semibold" style={{ color: theme.text }}>
            Ready for development
          </Text>
          <Text className="text-sm leading-6" style={{ color: theme.textMuted }}>
            The project shell, routing, dark theme tokens, and NativeWind
            pipeline are in place so we can start building real features instead
            of refactoring setup later.
          </Text>
        </Tile>

        <Tile variant="muted" className="gap-3 p-5">
          <Text className="text-lg font-semibold" style={{ color: theme.text }}>
            Next feature ideas
          </Text>
          {highlights.map((item) => (
            <View key={item} className="flex-row items-start gap-3">
              <View className="mt-2 h-2 w-2 rounded-full" style={{ backgroundColor: theme.primaryAccent }} />
              <Text className="flex-1 text-sm leading-6" style={{ color: theme.text }}>{item}</Text>
            </View>
          ))}
        </Tile>
        <EmptyState title="Soft UI system ready" description="Reusable tiles, controls, and theme tokens can now carry the rest of this tab when the feature is built." />
      </View>
    </Screen>
  );
}
