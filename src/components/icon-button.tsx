import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { useAppTheme } from "@/theme/theme-provider";

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label?: string;
  tone?: "default" | "danger";
  filled?: boolean;
};

export function IconButton({
  icon,
  onPress,
  label,
  tone = "default",
  filled = false
}: IconButtonProps) {
  const { theme } = useAppTheme();
  const color = tone === "danger" ? theme.danger : theme.icon;
  const backgroundColor = filled ? theme.cardMuted : theme.transparent;

  return (
    <Pressable
      onPress={onPress}
      className="h-11 flex-row items-center justify-center gap-2 rounded-card px-4"
      style={{ backgroundColor }}
    >
      <Ionicons name={icon} size={18} color={color} />
      {label ? <Text className="text-sm font-semibold" style={{ color }}>{label}</Text> : null}
    </Pressable>
  );
}
