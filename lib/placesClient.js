const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchNearbyMosques(lat, lng, radius = 2000) {
  const query =
    `[out:json][timeout:15];` +
    `(` +
    `node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});` +
    `way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});` +
    `);` +
    `out center 30;`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let json;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) {
      console.warn('Overpass API error or rate limited');
      return [];
    }
    
    json = await res.json();
  } catch (err) {
    console.warn('Overpass fetch failed:', err);
    return [];
  } finally {
    clearTimeout(timer);
  }

  return (json.elements || [])
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;

      const tags = el.tags || {};
      const addressParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:suburb'] || tags['addr:city'],
      ].filter(Boolean);

      const osmId = `${el.type}/${el.id}`;
      return {
        id: osmId,
        place_id: osmId,
        name: tags.name || tags['name:en'] || tags['name:ar'] || 'Mosque',
        address: addressParts.join(', '),
        lat: elLat,
        lng: elLon,
        distance: haversineMeters(lat, lng, elLat, elLon),
        geometry: { location: { lat: elLat, lng: elLon } },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);
}

export async function fetchMosquesWithin100m(lat, lng) {
  return fetchNearbyMosques(lat, lng, 100);
}
