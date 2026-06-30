import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { useAppTheme } from '../../components/theme';
import BackgroundEffect from '../../components/BackgroundEffect';
import YouTubeCard from '../../components/YouTubeCard';
import { extractPlaylistId, fetchPlaylistDetails, fetchAllPlaylistVideos } from '../../lib/youtubeClient';

export default function LearningScreen() {
  const { COLORS, isDark } = useAppTheme();
  const [playlists, setPlaylists] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [userId, setUserId] = useState(null);
  const [playlistInput, setPlaylistInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Inline expansion states
  const [expandedId, setExpandedId] = useState(null);
  const [videosMap, setVideosMap] = useState({});
  const [loadingVideos, setLoadingVideos] = useState(false);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: pl } = await supabase.from('youtube_playlists')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });
      
    setPlaylists(pl || []);

    if (pl?.length) {
      const prog = {};
      for (const p of pl) {
        const { data } = await supabase.from('youtube_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('playlist_id', p.playlist_id);
        prog[p.playlist_id] = data || [];
      }
      setProgressMap(prog);
    }
  }

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const handleToggleExpand = async (playlistId) => {
    if (expandedId === playlistId) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(playlistId);
    
    if (!videosMap[playlistId]) {
      setLoadingVideos(true);
      const vids = await fetchAllPlaylistVideos(playlistId).catch(() => []);
      setVideosMap(prev => ({ ...prev, [playlistId]: vids }));
      setLoadingVideos(false);
    }
  };

  const handleToggleVideo = async (playlistId, videoId) => {
    if (!userId) return;
    const existingList = progressMap[playlistId] || [];
    const existing = existingList.find((v) => v.video_id === videoId);
    
    // Optimistic UI update
    const newWatchedState = existing ? !existing.watched : true;
    setProgressMap(prev => {
      const current = prev[playlistId] || [];
      if (existing) {
        return { ...prev, [playlistId]: current.map(v => v.video_id === videoId ? { ...v, watched: newWatchedState } : v) };
      } else {
        return { ...prev, [playlistId]: [...current, { id: 'temp', user_id: userId, playlist_id: playlistId, video_id: videoId, watched: newWatchedState }] };
      }
    });

    if (existing) {
      await supabase.from('youtube_progress').update({ watched: newWatchedState }).eq('id', existing.id);
    } else {
      await supabase.from('youtube_progress').insert({
        user_id: userId,
        playlist_id: playlistId,
        video_id: videoId,
        watched: true,
      });
    }
    await loadAll(); // Re-sync with backend
  };

  async function handleAddPlaylist() {
    if (!userId || !playlistInput.trim()) return;
    
    let id = playlistInput.trim();
    const match = id.match(/[?&]list=([^&]+)/);
    if (match) id = match[1];

    if (!id) { Alert.alert('Error', 'Invalid YouTube playlist URL'); return; }
    
    setActionLoading(true);
    try {
      const details = await fetchPlaylistDetails(id);
      
      const { error: insertError } = await supabase.from('youtube_playlists').insert({
        user_id: userId,
        playlist_id: details.id,
        title: details.title,
        total_videos: details.totalVideos,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('This playlist is already in your tracker.');
        }
        throw insertError;
      }

      const vids = await fetchAllPlaylistVideos(details.id).catch(() => []);
      if (vids.length) {
        const { error: progressError } = await supabase.from('youtube_progress').insert(
          vids.map((v) => ({ user_id: userId, playlist_id: details.id, video_id: v.id, watched: false }))
        );
        if (progressError) throw progressError;
      }
      
      setPlaylistInput('');
      await loadAll();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add playlist');
    } finally {
      setActionLoading(false);
    }
  }

  async function removePlaylist(playlistId) {
    Alert.alert('Remove Playlist', 'This will remove the playlist and all progress.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await Promise.all([
            supabase.from('youtube_playlists').delete().eq('user_id', userId).eq('playlist_id', playlistId),
            supabase.from('youtube_progress').delete().eq('user_id', userId).eq('playlist_id', playlistId),
          ]);
          if (expandedId === playlistId) setExpandedId(null);
          await loadAll();
        },
      },
    ]);
  }

  // Calculate dynamic stats
  const getWatchedCount = (pId) => (progressMap[pId] || []).filter((v) => v.watched).length;
  const getPct = (pl) => pl.total_videos > 0 ? Math.round((getWatchedCount(pl.playlist_id) / pl.total_videos) * 100) : 0;

  const activePlaylists = playlists.filter(p => getWatchedCount(p.playlist_id) < p.total_videos);
  const completedPlaylists = playlists.filter(p => p.total_videos > 0 && getWatchedCount(p.playlist_id) === p.total_videos);
  
  const totalPlaylists = playlists.length;
  const avgProgress = totalPlaylists > 0 
    ? Math.round(playlists.reduce((acc, p) => acc + getPct(p), 0) / totalPlaylists)
    : 0;

  // Dynamic Insight Generation
  const mizanInsight = useMemo(() => {
    if (activePlaylists.length > 0) {
      // Pick the first active playlist as suggestion
      const target = activePlaylists[0];
      const pct = getPct(target);
      return (
        <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{target.title}</Text> has some unwatched videos — you are at {pct}%. Even one video today keeps the momentum going.
        </Text>
      );
    } else if (completedPlaylists.length > 0) {
      return (
        <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
          You&apos;ve completed all your playlists! Add a new one to continue your learning journey.
        </Text>
      );
    } else {
      return (
        <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
          Build structures around learning and pacing playlists. Add your first YouTube playlist below.
        </Text>
      );
    }
  }, [activePlaylists, completedPlaylists, progressMap]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <BackgroundEffect />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 40 }}>
        
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary }}>
              Learning
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
              {activePlaylists.length} active playlists &middot; {completedPlaylists.length} completed
            </Text>
          </View>
          <View style={{ 
            width: 36, height: 36, 
            borderWidth: 1, borderColor: COLORS.border, 
            borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
          }} />
        </View>

        {/* Add Playlist Form */}
        <View style={{ 
          backgroundColor: isDark ? 'rgba(15, 15, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1, borderColor: isDark ? 'rgba(201, 168, 76, 0.15)' : 'rgba(166, 131, 38, 0.2)',
          borderRadius: 16, padding: 16, marginBottom: 16
        }}>
          <Text style={{ 
            fontFamily: 'Inter_600SemiBold', fontSize: 11, 
            textTransform: 'uppercase', letterSpacing: 1, 
            color: COLORS.gold, marginBottom: 12
          }}>
            Add YouTube Playlist
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              placeholder="Paste YouTube playlist URL..."
              placeholderTextColor={COLORS.textTertiary}
              value={playlistInput}
              onChangeText={setPlaylistInput}
              editable={!actionLoading}
              style={{
                flex: 1, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
                color: COLORS.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 14
              }}
            />
            <TouchableOpacity 
              onPress={handleAddPlaylist}
              disabled={actionLoading}
              style={{
                borderWidth: 1, borderColor: COLORS.border,
                borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center',
                alignItems: 'center', opacity: actionLoading ? 0.5 : 1
              }}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
              ) : (
                <Text style={{ color: COLORS.textPrimary, fontFamily: 'Inter_500Medium', fontSize: 14 }}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{
            flex: 1, backgroundColor: isDark ? 'rgba(15, 15, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: 12, paddingVertical: 16, alignItems: 'center'
          }}>
            <Text style={{ color: COLORS.gold, fontFamily: 'Inter_600SemiBold', fontSize: 24 }}>{activePlaylists.length}</Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.5, marginTop: 4 }}>ACTIVE</Text>
          </View>
          
          <View style={{
            flex: 1, backgroundColor: isDark ? 'rgba(15, 15, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: 12, paddingVertical: 16, alignItems: 'center'
          }}>
            <Text style={{ color: COLORS.successGlow || (isDark ? '#3DA876' : '#2A7A53'), fontFamily: 'Inter_600SemiBold', fontSize: 24 }}>{completedPlaylists.length}</Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.5, marginTop: 4 }}>COMPLETE</Text>
          </View>
          
          <View style={{
            flex: 1, backgroundColor: isDark ? 'rgba(15, 15, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: 12, paddingVertical: 16, alignItems: 'center'
          }}>
            <Text style={{ color: COLORS.gold, fontFamily: 'Inter_600SemiBold', fontSize: 24 }}>{avgProgress}%</Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.5, marginTop: 4, textAlign: 'center' }}>AVG PROGRESS</Text>
          </View>
        </View>

        {/* Mizan Insight */}
        <View style={{
          backgroundColor: isDark ? 'rgba(15, 15, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1, borderColor: isDark ? 'rgba(201, 168, 76, 0.15)' : 'rgba(166, 131, 38, 0.2)',
          borderRadius: 12, padding: 16, marginBottom: 24
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <FontAwesome5 name="star" size={10} color={COLORS.gold} solid style={{ marginRight: 6 }} />
            <Text style={{ color: COLORS.gold, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 }}>
              MIZAN INSIGHT
            </Text>
          </View>
          {mizanInsight}
        </View>

        {/* Active Playlists Section */}
        {activePlaylists.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ 
              color: COLORS.textSecondary, fontFamily: 'Inter_600SemiBold', 
              fontSize: 11, letterSpacing: 1, marginBottom: 12
            }}>
              ACTIVE PLAYLISTS
            </Text>
            {activePlaylists.map(pl => (
              <YouTubeCard
                key={pl.playlist_id}
                playlist={pl}
                progressCount={getWatchedCount(pl.playlist_id)}
                total={pl.total_videos}
                isExpanded={expandedId === pl.playlist_id}
                onToggleExpand={() => handleToggleExpand(pl.playlist_id)}
                onRemove={() => removePlaylist(pl.playlist_id)}
                videos={videosMap[pl.playlist_id]}
                loadingVideos={loadingVideos && expandedId === pl.playlist_id}
                progressList={progressMap[pl.playlist_id]}
                onToggleVideo={(videoId) => handleToggleVideo(pl.playlist_id, videoId)}
              />
            ))}
          </View>
        )}

        {/* Completed Playlists Section */}
        {completedPlaylists.length > 0 && (
          <View>
            <Text style={{ 
              color: COLORS.textSecondary, fontFamily: 'Inter_600SemiBold', 
              fontSize: 11, letterSpacing: 1, marginBottom: 12
            }}>
              COMPLETED
            </Text>
            {completedPlaylists.map(pl => (
              <YouTubeCard
                key={pl.playlist_id}
                playlist={pl}
                progressCount={getWatchedCount(pl.playlist_id)}
                total={pl.total_videos}
                isExpanded={expandedId === pl.playlist_id}
                onToggleExpand={() => handleToggleExpand(pl.playlist_id)}
                onRemove={() => removePlaylist(pl.playlist_id)}
                videos={videosMap[pl.playlist_id]}
                loadingVideos={loadingVideos && expandedId === pl.playlist_id}
                progressList={progressMap[pl.playlist_id]}
                onToggleVideo={(videoId) => handleToggleVideo(pl.playlist_id, videoId)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
