import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/theme/theme-provider";
import type { ThemePalette } from "@/theme/theme-provider";

type ScreenProps = {
  children: React.ReactNode;
  safe?: boolean;
  className?: string;
};

export function Screen({ children, safe = false, className = "" }: ScreenProps) {
  const { theme } = useAppTheme();
  const Component = safe ? SafeAreaView : View;

  return (
    <Component
      className={`flex-1 ${className}`}
      style={{ backgroundColor: theme.canvas }}
    >
      {children}
    </Component>
  );
}

export type TileVariant = "default" | "muted" | "accent" | "success" | "warning";

type TileProps = {
  children: React.ReactNode;
  variant?: TileVariant;
  className?: string;
  pressed?: boolean;
};

export function Tile({
  children,
  variant = "default",
  className = "",
  pressed = false,
}: TileProps) {
  const { theme } = useAppTheme();

  return (
    <View
      className={`rounded-card ${className}`}
      style={{
        backgroundColor: tileColor(theme, variant),
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: pressed ? 2 : 8 },
        shadowOpacity: theme.mode === "light" ? (pressed ? 0.08 : 0.14) : 0,
        shadowRadius: pressed ? 7 : 20,
        elevation: theme.mode === "light" ? (pressed ? 2 : 4) : 0,
      }}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View className={`flex-row items-center justify-between gap-3 ${className}`}>
      <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      className="flex-row rounded-card p-1"
      style={{ backgroundColor: theme.cardMuted }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-1 items-center justify-center rounded-card px-4 py-3"
            style={{ backgroundColor: active ? theme.card : theme.transparent }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: active ? theme.text : theme.textMuted }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatTile({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  variant?: TileVariant;
}) {
  const { theme } = useAppTheme();

  return (
    <Tile variant={variant} className="flex-1 p-4">
      <View className="min-h-[74px] justify-between">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-xs font-semibold uppercase" style={{ color: theme.textMuted }}>
            {label}
          </Text>
          {icon ? <Ionicons name={icon} size={16} color={theme.iconMuted} /> : null}
        </View>
        <Text className="mt-3 text-xl font-semibold" style={{ color: theme.text }}>
          {value}
        </Text>
      </View>
    </Tile>
  );
}

export function EmptyState({
  title,
  description,
  icon = "leaf-outline",
}: {
  title: string;
  description?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
}) {
  const { theme } = useAppTheme();

  return (
    <Tile variant="muted" className="items-center p-5">
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: theme.primaryAccentSoft }}
      >
        <Ionicons name={icon} size={22} color={theme.primaryAccent} />
      </View>
      <Text className="mt-3 text-center text-base font-semibold" style={{ color: theme.text }}>
        {title}
      </Text>
      {description ? (
        <Text className="mt-1 text-center text-sm leading-6" style={{ color: theme.textMuted }}>
          {description}
        </Text>
      ) : null}
    </Tile>
  );
}

export function Chip({
  label,
  active = false,
  tone = "default",
}: {
  label: string;
  active?: boolean;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const { theme } = useAppTheme();
  const colors = chipColors(theme, tone, active);

  return (
    <View
      className="rounded-full px-3 py-2"
      style={{ backgroundColor: colors.background }}
    >
      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
        {label}
      </Text>
    </View>
  );
}

function tileColor(theme: ThemePalette, variant: TileVariant) {
  switch (variant) {
    case "muted":
      return theme.cardMuted;
    case "accent":
      return theme.cardAccent;
    case "success":
      return theme.cardSuccess;
    case "warning":
      return theme.cardWarning;
    default:
      return theme.card;
  }
}

function chipColors(
  theme: ThemePalette,
  tone: "default" | "success" | "warning" | "danger" | "info",
  active: boolean,
) {
  if (active) {
    return { background: theme.primaryAccent, text: theme.textOnAccent };
  }

  switch (tone) {
    case "success":
      return { background: theme.successSoft, text: theme.success };
    case "warning":
      return { background: theme.warningSoft, text: theme.warning };
    case "danger":
      return { background: theme.dangerSoft, text: theme.danger };
    case "info":
      return { background: theme.infoSoft, text: theme.info };
    default:
      return { background: theme.cardMuted, text: theme.textSecondary };
  }
}
