import { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Animated, Pressable, TouchableOpacity } from 'react-native';
import { useAppTheme } from './theme';

/**
 * Themed confirmation/alert dialog.
 *
 * buttons: Array<{ label, onPress, style?: 'default' | 'cancel' | 'destructive' }>
 * - 2 buttons → side-by-side
 * - 1 or 3+ buttons → stacked
 */
export default function AppDialog({ visible, onClose, title, message, buttons = [] }) {
  const { COLORS, isDark } = useAppTheme();
  const [mounted, setMounted] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      scaleAnim.setValue(0.92);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.92, duration: 150, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible, mounted]);

  if (!mounted) return null;

  const bg = isDark ? '#13131F' : '#FAFAF5';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  function labelColor(style) {
    if (style === 'destructive') return COLORS.danger || '#C0392B';
    if (style === 'cancel') return COLORS.textSecondary;
    return COLORS.gold;
  }
  function labelFont(style) {
    return style === 'cancel' ? 'Inter_400Regular' : 'Inter_600SemiBold';
  }

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 32, opacity: fadeAnim }}>
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={onClose} />
        <Animated.View style={{ width: '100%', maxWidth: 340, backgroundColor: bg, borderRadius: 22, overflow: 'hidden', transform: [{ scale: scaleAnim }] }}>

          {/* Body */}
          <View style={{ padding: 26, paddingBottom: 22 }}>
            {title && (
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, textAlign: 'center', marginBottom: message ? 10 : 0 }}>
                {title}
              </Text>
            )}
            {message && (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 }}>
                {message}
              </Text>
            )}
          </View>

          {/* Buttons */}
          <View style={{ borderTopWidth: 0.5, borderTopColor: divider }}>
            {buttons.length === 2 ? (
              <View style={{ flexDirection: 'row' }}>
                {buttons.map((btn, i) => (
                  <TouchableOpacity
                    key={i} onPress={btn.onPress} activeOpacity={0.65}
                    style={{ flex: 1, paddingVertical: 16, alignItems: 'center', borderRightWidth: i === 0 ? 0.5 : 0, borderRightColor: divider }}
                  >
                    <Text style={{ fontFamily: labelFont(btn.style), fontSize: 15, color: labelColor(btn.style) }}>
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i} onPress={btn.onPress} activeOpacity={0.65}
                  style={{ paddingVertical: 15, alignItems: 'center', borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: divider }}
                >
                  <Text style={{ fontFamily: labelFont(btn.style), fontSize: 15, color: labelColor(btn.style) }}>
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
