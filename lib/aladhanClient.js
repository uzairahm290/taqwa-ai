const BASE = 'https://api.aladhan.com/v1';

export async function fetchPrayerTimes(lat, lng, method = 1, school = 1, targetDate = new Date()) {
  const dateStr = `${targetDate.getDate()}-${targetDate.getMonth() + 1}-${targetDate.getFullYear()}`;
  const url = `${BASE}/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data;
}

export async function fetchPrayerTimesByCity(city, country = 'PK', method = 1, school = 1) {
  const date = new Date();
  const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  const url = `${BASE}/timingsByCity/${dateStr}?city=${encodeURIComponent(city)}&country=${country}&method=${method}&school=${school}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data;
}

export async function fetchMonthlyCalendar(lat, lng, month, year, method = 1) {
  const url = `${BASE}/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=${method}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data;
}

export async function fetchYearlyCalendar(lat, lng, year, method = 1, school = 1) {
  const months = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const url = `${BASE}/calendar/${year}/${i + 1}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
      return fetch(url).then((r) => r.json()).then((j) => j.data);
    })
  );
  return months; // array of 12 arrays of days
}

export async function fetchHijriDate() {
  const date = new Date();
  const dateStr = `${date.getDate()}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  const url = `${BASE}/gToH/${dateStr}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    return json.data.hijri;
  } catch (err) {
    // Fallback: Kuwaiti Algorithm for Hijri date calculation
    console.warn('Aladhan API failed, using local Hijri fallback', err.message);
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    let m = month;
    let y = year;
    if (m < 3) {
      y -= 1;
      m += 12;
    }

    let a = Math.floor(y / 100);
    let b = 2 - a + Math.floor(a / 4);
    if (y < 1583) b = 0;
    if (y === 1582) {
      if (m > 10) b = -10;
      if (m === 10) {
        b = 0;
        if (day > 4) b = -10;
      }
    }

    let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
    let bb = 0;
    if (jd > 2299160) {
      a = Math.floor((jd - 1867216.25) / 36524.25);
      bb = 1 + a - Math.floor(a / 4);
    }
    let bbb = jd + bb + 1524;
    let cc = Math.floor((bbb - 122.1) / 365.25);
    let dd = Math.floor(365.25 * cc);
    // ee unused in julian conversion
    
    let z = jd - 1948084;
    let cyc = Math.floor(z / 10631);
    z = z - 10631 * cyc;
    let j = Math.floor((z - (8.01 / 60)) / (10631 / 30));
    let iy = 30 * cyc + j;
    z = z - Math.floor(j * (10631 / 30) + (8.01 / 60));
    let im = Math.floor((z + 28.5001) / 29.5);
    if (im === 13) im = 12;
    let id = z - Math.floor(29.5001 * im - 29);

    const monthNames = [
      'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah',
      'Rajab', 'Sha\'ban', 'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
    ];

    return {
      day: String(id),
      month: {
        number: im,
        en: monthNames[im - 1],
      },
      year: String(iy)
    };
  }
}

export async function fetchQiblaDirection(lat, lng) {
  const url = `${BASE}/qibla/${lat}/${lng}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data;
}

// Calculation method codes
export const CALCULATION_METHODS = {
  Karachi: 1,
  ISNA: 2,
  MWL: 3,
  Egypt: 5,
};

// School (madhab) codes for Asr — Maliki/Hanbali share the Shafi'i calculation
export const MADHAB = {
  Shafi: 0,
  Hanafi: 1,
  Maliki: 0,
  Hanbali: 0,
};
