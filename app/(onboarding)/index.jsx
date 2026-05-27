import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Defs, Pattern, Rect, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabaseClient';
import { useAppTheme } from '../../components/theme';
import { useRecoveryAuth } from '../../hooks/useRecoveryAuth';
import { cachePrayerSettings } from '../../lib/offlineCache';
import { useNotifications } from '../../hooks/useNotifications';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Steps: 0=welcome, 1=name, 2=madhab, 3=method, 4=goals, 5=notifications, 6=done
const TOTAL_QUESTION_STEPS = 5; // steps 1–5 show progress dots

const MADHAB_OPTIONS = [
  { id: 'Hanafi',  label: 'Hanafi',   arabic: 'حنفي',  desc: 'Later Asr time (2 shadow lengths)' },
  { id: 'Shafi',   label: "Shafi'i",  arabic: 'شافعي', desc: 'Earlier Asr time (1 shadow length)' },
  { id: 'Maliki',  label: 'Maliki',   arabic: 'مالكي', desc: 'Earlier Asr time (1 shadow length)' },
  { id: 'Hanbali', label: 'Hanbali',  arabic: 'حنبلي', desc: 'Earlier Asr time (1 shadow length)' },
];

const METHOD_OPTIONS = [
  { id: 'Karachi', label: 'Karachi (UISK)',        region: 'South Asia',        desc: 'Pakistan, India, Bangladesh' },
  { id: 'ISNA',    label: 'ISNA',                  region: 'North America',     desc: 'USA, Canada' },
  { id: 'MWL',     label: 'Muslim World League',   region: 'Europe & Worldwide',desc: 'UK, Europe, global default' },
  { id: 'Egypt',   label: 'Egyptian Authority',    region: 'Middle East',       desc: 'Egypt & Arab world' },
];

const GOAL_OPTIONS = [
  { id: 'prayers', label: '5 Daily Prayers', desc: 'Track and never miss a salah' },
  { id: 'quran',   label: 'Quran Reading',   desc: 'Build a consistent daily habit' },
  { id: 'habits',  label: 'Islamic Habits',  desc: 'Track your daily practices' },
  { id: 'dhikr',   label: 'Dhikr & Tasbih', desc: 'Count your daily remembrance' },
];

function StarPattern({ color }) {
  return (
    <Svg width={width} height="100%" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.035 }}>
      <Defs>
        <Pattern id="ob-stars" patternUnits="userSpaceOnUse" width={60} height={60}>
          <G fill={color}>
            <Path d="M30 10 L33 24 L47 21 L36 30 L47 39 L33 36 L30 50 L27 36 L13 39 L24 30 L13 21 L27 24 Z" />
          </G>
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#ob-stars)" />
    </Svg>
  );
}

function CrescentIcon({ color, size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Path
        d="M55 15 C35 15, 20 28, 20 45 C20 62, 35 75, 55 75 C42 70, 34 59, 34 45 C34 31, 42 20, 55 15Z"
        fill={color}
        opacity={0.95}
      />
      <Circle cx={58} cy={28} r={5} fill="transparent" />
    </Svg>
  );
}

function CheckIcon({ color, size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx={40} cy={40} r={36} fill="none" stroke={color} strokeWidth={3} opacity={0.3} />
      <Path
        d="M22 42 L34 54 L58 28"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProgressDots({ current, COLORS }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
      {Array.from({ length: TOTAL_QUESTION_STEPS }).map((_, i) => {
        const active = i === current - 1;
        const done   = i < current - 1;
        return (
          <View
            key={i}
            style={{
              width: active ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: active || done ? COLORS.gold : COLORS.textTertiary,
              opacity: done ? 0.5 : 1,
            }}
          />
        );
      })}
    </View>
  );
}

function SelectCard({ label, sublabel, desc, selected, onPress, COLORS, CARD_STYLE }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[CARD_STYLE, {
        flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10,
        borderColor: selected ? COLORS.gold : COLORS.border,
        borderWidth: selected ? 1 : 0.5,
      }]}
    >
      <View style={{
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 1.5,
        borderColor: selected ? COLORS.gold : COLORS.textTertiary,
        backgroundColor: selected ? COLORS.gold : 'transparent',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14, flexShrink: 0,
      }}>
        {selected && (
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M2 6 L5 9 L10 3" fill="none" stroke="#000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: selected ? COLORS.gold : COLORS.textPrimary }}>
            {label}
          </Text>
          {sublabel ? (
            <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: COLORS.goldMuted }}>{sublabel}</Text>
          ) : null}
        </View>
        {desc ? (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 2 }}>{desc}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function MultiCard({ label, desc, selected, onPress, COLORS, CARD_STYLE }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[CARD_STYLE, {
        flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10,
        borderColor: selected ? COLORS.gold : COLORS.border,
        borderWidth: selected ? 1 : 0.5,
      }]}
    >
      <View style={{
        width: 22, height: 22, borderRadius: 5,
        borderWidth: 1.5,
        borderColor: selected ? COLORS.gold : COLORS.textTertiary,
        backgroundColor: selected ? COLORS.gold : 'transparent',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14, flexShrink: 0,
      }}>
        {selected && (
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M2 6 L5 9 L10 3" fill="none" stroke="#000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: selected ? COLORS.gold : COLORS.textPrimary }}>
          {label}
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 2 }}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SummaryRow({ label, value, COLORS }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Text style={{
        fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary,
        letterSpacing: 0.8, textTransform: 'uppercase', flexShrink: 0, marginRight: 12,
      }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.textSecondary, textAlign: 'right', flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const { COLORS, CARD_STYLE } = useAppTheme();
  const router = useRouter();
  const { initializeAuth } = useRecoveryAuth();
  const { registerForPushNotifications } = useNotifications();

  const [step, setStep]     = useState(0);
  const [name, setName]     = useState('');
  const [madhab, setMadhab] = useState('Hanafi');
  const [method, setMethod] = useState('Karachi');
  const [goals, setGoals]   = useState(new Set(['prayers']));
  const [saving, setSaving] = useState(false);

  const opacity    = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  function transition(nextStep) {
    // eslint-disable-next-line react-compiler/react-compiler
    opacity.value = withTiming(0, { duration: 120 }, () => {
      // eslint-disable-next-line react-compiler/react-compiler
      translateY.value = 20;
      runOnJS(setStep)(nextStep);
      // eslint-disable-next-line react-compiler/react-compiler
      translateY.value = withTiming(0, { duration: 180 });
      // eslint-disable-next-line react-compiler/react-compiler
      opacity.value    = withTiming(1, { duration: 180 });
    });
  }

  function toggleGoal(id) {
    setGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // Setup the hidden account
      const { session } = await initializeAuth();

      if (session?.user) {
        // Save display name if provided
        if (name.trim()) {
          await supabase.auth.updateUser({ data: { display_name: name.trim() } });
        }
        // Save prayer preferences
        await supabase.from('user_location').upsert({
          user_id: session.user.id,
          calculation_method: method,
          madhab,
        });
      }

      await cachePrayerSettings({
        calculation_method: method,
        madhab,
      });

      await AsyncStorage.setItem('onboarding_goals', JSON.stringify([...goals]));
      await AsyncStorage.setItem('onboarding_complete', '1');
    } catch (_) {
      // Even if Supabase fails, let them into the app — we'll retry later
      await AsyncStorage.setItem('onboarding_complete', '1');
    }
    setSaving(false);
    router.replace('/(tabs)');
  }

  async function handleNotificationOptIn(enable) {
    if (enable) {
      await registerForPushNotifications();
    }
    await AsyncStorage.setItem('notif_permission_asked', '1');
    transition(6);
  }

  const btnStyle = { backgroundColor: COLORS.gold, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 };
  const btnTextStyle = { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' };

  // ─── Step 0: Welcome ──────────────────────────────────────────
  if (step === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StarPattern color={COLORS.gold} />
        <View style={{ flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' }}>
          <CrescentIcon color={COLORS.gold} size={72} />
          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 26, color: COLORS.gold, marginTop: 20, letterSpacing: 1 }}>
            بِسْمِ اللَّهِ
          </Text>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 30, color: COLORS.textPrimary, marginTop: 28, textAlign: 'center', letterSpacing: 0.5 }}>
            Welcome to Mizan
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 22, maxWidth: 280 }}>
            A few quick questions to personalize your experience. No account needed.
          </Text>
          <View style={{ width: '100%', marginTop: 56 }}>
            <TouchableOpacity onPress={() => transition(1)} style={btnStyle}>
              <Text style={btnTextStyle}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── Step 6: Done ─────────────────────────────────────────────
  if (step === 6) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StarPattern color={COLORS.gold} />
        <View style={{ flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' }}>
          <CheckIcon color={COLORS.gold} size={72} />
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 32, color: COLORS.textPrimary, marginTop: 28, textAlign: 'center' }}>
            {name.trim() ? `You're all set, ${name.trim().split(' ')[0]}` : "You're all set"}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 22, maxWidth: 280 }}>
            May Allah make your journey consistent and blessed.
          </Text>

          <View style={{ marginTop: 36, padding: 20, borderRadius: 14, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.card, width: '100%', gap: 10 }}>
            {name.trim() ? <SummaryRow label="Name"   value={name.trim()} COLORS={COLORS} /> : null}
            <SummaryRow label="Madhab" value={MADHAB_OPTIONS.find(m => m.id === madhab)?.label} COLORS={COLORS} />
            <SummaryRow label="Method" value={METHOD_OPTIONS.find(m => m.id === method)?.label} COLORS={COLORS} />
            <SummaryRow label="Focus"  value={GOAL_OPTIONS.filter(g => goals.has(g.id)).map(g => g.label).join(', ')} COLORS={COLORS} />
          </View>

          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 20, textAlign: 'center' }}>
            You can create an account later in Settings to sync across devices.
          </Text>

          <View style={{ width: '100%', marginTop: 24 }}>
            <TouchableOpacity onPress={handleFinish} disabled={saving} style={btnStyle}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={btnTextStyle}>Enter Mizan</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── Steps 1–5: Question steps ────────────────────────────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StarPattern color={COLORS.gold} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, paddingTop: 64 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[{ flex: 1 }, animStyle]}>

          {/* Header */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.gold, letterSpacing: 1.5, marginBottom: 10 }}>
              STEP {step} OF {TOTAL_QUESTION_STEPS}
            </Text>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary, lineHeight: 34 }}>
              {step === 1 && 'What should we\ncall you?'}
              {step === 2 && 'Which madhab do\nyou follow?'}
              {step === 3 && 'Where are you\nbased?'}
              {step === 4 && 'What would you\nlike to focus on?'}
              {step === 5 && 'Never miss\na prayer'}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, marginTop: 6 }}>
              {step === 1 && 'Optional — you can skip this.'}
              {step === 2 && 'This sets your Asr prayer time.'}
              {step === 3 && 'Selects the prayer calculation method for your region.'}
              {step === 4 && 'Select all that apply.'}
              {step === 5 && 'We’ll notify you when it’s time to pray.'}
            </Text>
          </View>

          {/* Step 1: Name */}
          {step === 1 && (
            <View style={{ marginBottom: 16 }}>
              <View style={[CARD_STYLE, { padding: 16 }]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.textTertiary}
                  autoFocus
                  maxLength={40}
                  returnKeyType="done"
                  onSubmitEditing={() => transition(2)}
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 18,
                    color: COLORS.textPrimary,
                    paddingVertical: 4,
                  }}
                />
              </View>
            </View>
          )}

          {/* Step 2: Madhab */}
          {step === 2 && MADHAB_OPTIONS.map((opt) => (
            <SelectCard
              key={opt.id}
              label={opt.label}
              sublabel={opt.arabic}
              desc={opt.desc}
              selected={madhab === opt.id}
              onPress={() => setMadhab(opt.id)}
              COLORS={COLORS}
              CARD_STYLE={CARD_STYLE}
            />
          ))}

          {/* Step 3: Calculation Method */}
          {step === 3 && METHOD_OPTIONS.map((opt) => (
            <SelectCard
              key={opt.id}
              label={opt.label}
              sublabel={opt.region}
              desc={opt.desc}
              selected={method === opt.id}
              onPress={() => setMethod(opt.id)}
              COLORS={COLORS}
              CARD_STYLE={CARD_STYLE}
            />
          ))}

          {/* Step 4: Goals */}
          {step === 4 && GOAL_OPTIONS.map((opt) => (
            <MultiCard
              key={opt.id}
              label={opt.label}
              desc={opt.desc}
              selected={goals.has(opt.id)}
              onPress={() => toggleGoal(opt.id)}
              COLORS={COLORS}
              CARD_STYLE={CARD_STYLE}
            />
          ))}

          {/* Step 5: Notifications */}
          {step === 5 && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(201, 168, 76, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Feather name="bell" size={32} color={COLORS.gold} />
              </View>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 24, marginBottom: 16 }}>
                Allow Mizan to send you notifications so you never miss a Salah.
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 20 }}>
                You can customize which of the 5 daily prayers you want to be notified for later in Settings.
              </Text>
            </View>
          )}

          {/* Progress + Continue */}
          <View style={{ marginTop: 'auto', paddingTop: 32 }}>
            <ProgressDots current={step} COLORS={COLORS} />
            {step === 5 ? (
              <>
                <TouchableOpacity onPress={() => handleNotificationOptIn(true)} style={btnStyle}>
                  <Text style={btnTextStyle}>Enable Notifications</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleNotificationOptIn(false)} style={{ marginTop: 16, alignItems: 'center', padding: 8 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textTertiary }}>Not Now</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => transition(step + 1)} style={btnStyle}>
                <Text style={btnTextStyle}>
                  {step === TOTAL_QUESTION_STEPS ? 'Finish' : 'Continue'}
                </Text>
              </TouchableOpacity>
            )}
            {step > 1 && (
              <TouchableOpacity onPress={() => transition(step - 1)} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textTertiary }}>Back</Text>
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
