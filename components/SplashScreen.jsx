import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, Pattern, Rect, G } from 'react-native-svg';
import { COLORS } from './theme';

const { width, height } = Dimensions.get('window');

// Islamic 8-pointed star for background tile pattern
function StarPattern() {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', opacity: 0.03 }}>
      <Defs>
        <Pattern id="stars" patternUnits="userSpaceOnUse" width={60} height={60}>
          <G fill={COLORS.gold}>
            {/* 8-pointed star */}
            <Path d="M30 10 L33 24 L47 21 L36 30 L47 39 L33 36 L30 50 L27 36 L13 39 L24 30 L13 21 L27 24 Z" />
          </G>
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#stars)" />
    </Svg>
  );
}

// Animated crescent moon SVG
function CrescentMoon({ opacity }) {
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={animStyle}>
      <Svg width={80} height={80} viewBox="0 0 80 80">
        <Path
          d="M55 15 C35 15, 20 28, 20 45 C20 62, 35 75, 55 75 C42 70, 34 59, 34 45 C34 31, 42 20, 55 15Z"
          fill={COLORS.gold}
          opacity={0.95}
        />
        <Circle cx={58} cy={28} r={5} fill={COLORS.bg} />
      </Svg>
    </Animated.View>
  );
}

function SplashScreen({ onFinish }) {
  const moonOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // Moon draws in
    moonOpacity.value = withDelay(400, withTiming(1, { duration: 700 }));

    // Title fades in
    titleOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));

    // Tagline fades in
    taglineOpacity.value = withDelay(1800, withTiming(1, { duration: 400 }));

    // Glow pulse
    glowOpacity.value = withDelay(
      2200,
      withSequence(withTiming(0.6, { duration: 150 }), withTiming(0.2, { duration: 150 }))
    );

    // Screen fade out → navigate
    screenOpacity.value = withDelay(
      2500,
      withTiming(0, { duration: 300 }, () => {
        if (onFinish) runOnJS(onFinish)();
      })
    );
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }, screenStyle]}>
      <StarPattern />

      {/* Gold glow behind crescent */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: COLORS.gold,
          },
          glowStyle,
        ]}
      />

      <CrescentMoon opacity={moonOpacity} />

      <Animated.Text
        style={[
          {
            fontFamily: 'CormorantGaramond_600SemiBold',
            fontSize: 32,
            color: COLORS.gold,
            marginTop: 24,
            letterSpacing: 2,
          },
          titleStyle,
        ]}
      >
        Taqwa AI
      </Animated.Text>

      <Animated.Text
        style={[
          {
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            color: COLORS.goldMuted,
            marginTop: 8,
            letterSpacing: 1,
          },
          taglineStyle,
        ]}
      >
        Track your deen and your day.
      </Animated.Text>
    </Animated.View>
  );
}

export default SplashScreen;
