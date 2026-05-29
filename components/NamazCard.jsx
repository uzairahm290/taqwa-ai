import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useAppTheme, PRAYERS_AR } from './theme';
import Svg, { Circle, Path } from 'react-native-svg';

function CheckIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L19 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StarIcon({ size = 14, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

function NamazCard({ prayer, time, prayed, location, onLog }) {
  const { COLORS, CARD_STYLE } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const isMosque = location === 'mosque';

  function handlePress() {
    if (!prayed) {
      setModalVisible(true);
    } else {
      onLog(false, null);
    }
  }

  function handleLocation(loc) {
    setModalVisible(false);
    onLog(true, loc);
  }

  const checkBg = prayed ? COLORS.gold : 'transparent';
  const checkBorder = prayed ? COLORS.gold : COLORS.border;

  return (
    <>
      <View style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8 }]}>
        <TouchableOpacity
          onPress={handlePress}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 1.5,
            borderColor: checkBorder,
            backgroundColor: checkBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {prayed && <CheckIcon color="#000" />}
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: COLORS.textPrimary }}>
            {PRAYERS_AR[prayer]}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 1 }}>
            {prayer}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 15, color: COLORS.textPrimary }}>
            {time}
          </Text>
          {isMosque && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 }}>
              <StarIcon color={COLORS.gold} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.gold }}>Mosque</Text>
            </View>
          )}
          {prayed && !isMosque && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.success, marginTop: 3 }}>
              Home
            </Text>
          )}
        </View>
      </View>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setModalVisible(false)}
        >
          <View style={[CARD_STYLE, { padding: 24, width: 280 }]}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 20, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 6 }}>
              Where did you pray?
            </Text>
            <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              {PRAYERS_AR[prayer]}
            </Text>
            <TouchableOpacity
              onPress={() => handleLocation('home')}
              style={{ backgroundColor: COLORS.gold, borderRadius: 10, padding: 14, marginBottom: 10, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' }}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleLocation('mosque')}
              style={{ borderWidth: 1, borderColor: COLORS.gold, borderRadius: 10, padding: 14, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: COLORS.gold }}>Mosque</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default React.memo(NamazCard);
