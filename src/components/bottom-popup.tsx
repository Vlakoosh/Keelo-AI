import { Ionicons } from "@expo/vector-icons";
import { Keyboard, Modal, Pressable, Text, View } from "react-native";

import { useAppTheme } from "@/theme/theme-provider";

type BottomPopupProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomPopup({
  visible,
  title,
  subtitle,
  onClose,
  children
}: BottomPopupProps) {
  const { theme } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: theme.overlay }}>
        <Pressable className="flex-1" onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <View className="rounded-t-card px-5 pb-8 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background }}>
          <View className="mb-4 items-center">
            <View className="mb-4 h-1.5 w-14 rounded-full" style={{ backgroundColor: theme.border }} />
            <View className="w-full flex-row items-center justify-between gap-4">
              <View className="flex-1 gap-1">
                <Text className="text-xl font-semibold" style={{ color: theme.text }}>{title}</Text>
                {subtitle ? <Text className="text-sm leading-6" style={{ color: theme.muted }}>{subtitle}</Text> : null}
              </View>
              <Pressable
                onPress={onClose}
                className="h-10 w-10 items-center justify-center"
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
