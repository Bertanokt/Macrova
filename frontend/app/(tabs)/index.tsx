import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions, RefreshControl,
  Modal, Alert, TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import {
  gunlukTakipGetir, haftalikTakipGetir, profilGetir,
  makroHedefGetir, ogunSil, suEkle, suGunlukGetir,
} from '../../services/api';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

const EKRAN = Dimensions.get('window').width;
const SU_HEDEF = 2500;

const OGUN_IDS = ['kahvalti', 'ogle', 'aksam', 'ara_ogun'] as const;
const OGUN_SEMBOL: Record<string, string> = {
  kahvalti: '🍳', ogle: '🥗', aksam: '🍽️', ara_ogun: '🍎',
};

const GUNLER_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const GUNLER_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AnaSayfa() {
  const router = useRouter();
  const { renkler } = useTemaStore();
  const { t, dil } = useDilStore();
  const GUNLER = dil === 'tr' ? GUNLER_TR : GUNLER_EN;

  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [profil, setProfil] = useState<any>(null);
  const [gunluk, setGunluk] = useState<any>(null);
  const [hedefler, setHedefler] = useState<any>(null);
  const [haftalik, setHaftalik] = useState<any[]>([]);
  const [suVerisi, setSuVerisi] = useState<any>(null);
  const [ozelSuMiktar, setOzelSuMiktar] = useState('');
  const [suYukleniyor, setSuYukleniyor] = useState(false);
  const [detayModal, setDetayModal] = useState(false);
  const [detayOgun, setDetayOgun] = useState<any>(null);
  const [silYukleniyor, setSilYukleniyor] = useState<string | null>(null);

  const veriYukle = async () => {
    try {
      const [profilY, gunlukY, hedefY, haftalikY, suY] = await Promise.all([
        profilGetir(), gunlukTakipGetir(), makroHedefGetir(),
        haftalikTakipGetir(), suGunlukGetir(),
      ]);
      setProfil(profilY.data);
      setGunluk(gunlukY.data);
      setHedefler(hedefY.data);
      setHaftalik(haftalikY.data);
      setSuVerisi(suY.data);
    } catch {}
    finally { setYukleniyor(false); setYenileniyor(false); }
  };

  useFocusEffect(useCallback(() => { veriYukle(); }, []));

  const kaloriHedef = hedefler?.kalori_hedef ?? 2000;
  const tuketilen  = gunluk?.toplam_kalori ?? 0;
  const kalan      = Math.max(0, kaloriHedef - tuketilen);
  const suToplam   = suVerisi?.toplam_ml ?? 0;
  const suYuzde    = Math.min(1, suToplam / SU_HEDEF);

  const selamlama = () => {
    const s = new Date().getHours();
    if (s < 12) return t('gunaydin');
    if (s < 18) return t('iyiGunler');
    return t('iyiAksamlar');
  };

  const makroPct = (val: number, hedef: number) =>
    Math.min(1, hedef > 0 ? val / hedef : 0);

  const suHizliEkle = async (ml: number) => {
    setSuYukleniyor(true);
    try {
      await suEkle(ml);
      const y = await suGunlukGetir();
      setSuVerisi(y.data);
    } catch { Alert.alert(t('hataOlustu'), ''); }
    finally { setSuYukleniyor(false); }
  };

  const suOzelEkle = async () => {
    const ml = parseInt(ozelSuMiktar);
    if (!ml || ml <= 0) return;
    setOzelSuMiktar('');
    await suHizliEkle(ml);
  };

  const ogunKartTikla = (ogunId: string) => {
    const ogunVerisi = gunluk?.ogunler?.[ogunId] ?? [];
    if (ogunVerisi.length > 0) {
      setDetayOgun({ id: ogunId, sembol: OGUN_SEMBOL[ogunId], isim: t(ogunId === 'ara_ogun' ? 'araOgun' : ogunId) });
      setDetayModal(true);
    } else {
      router.push({ pathname: '/(tabs)/yemek-ekle', params: { ogun: ogunId } });
    }
  };

  const ogunSilHandler = (kayitId: string, yemekIsim: string, yemekIsimEn?: string) => {
    const gosterIsim = dil === 'en' ? (yemekIsimEn ?? yemekIsim) : yemekIsim;
    Alert.alert(t('sil'), `"${gosterIsim}" ${t('sil').toLowerCase()}?`, [
      { text: t('iptal'), style: 'cancel' },
      {
        text: t('sil'), style: 'destructive',
        onPress: async () => {
          setSilYukleniyor(kayitId);
          try {
            await ogunSil(kayitId);
            const y = await gunlukTakipGetir();
            setGunluk(y.data);
            const yeni = y.data?.ogunler?.[detayOgun?.id] ?? [];
            if (yeni.length === 0) setDetayModal(false);
          } catch { Alert.alert(t('hataOlustu'), ''); }
          finally { setSilYukleniyor(null); }
        },
      },
    ]);
  };

  const styles = makeStyles(renkler);

  if (yukleniyor) {
    return (
      <View style={[styles.merkez, { backgroundColor: renkler.arkaplan }]}>
        <ActivityIndicator size="large" color={renkler.ana} />
      </View>
    );
  }

  const grafik  = haftalik.length > 0 ? haftalik : Array(7).fill({ toplam_kalori: 0 });
  const gVeri   = grafik.map((g: any) => Math.max(0, Math.round(g.toplam_kalori || 0)));
  const gEtiket = grafik.map((g: any) => {
    if (!g.tarih) return '';
    const d = new Date(g.tarih);
    return GUNLER[d.getDay() === 0 ? 6 : d.getDay() - 1];
  });

  const detayVerisi = gunluk?.ogunler?.[detayOgun?.id] ?? [];

  return (
    <ScrollView
      style={styles.kap}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={yenileniyor}
          onRefresh={() => { setYenileniyor(true); veriYukle(); }}
          tintColor={renkler.ana} />
      }
    >
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.selamlama}>{selamlama()}</Text>
          <Text style={styles.isim}>{profil?.isim ?? ''} 👋</Text>
        </View>
        <View style={styles.avatarDaire}>
          <Text style={styles.avatarHarf}>
            {profil?.isim?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      </View>

      {/* ─── KALORİ ─── */}
      <View style={styles.kaloriKap}>
        <Text style={styles.kaloriSayi}>{Math.round(kalan)}</Text>
        <Text style={styles.kaloriEtiket}>{t('kalanKcal')}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <Text style={styles.kaloriAlt}>🍽️ {Math.round(tuketilen)} kcal {t('tuketilen')}</Text>
          <Text style={[styles.kaloriAlt, { color: renkler.yaziAcik }]}>·</Text>
          <Text style={styles.kaloriAlt}>🎯 {Math.round(kaloriHedef)} kcal {t('hedef')}</Text>
        </View>
      </View>

      {/* ─── MAKRO BARLAR ─── */}
      <View style={styles.makroSatir}>
        {[
          { key: 'protein',    val: gunluk?.toplam_protein ?? 0,       hedef: hedefler?.protein_hedef ?? 150,      renk: renkler.mavi },
          { key: 'karbonhidrat', val: gunluk?.toplam_karbonhidrat ?? 0, hedef: hedefler?.karbonhidrat_hedef ?? 200, renk: renkler.turuncu },
          { key: 'yag',        val: gunluk?.toplam_yag ?? 0,           hedef: hedefler?.yag_hedef ?? 65,           renk: renkler.mor },
        ].map((m, i, arr) => (
          <React.Fragment key={m.key}>
            <View style={styles.makroKart}>
              <Text style={[styles.makroSayi, { color: m.renk }]}>{Math.round(m.val)}g</Text>
              <Text style={styles.makroEtiket}>{t(m.key)}</Text>
              <View style={styles.makroBarArka}>
                <View style={[styles.makroBarDolu, { width: `${makroPct(m.val, m.hedef) * 100}%`, backgroundColor: m.renk }]} />
              </View>
              <Text style={styles.makroHedef}>{Math.round(m.hedef)}g</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.makroAyirici} />}
          </React.Fragment>
        ))}
      </View>

      {/* ─── SU TAKİBİ ─── */}
      <View style={styles.suKap}>
        <View style={styles.suUstSatir}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={{ fontSize: 16 }}>💧</Text>
            <Text style={styles.suBaslik}>{t('suTakibi')}</Text>
          </View>
          <Text style={styles.suMiktar}>
            <Text style={{ color: renkler.mavi, fontWeight: '700' }}>{suToplam}</Text>
            <Text style={styles.suHedefYazi}> / {SU_HEDEF} ml</Text>
          </Text>
        </View>
        <View style={styles.suBarArka}>
          <View style={[styles.suBarDolu, { width: `${suYuzde * 100}%` }]} />
        </View>
        <View style={styles.suButonlar}>
          {[200, 300, 500].map((ml) => (
            <TouchableOpacity key={ml} style={styles.suButon}
              onPress={() => suHizliEkle(ml)} disabled={suYukleniyor}>
              <Text style={[styles.suButonYazi, { color: renkler.mavi }]}>+{ml}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.suInputKap}>
            <TextInput
              style={[styles.suInput, { color: renkler.yazi }]}
              placeholder="ml" placeholderTextColor={renkler.yaziAcik}
              value={ozelSuMiktar} onChangeText={setOzelSuMiktar}
              keyboardType="numeric"
            />
            <TouchableOpacity style={[styles.suEkleButon, { backgroundColor: renkler.mavi }]}
              onPress={suOzelEkle} disabled={suYukleniyor}>
              {suYukleniyor
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.suEkleYazi}>+</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── ÖĞÜNLER ─── */}
      <Text style={styles.bolumBaslik}>{t('bugunOgunler')}</Text>
      <View style={styles.ogunListeKap}>
        {OGUN_IDS.map((id, i) => {
          const anahtar  = id === 'ara_ogun' ? 'araOgun' : id;
          const veri     = gunluk?.ogunler?.[id] ?? [];
          const kalori   = veri.reduce((t: number, y: any) => t + (y.kalori ?? 0), 0);
          const sonMu    = i === OGUN_IDS.length - 1;
          return (
            <React.Fragment key={id}>
              <TouchableOpacity style={styles.ogunSatir} onPress={() => ogunKartTikla(id)}>
                <Text style={styles.ogunSembol}>{OGUN_SEMBOL[id]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ogunIsim}>{t(anahtar)}</Text>
                  <Text style={styles.ogunAdet}>
                    {veri.length > 0 ? t('yemekVar', { sayi: veri.length }) : t('yemekYok')}
                  </Text>
                </View>
                <Text style={[styles.ogunKalori, { color: veri.length > 0 ? renkler.ana : renkler.yaziAcik }]}>
                  {veri.length > 0 ? `${Math.round(kalori)} kcal` : ''}
                </Text>
                <Text style={styles.ogunOk}>›</Text>
              </TouchableOpacity>
              {!sonMu && <View style={styles.ayirici} />}
            </React.Fragment>
          );
        })}
      </View>

      {/* ─── HAFTALIK GRAFİK ─── */}
      <Text style={styles.bolumBaslik}>{t('haftalikOzet')}</Text>
      <View style={[styles.grafikKap, { backgroundColor: renkler.kart }]}>
        <BarChart
          data={{ labels: gEtiket, datasets: [{ data: gVeri.map(v => v || 0) }] }}
          width={EKRAN - 64}
          height={160}
          yAxisLabel="" yAxisSuffix=""
          chartConfig={{
            backgroundColor: renkler.kart,
            backgroundGradientFrom: renkler.kart,
            backgroundGradientTo: renkler.kart,
            decimalPlaces: 0,
            color: (op = 1) => `rgba(46,204,113,${op})`,
            labelColor: () => renkler.yaziAcik,
            barPercentage: 0.55,
            propsForBackgroundLines: { strokeDasharray: '4', stroke: renkler.sinir, strokeWidth: 1 },
          }}
          style={{ borderRadius: 8 }}
          showValuesOnTopOfBars={false}
          withInnerLines
          fromZero
        />
        {kaloriHedef > 0 && (
          <Text style={[styles.hedefCizgiYazi, { color: renkler.yaziAcik }]}>
            Hedef: {Math.round(kaloriHedef)} kcal
          </Text>
        )}
      </View>

      <View style={{ height: 32 }} />

      {/* ─── ÖĞÜN DETAY MODALI ─── */}
      <Modal visible={detayModal} transparent animationType="slide">
        <View style={styles.modalArka}>
          <View style={[styles.modal, { backgroundColor: renkler.kart }]}>
            <View style={styles.modalBaslikSatir}>
              <Text style={[styles.modalBaslik, { color: renkler.yazi }]}>
                {detayOgun?.sembol} {detayOgun?.isim}
              </Text>
              <TouchableOpacity onPress={() => setDetayModal(false)}>
                <Text style={[styles.kapat, { color: renkler.yaziAcik }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {detayVerisi.map((item: any) => (
                <View key={item.id} style={[styles.detayItem, { borderBottomColor: renkler.sinir }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detayIsim, { color: renkler.yazi }]}>
                      {dil === 'en' ? (item.yemek_isim_en ?? item.yemek_isim) : item.yemek_isim}
                    </Text>
                    <Text style={[styles.detayAlt, { color: renkler.yaziAcik }]}>
                      {item.miktar_gram}g · {Math.round(item.kalori)} kcal
                    </Text>
                    <View style={styles.detayMakrolar}>
                      <Text style={[styles.detayMakro, { color: renkler.mavi }]}>P {Math.round(item.protein)}g</Text>
                      <Text style={[styles.detayMakro, { color: renkler.turuncu }]}>K {Math.round(item.karbonhidrat)}g</Text>
                      <Text style={[styles.detayMakro, { color: renkler.mor }]}>Y {Math.round(item.yag)}g</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.silButon}
                    onPress={() => ogunSilHandler(item.id, item.yemek_isim, item.yemek_isim_en)}
                    disabled={silYukleniyor === item.id}>
                    {silYukleniyor === item.id
                      ? <ActivityIndicator size="small" color={renkler.kirmizi} />
                      : <Text style={styles.silIkon}>🗑️</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.ekleButon, { backgroundColor: renkler.ana }]}
              onPress={() => {
                setDetayModal(false);
                router.push({ pathname: '/(tabs)/yemek-ekle', params: { ogun: detayOgun?.id } });
              }}>
              <Text style={styles.ekleButonYazi}>+ {t('yemekEkleButon')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Dinamik stiller — renkler her render'da güncellenir
const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:           { flex: 1, backgroundColor: r.arkaplan },
    merkez:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // Header
    header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
    selamlama:     { fontSize: 13, color: r.yaziAcik },
    isim:          { fontSize: 24, fontWeight: '800', color: r.yazi },
    avatarDaire:   { width: 44, height: 44, borderRadius: 22, backgroundColor: r.ana, alignItems: 'center', justifyContent: 'center' },
    avatarHarf:    { fontSize: 18, fontWeight: '800', color: '#fff' },
    // Kalori
    kaloriKap:     { alignItems: 'center', paddingVertical: 24 },
    kaloriSayi:    { fontSize: 72, fontWeight: '800', color: r.yazi, letterSpacing: -2 },
    kaloriEtiket:  { fontSize: 15, color: r.yaziAcik, marginTop: 2 },
    kaloriAlt:     { fontSize: 15, color: r.yaziAcik, marginTop: 6 },
    // Makro
    makroSatir:    { flexDirection: 'row', marginHorizontal: 16, backgroundColor: r.kart, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    makroKart:     { flex: 1, alignItems: 'center' },
    makroSayi:     { fontSize: 20, fontWeight: '800' },
    makroEtiket:   { fontSize: 11, color: r.yaziAcik, marginTop: 2, marginBottom: 6 },
    makroBarArka:  { width: '100%', height: 4, backgroundColor: r.sinir, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
    makroBarDolu:  { height: 4, borderRadius: 2 },
    makroHedef:    { fontSize: 10, color: r.yaziAcik },
    makroAyirici:  { width: 1, backgroundColor: r.sinir, marginVertical: 4 },
    // Su
    suKap:         { marginHorizontal: 16, marginTop: 16, backgroundColor: r.kart, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    suUstSatir:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    suBaslik:      { fontSize: 14, fontWeight: '700', color: r.yazi },
    suMiktar:      { fontSize: 13 },
    suHedefYazi:   { color: r.yaziAcik, fontSize: 12 },
    suBarArka:     { height: 6, backgroundColor: r.sinir, borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
    suBarDolu:     { height: 6, backgroundColor: r.mavi, borderRadius: 3 },
    suButonlar:    { flexDirection: 'row', gap: 6, alignItems: 'center' },
    suButon:       { backgroundColor: r.arkaplan, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: r.sinir },
    suButonYazi:   { fontSize: 12, fontWeight: '700' },
    suInputKap:    { flex: 1, flexDirection: 'row', gap: 4 },
    suInput:       { flex: 1, backgroundColor: r.arkaplan, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 13, borderWidth: 1, borderColor: r.sinir },
    suEkleButon:   { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
    suEkleYazi:    { color: '#fff', fontSize: 16, fontWeight: '700' },
    // Bölüm başlığı
    bolumBaslik:   { fontSize: 13, fontWeight: '700', color: r.yaziAcik, paddingHorizontal: 20, marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    // Öğün liste
    ogunListeKap:  { marginHorizontal: 16, backgroundColor: r.kart, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    ogunSatir:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    ogunSembol:    { fontSize: 22, width: 30, textAlign: 'center' },
    ogunIsim:      { fontSize: 15, fontWeight: '700', color: r.yazi },
    ogunAdet:      { fontSize: 12, color: r.yaziAcik, marginTop: 1 },
    ogunKalori:    { fontSize: 15, fontWeight: '700' },
    ogunOk:        { fontSize: 20, color: r.yaziAcik, fontWeight: '300' },
    ayirici:       { height: 1, backgroundColor: r.sinir, marginLeft: 60 },
    // Grafik
    grafikKap:     { marginHorizontal: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    hedefCizgiYazi:{ fontSize: 11, textAlign: 'right', marginTop: 4 },
    // Modal
    modalArka:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalBaslikSatir:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalBaslik:   { fontSize: 20, fontWeight: '800' },
    kapat:         { fontSize: 18, padding: 4 },
    detayItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    detayIsim:     { fontSize: 15, fontWeight: '600' },
    detayAlt:      { fontSize: 12, marginTop: 2 },
    detayMakrolar: { flexDirection: 'row', gap: 10, marginTop: 5 },
    detayMakro:    { fontSize: 12, fontWeight: '700' },
    silButon:      { padding: 8 },
    silIkon:       { fontSize: 20 },
    ekleButon:     { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16 },
    ekleButonYazi: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
