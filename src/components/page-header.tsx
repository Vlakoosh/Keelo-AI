import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/theme/theme-provider";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
};

export function PageHeader({ title, subtitle, onBack, rightSlot }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <View
      className="px-5 pb-4"
      style={{ paddingTop: insets.top + 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.background }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          {onBack ? (
            <Pressable
              onPress={onBack}
              className="h-11 w-11 items-center justify-center"
            >
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </Pressable>
          ) : null}
          <View className="flex-1">
            <Text className="text-xl font-semibold" style={{ color: theme.text }}>{title}</Text>
            {subtitle ? <Text className="mt-1 text-sm" style={{ color: theme.muted }}>{subtitle}</Text> : null}
          </View>
        </View>
        {rightSlot ? <View className="flex-row items-center gap-2">{rightSlot}</View> : null}
      </View>
    </View>
  );
}
