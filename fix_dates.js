const fs = require('fs');
const glob = require('glob');

const files = [
  'app/(tabs)/more.jsx',
  'app/(tabs)/habits.jsx',
  'app/(tabs)/index.jsx',
  'app/(tabs)/salah.jsx',
  'app/(tabs)/quran.jsx',
  'components/WeeklyGrid.jsx',
  'components/QuranTracker.jsx',
  'hooks/usePrayerTimes.js',
  'hooks/useQuran.js',
  'hooks/useMosque.js',
  'hooks/useGemini.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import { getLocalDateString } from")) {
    let depth = file.split('/').length - 1;
    let relPath = Array(depth).fill('..').join('/');
    if (depth === 0) relPath = '.';
    let importStmt = `import { getLocalDateString } from '${relPath}/lib/dateUtils';\n`;
    if (file.startsWith('hooks') || file.startsWith('components')) {
        importStmt = `import { getLocalDateString } from '../lib/dateUtils';\n`;
    }
    if (file.startsWith('app/(tabs)')) {
        importStmt = `import { getLocalDateString } from '../../lib/dateUtils';\n`;
    }
    content = importStmt + content;
  }
  
  content = content.replace(/new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g, "getLocalDateString()");
  content = content.replace(/d\.toISOString\(\)\.split\('T'\)\[0\]/g, "getLocalDateString(d)");
  content = content.replace(/targetDate\.toISOString\(\)\.split\('T'\)\[0\]/g, "getLocalDateString(targetDate)");
  
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
