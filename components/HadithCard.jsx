import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useAppTheme } from './theme';

export default function HadithCard({ hadith }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const viewShotRef = useRef(null);

  const captureAndShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing is not available on this device');
        return;
      }

      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Share Hadith',
          mimeType: 'image/jpeg',
          UTI: 'public.jpeg',
        });
      }
    } catch (error) {
      console.log('Error sharing hadith:', error);
      Alert.alert('Oops', 'Could not share the Hadith at this time.');
    }
  };

  if (!hadith) return null;

  return (
    <View style={[CARD_STYLE, { overflow: 'hidden' }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.gold, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          HADITH OF THE DAY
        </Text>
        <TouchableOpacity onPress={captureAndShare} style={{ padding: 4 }} accessibilityLabel="Share Hadith">
          <Feather name="share" size={18} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      {/* The section we actually want to capture as an image. We wrap it in ViewShot. */}
      {/* We apply a background color directly to ViewShot so the image isn't transparent. */}
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={{ backgroundColor: isDark ? '#14141E' : '#FAF8F5' }}>
        <View style={{ padding: 20, paddingTop: 12 }}>
          {/* Top Decorative Border inside the shared image */}
          <View style={{ height: 2, width: 40, backgroundColor: COLORS.gold, marginBottom: 16 }} />

          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 26, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 46, marginBottom: 16 }}>
            {hadith.arabic}
          </Text>

          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 18, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 26, fontStyle: 'italic', marginBottom: 16 }}>
            &quot;{hadith.translation}&quot;
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ height: 1, flex: 1, backgroundColor: COLORS.border }} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: COLORS.textTertiary, paddingHorizontal: 12 }}>
              {hadith.source}
            </Text>
            <View style={{ height: 1, flex: 1, backgroundColor: COLORS.border }} />
          </View>

          {/* App watermark for shared images */}
          <View style={{ alignItems: 'center', marginTop: 16 }}>
             <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary, opacity: 0.6 }}>
               Sent from Mizan
             </Text>
          </View>
        </View>
      </ViewShot>
    </View>
  );
}
