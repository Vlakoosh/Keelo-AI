import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-6 px-5 pb-8 pt-4">
        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-muted">
            {eyebrow}
          </Text>
          <Text className="text-4xl font-semibold leading-tight text-text">
            {title}
          </Text>
          <Text className="max-w-xl text-base leading-7 text-muted">
            {description}
          </Text>
        </View>

        <View className="gap-3 rounded-card border border-border bg-surface p-5">
          <Text className="text-lg font-semibold text-text">
            Ready for development
          </Text>
          <Text className="text-sm leading-6 text-muted">
            The project shell, routing, dark theme tokens, and NativeWind
            pipeline are in place so we can start building real features instead
            of refactoring setup later.
          </Text>
        </View>

        <View className="gap-3 rounded-card border border-border bg-surface-2 p-5">
          <Text className="text-lg font-semibold text-text">
            Next feature ideas
          </Text>
          {highlights.map((item) => (
            <View key={item} className="flex-row items-start gap-3">
              <View className="mt-2 h-2 w-2 rounded-full bg-accent" />
              <Text className="flex-1 text-sm leading-6 text-text">{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
