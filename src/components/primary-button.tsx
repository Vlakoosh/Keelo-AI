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
      ? "border-secondary bg-secondary"
      : variant === "danger"
        ? "border-red-500 bg-red-500/10"
        : "border-tertiary bg-tertiary";

  const textClass =
    variant === "primary"
      ? "text-text-secondary"
      : variant === "danger"
        ? "text-red-300"
        : "text-secondary uppercase tracking-[1px]";

  return (
    <Pressable
      onPress={onPress}
      className={`${fullWidth ? "w-full" : ""} h-12 items-center justify-center rounded-card ${variant === "primary" ? "border-0" : "border"} ${classes} px-5`}
    >
      <Text className={`text-base font-semibold ${textClass}`}>{label}</Text>
    </Pressable>
  );
}
