import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, {
  Circle, Path, G, Line, Text as SvgText, Defs, RadialGradient, Stop,
} from 'react-native-svg';
import { useAppTheme } from './theme';
import { useQibla } from '../hooks/useQibla';

const SIZE = 300;
const C = SIZE / 2;      // center
const OUTER_R = 138;     // outer ring radius
const INNER_R = 118;     // inner ring radius
const TICK_R = 126;      // where ticks start (outer edge)
const LABEL_R = 107;     // where cardinal labels sit

// Pre-compute tick marks at every 5°, majors at 45° and 90°
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const deg = i * 5;
  const rad = (deg * Math.PI) / 180;
  const isCardinal = deg % 90 === 0;
  const isMajor = deg % 45 === 0;
  const len = isCardinal ? 14 : isMajor ? 10 : 5;
  const r1 = TICK_R;
  const r2 = TICK_R - len;
  return {
    x1: C + r1 * Math.sin(rad),
    y1: C - r1 * Math.cos(rad),
    x2: C + r2 * Math.sin(rad),
    y2: C - r2 * Math.cos(rad),
    isCardinal,
    isMajor,
  };
});

const CARDINALS = [
  { label: 'N', deg: 0, ar: 'شمال' },
  { label: 'E', deg: 90, ar: 'شرق' },
  { label: 'S', deg: 180, ar: 'جنوب' },
  { label: 'W', deg: 270, ar: 'غرب' },
];

// Simple Kaaba silhouette path (centered at 0,0 — scaled and translated when used)
function KaabaIcon({ x, y, size = 20, color }) {
  const s = size / 24;
  return (
    <G transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${s})`}>
      {/* Main cube */}
      <Path d="M3 8 L12 3 L21 8 L21 20 L3 20 Z" fill={color} opacity={0.95} />
      {/* Door */}
      <Path d="M9 20 L9 13 Q12 11 15 13 L15 20 Z" fill="#000" opacity={0.6} />
      {/* Kiswa band */}
      <Path d="M3 11 L21 11 L21 13 L3 13 Z" fill="#000" opacity={0.3} />
    </G>
  );
}

function CompassFace({ isDark, COLORS }) {
  const gold = COLORS.gold;
  const goldDim = 'rgba(201,168,76,0.2)';
  const goldFaint = 'rgba(201,168,76,0.07)';
  const textColor = isDark ? 'rgba(240,237,230,0.7)' : 'rgba(26,24,20,0.7)';

  return (
    <Svg width={SIZE} height={SIZE}>
      <Defs>
        <RadialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={isDark ? '#1a1a28' : '#f5f1e8'} stopOpacity="1" />
          <Stop offset="100%" stopColor={isDark ? '#0A0A0F' : '#ece7d8'} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="innerGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={isDark ? '#141420' : '#faf8f2'} stopOpacity="1" />
          <Stop offset="100%" stopColor={isDark ? '#0e0e18' : '#f0ece0'} stopOpacity="1" />
        </RadialGradient>
      </Defs>

      {/* Background circle */}
      <Circle cx={C} cy={C} r={OUTER_R + 2} fill="url(#bgGrad)" />

      {/* Decorative outer ring */}
      <Circle cx={C} cy={C} r={OUTER_R} stroke={gold} strokeWidth={1.5} fill="none" opacity={0.6} />
      <Circle cx={C} cy={C} r={OUTER_R - 3} stroke={goldDim} strokeWidth={0.5} fill="none" />

      {/* Tick marks */}
      {TICKS.map((t, i) => (
        <Line
          key={i}
          x1={t.x1} y1={t.y1}
          x2={t.x2} y2={t.y2}
          stroke={t.isCardinal ? gold : t.isMajor ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.25)'}
          strokeWidth={t.isCardinal ? 2 : t.isMajor ? 1.5 : 1}
        />
      ))}

      {/* Inner ring */}
      <Circle cx={C} cy={C} r={INNER_R} stroke={goldDim} strokeWidth={1} fill="url(#innerGrad)" />
      <Circle cx={C} cy={C} r={INNER_R - 8} stroke={goldFaint} strokeWidth={0.5} fill="none" />

      {/* Cardinal labels */}
      {CARDINALS.map(({ label, deg }) => {
        const rad = (deg * Math.PI) / 180;
        const x = C + LABEL_R * Math.sin(rad);
        const y = C - LABEL_R * Math.cos(rad);
        return (
          <G key={label}>
            <SvgText
              x={x} y={y + 5}
              textAnchor="middle"
              fill={label === 'N' ? gold : textColor}
              fontSize={label === 'N' ? 15 : 12}
              fontFamily="Inter_600SemiBold"
              fontWeight="bold"
            >
              {label}
            </SvgText>
          </G>
        );
      })}

      {/* Intercardinal marks (NE NW SE SW) */}
      {[45, 135, 225, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x = C + LABEL_R * Math.sin(rad);
        const y = C - LABEL_R * Math.cos(rad);
        return (
          <Circle key={deg} cx={x} cy={y} r={2} fill={goldDim} />
        );
      })}

      {/* Center decoration */}
      <Circle cx={C} cy={C} r={16} fill={isDark ? '#1a1a28' : '#f0ece0'} stroke={gold} strokeWidth={1.5} />
      <Circle cx={C} cy={C} r={6} fill={gold} opacity={0.8} />
      <Circle cx={C} cy={C} r={3} fill={isDark ? '#0A0A0F' : '#fff'} />
    </Svg>
  );
}

function NeedleSvg({ gold }) {
  return (
    <Svg width={SIZE} height={SIZE} pointerEvents="none">
      {/* Gold tip pointing toward Qibla */}
      <Path
        d={`M ${C} ${C - INNER_R + 18} L ${C - 9} ${C - 10} L ${C} ${C + 5} L ${C + 9} ${C - 10} Z`}
        fill={gold}
        opacity={0.95}
      />
      {/* Subtle glow edge */}
      <Path
        d={`M ${C} ${C - INNER_R + 18} L ${C - 9} ${C - 10} L ${C} ${C + 5} L ${C + 9} ${C - 10} Z`}
        fill="none"
        stroke={gold}
        strokeWidth={1}
        opacity={0.4}
      />
      {/* Dim tail */}
      <Path
        d={`M ${C} ${C + 5} L ${C - 6} ${C + INNER_R - 22} L ${C} ${C + INNER_R - 14} L ${C + 6} ${C + INNER_R - 22} Z`}
        fill="rgba(201,168,76,0.25)"
      />
      {/* Kaaba icon at the gold tip */}
      <KaabaIcon x={C} y={C - INNER_R + 38} size={22} color="rgba(240,237,230,0.9)" />
    </Svg>
  );
}

function QiblaCompass({ location }) {
  const { COLORS, isDark } = useAppTheme();
  const { qiblaAngle, compassHeading, needleAngle, distance, error } = useQibla(location);

  const rotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rotAnim, {
      toValue: needleAngle,
      useNativeDriver: true,
      friction: 7,
      tension: 35,
    }).start();
  }, [needleAngle]);

  const spin = rotAnim.interpolate({
    inputRange: [-7200, 7200],
    outputRange: ['-7200deg', '7200deg'],
  });

  const gold = COLORS.gold;

  if (!location) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 28, color: gold, marginBottom: 12 }}>
          القبلة
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 22 }}>
          Enable location access to find the Qibla direction from your current position.
        </Text>
      </View>
    );
  }

  if (error && qiblaAngle === null) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textTertiary, textAlign: 'center' }}>
          Unable to determine Qibla direction.{'\n'}Please check your internet connection.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 }}>
      {/* Title */}
      <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 32, color: gold, letterSpacing: 1, marginBottom: 4 }}>
        القبلة
      </Text>
      <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 18, color: COLORS.textPrimary, marginBottom: 28 }}>
        Direction to the Kaaba
      </Text>

      {/* Compass container */}
      <View style={{ width: SIZE, height: SIZE }}>
        {/* Static compass face */}
        <CompassFace isDark={isDark} COLORS={COLORS} />

        {/* Animated needle — rotates around the center */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: SIZE, height: SIZE,
            transform: [{ rotate: spin }],
          }}
        >
          <NeedleSvg gold={gold} />
        </Animated.View>
      </View>

      {/* Degree + Distance info */}
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 28 }}>
        <View style={{
          alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14,
          borderRadius: 14, borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
          backgroundColor: isDark ? 'rgba(20,20,32,0.9)' : 'rgba(250,248,242,0.9)',
        }}>
          <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 28, color: gold }}>
            {qiblaAngle !== null ? `${Math.round(qiblaAngle)}°` : '--°'}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>
            from North
          </Text>
        </View>

        {distance ? (
          <View style={{
            alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14,
            borderRadius: 14, borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
            backgroundColor: isDark ? 'rgba(20,20,32,0.9)' : 'rgba(250,248,242,0.9)',
          }}>
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 28, color: COLORS.textPrimary }}>
              {distance < 1000 ? `${distance}` : `${(distance / 1000).toFixed(1)}k`}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>
              km to Mecca
            </Text>
          </View>
        ) : null}
      </View>

      {/* Compass note */}
      {error ? (
        <View style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)' }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, textAlign: 'center' }}>
            Compass sensor unavailable · Face {qiblaAngle !== null ? `${Math.round(qiblaAngle)}° from North` : 'the Qibla direction'}
          </Text>
        </View>
      ) : (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 16, textAlign: 'center', opacity: 0.7 }}>
          Hold your phone flat · Gold needle points to Mecca
        </Text>
      )}
    </View>
  );
}

export default React.memo(QiblaCompass);
