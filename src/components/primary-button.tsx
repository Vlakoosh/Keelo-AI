import { Pressable, Text } from "react-native";

import { useAppTheme } from "@/theme/theme-provider";

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
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
          backgroundColor: theme.primaryAccent,
          borderWidth: 0
        }
      : variant === "danger"
        ? {
            backgroundColor: theme.destructiveSoft,
            borderWidth: 0
          }
        : variant === "ghost"
          ? {
              backgroundColor: theme.transparent,
              borderWidth: 0
            }
          : {
              backgroundColor: theme.cardMuted,
              borderWidth: 0
            };

  const textStyle =
    variant === "primary"
      ? {
          color: theme.textOnAccent
        }
      : variant === "danger"
        ? {
            color: theme.destructive
          }
        : variant === "ghost"
          ? {
              color: theme.primaryAccent
            }
        : {
            color: theme.text
          };

  return (
    <Pressable
      onPress={onPress}
      className={`${fullWidth ? "w-full" : ""} min-h-[52px] items-center justify-center rounded-card px-5`}
      style={style}
    >
      <Text className="text-base font-semibold" style={textStyle}>{label}</Text>
    </Pressable>
  );
}
