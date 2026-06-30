import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { fetchYearlyCalendar, CALCULATION_METHODS, MADHAB } from './aladhanClient';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const METHOD_LABELS = {
  Karachi: 'Univ. of Islamic Sciences, Karachi',
  ISNA: 'Islamic Society of North America',
  MWL: 'Muslim World League',
  Egypt: 'Egyptian General Authority of Survey',
};

function clean(t) {
  return t ? t.split(' ')[0] : '--:--';
}

function fmt12(t) {
  if (!t || t === '--:--') return t;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function buildMonthTable(monthDays, monthIndex) {
  if (!monthDays || !monthDays.length) return '';

  const rows = monthDays.map((day) => {
    const g = day.date?.gregorian;
    const h = day.date?.hijri;
    const t = day.timings || {};

    const gregDate = `${g?.day} ${g?.month?.en?.slice(0, 3)} ${g?.year}`;
    const hijriDate = `${h?.day} ${h?.month?.en?.slice(0, 3)} ${h?.year}`;
    const weekday = g?.weekday?.en?.slice(0, 3) || '';

    return `
      <tr>
        <td class="date-col">
          <span class="weekday">${weekday}</span>
          <span class="greg">${gregDate}</span>
          <span class="hijri">${hijriDate}</span>
        </td>
        <td>${fmt12(clean(t.Imsak))}</td>
        <td class="prayer-col">${fmt12(clean(t.Fajr))}</td>
        <td>${fmt12(clean(t.Dhuhr))}</td>
        <td>${fmt12(clean(t.Asr))}</td>
        <td class="prayer-col">${fmt12(clean(t.Maghrib))}</td>
        <td>${fmt12(clean(t.Isha))}</td>
      </tr>`;
  }).join('');

  return `
    <div class="month-block">
      <h2 class="month-title">${MONTH_NAMES[monthIndex]}</h2>
      <table>
        <thead>
          <tr>
            <th class="date-col">Date</th>
            <th>Sehri</th>
            <th class="prayer-col">Fajr</th>
            <th>Dhuhr</th>
            <th>Asr</th>
            <th class="prayer-col">Maghrib / Iftar</th>
            <th>Isha</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildHTML({ months, year, city, methodName, madhab }) {
  const methodLabel = METHOD_LABELS[methodName] || methodName;
  const monthBlocks = months.map((days, i) => buildMonthTable(days, i)).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 9pt;
    color: #1a1814;
    background: #fff;
    padding: 0;
  }

  .cover {
    text-align: center;
    padding: 60pt 40pt 40pt;
    border-bottom: 1pt solid #e8c96a;
    margin-bottom: 24pt;
  }

  .cover h1 {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 1pt;
    color: #1a1814;
    margin-bottom: 6pt;
  }

  .cover .subtitle {
    font-size: 13pt;
    color: #a68326;
    margin-bottom: 4pt;
  }

  .cover .meta {
    font-size: 9pt;
    color: #666;
    margin-top: 10pt;
    line-height: 1.6;
  }

  .month-block {
    page-break-inside: avoid;
    margin-bottom: 28pt;
    padding: 0 20pt;
  }

  .month-title {
    font-size: 13pt;
    font-weight: 700;
    color: #a68326;
    margin-bottom: 6pt;
    padding-bottom: 4pt;
    border-bottom: 0.5pt solid #e8c96a;
    letter-spacing: 0.5pt;
    text-transform: uppercase;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
  }

  thead tr {
    background: #fdfcf7;
  }

  th {
    text-align: center;
    padding: 5pt 3pt;
    font-weight: 600;
    color: #666;
    font-size: 7.5pt;
    letter-spacing: 0.3pt;
    border-bottom: 0.5pt solid #e0dbd0;
    text-transform: uppercase;
  }

  th.date-col { text-align: left; padding-left: 4pt; }

  td {
    text-align: center;
    padding: 4pt 3pt;
    border-bottom: 0.3pt solid #f0ece4;
    vertical-align: middle;
    color: #333;
  }

  td.date-col {
    text-align: left;
    padding-left: 4pt;
  }

  .weekday {
    display: block;
    font-size: 6.5pt;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.3pt;
  }

  .greg {
    display: block;
    font-weight: 500;
    font-size: 8pt;
    color: #1a1814;
  }

  .hijri {
    display: block;
    font-size: 6.5pt;
    color: #a68326;
  }

  .prayer-col {
    font-weight: 600;
    color: #a68326;
  }

  tr:nth-child(even) td { background: #fdfcf7; }

  tr:nth-child(7n) td, tr:nth-child(7n-1) td {
    border-bottom: 0.5pt solid #e0dbd0;
  }

  .footer {
    text-align: center;
    padding: 12pt 20pt;
    font-size: 7.5pt;
    color: #999;
    border-top: 0.5pt solid #e8c96a;
    margin-top: 12pt;
  }
</style>
</head>
<body>

<div class="cover">
  <h1>Prayer Times ${year}</h1>
  <div class="subtitle">${city || 'Current Location'}</div>
  <div class="meta">
    Calculation Method: ${methodLabel}<br>
    Madhab (Asr): ${madhab === 'Hanafi' ? 'Hanafi (later Asr)' : "Shafi'i / Maliki / Hanbali (earlier Asr)"}<br>
    Times shown in 12-hour format · Sehri = Imsak · Iftar = Maghrib
  </div>
</div>

${monthBlocks}

<div class="footer">
  Generated from Aladhan.com prayer times data · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
</div>

</body>
</html>`;
}

export async function exportAnnualPrayerTimes({ lat, lng, city, year, methodName = 'Karachi', madhab = 'Hanafi', onProgress }) {
  const method = CALCULATION_METHODS[methodName] || 1;
  const school = MADHAB[madhab] ?? 1;

  onProgress?.('Fetching prayer times…');
  const months = await fetchYearlyCalendar(lat, lng, year, method, school);

  onProgress?.('Generating PDF…');
  const html = buildHTML({ months, year, city, methodName, madhab });

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const fileName = `prayer-times-${year}-${(city || 'location').replace(/\s+/g, '-').toLowerCase()}.pdf`;

  onProgress?.('Opening share sheet…');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Prayer Times ${year}`,
    UTI: 'com.adobe.pdf',
  });
}
