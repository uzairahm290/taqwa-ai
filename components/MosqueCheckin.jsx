import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, Linking, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from './theme';
import { useMosque } from '../hooks/useMosque';
import { supabase } from '../lib/supabaseClient';

function formatDistance(meters) {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function openInMaps(lat, lng, name) {
  const encoded = encodeURIComponent(name);
  Linking.openURL(`https://maps.google.com/?q=${lat},${lng}(${encoded})`).catch(() => {});
}

function MosqueCard({ mosque, onCheckin, checkedIn, isActive }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();

  return (
    <View style={[CARD_STYLE, { padding: 16, marginBottom: 12 }]}>
      {/* Top row: name + map button */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text
            style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 19, color: COLORS.textPrimary }}
            numberOfLines={2}
          >
            {mosque.name}
          </Text>
          {mosque.address ? (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 3 }}>
              {mosque.address}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => openInMaps(mosque.lat, mosque.lng, mosque.name)}
          accessibilityLabel={`Open ${mosque.name} in maps`}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(166,131,38,0.08)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Feather name="map-pin" size={16} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      {/* Meta row: distance + rating */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
        {mosque.distance != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="navigation" size={11} color={COLORS.gold} />
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: COLORS.gold }}>
              {formatDistance(mosque.distance)}
            </Text>
          </View>
        ) : null}
        {mosque.rating ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Feather name="star" size={11} color={COLORS.gold} />
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: COLORS.textSecondary }}>
              {mosque.rating}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Check-in button */}
      <TouchableOpacity
        onPress={() => onCheckin(mosque)}
        disabled={checkedIn || isActive}
        accessibilityLabel={checkedIn ? `Checked in at ${mosque.name}` : `Check in at ${mosque.name}`}
        accessibilityRole="button"
        style={{
          marginTop: 14,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 12, paddingVertical: 12,
          backgroundColor: checkedIn
            ? (isDark ? 'rgba(61,168,118,0.15)' : 'rgba(39,122,80,0.1)')
            : COLORS.gold,
          opacity: isActive ? 0.7 : 1,
        }}
      >
        {isActive ? (
          <ActivityIndicator size="small" color={isDark ? COLORS.gold : '#1A1814'} />
        ) : (
          <>
            <Feather
              name={checkedIn ? 'check-circle' : 'check'}
              size={15}
              color={checkedIn ? COLORS.success : '#1A1814'}
            />
            <Text style={{
              fontFamily: 'Inter_600SemiBold', fontSize: 13,
              color: checkedIn ? COLORS.success : '#1A1814',
            }}>
              {checkedIn ? 'Checked In' : 'Check In Here'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function MosqueCheckin({ location }) {
  const { COLORS } = useAppTheme();
  const { nearbyMosques, loading, loadNearbyMosques, checkinMosque } = useMosque();
  const [userId, setUserId] = useState(null);
  const [checkedInIds, setCheckedInIds] = useState(new Set());
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id));
  }, []);

  const load = useCallback(async () => {
    if (!location?.lat || !location?.lng) return;
    setError(null);
    try {
      await loadNearbyMosques(location.lat, location.lng);
    } catch {
      setError('Could not load mosques. Check your connection and try again.');
    }
  }, [location?.lat, location?.lng, loadNearbyMosques]);

  useEffect(() => { load(); }, [load]);

  async function handleCheckin(mosque) {
    if (!userId || checkedInIds.has(mosque.id) || activeId) return;

    const h = new Date().getHours();
    let prayer = 'Dhuhr';
    if (h < 7) prayer = 'Fajr';
    else if (h < 13) prayer = 'Dhuhr';
    else if (h < 16) prayer = 'Asr';
    else if (h < 19) prayer = 'Maghrib';
    else prayer = 'Isha';

    setActiveId(mosque.id);
    try {
      await checkinMosque({ prayerName: prayer, mosque, userId });
      setCheckedInIds((prev) => new Set([...prev, mosque.id]));
    } catch {
      Alert.alert('Error', 'Could not save check-in. Please try again.');
    } finally {
      setActiveId(null);
    }
  }

  if (!location) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Feather name="map-pin" size={38} color={COLORS.textTertiary} />
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 16 }}>
          Enable location access to find nearby mosques
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <ActivityIndicator color={COLORS.gold} />
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, marginTop: 12 }}>
          Finding nearby mosques...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Feather name="wifi-off" size={38} color={COLORS.textTertiary} />
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 16 }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={load}
          style={{ marginTop: 20, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gold, paddingHorizontal: 24, paddingVertical: 10 }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.gold }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!nearbyMosques.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Feather name="search" size={38} color={COLORS.textTertiary} />
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 16 }}>
          No mosques found within 2 km
        </Text>
        <TouchableOpacity
          onPress={load}
          style={{ marginTop: 20, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 24, paddingVertical: 10 }}
        >
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary }}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1 }}>
          {nearbyMosques.length} MOSQUE{nearbyMosques.length !== 1 ? 'S' : ''} NEARBY
        </Text>
        <TouchableOpacity onPress={load} accessibilityLabel="Refresh mosque list" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="refresh-cw" size={14} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>

      {nearbyMosques.map((mosque) => (
        <MosqueCard
          key={mosque.id}
          mosque={mosque}
          onCheckin={handleCheckin}
          checkedIn={checkedInIds.has(mosque.id)}
          isActive={activeId === mosque.id}
        />
      ))}

      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary, textAlign: 'center', marginTop: 8 }}>
        Mosque data © OpenStreetMap contributors
      </Text>
    </ScrollView>
  );
}
