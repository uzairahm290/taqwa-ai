import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Path, Circle } from 'react-native-svg';

const DUAS = [
  {
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhab an-nar",
    meaning: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
    source: 'Quran 2:201',
  },
  {
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
    transliteration: 'Rabbi ishrah li sadri wa yassir li amri',
    meaning: 'My Lord, expand my chest and ease my task for me.',
    source: 'Quran 20:25–26',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
    transliteration: "Allahumma inni as'aluka al-'afwa wal-'afiyata fid-dunya wal-akhirah",
    meaning: 'O Allah, I ask You for pardon and well-being in this world and the Hereafter.',
    source: 'Ibn Majah',
  },
  {
    arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً',
    transliteration: 'Rabbana la tuzigh qulubana ba\'da idh hadaytana wa hab lana min ladunka rahmah',
    meaning: 'Our Lord, do not let our hearts deviate after You have guided us, and grant us mercy from Your presence.',
    source: 'Quran 3:8',
  },
  {
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    transliteration: "Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik",
    meaning: 'O Allah, help me to remember You, to thank You, and to worship You in an excellent manner.',
    source: 'Abu Dawud',
  },
  {
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidni ilma',
    meaning: 'My Lord, increase me in knowledge.',
    source: 'Quran 20:114',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ',
    transliteration: 'Allahumma inni a\'udhu bika minal-hammi wal-hazan',
    meaning: 'O Allah, I seek refuge in You from anxiety and sorrow.',
    source: 'Bukhari',
  },
  {
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: 'Hasbunallahu wa ni\'mal-wakil',
    meaning: 'Allah is sufficient for us, and He is the best Disposer of affairs.',
    source: 'Quran 3:173',
  },
  {
    arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ',
    transliteration: "Rabbana taqabbal minna innaka antas-sami'ul-'alim",
    meaning: 'Our Lord, accept from us. Indeed, You are the Hearing, the Knowing.',
    source: 'Quran 2:127',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ',
    transliteration: "Allahumma inni as'alukal-jannata wa a'udhu bika minan-nar",
    meaning: 'O Allah, I ask You for Paradise and I seek refuge in You from the Fire.',
    source: 'Abu Dawud',
  },
  {
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin waj'alna lil-muttaqina imama",
    meaning: 'Our Lord, grant us from our spouses and offspring comfort to our eyes, and make us an example for the righteous.',
    source: 'Quran 25:74',
  },
  {
    arabic: 'اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي',
    transliteration: "Allahumma aslih li dini alladhi huwa 'ismatu amri",
    meaning: 'O Allah, set right for me my religion, which is the safeguard of my affairs.',
    source: 'Muslim',
  },
  {
    arabic: 'سُبْحَانَكَ لَا عِلْمَ لَنَا إِلَّا مَا عَلَّمْتَنَا إِنَّكَ أَنتَ الْعَلِيمُ الْحَكِيمُ',
    transliteration: "Subhanakal la 'ilma lana illa ma 'allamtana innaka antal-'alimul-hakim",
    meaning: 'Glory be to You! We have no knowledge except what You have taught us. Indeed, You are the Knowing, the Wise.',
    source: 'Quran 2:32',
  },
  {
    arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ',
    transliteration: "Rabbi awzi'ni an ashkura ni'matakal-lati an'amta 'alayya",
    meaning: 'My Lord, inspire me to be grateful for Your blessing which You have bestowed upon me.',
    source: 'Quran 27:19',
  },
  {
    arabic: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',
    transliteration: "Allahummaj'alni minat-tawwabina waj'alni minal-mutatahhirin",
    meaning: 'O Allah, make me among those who repent and among those who purify themselves.',
    source: 'Tirmidhi',
  },
  {
    arabic: 'لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
    transliteration: "La ilaha illa anta subhanaka inni kuntu minaz-zalimin",
    meaning: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.',
    source: 'Quran 21:87',
  },
  {
    arabic: 'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
    transliteration: "Rabbi inni lima anzalta ilayya min khayrin faqir",
    meaning: 'My Lord, indeed I am in need of whatever good You would send down to me.',
    source: 'Quran 28:24',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا',
    transliteration: "Allahumma inni as'aluka 'ilman nafi'an wa rizqan tayyiban wa 'amalan mutaqabbala",
    meaning: 'O Allah, I ask You for beneficial knowledge, wholesome provision, and accepted deeds.',
    source: 'Ibn Majah',
  },
  {
    arabic: 'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا',
    transliteration: "Rabbana-ghfir lana dhunubana wa israfana fi amrina wa thabbit aqdamana",
    meaning: 'Our Lord, forgive us our sins and the excess we have committed in our affairs, and plant firmly our feet.',
    source: 'Quran 3:147',
  },
  {
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ',
    transliteration: "Allahumma anta rabbi la ilaha illa anta khalaqtani wa ana 'abduk",
    meaning: 'O Allah, You are my Lord, there is no god but You. You created me and I am Your servant.',
    source: 'Bukhari — Sayyid al-Istighfar',
  },
  {
    arabic: 'رَبَّنَا لَا تَجْعَلْنَا مَعَ الْقَوْمِ الظَّالِمِينَ',
    transliteration: "Rabbana la taj'alna ma'al-qawmiz-zalimin",
    meaning: 'Our Lord, do not place us with the wrongdoing people.',
    source: 'Quran 7:47',
  },
  {
    arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ',
    transliteration: "Allahumma barik lana fima razaqtana wa qina 'adhaban-nar",
    meaning: 'O Allah, bless what You have provided us and protect us from the punishment of the Fire.',
    source: 'Transmitted',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ حُسْنَ الْخَاتِمَةِ',
    transliteration: "Allahumma inni as'aluka husnal-khatimah",
    meaning: 'O Allah, I ask You for a good end.',
    source: 'Transmitted',
  },
  {
    arabic: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
    transliteration: "Rabbana-ghfir li wa liwalidayya wa lil-mu'minina yawma yaqumul-hisab",
    meaning: 'Our Lord, forgive me and my parents and the believers on the Day the account is established.',
    source: 'Quran 14:41',
  },
  {
    arabic: 'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي',
    transliteration: 'Allahumma-hdini wa saddidni',
    meaning: 'O Allah, guide me and keep me on the straight path.',
    source: 'Muslim',
  },
  {
    arabic: 'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَتَوَفَّنَا مُسْلِمِينَ',
    transliteration: "Rabbana afrigh 'alayna sabran wa tawaffana muslimin",
    meaning: 'Our Lord, pour patience upon us and let us die as Muslims.',
    source: 'Quran 7:126',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ',
    transliteration: "Allahumma inni a'udhu bika minal-kasali wa su'il-kibar",
    meaning: 'O Allah, I seek refuge in You from laziness and the misery of old age.',
    source: 'Bukhari',
  },
  {
    arabic: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ',
    transliteration: "Rabbi-j'alni muqimas-salati wa min dhurriyyati rabbana wa taqabbal du'a'",
    meaning: 'My Lord, make me an establisher of prayer, and from my descendants. Our Lord, accept my supplication.',
    source: 'Quran 14:40',
  },
  {
    arabic: 'اللَّهُمَّ لَكَ أَسْلَمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ',
    transliteration: 'Allahumma laka aslamtu wa bika amantu wa alayka tawakkaltu',
    meaning: 'O Allah, to You I have submitted, in You I have believed, and upon You I have relied.',
    source: 'Bukhari',
  },
  {
    arabic: 'رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ',
    transliteration: "Rabbana innana amanna faghfir lana dhunubana wa qina 'adhaban-nar",
    meaning: 'Our Lord, we have indeed believed, so forgive us our sins and save us from the punishment of the Fire.',
    source: 'Quran 3:16',
  },
  {
    arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
    transliteration: 'Ya muqallibal-qulubi thabbit qalbi ala dinik',
    meaning: 'O Turner of hearts, make my heart firm upon Your religion.',
    source: 'Tirmidhi',
  },
];

function CrescentIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Path
        d="M55 15 C35 15, 20 28, 20 45 C20 62, 35 75, 55 75 C42 70, 34 59, 34 45 C34 31, 42 20, 55 15Z"
        fill={color}
        opacity={0.95}
      />
      <Circle cx={58} cy={28} r={5} fill="transparent" />
    </Svg>
  );
}

export default function DailyDuaCard() {
  const viewShotRef = useRef(null);

  const gold = '#C9A84C';
  const bg = '#0A0A0F';
  const border = 'rgba(201,168,76,0.25)';
  const textPrimary = '#F0EDE6';
  const textSecondary = '#9E9B94';
  const textTertiary = '#5C5A55';

  // Rotate through duas daily
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const dua = DUAS[dayOfYear % DUAS.length];

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  async function handleShare() {
    try {
      const uri = await viewShotRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Daily Dua' });
      } else {
        await Share.share({ url: uri, title: 'Daily Dua' });
      }
    } catch (_) {}
  }

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: textTertiary, letterSpacing: 1.2, marginBottom: 12 }}>
        DAILY DUA
      </Text>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: bg, borderRadius: 20, overflow: 'hidden' }}>
        <View style={{ backgroundColor: bg, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: border }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: textTertiary, letterSpacing: 0.8 }}>
                {dateStr.toUpperCase()}
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: textTertiary, marginTop: 2 }}>
                {dua.source}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CrescentIcon color={gold} size={16} />
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 15, color: gold, letterSpacing: 1 }}>
                Taqwa AI
              </Text>
            </View>
          </View>

          {/* Arabic */}
          <Text style={{
            fontFamily: 'Amiri_400Regular',
            fontSize: 24,
            color: gold,
            textAlign: 'right',
            lineHeight: 42,
            marginBottom: 20,
          }}>
            {dua.arabic}
          </Text>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: border, marginBottom: 16 }} />

          {/* Transliteration */}
          <Text style={{
            fontFamily: 'CormorantGaramond_400Regular',
            fontSize: 15,
            color: textSecondary,
            fontStyle: 'italic',
            lineHeight: 24,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            {dua.transliteration}
          </Text>

          {/* Meaning */}
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            color: textPrimary,
            lineHeight: 22,
            textAlign: 'center',
          }}>
            {dua.meaning}
          </Text>

          {/* Footer */}
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: textTertiary, textAlign: 'center', marginTop: 20, letterSpacing: 0.5 }}>
            taqwaai.app · daily dua
          </Text>
        </View>
      </ViewShot>

      {/* Share button */}
      <TouchableOpacity
        onPress={handleShare}
        activeOpacity={0.8}
        style={{
          marginTop: 12,
          backgroundColor: 'rgba(201,168,76,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(201,168,76,0.3)',
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: gold }}>
          Share as Image
        </Text>
      </TouchableOpacity>
    </View>
  );
}
