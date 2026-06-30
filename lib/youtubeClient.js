const YT_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

export function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

export async function fetchPlaylistDetails(playlistId) {
  const url = `${BASE}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YT_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  const item = json.items?.[0];
  if (!item) throw new Error('Playlist not found');
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails?.medium?.url,
    totalVideos: item.contentDetails.itemCount,
  };
}

export async function fetchPlaylistVideos(playlistId, pageToken = null) {
  let url = `${BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${YT_KEY}`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  const res = await fetch(url);
  const json = await res.json();
  const videos = (json.items || []).map((item) => ({
    id: item.contentDetails.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.default?.url,
    position: item.snippet.position,
  }));
  return { videos, nextPageToken: json.nextPageToken };
}

export async function fetchAllPlaylistVideos(playlistId) {
  let allVideos = [];
  let pageToken = null;
  do {
    const { videos, nextPageToken } = await fetchPlaylistVideos(playlistId, pageToken);
    allVideos = [...allVideos, ...videos];
    pageToken = nextPageToken;
  } while (pageToken);
  return allVideos;
}
