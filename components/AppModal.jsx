import { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Animated, Pressable, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from './theme';

export default function AppModal({ visible, onClose, title, children, scrollable = true, maxHeight = '85%' }) {
  const { COLORS, isDark } = useAppTheme();
  const [mounted, setMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Mount when opening
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  // Animate in/out after mount state settles
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 75, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 500, duration: 210, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible, mounted]);

  if (!mounted) return null;

  const bg = isDark ? '#0F0F1A' : '#FAF8F3';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const content = (
    <View style={{ backgroundColor: bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight }}>
      {/* Drag handle */}
      <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6 }}>
        <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)' }} />
      </View>

      {/* Header */}
      {title && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: divider }}>
          <Text style={{ flex: 1, fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary }}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={19} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {scrollable ? (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : children}
    </View>
  );

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)', opacity: fadeAnim }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <Pressable onPress={() => {}}>
            {content}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
