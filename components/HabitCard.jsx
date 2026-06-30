import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from './theme';

function HabitCard({ habit, completed, streak, onToggle, onDelete }) {
  const { COLORS, isDark } = useAppTheme();
  // We can show the last 7 days of the streak conceptually, or just simple dots.
  // For now, let's render a mini visual representing consistency.
  const maxDots = 5;
  const filledDots = Math.min(streak, maxDots);
  const dots = Array.from({ length: maxDots }).map((_, i) => i < filledDots);

  return (
    <View style={{
      backgroundColor: isDark ? 'rgba(15, 15, 20, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderColor: completed ? (isDark ? 'rgba(46, 125, 94, 0.3)' : 'rgba(46, 125, 94, 0.2)') : (isDark ? 'rgba(201, 168, 76, 0.15)' : 'rgba(166, 131, 38, 0.2)'),
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center'
    }}>
      {/* Left Icon Block */}
      <View style={{
        width: 48, height: 48,
        borderRadius: 12,
        backgroundColor: completed ? (isDark ? 'rgba(46, 125, 94, 0.15)' : 'rgba(46, 125, 94, 0.1)') : (isDark ? 'rgba(201, 168, 76, 0.08)' : 'rgba(166, 131, 38, 0.1)'),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: completed ? (isDark ? 'rgba(46, 125, 94, 0.3)' : 'rgba(46, 125, 94, 0.2)') : (isDark ? 'rgba(201, 168, 76, 0.1)' : 'rgba(166, 131, 38, 0.15)')
      }}>
        <Text style={{ fontSize: 22 }}>{habit.icon || '📖'}</Text>
      </View>

      {/* Info Section */}
      <View style={{ flex: 1, paddingRight: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ 
            fontFamily: completed ? 'Inter_500Medium' : 'Inter_600SemiBold', 
            fontSize: 15, 
            color: completed ? COLORS.textSecondary : COLORS.textPrimary,
            textDecorationLine: completed ? 'line-through' : 'none',
            flex: 1
          }} numberOfLines={1}>
            {habit.name}
          </Text>
          
          <TouchableOpacity onPress={onDelete} style={{ padding: 4, marginLeft: 8 }}>
            <Feather name="trash-2" size={14} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
          {/* Streak text */}
          <Text style={{ 
            fontFamily: 'Inter_600SemiBold', 
            fontSize: 11, 
            color: streak > 0 ? COLORS.gold : COLORS.textTertiary 
          }}>
            {streak} {streak === 1 ? 'day' : 'days'}
          </Text>
          
          {/* Visual Dots */}
          <View style={{ flexDirection: 'row', gap: 3, opacity: 0.8 }}>
            {dots.map((isFilled, idx) => (
              <View 
                key={idx} 
                style={{ 
                  width: 4, height: 4, borderRadius: 2, 
                  backgroundColor: isFilled ? COLORS.gold : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') 
                }} 
              />
            ))}
            {streak > maxDots && (
              <Feather name="plus" size={6} color={COLORS.gold} style={{ alignSelf: 'center' }} />
            )}
          </View>
        </View>
      </View>

      {/* Right Action Button */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={{
          width: 32, height: 32, borderRadius: 16,
          borderWidth: 1.5,
          borderColor: completed ? (COLORS.successGlow || '#3DA876') : COLORS.textTertiary,
          backgroundColor: completed ? (COLORS.successGlow || '#3DA876') : 'transparent',
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        {completed && <Feather name="check" size={16} color="#fff" />}
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(HabitCard);
