import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { SEED_DUAS } from '../lib/seedDuas';
import AppDialog from './AppDialog';

const SEED_DUAS_WITH_IDS = SEED_DUAS.map((d, i) => ({
  ...d,
  id: `seed_${i}`,
  is_custom: false,
  is_favorite: false,
}));

const FILTER_CHIPS = ['All', 'Favorites', 'Morning', 'Evening', 'After Salah', 'Food'];
const CATEGORY_ORDER = ['Morning', 'After Salah', 'Evening', 'Food', 'Travel', 'Sleep', 'General'];
const SECTION_LABELS = {
  Morning: 'MORNING DUAS',
  Evening: 'EVENING DUAS',
  'After Salah': 'AFTER SALAH',
  Food: 'FOOD DUAS',
  Travel: 'TRAVEL DUAS',
  Sleep: 'SLEEP DUAS',
  General: 'GENERAL DUAS',
};
const CATEGORY_COLORS = {
  Morning:      { bg: 'rgba(95, 155, 130, 0.18)', text: '#72A896', border: 'rgba(95, 155, 130, 0.3)' },
  Evening:      { bg: 'rgba(80, 120, 160, 0.18)', text: '#7098B8', border: 'rgba(80, 120, 160, 0.3)' },
  'After Salah':{ bg: 'rgba(110, 90, 170, 0.18)', text: '#9280CC', border: 'rgba(110, 90, 170, 0.3)' },
  Food:         { bg: 'rgba(160, 130, 80, 0.18)',  text: '#C09870', border: 'rgba(160, 130, 80, 0.3)' },
  Travel:       { bg: 'rgba(80, 130, 160, 0.18)',  text: '#70A0B8', border: 'rgba(80, 130, 160, 0.3)' },
  Sleep:        { bg: 'rgba(100, 80, 160, 0.18)',  text: '#8870C0', border: 'rgba(100, 80, 160, 0.3)' },
  General:      { bg: 'rgba(140, 140, 140, 0.15)', text: '#9A9A9A', border: 'rgba(140, 140, 140, 0.25)' },
  Custom:       { bg: 'rgba(180, 180, 180, 0.12)', text: '#AAAAAA', border: 'rgba(180, 180, 180, 0.2)' },
};

function DuaHeartIcon({ filled, colors }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={filled ? colors.gold : 'none'}>
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CategoryBadge({ category, isCustom }) {
  const key = isCustom ? 'Custom' : category;
  const colors = CATEGORY_COLORS[key] || CATEGORY_COLORS.General;
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 0.5, borderColor: colors.border }}>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: colors.text, letterSpacing: 0.5 }}>
        {isCustom ? 'CUSTOM' : category.toUpperCase()}
      </Text>
    </View>
  );
}

function DailyBadge({ isDark }) {
  return (
    <View style={{
      backgroundColor: isDark ? 'rgba(50, 140, 90, 0.2)' : 'rgba(39, 122, 80, 0.1)',
      borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 0.5,
      borderColor: isDark ? 'rgba(50, 140, 90, 0.4)' : 'rgba(39, 122, 80, 0.3)',
    }}>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: isDark ? '#4CAF7A' : '#2A7A53' }}>✓ Daily</Text>
    </View>
  );
}

function DuaListCard({ dua, onFavorite, theme }) {
  const { COLORS, CARD_STYLE, isDark } = theme;
  return (
    <View style={[CARD_STYLE, { marginHorizontal: 16, marginBottom: 12, padding: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <CategoryBadge category={dua.category} isCustom={dua.is_custom} />
        <TouchableOpacity onPress={onFavorite} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} accessibilityLabel={dua.is_favorite ? 'Remove from favourites' : 'Add to favourites'} accessibilityRole="button">
          <DuaHeartIcon filled={dua.is_favorite} colors={COLORS} />
        </TouchableOpacity>
      </View>
      <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 24, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 42, marginBottom: 10 }}>
        {dua.arabic}
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 14 }}>
        "{dua.translation}"
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary }}>{dua.source}</Text>
        {dua.is_daily ? <DailyBadge isDark={isDark} /> : null}
      </View>
    </View>
  );
}

function DuaOfTheDayCard({ dua, onFavorite, theme }) {
  const { COLORS, CARD_STYLE } = theme;
  if (!dua) return null;
  return (
    <View style={[CARD_STYLE, { marginHorizontal: 16, marginBottom: 24, padding: 20 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <Text style={{ fontSize: 14 }}>🌙</Text>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.gold, letterSpacing: 1 }}>DUA OF THE DAY</Text>
      </View>
      <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 30, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 52, marginBottom: 12 }}>
        {dua.arabic}
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.gold, fontStyle: 'italic', marginBottom: 8 }}>
        {dua.transliteration}
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 6 }}>
        "{dua.translation}"
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginBottom: 18 }}>{dua.source}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 11, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.textSecondary }}>Read full dua</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onFavorite} style={{ flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 11, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.textSecondary }}>
            {dua.is_favorite ? '♥ Favourited' : '♡ Favourite'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DuasScreen({ onBack, theme }) {
  const { COLORS, CARD_STYLE, isDark } = theme;
  const [duas, setDuas] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [newDua, setNewDua] = useState({ arabic: '', transliteration: '', translation: '', source: '', category: 'General' });
  const [dialog, setDialog] = useState(null);

  useEffect(() => { loadDuas(); }, []);

  async function loadDuas() {
    const [favRaw, customRaw] = await Promise.all([
      AsyncStorage.getItem('@dua_favorites'),
      AsyncStorage.getItem('@dua_custom'),
    ]);
    const favorites = favRaw ? JSON.parse(favRaw) : {};
    const localCustom = customRaw ? JSON.parse(customRaw) : [];
    setDuas([
      ...SEED_DUAS_WITH_IDS.map((d) => ({ ...d, is_favorite: !!favorites[d.id] })),
      ...localCustom,
    ]);
    syncCloudCustomDuas(favorites, localCustom);
  }

  async function syncCloudCustomDuas(favorites, localCustom) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: cloudDuas } = await supabase.from('duas').select('*').eq('user_id', user.id).eq('is_custom', true);
      if (!cloudDuas?.length) return;
      const localIds = new Set(localCustom.map((d) => d.cloud_id));
      const newFromCloud = cloudDuas
        .filter((d) => !localIds.has(d.id))
        .map((d) => ({
          id: `custom_${d.id}`, cloud_id: d.id, arabic: d.arabic, transliteration: d.transliteration,
          translation: d.translation, source: d.source, category: d.category,
          is_custom: true, is_daily: false, is_favorite: !!favorites[`custom_${d.id}`],
        }));
      if (!newFromCloud.length) return;
      const updated = [...localCustom, ...newFromCloud];
      await AsyncStorage.setItem('@dua_custom', JSON.stringify(updated));
      setDuas((prev) => [...prev.filter((d) => !d.is_custom), ...updated]);
    } catch (_) {}
  }

  async function toggleFavorite(dua) {
    const newValue = !dua.is_favorite;
    setDuas((prev) => prev.map((d) => d.id === dua.id ? { ...d, is_favorite: newValue } : d));
    const favRaw = await AsyncStorage.getItem('@dua_favorites');
    const favorites = favRaw ? JSON.parse(favRaw) : {};
    favorites[dua.id] = newValue;
    await AsyncStorage.setItem('@dua_favorites', JSON.stringify(favorites));
    if (dua.cloud_id) {
      try { await supabase.from('duas').update({ is_favorite: newValue }).eq('id', dua.cloud_id); } catch (_) {}
    }
  }

  function sanitizeDuaField(value) {
    return value.replace(/<[^>]*>/g, '').replace(/https?:\/\/\S+/gi, '').slice(0, 1000);
  }

  async function addCustomDua() {
    if (!newDua.arabic || !newDua.translation) {
      setDialog({ title: 'Required Fields', message: 'Arabic text and translation are required.', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
      return;
    }
    const cleanDua = {
      arabic: sanitizeDuaField(newDua.arabic),
      transliteration: sanitizeDuaField(newDua.transliteration),
      translation: sanitizeDuaField(newDua.translation),
      source: sanitizeDuaField(newDua.source),
      category: newDua.category,
    };
    const localId = `custom_${Date.now()}`;
    const newEntry = { ...cleanDua, id: localId, is_custom: true, is_daily: false, is_favorite: false };
    const customRaw = await AsyncStorage.getItem('@dua_custom');
    const existing = customRaw ? JSON.parse(customRaw) : [];
    await AsyncStorage.setItem('@dua_custom', JSON.stringify([...existing, newEntry]));
    setDuas((prev) => [...prev, newEntry]);
    setShowAdd(false);
    setNewDua({ arabic: '', transliteration: '', translation: '', source: '', category: 'General' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('duas').insert({ ...cleanDua, user_id: user.id, is_custom: true, is_daily: false }).select().single();
        if (data) {
          const updatedRaw = await AsyncStorage.getItem('@dua_custom');
          const updatedList = updatedRaw ? JSON.parse(updatedRaw) : [];
          await AsyncStorage.setItem('@dua_custom', JSON.stringify(updatedList.map((d) => d.id === localId ? { ...d, cloud_id: data.id } : d)));
        }
      }
    } catch (_) {}
  }

  const favouritedCount = duas.filter((d) => d.is_favorite).length;
  const customCount = duas.filter((d) => d.is_custom).length;
  const duaOfDay = duas.find((d) => d.arabic?.includes('زِدْنِي عِلْمًا') || d.arabic?.includes('زدني علما')) || duas[0];

  const filtered = duas.filter((d) => {
    const matchSearch = !search || d.arabic?.includes(search) || d.translation?.toLowerCase().includes(search.toLowerCase());
    if (category === 'Favorites') return d.is_favorite && matchSearch;
    return (category === 'All' || d.category === category) && matchSearch;
  });

  const sections = [];
  if (category === 'Favorites') {
    if (filtered.length) sections.push({ title: 'FAVOURITED DUAS', data: filtered });
  } else if (category === 'All') {
    for (const cat of CATEGORY_ORDER) {
      const catDuas = filtered.filter((d) => d.category === cat && !d.is_custom);
      if (catDuas.length) sections.push({ title: SECTION_LABELS[cat] || cat.toUpperCase(), data: catDuas });
    }
    const customDuas = filtered.filter((d) => d.is_custom);
    if (customDuas.length) sections.push({ title: 'MY CUSTOM DUAS', data: customDuas });
  } else {
    const catDuas = filtered.filter((d) => !d.is_custom);
    if (catDuas.length) sections.push({ title: '', data: catDuas });
    const customDuas = filtered.filter((d) => d.is_custom);
    if (customDuas.length) sections.push({ title: 'MY CUSTOM DUAS', data: customDuas });
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
              <Ionicons name="chevron-back" size={24} color={COLORS.gold} />
            </TouchableOpacity>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 34, color: COLORS.textPrimary, lineHeight: 38 }}>Duas</Text>
              <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 18, color: COLORS.gold, marginTop: 2 }}>الأدعية</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 6 }}>
                {duas.length} duas · {favouritedCount} favourited · {customCount} custom
              </Text>
            </View>
            <View style={{ width: 40, height: 40, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Rect x="3" y="3" width="7" height="7" rx="1" stroke={COLORS.textTertiary} strokeWidth={1.5} />
                <Rect x="14" y="3" width="7" height="7" rx="1" stroke={COLORS.textTertiary} strokeWidth={1.5} />
                <Rect x="3" y="14" width="7" height="7" rx="1" stroke={COLORS.textTertiary} strokeWidth={1.5} />
                <Rect x="14" y="14" width="7" height="7" rx="1" stroke={COLORS.textTertiary} strokeWidth={1.5} />
              </Svg>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <View style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, gap: 8 }]}>
            <Ionicons name="search-outline" size={16} color={COLORS.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search duas..."
              placeholderTextColor={COLORS.textTertiary}
              style={{ flex: 1, color: COLORS.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 14 }}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} style={{ marginBottom: 22 }}>
          {FILTER_CHIPS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={{
                paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                borderColor: category === c ? COLORS.gold : (isDark ? '#333' : '#EAE6DF'),
                backgroundColor: category === c ? (isDark ? 'rgba(201,168,76,0.1)' : 'rgba(166,131,38,0.1)') : 'transparent',
              }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: category === c ? COLORS.gold : COLORS.textTertiary }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {category === 'All' && !search && (
          <DuaOfTheDayCard dua={duaOfDay} onFavorite={() => duaOfDay && toggleFavorite(duaOfDay)} theme={theme} />
        )}

        {sections.map((section, si) => (
          <View key={section.title || si}>
            {section.title ? (
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1.2, paddingHorizontal: 20, marginBottom: 12 }}>
                {section.title}
              </Text>
            ) : null}
            {section.data.map((dua) => (
              <DuaListCard key={dua.id || dua.arabic} dua={dua} onFavorite={() => toggleFavorite(dua)} theme={theme} />
            ))}
          </View>
        ))}

        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          accessibilityLabel="Add a custom dua"
          accessibilityRole="button"
          style={{ marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: COLORS.gold, borderRadius: 12, padding: 14, alignItems: 'center', borderStyle: 'dashed' }}
        >
          <Text style={{ fontFamily: 'Inter_500Medium', color: COLORS.gold }}>+ Add Custom Dua</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }} onPress={() => setShowAdd(false)}>
          <ScrollView style={[CARD_STYLE, { maxHeight: '80%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]} contentContainerStyle={{ padding: 24 }}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 20 }}>Custom Dua</Text>
            {[
              { key: 'arabic', label: 'ARABIC', ph: 'Arabic text', multiline: true },
              { key: 'transliteration', label: 'TRANSLITERATION', ph: 'Transliteration', multiline: false },
              { key: 'translation', label: 'TRANSLATION', ph: 'English translation', multiline: true },
              { key: 'source', label: 'SOURCE', ph: 'e.g. Bukhari 1234', multiline: false },
            ].map(({ key, label, ph, multiline }) => (
              <View key={key} style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginBottom: 4 }}>{label}</Text>
                <TextInput
                  value={newDua[key]}
                  onChangeText={(v) => setNewDua((p) => ({ ...p, [key]: v.slice(0, 1000) }))}
                  placeholder={ph}
                  placeholderTextColor={COLORS.textTertiary}
                  multiline={multiline}
                  maxLength={1000}
                  accessibilityLabel={label}
                  style={{ borderBottomWidth: 1, borderBottomColor: COLORS.gold, paddingVertical: 8, color: COLORS.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 14 }}
                />
              </View>
            ))}
            <TouchableOpacity onPress={addCustomDua} style={{ backgroundColor: COLORS.gold, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' }}>Save Dua</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Modal>

      <AppDialog visible={!!dialog} onClose={() => setDialog(null)} title={dialog?.title} message={dialog?.message} buttons={dialog?.buttons || []} />
    </View>
  );
}
