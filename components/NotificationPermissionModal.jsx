import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from './theme';

export default function NotificationPermissionModal({ visible, onAllow, onSkip }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onSkip}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        onPress={onSkip}
      >
        <Pressable onPress={() => {}} style={[CARD_STYLE, { width: '100%', padding: 28, borderRadius: 20 }]}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: isDark ? 'rgba(201,168,76,0.12)' : 'rgba(166,131,38,0.1)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Ionicons name="notifications-outline" size={30} color={COLORS.gold} />
            </View>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 24, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 30 }}>
              Never Miss a Prayer
            </Text>
          </View>

          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 8 }}>
            Taqwa AI will notify you at each prayer time so you never miss Salah.
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, lineHeight: 20, textAlign: 'center', marginBottom: 28 }}>
            You can choose which of the 5 prayers notify you in Settings. No marketing — only your prayer reminders.
          </Text>

          <TouchableOpacity
            onPress={onAllow}
            accessibilityLabel="Allow prayer time notifications"
            accessibilityRole="button"
            style={{ backgroundColor: COLORS.gold, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' }}>
              Enable Prayer Reminders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSkip}
            accessibilityLabel="Skip notifications for now"
            accessibilityRole="button"
            style={{ padding: 10, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textTertiary }}>
              Not now
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
