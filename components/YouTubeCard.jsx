import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from './theme';

function YouTubeCard({ 
  playlist, 
  progressCount, 
  total, 
  isExpanded, 
  onToggleExpand, 
  onRemove,
  videos = [],
  loadingVideos = false,
  progressList = [],
  onToggleVideo
}) {
  const pct = total > 0 ? Math.round((progressCount / total) * 100) : 0;
  const isCompleted = total > 0 && progressCount === total;

  return (
    <View style={{
      backgroundColor: 'rgba(15, 15, 20, 0.9)',
      borderWidth: 1,
      borderColor: isCompleted ? 'rgba(46, 125, 94, 0.3)' : 'rgba(201, 168, 76, 0.2)',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12
    }}>
      <TouchableOpacity 
        onPress={onToggleExpand}
        activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
      >
        {/* Left Icon Block */}
        <View style={{
          width: 48, height: 48,
          borderRadius: 8,
          backgroundColor: isCompleted ? 'rgba(46, 125, 94, 0.15)' : 'rgba(100, 50, 150, 0.15)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        }}>
          {isCompleted ? (
            <Feather name="check" size={20} color={COLORS.successGlow || '#3DA876'} />
          ) : (
            <Feather name="play" size={20} color={COLORS.gold} />
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ 
              fontFamily: 'Inter_600SemiBold', 
              fontSize: 14, 
              color: COLORS.textPrimary, 
              marginBottom: 4,
              flex: 1
            }} numberOfLines={1}>
              {playlist.title}
            </Text>
            {/* Minimal Remove Button */}
            <TouchableOpacity onPress={onRemove} style={{ padding: 4 }}>
              <Feather name="trash-2" size={14} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: isCompleted ? (COLORS.successGlow || '#3DA876') : COLORS.gold, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>
              {pct}%
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 11 }}>
              &middot; {progressCount} / {total} videos
            </Text>
            <View style={{ 
              backgroundColor: isCompleted ? 'rgba(46, 125, 94, 0.15)' : 'rgba(255,255,255,0.08)', 
              paddingHorizontal: 6, 
              paddingVertical: 2, 
              borderRadius: 4, 
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: 4
            }}>
              {isCompleted && <Feather name="check" size={10} color={COLORS.successGlow || '#3DA876'} style={{ marginRight: 2 }} />}
              <Text style={{ color: isCompleted ? (COLORS.successGlow || '#3DA876') : COLORS.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 9 }}>
                {isCompleted ? 'Complete' : 'In progress'}
              </Text>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <View style={{ marginLeft: 8 }}>
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={isCompleted ? COLORS.textSecondary : COLORS.gold} />
        </View>
      </TouchableOpacity>

      {/* Bottom Progress Bar */}
      <View style={{ height: 3, backgroundColor: isCompleted ? 'rgba(46, 125, 94, 0.2)' : 'rgba(201, 168, 76, 0.1)', width: '100%' }}>
        <View style={{ height: '100%', backgroundColor: isCompleted ? (COLORS.successGlow || '#3DA876') : COLORS.gold, width: `${pct}%` }} />
      </View>

      {/* YouTube attribution — required by YouTube Data API ToS */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textTertiary, opacity: 0.7 }}>
          Powered by YouTube
        </Text>
      </View>

      {/* Expanded State */}
      {isExpanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8 }}>
          {loadingVideos ? (
            <ActivityIndicator color={COLORS.gold} style={{ marginVertical: 20 }} />
          ) : (
            <View>
              {videos.map((video, idx) => {
                const isWatched = progressList.some(p => p.video_id === video.id && p.watched);
                
                // Find "Up next"
                const firstUnwatchedIdx = videos.findIndex(v => {
                  return !progressList.some(p => p.video_id === v.id && p.watched);
                });
                const isUpNext = !isWatched && idx === firstUnwatchedIdx;

                return (
                  <TouchableOpacity 
                    key={video.id}
                    onPress={() => onToggleVideo(video.id)}
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      paddingVertical: 14,
                      borderBottomWidth: idx < videos.length - 1 ? 1 : 0,
                      borderBottomColor: 'rgba(255,255,255,0.03)'
                    }}
                  >
                    <Text style={{ 
                      color: isUpNext ? COLORS.gold : COLORS.textSecondary, 
                      fontSize: 11, 
                      width: 28,
                      fontFamily: 'JetBrainsMono_400Regular'
                    }}>
                      {String(video.position + 1).padStart(2, '0')}
                    </Text>
                    
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 12 }}>
                      <Text style={{ 
                        color: isUpNext ? COLORS.gold : COLORS.textPrimary, 
                        fontSize: 13, 
                        fontFamily: isUpNext ? 'Inter_600SemiBold' : 'Inter_400Regular',
                        flexShrink: 1
                      }} numberOfLines={1}>
                        {video.title}
                      </Text>
                      {isUpNext && (
                        <Text style={{ color: COLORS.gold, fontSize: 10, fontFamily: 'Inter_500Medium', marginLeft: 6, flexShrink: 0 }}>
                          &larr; Up next
                        </Text>
                      )}
                    </View>
                    
                    <View style={{
                      width: 20, 
                      height: 20, 
                      borderRadius: 10, 
                      borderWidth: isWatched ? 0 : 1.5,
                      borderColor: isUpNext ? COLORS.gold : COLORS.textSecondary,
                      backgroundColor: isWatched ? (COLORS.successGlow || '#3DA876') : 'transparent',
                      alignItems: 'center', 
                      justifyContent: 'center'
                    }}>
                      {isWatched && <Feather name="check" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default React.memo(YouTubeCard);
