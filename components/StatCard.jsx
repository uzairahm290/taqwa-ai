import React from 'react';
import { View, Text } from 'react-native';
import { useAppTheme } from './theme';

function StatCard({ label, value, sub, color }) {
  const { COLORS, CARD_STYLE } = useAppTheme();
  return (
    <View style={[CARD_STYLE, { flex: 1, padding: 14, margin: 4 }]}>
      <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 26, color: color || COLORS.gold }}>
        {value}
      </Text>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
        {label}
      </Text>
      {sub ? (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary, marginTop: 2 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export default React.memo(StatCard);
