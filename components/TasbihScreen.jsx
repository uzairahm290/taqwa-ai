import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  ScrollView, TextInput, Alert, Modal,
  Pressable, Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useAppTheme } from './theme';
import { useDhikr, PRESETS } from '../hooks/useDhikr';

const TASBIH_TAP_SOUND = require('../assets/sounds/tasbih-tap.wav');
const RING_SIZE = 230;
const STROKE = 11;
const R = (RING_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

async function haptic(type = 'light') {
  try {
    if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (_) {}
}

// ─── Progress ring ────────────────────────────────────────────────────────────
function CounterRing({ count, target, completing, COLORS, isDark, onPress, scale }) {
  const pct = target > 0 ? count / target : 0;
  const filled = CIRC * Math.min(pct, 1);
  const ringColor = completing ? COLORS.success : COLORS.gold;
  const trackColor = isDark ? '#1A1A26' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={1}
        style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
          <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R} stroke={trackColor} strokeWidth={STROKE} fill="none" />
          {count > 0 && (
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
              stroke={ringColor} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${filled} ${CIRC}`}
              strokeLinecap="round"
              transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
            />
          )}
        </Svg>

        {/* Inner tap area */}
        <View style={{
          width: RING_SIZE - STROKE * 3,
          height: RING_SIZE - STROKE * 3,
          borderRadius: (RING_SIZE - STROKE * 3) / 2,
          backgroundColor: completing
            ? (isDark ? 'rgba(61,168,118,0.08)' : 'rgba(39,122,80,0.06)')
            : (isDark ? 'rgba(201,168,76,0.05)' : 'rgba(166,131,38,0.04)'),
          alignItems: 'center', justifyContent: 'center',
        }}>
          {completing ? (
            <>
              <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 28, color: COLORS.success, marginBottom: 4 }}>
                ✓
              </Text>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 44, color: COLORS.success, lineHeight: 50 }}>
                {count}
              </Text>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.success, marginTop: 4 }}>
                Round complete!
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 72, color: COLORS.textPrimary, lineHeight: 80 }}>
                {count}
              </Text>
              {target > 0 && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary }}>
                  of {target}
                </Text>
              )}
              {count === 0 && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 6 }}>
                  tap to begin
                </Text>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Add Custom Dhikr modal ───────────────────────────────────────────────────
function CustomDhikrModal({ visible, onSave, onClose, COLORS, isDark }) {
  const [name, setName] = useState('');
  const [arabic, setArabic] = useState('');
  const [target, setTarget] = useState('33');

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for your dhikr.');
      return;
    }
    const t = parseInt(target, 10);
    onSave({
      id: 'custom_' + Date.now(),
      name: name.trim(),
      arabic: arabic.trim(),
      meaning: '',
      target: t > 0 ? t : 33,
    });
    setName(''); setArabic(''); setTarget('33');
    onClose();
  }

  const inputStyle = {
    backgroundColor: isDark ? '#1A1A26' : '#F5F2EA',
    borderRadius: 12, padding: 14, color: COLORS.textPrimary,
    fontFamily: 'Inter_400Regular', fontSize: 15,
    borderWidth: 0.5, borderColor: COLORS.border, marginBottom: 12,
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View style={{ backgroundColor: isDark ? '#12121C' : '#FAF7F0', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 }}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 20 }}>
              Custom Dhikr
            </Text>
            <TextInput
              placeholder="Name (e.g. Salawat)" placeholderTextColor={COLORS.textTertiary}
              value={name} onChangeText={setName}
              style={inputStyle}
            />
            <TextInput
              placeholder="Arabic text (optional)"
              placeholderTextColor={COLORS.textTertiary}
              value={arabic} onChangeText={setArabic}
              style={[inputStyle, { fontFamily: 'Amiri_400Regular', fontSize: 20, textAlign: 'right' }]}
            />
            <TextInput
              placeholder="Target count" placeholderTextColor={COLORS.textTertiary}
              value={target} onChangeText={setTarget} keyboardType="number-pad"
              style={inputStyle}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity onPress={onClose} style={{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: COLORS.gold }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Tasbih screen ───────────────────────────────────────────────────────
export default function TasbihScreen({ onBack }) {
  const { COLORS, isDark } = useAppTheme();
  const tapSound = useAudioPlayer(TASBIH_TAP_SOUND);
  const {
    activeId, activePreset, roundCount, completing,
    activeTotal, totalToday, completedRounds,
    increment, resetRound, switchPreset,
    customDhikr, setCustomDhikr,
  } = useDhikr();

  const [scale] = useState(() => new Animated.Value(1));
  const [showCustomModal, setShowCustomModal] = useState(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // All presets + custom if set
  const allPresets = customDhikr ? [...PRESETS, customDhikr] : PRESETS;

  function playTapSound() {
    void tapSound.seekTo(0).then(() => {
      tapSound.play();
    }).catch(() => {});
  }

  function handleTap() {
    if (completing) return; // ignore taps during the "complete" flash

    // Scale pulse
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 55, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    const willComplete = roundCount + 1 >= activePreset.target;
    playTapSound();
    haptic(willComplete ? 'success' : 'light');
    increment();
  }

  function handleReset() {
    Alert.alert('Reset round?', 'This resets the current round counter. Your daily total is kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: resetRound },
    ]);
  }

  function handleAddCustom(dhikr) {
    setCustomDhikr(dhikr);
    switchPreset(dhikr.id);
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* ── Header ── */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 14 }}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 26, color: COLORS.textPrimary }}>
          Tasbih
        </Text>
        {completedRounds > 0 && (
          <View style={{ backgroundColor: isDark ? 'rgba(201,168,76,0.12)' : 'rgba(166,131,38,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: isDark ? 'rgba(201,168,76,0.25)' : 'rgba(166,131,38,0.2)' }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.gold }}>
              ×{completedRounds} rounds
            </Text>
          </View>
        )}
      </View>

      {/* ── Active dhikr label ── */}
      <View style={{ alignItems: 'center', paddingHorizontal: 24, marginBottom: 10 }}>
        <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 32, color: COLORS.gold, textAlign: 'center' }}>
          {activePreset.arabic}
        </Text>
        <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, marginTop: 4 }}>
          {activePreset.name}
        </Text>
        {activePreset.meaning ? (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, marginTop: 3 }}>
            {activePreset.meaning}
          </Text>
        ) : null}
      </View>

      {/* ── Counter ring (main tap area) ── */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <CounterRing
          count={roundCount}
          target={activePreset.target}
          completing={completing}
          COLORS={COLORS}
          isDark={isDark}
          onPress={handleTap}
          scale={scale}
        />
      </View>

      {/* ── Bottom panel ── */}
      <View style={{ paddingBottom: Platform.OS === 'ios' ? 36 : 20 }}>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 16, paddingHorizontal: 24 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary }}>
              {activeTotal}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary }}>this dhikr today</Text>
          </View>
          <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary }}>
              {totalToday}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary }}>total today</Text>
          </View>
          <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
          <TouchableOpacity onPress={handleReset} style={{ alignItems: 'center' }}>
            <Feather name="rotate-ccw" size={22} color={COLORS.textTertiary} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 4 }}>reset</Text>
          </TouchableOpacity>
        </View>

        {/* Preset chips */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
        >
          {allPresets.map((preset) => {
            const active = preset.id === activeId;
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => switchPreset(preset.id)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderRadius: 22,
                  backgroundColor: active ? COLORS.gold : (isDark ? '#1A1A26' : '#F0EDE5'),
                  borderWidth: active ? 0 : 0.5,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <Text style={{
                  fontFamily: 'Inter_500Medium', fontSize: 13,
                  color: active ? '#000' : COLORS.textSecondary,
                }}>
                  {preset.name}
                </Text>
                {preset.target > 0 && (
                  <Text style={{
                    fontFamily: 'Inter_400Regular', fontSize: 10,
                    color: active ? 'rgba(0,0,0,0.5)' : COLORS.textTertiary,
                    marginTop: 2, textAlign: 'center',
                  }}>
                    ×{preset.target}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Add custom button */}
          <TouchableOpacity
            onPress={() => setShowCustomModal(true)}
            style={{
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
              borderWidth: 1, borderColor: isDark ? 'rgba(201,168,76,0.3)' : 'rgba(166,131,38,0.3)',
              borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 6,
            }}
          >
            <Feather name="plus" size={13} color={COLORS.gold} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.gold }}>Custom</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <CustomDhikrModal
        visible={showCustomModal}
        onSave={handleAddCustom}
        onClose={() => setShowCustomModal(false)}
        COLORS={COLORS}
        isDark={isDark}
      />
    </View>
  );
}
