import { getLocalDateString } from '../../lib/dateUtils';
import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from '../../lib/i18n';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Pressable, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../components/theme';
import BackgroundEffect from '../../components/BackgroundEffect';
import HabitCard from '../../components/HabitCard';
import {
  getHabits, addHabit as dbAddHabit, archiveHabit,
  getHabitLogs, toggleHabitLog,
} from '../../lib/localDb';

const ICONS = ['📖', '🤲', '🏃', '💧', '🌙', '☀️', '🍎', '✍️', '🧘', '🕌', '📿', '💪'];

function AddHabitModal({ visible, onClose, onAdd }) {
  const { COLORS, isDark } = useAppTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📖');

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), icon });
    setName('');
    setIcon('📖');
    onClose();
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          style={{
            backgroundColor: isDark ? 'rgba(15, 15, 20, 1)' : 'rgba(255, 255, 255, 1)',
            borderTopWidth: 1, borderTopColor: COLORS.border,
            padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          }}
          onPress={e => e.stopPropagation()}
        >
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 20 }}>
            {t('habits.new_habit')}
          </Text>

          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1, color: COLORS.gold, marginBottom: 6 }}>
            {t('habits.name')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('habits.name_placeholder')}
            placeholderTextColor={COLORS.textTertiary}
            style={{
              borderBottomWidth: 1, borderBottomColor: COLORS.border,
              paddingVertical: 10, color: COLORS.textPrimary,
              fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 24,
            }}
          />

          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1, color: COLORS.gold, marginBottom: 10 }}>
            {t('habits.icon')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
            {ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                onPress={() => setIcon(ic)}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: icon === ic
                    ? (isDark ? 'rgba(201,168,76,0.15)' : 'rgba(166,131,38,0.1)')
                    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                  borderWidth: 1,
                  borderColor: icon === ic ? COLORS.gold : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                }}
              >
                <Text style={{ fontSize: 20 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            style={{
              backgroundColor: COLORS.gold, borderRadius: 12, padding: 16, alignItems: 'center',
              shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' }}>
              {t('habits.add_habit')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function HabitsScreen() {
  const { COLORS, isDark } = useAppTheme();
  const { t } = useTranslation();
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  const today = getLocalDateString();

  async function computeStreaks(allHabits) {
    const last30 = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last30.push(getLocalDateString(d));
    }

    const s = {};
    for (const habit of allHabits) {
      let streak = 0;
      for (const date of last30) {
        const dayLogs = await getHabitLogs(date);
        if (dayLogs.find(l => l.habit_id === habit.id && l.completed)) {
          streak++;
        } else {
          break;
        }
      }
      s[habit.id] = streak;
    }
    setStreaks(s);
  }

  async function loadAll() {
    const todayStr = getLocalDateString();
    const [allHabits, todayLogs] = await Promise.all([
      getHabits(),
      getHabitLogs(todayStr),
    ]);
    const active = allHabits.filter(h => h.is_active);
    setHabits(active);
    setLogs(todayLogs);
    computeStreaks(active);
  }

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  async function toggleHabit(habitId) {
    const todayStr = getLocalDateString();
    const updated = await toggleHabitLog(habitId, todayStr);
    setLogs(updated);
  }

  async function addHabit({ name, icon }) {
    await dbAddHabit({ name, icon });
    await loadAll();
  }

  async function deleteHabit(habitId) {
    Alert.alert(t('habits.archive_title'), t('habits.archive_msg'), [
      { text: t('habits.cancel'), style: 'cancel' },
      {
        text: t('habits.archive'), style: 'destructive',
        onPress: async () => {
          await archiveHabit(habitId);
          await loadAll();
        },
      },
    ]);
  }

  const completedHabits = habits.filter(h => logs.find(l => l.habit_id === h.id && l.completed));
  const todoHabits = habits.filter(h => !logs.find(l => l.habit_id === h.id && l.completed));

  const mizanInsight = useMemo(() => {
    if (todoHabits.length === 0 && habits.length > 0) {
      return (
        <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
          {t('habits.insight_all_done')}
        </Text>
      );
    } else if (habits.length > 0) {
      let maxStreakHabit = null;
      let maxS = -1;
      for (const h of todoHabits) {
        if (streaks[h.id] > maxS) { maxS = streaks[h.id]; maxStreakHabit = h; }
      }
      if (maxStreakHabit && maxS > 0) {
        return (
          <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
            {t('habits.insight_streak').replace('{streak}', maxS).replace('{habit}', maxStreakHabit.name)}
          </Text>
        );
      }
      return (
        <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
          {t('habits.insight_remaining').replace('{count}', todoHabits.length).replace('{plural}', todoHabits.length === 1 ? t('habits.habit_word') : t('habits.habits_word'))}
        </Text>
      );
    } else {
      return (
        <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
          {t('habits.insight_empty')}
        </Text>
      );
    }
  }, [todoHabits, habits, streaks, t, COLORS.textPrimary]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <BackgroundEffect />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <View>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary }}>
              {t('habits.title')}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
              {t('habits.done_today').replace('{completed}', completedHabits.length).replace('{total}', habits.length)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={{
              backgroundColor: isDark ? 'rgba(201, 168, 76, 0.1)' : 'rgba(166, 131, 38, 0.1)',
              borderWidth: 1, borderColor: isDark ? 'rgba(201, 168, 76, 0.3)' : 'rgba(166, 131, 38, 0.3)',
              borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.gold }}>
              {t('habits.add_btn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Insight */}
        <View style={{
          backgroundColor: isDark ? 'rgba(15, 15, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1, borderColor: isDark ? 'rgba(201, 168, 76, 0.15)' : 'rgba(166, 131, 38, 0.2)',
          borderRadius: 12, padding: 16, marginBottom: 24,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <FontAwesome5 name="star" size={10} color={COLORS.gold} solid style={{ marginRight: 6 }} />
            <Text style={{ color: COLORS.gold, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 }}>
              {t('habits.mizan_insight')}
            </Text>
          </View>
          {mizanInsight}
        </View>

        {habits.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', opacity: 0.5 }}>
            <Feather name="check-circle" size={48} color={COLORS.textTertiary} style={{ marginBottom: 16 }} />
            <Text style={{ fontFamily: 'CormorantGaramond_400Regular', fontSize: 20, color: COLORS.textSecondary, textAlign: 'center' }}>
              {t('habits.no_habits')}
            </Text>
          </View>
        ) : (
          <>
            {todoHabits.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>
                  {t('habits.to_do_today')}
                </Text>
                {todoHabits.map(h => (
                  <HabitCard
                    key={h.id} habit={h} completed={false}
                    streak={streaks[h.id] || 0}
                    onToggle={() => toggleHabit(h.id)}
                    onDelete={() => deleteHabit(h.id)}
                  />
                ))}
              </View>
            )}
            {completedHabits.length > 0 && (
              <View>
                <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>
                  {t('habits.completed')}
                </Text>
                {completedHabits.map(h => (
                  <HabitCard
                    key={h.id} habit={h} completed={true}
                    streak={streaks[h.id] || 0}
                    onToggle={() => toggleHabit(h.id)}
                    onDelete={() => deleteHabit(h.id)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <AddHabitModal visible={showAdd} onClose={() => setShowAdd(false)} onAdd={addHabit} />
    </View>
  );
}
