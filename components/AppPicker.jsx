import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppModal from './AppModal';
import { useAppTheme } from './theme';

/**
 * Themed bottom-sheet option picker.
 *
 * options: Array<{ label, value, description?, selected? }>
 * onSelect(value) called when an option is tapped; modal closes automatically.
 */
export default function AppPicker({ visible, onClose, title, subtitle, options = [], onSelect }) {
  const { COLORS, isDark } = useAppTheme();
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <AppModal visible={visible} onClose={onClose} title={title} scrollable={false}>
      {subtitle ? (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 }}>
          {subtitle}
        </Text>
      ) : <View style={{ height: 8 }} />}

      {options.map((opt, i) => (
        <TouchableOpacity
          key={opt.value ?? i}
          onPress={() => { onSelect(opt.value); onClose(); }}
          activeOpacity={0.65}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 15, borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: divider }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: opt.selected ? 'Inter_600SemiBold' : 'Inter_400Regular', fontSize: 15, color: opt.selected ? COLORS.gold : COLORS.textPrimary }}>
              {opt.label}
            </Text>
            {opt.description ? (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 2 }}>
                {opt.description}
              </Text>
            ) : null}
          </View>
          {opt.selected && <Feather name="check" size={17} color={COLORS.gold} />}
        </TouchableOpacity>
      ))}

      {/* Cancel row */}
      <TouchableOpacity
        onPress={onClose} activeOpacity={0.65}
        style={{ paddingVertical: 16, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: divider, marginTop: 4 }}
      >
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: COLORS.textSecondary }}>Cancel</Text>
      </TouchableOpacity>
    </AppModal>
  );
}
