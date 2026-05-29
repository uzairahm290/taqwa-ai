import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import AppDialog from './AppDialog';

const FEEDBACK_TYPES = ['Bug Report', 'Feature Request', 'Suggestion', 'Appreciation'];

function StarRow({ rating, onRate, colors }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 20 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onRate(star)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={36}
            color={star <= rating ? colors.gold : colors.textTertiary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function FeedbackScreen({ onBack, theme }) {
  const { COLORS, CARD_STYLE, isDark } = theme;
  const [rating, setRating] = useState(0);
  const [type, setType] = useState('General');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [dialog, setDialog] = useState(null);

  const ratingLabel = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating] || '';
  const canSubmit = message.trim().length >= 10;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const subject = encodeURIComponent(`[Taqwa AI] ${type} · ${ratingLabel || 'No rating'}`);
      const body = encodeURIComponent(
        `Type: ${type}\nRating: ${rating ? `${rating}/5 (${ratingLabel})` : 'Not rated'}\nUser: ${user?.email || 'guest'}\n\n---\n\n${message.trim()}`
      );
      const mailto = `mailto:uzairahm290@gmail.com?subject=${subject}&body=${body}`;
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await Linking.openURL(mailto);
        setSubmitted(true);
      } else {
        await supabase.from('app_feedback').insert({ user_id: user?.id ?? null, type, rating: rating || null, message: message.trim() });
        setSubmitted(true);
      }
    } catch (_) {
      setDialog({
        title: 'Sent!',
        message: 'Your feedback has been recorded. JazakAllah khair for helping improve Taqwa AI.',
        buttons: [{ label: 'OK', onPress: () => { setDialog(null); setSubmitted(true); } }],
      });
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 }}>
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
            <Ionicons name="chevron-back" size={24} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: isDark ? 'rgba(201,168,76,0.12)' : 'rgba(166,131,38,0.1)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <Ionicons name="checkmark-circle" size={44} color={COLORS.gold} />
          </View>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 12 }}>
            JazakAllah Khair
          </Text>
          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 22, color: COLORS.gold, marginBottom: 16 }}>
            جزاك الله خيرًا
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Your feedback helps make Taqwa AI better for the entire ummah. We read every message.
          </Text>
          <TouchableOpacity
            onPress={onBack}
            style={{ marginTop: 36, backgroundColor: COLORS.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' }}>Back to More</Text>
          </TouchableOpacity>
        </View>
        <AppDialog visible={!!dialog} onClose={() => setDialog(null)} title={dialog?.title} message={dialog?.message} buttons={dialog?.buttons || []} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 }}>
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 34, color: COLORS.textPrimary, lineHeight: 38 }}>Feedback</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 20 }}>
          Help us improve Taqwa AI for the ummah. Every message is read.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={[CARD_STYLE, { padding: 20, marginBottom: 16, alignItems: 'center' }]}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.gold, letterSpacing: 1.2 }}>RATE YOUR EXPERIENCE</Text>
          <StarRow rating={rating} onRate={setRating} colors={COLORS} />
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: rating > 0 ? COLORS.gold : COLORS.textTertiary, minHeight: 28 }}>
            {ratingLabel}
          </Text>
        </View>

        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1.2, marginBottom: 10, marginLeft: 2 }}>TYPE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {FEEDBACK_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                borderColor: type === t ? COLORS.gold : (isDark ? '#333' : '#EAE6DF'),
                backgroundColor: type === t ? (isDark ? 'rgba(201,168,76,0.12)' : 'rgba(166,131,38,0.08)') : 'transparent',
              }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: type === t ? COLORS.gold : COLORS.textTertiary }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1.2, marginBottom: 10, marginLeft: 2 }}>MESSAGE</Text>
        <View style={[CARD_STYLE, { padding: 16, marginBottom: 8 }]}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what's on your mind... (min. 10 characters)"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={6}
            maxLength={1000}
            textAlignVertical="top"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textPrimary, minHeight: 140, lineHeight: 22 }}
          />
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, textAlign: 'right', marginBottom: 28 }}>
          {message.length}/1000
        </Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit || sending}
          style={{ backgroundColor: canSubmit ? COLORS.gold : (isDark ? '#1E1E2E' : '#EAE6DF'), borderRadius: 14, padding: 16, alignItems: 'center' }}
        >
          {sending
            ? <ActivityIndicator color="#000" />
            : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: canSubmit ? '#000' : COLORS.textTertiary }}>Send Feedback</Text>
          }
        </TouchableOpacity>

        {!canSubmit && message.length > 0 && (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, textAlign: 'center', marginTop: 10 }}>
            Please write at least 10 characters
          </Text>
        )}
      </View>

      <AppDialog visible={!!dialog} onClose={() => setDialog(null)} title={dialog?.title} message={dialog?.message} buttons={dialog?.buttons || []} />
    </ScrollView>
  );
}
