/**
 * Run once: node scripts/download-quran.js
 * Downloads the full Quran (Arabic + Sahih International English) from Al-Quran Cloud
 * and saves it as assets/quran.json (~3.5 MB).
 * After this, the app needs no API calls for Quran text.
 */

const fs = require('fs');
const path = require('path');

async function download() {
  console.log('⬇  Fetching Arabic text (Uthmani script)...');
  const arabicRes = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
  const arabicJson = await arabicRes.json();
  if (arabicJson.code !== 200) throw new Error('Arabic fetch failed: ' + JSON.stringify(arabicJson));

  console.log('⬇  Fetching English translation (Sahih International)...');
  const englishRes = await fetch('https://api.alquran.cloud/v1/quran/en.sahih');
  const englishJson = await englishRes.json();
  if (englishJson.code !== 200) throw new Error('English fetch failed: ' + JSON.stringify(englishJson));

  console.log('🔨  Merging and structuring...');
  const quran = arabicJson.data.surahs.map((surah, idx) => ({
    id: surah.number,
    name: surah.englishName,
    nameAr: surah.name,
    type: surah.revelationType,       // 'Meccan' | 'Medinan'
    count: surah.numberOfAyahs,
    verses: surah.ayahs.map((ayah, vIdx) => ({
      id: ayah.numberInSurah,
      gid: ayah.number,               // global verse id 1–6236 (used for audio URL)
      ar: ayah.text,
      en: englishJson.data.surahs[idx].ayahs[vIdx].text,
    })),
  }));

  const outPath = path.join(__dirname, '../assets/quran.json');
  fs.writeFileSync(outPath, JSON.stringify(quran));

  const sizeMb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`✅  Saved ${quran.length} surahs → assets/quran.json (${sizeMb} MB)`);
}

download().catch((err) => { console.error('❌ ', err); process.exit(1); });
