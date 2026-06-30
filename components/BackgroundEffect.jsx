import React from 'react';
import Svg, { Path, Defs, RadialGradient, Stop, Ellipse, G } from 'react-native-svg';
import { useAppTheme } from './theme';

export default function BackgroundEffect() {
  const { isDark, COLORS } = useAppTheme();

  const goldRGB = isDark ? '201,168,76' : '166,131,38';
  const dotOpacity = isDark ? 0.055 : 0.038;
  const glowOpacity = isDark ? 0.13 : 0.08;

  const starNodes = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 6; col++) {
      starNodes.push(
        <Path
          key={`${row}-${col}`}
          d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z"
          fill={`rgba(${goldRGB},${dotOpacity})`}
          transform={`translate(${38 + col * 56} ${30 + row * 104}) scale(${row % 2 === 0 ? 1 : 0.75})`}
        />
      );
    }
  }

  return (
    <Svg
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      viewBox="0 0 360 920"
    >
      <Defs>
        <RadialGradient id="bgGlow1" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0%" stopColor={COLORS.gold} stopOpacity={glowOpacity} />
          <Stop offset="100%" stopColor={COLORS.gold} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bgGlow2" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0%" stopColor={COLORS.gold} stopOpacity={glowOpacity * 0.6} />
          <Stop offset="100%" stopColor={COLORS.gold} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Top-left soft glow */}
      <Ellipse cx={55} cy={85} rx={190} ry={205} fill="url(#bgGlow1)" />
      {/* Bottom-right soft glow */}
      <Ellipse cx={315} cy={740} rx={170} ry={190} fill="url(#bgGlow2)" />

      {/* Geometric star grid */}
      <G>{starNodes}</G>
    </Svg>
  );
}
