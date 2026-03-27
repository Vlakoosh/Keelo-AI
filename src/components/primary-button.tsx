import { Pressable, Text } from "react-native";

import { useAppTheme } from "@/theme/theme-provider";

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
  const { theme } = useAppTheme();

  const style =
    variant === "primary"
      ? {
          backgroundColor: theme.secondary,
          borderWidth: 0
        }
      : variant === "danger"
        ? {
            backgroundColor: "rgba(239,68,68,0.1)",
            borderWidth: 1,
            borderColor: "#EF4444"
          }
        : {
            backgroundColor: theme.tertiary,
            borderWidth: 1,
            borderColor: theme.tertiary
          };

  const textStyle =
    variant === "primary"
      ? {
          color: theme.mode === "light" ? theme.text : theme.textSecondary
        }
      : variant === "danger"
        ? {
            color: "#FCA5A5"
          }
        : {
            color: theme.secondary,
            textTransform: "uppercase" as const,
            letterSpacing: 1
          };

  return (
    <Pressable
      onPress={onPress}
      className={`${fullWidth ? "w-full" : ""} h-12 items-center justify-center rounded-card px-5`}
      style={style}
    >
      <Text className="text-base font-semibold" style={textStyle}>{label}</Text>
    </Pressable>
  );
}
