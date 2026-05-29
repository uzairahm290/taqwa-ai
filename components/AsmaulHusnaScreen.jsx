import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from './theme';
import { ASMAUL_HUSNA } from '../lib/seedAsmaulHusna';

export default function AsmaulHusnaScreen({ onBack }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return ASMAUL_HUSNA;
    const q = search.toLowerCase();
    return ASMAUL_HUSNA.filter(
      (n) =>
        n.transliteration.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q) ||
        n.arabic.includes(search)
    );
  }, [search]);

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        onPress={() => setSelected(selected?.number === item.number ? null : item)}
        activeOpacity={0.75}
        style={[
          CARD_STYLE,
          {
            marginHorizontal: 16,
            marginBottom: 10,
            padding: 16,
            borderWidth: selected?.number === item.number ? 1 : 0,
            borderColor: selected?.number === item.number ? COLORS.gold : 'transparent',
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Number badge */}
          <View style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(201,168,76,0.12)' : 'rgba(166,131,38,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}>
            <Text style={{
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              color: COLORS.gold,
            }}>
              {String(item.number).padStart(2, '0')}
            </Text>
          </View>

          {/* Name info */}
          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 13,
              color: COLORS.textPrimary,
              marginBottom: 2,
            }}>
              {item.transliteration}
            </Text>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 12,
              color: COLORS.textSecondary,
            }}>
              {item.meaning}
            </Text>
          </View>

          {/* Arabic */}
          <Text style={{
            fontFamily: 'Amiri_400Regular',
            fontSize: 22,
            color: COLORS.gold,
            marginLeft: 10,
            lineHeight: 40,
            paddingTop: 6,
          }}>
            {item.arabic}
          </Text>
        </View>

        {/* Expanded detail */}
        {selected?.number === item.number && (
          <View style={{
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 0.5,
            borderTopColor: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(0,0,0,0.06)',
          }}>
            <Text style={{
              fontFamily: 'Amiri_400Regular',
              fontSize: 40,
              color: COLORS.textPrimary,
              textAlign: 'center',
              lineHeight: 90,
              paddingTop: 16,
              marginBottom: 4,
            }}>
              {item.arabic}
            </Text>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: COLORS.gold,
              textAlign: 'center',
              fontStyle: 'italic',
              marginBottom: 4,
            }}>
              {item.transliteration}
            </Text>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: COLORS.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}>
              {item.meaning}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
            <Ionicons name="chevron-back" size={24} color={COLORS.gold} />
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{
              fontFamily: 'CormorantGaramond_600SemiBold',
              fontSize: 34,
              color: COLORS.textPrimary,
              lineHeight: 38,
            }}>
              Asma ul Husna
            </Text>
            <Text style={{
              fontFamily: 'Amiri_400Regular',
              fontSize: 18,
              color: COLORS.gold,
              marginTop: 2,
            }}>
              أسماء الله الحسنى
            </Text>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 12,
              color: COLORS.textTertiary,
              marginTop: 6,
            }}>
              The 99 Beautiful Names of Allah
            </Text>
          </View>
          <Text style={{
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 32,
            color: isDark ? 'rgba(201,168,76,0.2)' : 'rgba(166,131,38,0.15)',
          }}>
            99
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
        <View style={[
          CARD_STYLE,
          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
        ]}>
          <Ionicons name="search-outline" size={16} color={COLORS.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or meaning..."
            placeholderTextColor={COLORS.textTertiary}
            style={{
              flex: 1,
              color: COLORS.textPrimary,
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hadith banner */}
      {!search && (
        <View style={{
          marginHorizontal: 16,
          marginBottom: 18,
          padding: 14,
          borderRadius: 12,
          backgroundColor: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(166,131,38,0.06)',
          borderWidth: 0.5,
          borderColor: isDark ? 'rgba(201,168,76,0.2)' : 'rgba(166,131,38,0.15)',
        }}>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: COLORS.textSecondary,
            lineHeight: 18,
          }}>
            "Allah has ninety-nine names, one hundred minus one. Whoever memorises them will enter Paradise."
          </Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 11,
            color: COLORS.textTertiary,
            marginTop: 6,
          }}>
            — Sahih al-Bukhari 2736
          </Text>
        </View>
      )}

      {/* Count when searching */}
      {search.length > 0 && (
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 12,
          color: COLORS.textTertiary,
          paddingHorizontal: 20,
          marginBottom: 10,
        }}>
          {filtered.length} of 99 names
        </Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
