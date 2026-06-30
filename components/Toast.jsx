import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Text, View, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from './theme';

const ICONS = {
  error:   { name: 'wifi-off',     color: '#E57373' },
  success: { name: 'check-circle', color: '#81C784' },
  info:    { name: 'info',         color: '#64B5F6' },
};

const Toast = forwardRef(function Toast(_, ref) {
  const { isDark } = useAppTheme();
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const timerRef   = useRef(null);
  const [state, setState] = useState({ message: '', type: 'info' });

  useImperativeHandle(ref, () => ({
    show(message, type = 'info', duration = 3000) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setState({ message, type });
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1,  duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0,  duration: 220, useNativeDriver: true }),
      ]).start();
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity,    { toValue: 0,  duration: 280, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 16, duration: 280, useNativeDriver: true }),
        ]).start();
      }, duration);
    },
  }));

  const icon = ICONS[state.type] ?? ICONS.info;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 110 : 90,
        left: 20,
        right: 20,
        zIndex: 9999,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: isDark ? '#1C1C2E' : '#2C2C3E',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
      }}>
        <Feather name={icon.name} size={16} color={icon.color} />
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 13,
          color: '#F0EDE5',
          flex: 1,
          lineHeight: 18,
        }}>
          {state.message}
        </Text>
      </View>
    </Animated.View>
  );
});

export default Toast;
