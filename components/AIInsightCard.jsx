import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS, CARD_STYLE } from './theme';
import Svg, { Path } from 'react-native-svg';

function SparkleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={COLORS.gold} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function AIInsightCard({ insight, onDismiss }) {
  if (!insight) return null;
  return (
    <View style={[CARD_STYLE, { padding: 16, marginBottom: 16, borderColor: 'rgba(201,168,76,0.4)' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <SparkleIcon />
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.gold, letterSpacing: 1, textTransform: 'uppercase' }}>
          Mizan
        </Text>
      </View>
      <Text style={{ fontFamily: 'CormorantGaramond_400Regular', fontSize: 17, color: COLORS.textPrimary, lineHeight: 24 }}>
        {insight.message}
      </Text>
      <TouchableOpacity onPress={onDismiss} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary }}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(AIInsightCard);
