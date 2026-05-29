import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from './theme';
import Svg, { Path } from 'react-native-svg';

function HeartIcon({ filled, color }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DuaCard({ dua, onFavorite, compact = false }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  if (!dua) return null;

  if (compact) {
    return (
      <View style={[CARD_STYLE, { padding: 16, marginBottom: 8 }]}>
        <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 18, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 30 }}>
          {dua.arabic}
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 8, fontStyle: 'italic' }}>
          {dua.transliteration}
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textPrimary, marginTop: 6 }}>
          {dua.translation}
        </Text>
        {dua.source ? (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary, marginTop: 6 }}>
            {dua.source}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[CARD_STYLE, { padding: 20, marginBottom: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ backgroundColor: isDark ? 'rgba(201,168,76,0.1)' : 'rgba(166,131,38,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.gold }}>{dua.category}</Text>
        </View>
        {onFavorite && (
          <TouchableOpacity onPress={onFavorite}>
            <HeartIcon filled={dua.is_favorite} color={COLORS.gold} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 22, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 38, marginBottom: 12 }}>
        {dua.arabic}
      </Text>

      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 8 }}>
        {dua.transliteration}
      </Text>

      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 }}>
        {dua.translation}
      </Text>

      {dua.source ? (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 10 }}>
          — {dua.source}
        </Text>
      ) : null}
    </View>
  );
}

export default React.memo(DuaCard);
