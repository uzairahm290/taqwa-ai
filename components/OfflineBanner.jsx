import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { COLORS } from './theme';

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [translateY] = useState(() => new Animated.Value(-50));

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      Animated.timing(translateY, {
        toValue: offline ? 0 : -50,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    return () => unsub();
  }, [translateY]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        backgroundColor: COLORS.danger,
        paddingTop: 44,
        paddingBottom: 10,
        alignItems: 'center',
        transform: [{ translateY }],
      }}
    >
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#fff' }}>
        No internet connection — showing cached data
      </Text>
    </Animated.View>
  );
}

export default OfflineBanner;
