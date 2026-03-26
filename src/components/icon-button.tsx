import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

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
  const textColor = tone === "danger" ? "text-red-400" : "text-text";
  const borderColor = "border-white";
  const backgroundColor = filled ? "bg-surface-2" : "bg-transparent";

  return (
    <Pressable
      onPress={onPress}
      className={`h-11 flex-row items-center justify-center gap-2 rounded-card border px-4 ${borderColor} ${backgroundColor}`}
    >
      <Ionicons
        name={icon}
        size={18}
        color={tone === "danger" ? "#F87171" : "#FAFAFA"}
      />
      {label ? <Text className={`text-sm font-semibold ${textColor}`}>{label}</Text> : null}
    </Pressable>
  );
}
