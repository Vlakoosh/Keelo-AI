import { Pressable, Text } from "react-native";

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  fullWidth?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  fullWidth = true
}: PrimaryButtonProps) {
  const classes =
    variant === "primary"
      ? "border-accent bg-accent"
      : variant === "danger"
        ? "border-white bg-red-500/10"
        : "border-white bg-surface";

  const textClass =
    variant === "primary"
      ? "text-background"
      : variant === "danger"
        ? "text-red-300"
        : "text-text";

  return (
    <Pressable
      onPress={onPress}
      className={`${fullWidth ? "w-full" : ""} h-12 items-center justify-center rounded-card border ${classes} px-5`}
    >
      <Text className={`text-sm font-semibold ${textClass}`}>{label}</Text>
    </Pressable>
  );
}
