import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, FlatList,
  RefreshControl, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  antrenmanIstatistik, sablonlariGetir, antrenmanGecmisi,
  egzersizleriGetir, antrenmanBaslat, setEkle, setGuncelle,
  antrenmanBitir, sablonOlustur, antrenmanSil,
} from '../../services/api';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

const KAS_GRUPLARI_TR = ['Tümü', 'göğüs', 'sırt', 'omuz', 'biceps', 'triceps', 'bacak', 'karın', 'kardiyo'];
const KAS_GRUPLARI_EN = ['All',  'chest', 'back', 'shoulder', 'biceps', 'triceps', 'leg',  'abs',  'cardio'];

interface AktifSet {
  id?: string; set_no: number;
  kg: string; tekrar: string; tamamlandi: boolean;
}
interface AktifEgzersiz { egzersiz: any; setler: AktifSet[]; }

// Aktif antrenman modalı içindeki ekranlar
type AktifEkran = 'antrenman' | 'picker' | 'bitir';

export default function AntrenmanEkrani() {
  const { renkler } = useTemaStore();
  const { dil }     = useDilStore();
  const KG          = dil === 'tr' ? KAS_GRUPLARI_TR : KAS_GRUPLARI_EN;
  const tr          = (t: string, e: string) => dil === 'tr' ? t : e;

  // ── Ana ekran ──
  const [istatistik, setIstatistik]   = useState<any>(null);
  const [sablonlar, setSablonlar]     = useState<any[]>([]);
  const [gecmis, setGecmis]           = useState<any[]>([]);
  const [yukleniyor, setYukleniyor]   = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  // ── Aktif antrenman ──
  const [aktifLogId, setAktifLogId]             = useState<string | null>(null);
  const [aktifAdi, setAktifAdi]                 = useState('');
  const [aktifEgzersizler, setAktifEgzersizler] = useState<AktifEgzersiz[]>([]);

  // ── Modal ve ekran yönetimi ──
  // TEK modal (gosterAktif), içinde ekran geçişi yapıyoruz
  const [gosterAktif, setGosterAktif]   = useState(false);
  const [aktifEkran, setAktifEkran]     = useState<AktifEkran>('antrenman');
  const [gosterOzet, setGosterOzet]     = useState(false);
  const [gosterSablon, setGosterSablon] = useState(false);
  const [ozet, setOzet]                 = useState<any>(null);
  const [bitirSure, setBitirSure]       = useState('');

  // ── Egzersiz picker ──
  const [egzersizler, setEgzersizler]   = useState<any[]>([]);
  const [seciliKas, setSeciliKas]       = useState(KG[0]);
  const [egArama, setEgArama]           = useState('');
  const [egYukleniyor, setEgYukleniyor] = useState(false);
  const [egHata, setEgHata]             = useState(false);

  // ── Şablon ──
  const [sablonAdi, setSablonAdi] = useState('');

  // ── Veri yükle ───────────────────────────────────────────────────────────
  const veriYukle = async () => {
    try {
      const [ist, sab, gec] = await Promise.all([
        antrenmanIstatistik(), sablonlariGetir(), antrenmanGecmisi(10),
      ]);
      setIstatistik(ist.data);
      setSablonlar(sab.data);
      setGecmis(gec.data);
    } catch {}
    finally { setYukleniyor(false); setYenileniyor(false); }
  };

  useFocusEffect(useCallback(() => { veriYukle(); }, []));

  // ── Antrenman başlat ──────────────────────────────────────────────────────
  const antrenmanBaslatHandler = async (sablon?: any) => {
    try {
      const yanit = await antrenmanBaslat({
        sablon_id: sablon?.id,
        antrenman_adi: sablon?.isim || tr('Antrenman', 'Workout'),
      });
      setAktifLogId(yanit.data.id);
      setAktifAdi(yanit.data.antrenman_adi);
      setAktifEgzersizler(
        sablon?.sablon_egzersizleri?.length
          ? sablon.sablon_egzersizleri.map((se: any) => ({
              egzersiz: se.egzersizler,
              setler: Array.from({ length: se.hedef_set || 3 }, (_, i) => ({
                set_no: i + 1, kg: String(se.hedef_kg || ''),
                tekrar: se.hedef_rep?.split('-')[0] || '', tamamlandi: false,
              })),
            }))
          : []
      );
      setAktifEkran('antrenman');
      setGosterAktif(true);
    } catch {
      Alert.alert(tr('Hata', 'Error'), tr('Antrenman başlatılamadı.', 'Could not start workout.'));
    }
  };

  // ── Egzersiz picker ───────────────────────────────────────────────────────
  const egzersizlerYukle = async (kas?: string, arama?: string) => {
    setEgYukleniyor(true); setEgHata(false);
    try {
      const kg  = kas && kas !== KG[0] ? kas : undefined;
      const ara = arama && arama.length >= 2 ? arama : undefined;
      const r   = await egzersizleriGetir(kg, ara);
      setEgzersizler(r.data || []);
    } catch {
      setEgHata(true);
    } finally {
      setEgYukleniyor(false);
    }
  };

  const pickerAc = () => {
    setSeciliKas(KG[0]); setEgArama('');
    setAktifEkran('picker');
    egzersizlerYukle();
  };

  const egzersizSec = (eg: any) => {
    setAktifEgzersizler(prev => [...prev, {
      egzersiz: eg,
      setler: [{ set_no: 1, kg: '', tekrar: '', tamamlandi: false }],
    }]);
    setAktifEkran('antrenman');
  };

  // ── Set işlemleri ─────────────────────────────────────────────────────────
  const setGuncelleFn = (ei: number, si: number, alan: 'kg' | 'tekrar', v: string) => {
    setAktifEgzersizler(prev => {
      const yeni = [...prev];
      yeni[ei] = { ...yeni[ei], setler: yeni[ei].setler.map((s, i) => i === si ? { ...s, [alan]: v } : s) };
      return yeni;
    });
  };

  const setTamamlaFn = async (ei: number, si: number) => {
    if (!aktifLogId) return;
    const eg = aktifEgzersizler[ei];
    const set = eg.setler[si];
    try {
      if (set.id) {
        await setGuncelle(set.id, { tamamlandi: !set.tamamlandi });
      } else {
        const r = await setEkle({
          antrenman_log_id: aktifLogId,
          egzersiz_id: eg.egzersiz.id,
          set_no: set.set_no,
          kg: parseFloat(set.kg) || undefined,
          tekrar: parseInt(set.tekrar) || undefined,
          tamamlandi: true,
        });
        setAktifEgzersizler(prev => {
          const yeni = [...prev];
          yeni[ei] = { ...yeni[ei], setler: yeni[ei].setler.map((s, i) => i === si ? { ...s, tamamlandi: true, id: r.data.id } : s) };
          return yeni;
        });
        return;
      }
    } catch {}
    setAktifEgzersizler(prev => {
      const yeni = [...prev];
      yeni[ei] = { ...yeni[ei], setler: yeni[ei].setler.map((s, i) => i === si ? { ...s, tamamlandi: !s.tamamlandi } : s) };
      return yeni;
    });
  };

  const yeniSetEkle = (ei: number) => {
    setAktifEgzersizler(prev => {
      const yeni = [...prev];
      const setler = yeni[ei].setler;
      yeni[ei] = { ...yeni[ei], setler: [...setler, { set_no: setler.length + 1, kg: setler.at(-1)?.kg || '', tekrar: setler.at(-1)?.tekrar || '', tamamlandi: false }] };
      return yeni;
    });
  };

  const egzersizSilFn = (ei: number) => {
    Alert.alert(tr('Egzersizi Kaldır', 'Remove Exercise'), tr('Bu egzersizi kaldırmak istiyor musun?', 'Remove this exercise?'), [
      { text: tr('İptal', 'Cancel'), style: 'cancel' },
      { text: tr('Kaldır', 'Remove'), style: 'destructive', onPress: () => setAktifEgzersizler(prev => prev.filter((_, i) => i !== ei)) },
    ]);
  };

  // ── Antrenman bitir ───────────────────────────────────────────────────────
  const antrenmanBitirOnayla = async () => {
    if (!aktifLogId) return;
    const dakika = parseInt(bitirSure) || 0;
    try {
      const r = await antrenmanBitir(aktifLogId, { sure_dakika: dakika || undefined });
      setOzet({ ...r.data.ozet, sure_dakika: dakika });
      setGosterAktif(false);
      setGosterOzet(true);
      setBitirSure(''); setAktifLogId(null); setAktifEgzersizler([]);
      veriYukle();
    } catch {
      Alert.alert(tr('Hata', 'Error'), tr('Bir hata oluştu.', 'An error occurred.'));
    }
  };

  // ── Geçmiş sil ───────────────────────────────────────────────────────────
  const antrenmanSilHandler = (logId: string, adi: string) => {
    Alert.alert(tr('Antrenmanı Sil', 'Delete Workout'), tr(`"${adi}" silinecek.`, `"${adi}" will be deleted.`), [
      { text: tr('İptal', 'Cancel'), style: 'cancel' },
      { text: tr('Sil', 'Delete'), style: 'destructive', onPress: async () => {
        try {
          await antrenmanSil(logId);
          setGecmis(prev => prev.filter(l => l.id !== logId));
          veriYukle();
        } catch {}
      }},
    ]);
  };

  // ── Şablon kaydet ─────────────────────────────────────────────────────────
  const sablonKaydet = async () => {
    if (!sablonAdi.trim()) { Alert.alert(tr('Uyarı', 'Warning'), tr('Şablon adı girin.', 'Enter template name.')); return; }
    try { await sablonOlustur({ isim: sablonAdi, egzersizler: [] }); setSablonAdi(''); setGosterSablon(false); veriYukle(); } catch {}
  };

  const s = makeStyles(renkler);

  if (yukleniyor) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: renkler.arkaplan }}>
      <ActivityIndicator size="large" color={renkler.ana} />
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Aktif antrenman modalı içinde — EGZERSİZ PİCKER ekranı
  // ─────────────────────────────────────────────────────────────────────────
  const renderPicker = () => (
    <SafeAreaView style={[s.kap, { paddingTop: 0 }]}>
      {/* Üst bar */}
      <View style={s.modalBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setAktifEkran('antrenman')}>
          <Text style={{ color: renkler.ana, fontSize: 15, fontWeight: '600' }}>← {tr('Geri', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={s.modalBaslik}>{tr('Egzersiz Seç', 'Select Exercise')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Arama */}
      <TextInput
        style={s.aramaInput}
        placeholder={tr('🔍 Egzersiz ara...', '🔍 Search...')}
        placeholderTextColor={renkler.yaziAcik}
        value={egArama}
        onChangeText={v => { setEgArama(v); egzersizlerYukle(seciliKas, v); }}
      />

      {/* Kas grubu filtresi */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.kasFiltre} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {KG.map(k => (
          <TouchableOpacity key={k} style={[s.kasButon, seciliKas === k && s.kasButonAktif]} activeOpacity={0.7}
            onPress={() => { setSeciliKas(k); egzersizlerYukle(k, egArama); }}>
            <Text style={[s.kasYazi, seciliKas === k && { color: '#fff' }]}>
              {(k === 'kardiyo' || k === 'cardio') ? '🏃 ' + k : k}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sonuçlar */}
      {egYukleniyor ? (
        <ActivityIndicator style={{ marginTop: 48 }} size="large" color={renkler.ana} />
      ) : egHata ? (
        <View style={s.bosKart}>
          <Text style={s.bosEmoji}>⚠️</Text>
          <Text style={s.bosBaslik}>{tr('Yüklenemedi', 'Failed to load')}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => egzersizlerYukle(seciliKas, egArama)}>
            <Text style={{ color: renkler.ana, fontWeight: '600', marginTop: 8 }}>{tr('Tekrar dene', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : egzersizler.length === 0 ? (
        <View style={s.bosKart}>
          <Text style={s.bosEmoji}>🔍</Text>
          <Text style={s.bosBaslik}>{tr('Sonuç yok', 'No results')}</Text>
        </View>
      ) : (
        <FlatList
          data={egzersizler}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const isKardiyo = item.kas_grubu === 'kardiyo' || item.kas_grubu === 'cardio';
            return (
              <TouchableOpacity style={s.egzersizSatir} activeOpacity={0.7} onPress={() => egzersizSec(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.egzersizSatirAdi}>{item.isim}</Text>
                  <Text style={s.egzersizSatirKas}>{isKardiyo ? '🏃 ' : ''}{item.kas_grubu}  ·  {item.ekipman}</Text>
                </View>
                <View style={[s.ekleIkon, isKardiyo && { backgroundColor: '#FF6B35' }]}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>+</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Aktif antrenman modalı içinde — ANTRENMANı BİTİR ekranı
  // ─────────────────────────────────────────────────────────────────────────
  const renderBitir = () => (
    <SafeAreaView style={[s.kap, { justifyContent: 'center', padding: 24 }]}>
      <View style={s.ozetModal}>
        <Text style={s.ozetBaslik}>🏁 {tr('Antrenmanı Tamamla', 'Finish Workout')}</Text>
        <Text style={[s.bolumAciklama, { marginBottom: 12 }]}>
          {tr('Toplam antrenman süren kaç dakikaydı?', 'How many minutes did you workout?')}
        </Text>
        <View style={s.sureSatir}>
          <TextInput
            style={s.sureInput}
            value={bitirSure}
            onChangeText={setBitirSure}
            keyboardType="number-pad"
            placeholder="60"
            placeholderTextColor={renkler.yaziAcik}
            autoFocus
          />
          <Text style={s.sureBirim}>{tr('dakika', 'minutes')}</Text>
        </View>
        <Text style={[s.bolumAciklama, { marginBottom: 20, fontSize: 12 }]}>
          {tr('Boş bırakabilirsin.', 'You can leave it empty.')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[s.baslatButon, { flex: 1, backgroundColor: renkler.sinir, shadowOpacity: 0, marginTop: 0 }]}
            activeOpacity={0.7} onPress={() => { setAktifEkran('antrenman'); setBitirSure(''); }}>
            <Text style={[s.baslatYazi, { color: renkler.yazi }]}>{tr('İptal', 'Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.baslatButon, { flex: 1, marginTop: 0 }]}
            activeOpacity={0.75} onPress={antrenmanBitirOnayla}>
            <Text style={s.baslatYazi}>✓ {tr('Tamamla', 'Complete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Aktif antrenman modalı içinde — AKTİF ANTRENMAN ekranı
  // ─────────────────────────────────────────────────────────────────────────
  const renderAntrenman = () => (
    <SafeAreaView style={[s.kap, { paddingTop: 0 }]}>
      {/* Üst bar */}
      <View style={s.timerBar}>
        <Text style={s.aktifAdi} numberOfLines={1}>{aktifAdi}</Text>
        <TouchableOpacity style={s.bitirButon} activeOpacity={0.7} onPress={() => setAktifEkran('bitir')}>
          <Text style={s.bitirYazi}>✓ {tr('Bitir', 'Finish')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {aktifEgzersizler.length === 0 && (
          <View style={[s.bosKart, { marginBottom: 16 }]}>
            <Text style={s.bosEmoji}>💪</Text>
            <Text style={s.bosBaslik}>{tr('Egzersiz ekle', 'Add exercises')}</Text>
            <Text style={s.bosAciklama}>{tr('Aşağıdaki butona bas ve egzersiz seç.', 'Tap the button below.')}</Text>
          </View>
        )}

        {aktifEgzersizler.map((ae, ei) => {
          const kardiyo = ae.egzersiz?.kas_grubu === 'kardiyo' || ae.egzersiz?.kas_grubu === 'cardio';
          return (
            <View key={ei} style={s.egzersizBlok}>
              <View style={s.egzersizBaslikSatir}>
                <View style={{ flex: 1 }}>
                  <Text style={s.egzersizAdi}>{ae.egzersiz?.isim}</Text>
                  <Text style={s.egzersizKas}>{ae.egzersiz?.kas_grubu}  ·  {ae.egzersiz?.ekipman}</Text>
                </View>
                <TouchableOpacity onPress={() => egzersizSilFn(ei)} activeOpacity={0.7} style={{ padding: 6 }}>
                  <Text style={{ color: renkler.kirmizi, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={s.setSatirBaslik}>
                <Text style={[s.setBaslik, { flex: 0.5 }]}>Set</Text>
                {kardiyo ? (
                  <>
                    <Text style={[s.setBaslik, { flex: 2 }]}>⏱ {tr('Süre (dk)', 'Duration (min)')}</Text>
                    <Text style={[s.setBaslik, { flex: 1.5 }]}>📍 km</Text>
                  </>
                ) : (
                  <>
                    <Text style={[s.setBaslik, { flex: 1 }]}>kg</Text>
                    <Text style={[s.setBaslik, { flex: 1 }]}>{tr('Tekrar', 'Reps')}</Text>
                  </>
                )}
                <Text style={[s.setBaslik, { flex: 0.7 }]}>✓</Text>
              </View>

              {ae.setler.map((set, si) => (
                <View key={si} style={s.setSatir}>
                  <Text style={[s.setNo, { flex: 0.5 }]}>{set.set_no}</Text>
                  {kardiyo ? (
                    <>
                      <TextInput style={[s.setInput, { flex: 2 }, set.tamamlandi && s.setInputTamamlandi]}
                        value={set.tekrar} onChangeText={v => setGuncelleFn(ei, si, 'tekrar', v)}
                        keyboardType="number-pad" placeholder={tr('dk', 'min')}
                        placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi} />
                      <TextInput style={[s.setInput, { flex: 1.5 }, set.tamamlandi && s.setInputTamamlandi]}
                        value={set.kg} onChangeText={v => setGuncelleFn(ei, si, 'kg', v)}
                        keyboardType="decimal-pad" placeholder="km"
                        placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi} />
                    </>
                  ) : (
                    <>
                      <TextInput style={[s.setInput, { flex: 1 }, set.tamamlandi && s.setInputTamamlandi]}
                        value={set.kg} onChangeText={v => setGuncelleFn(ei, si, 'kg', v)}
                        keyboardType="decimal-pad" placeholder="0"
                        placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi} />
                      <TextInput style={[s.setInput, { flex: 1 }, set.tamamlandi && s.setInputTamamlandi]}
                        value={set.tekrar} onChangeText={v => setGuncelleFn(ei, si, 'tekrar', v)}
                        keyboardType="number-pad" placeholder="0"
                        placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi} />
                    </>
                  )}
                  <TouchableOpacity style={[s.tamamlaButon, { flex: 0.7 }, set.tamamlandi && s.tamamlaAktif]}
                    activeOpacity={0.7} onPress={() => setTamamlaFn(ei, si)}>
                    <Text style={{ color: set.tamamlandi ? '#fff' : renkler.yaziAcik, fontSize: 16, fontWeight: '700' }}>✓</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={s.setEkleButon} activeOpacity={0.7} onPress={() => yeniSetEkle(ei)}>
                <Text style={{ color: renkler.ana, fontSize: 13, fontWeight: '600' }}>
                  + {kardiyo ? tr('Seans Ekle', 'Add Session') : tr('Set Ekle', 'Add Set')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity style={s.egzersizEkleButon} activeOpacity={0.7} onPress={pickerAc}>
          <Text style={s.egzersizEkleYazi}>+ {tr('Egzersiz / Kardiyo Ekle', 'Add Exercise / Cardio')}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ANA EKRAN
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.kap}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriYukle(); }} tintColor={renkler.ana} />}>

        <View style={s.header}>
          <Text style={s.headerBaslik}>🏋️ {tr('Antrenman', 'Workout')}</Text>
          <Text style={s.headerAlt}>{tr('Egzersiz ve kardiyo takibi', 'Exercise & cardio tracking')}</Text>
        </View>

        <View style={s.istatistikSatir}>
          <View style={s.istatistikKart}>
            <Text style={s.istatistikSayi}>{istatistik?.bu_hafta_antrenman_sayisi ?? 0}</Text>
            <Text style={s.istatistikEtiket}>{tr('Bu Hafta', 'This Week')}</Text>
          </View>
          <View style={s.istatistikKart}>
            <Text style={s.istatistikSayi}>{istatistik?.bu_ay_antrenman_sayisi ?? 0}</Text>
            <Text style={s.istatistikEtiket}>{tr('Bu Ay', 'This Month')}</Text>
          </View>
          <View style={s.istatistikKart}>
            <Text style={s.istatistikSayi}>{istatistik?.son_30_gun_toplam_sure ?? 0}</Text>
            <Text style={s.istatistikEtiket}>{tr('Dk (30 gün)', 'Min (30d)')}</Text>
          </View>
        </View>

        {/* Hızlı Başlat */}
        <View style={s.bolum}>
          <Text style={s.bolumBaslik}>⚡ {tr('Hızlı Başlat', 'Quick Start')}</Text>
          <Text style={s.bolumAciklama}>{tr('Boş başlat, egzersizleri kendin ekle.', 'Start empty, add exercises as you go.')}</Text>
          <TouchableOpacity style={s.baslatButon} activeOpacity={0.75} onPress={() => antrenmanBaslatHandler()}>
            <Text style={s.baslatYazi}>{tr('Boş Antrenman Başlat', 'Start Empty Workout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Şablonlar */}
        <View style={s.bolum}>
          <View style={s.bolumSatir}>
            <View style={{ flex: 1 }}>
              <Text style={s.bolumBaslik}>📋 {tr('Şablonlarım', 'My Templates')}</Text>
              <Text style={s.bolumAciklama}>{tr('Hazır rutinlerin. Tıkla, hemen başla.', 'Your saved routines. Tap to start.')}</Text>
            </View>
            <TouchableOpacity style={s.yeniSablonButon} activeOpacity={0.7} onPress={() => setGosterSablon(true)}>
              <Text style={s.yeniSablonYazi}>+ {tr('Yeni', 'New')}</Text>
            </TouchableOpacity>
          </View>
          {sablonlar.length === 0 ? (
            <View style={s.bosKart}>
              <Text style={s.bosEmoji}>📭</Text>
              <Text style={s.bosBaslik}>{tr('Henüz şablon yok', 'No templates yet')}</Text>
              <Text style={s.bosAciklama}>{tr('"+ Yeni" ile Push Day, Pull Day gibi rutinler oluştur.', 'Create routines like Push Day, Pull Day.')}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sablonlar.map(sab => (
                <TouchableOpacity key={sab.id} style={s.sablonKart} activeOpacity={0.7} onPress={() => antrenmanBaslatHandler(sab)}>
                  <Text style={s.sablonEmoji}>▶</Text>
                  <Text style={s.sablonAdi}>{sab.isim}</Text>
                  <Text style={s.sablonEgSayisi}>{sab.sablon_egzersizleri?.length ?? 0} {tr('egzersiz', 'exercises')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Geçmiş */}
        <View style={s.bolum}>
          <Text style={s.bolumBaslik}>🕐 {tr('Son Antrenmanlar', 'Recent Workouts')}</Text>
          {gecmis.length === 0 ? (
            <Text style={s.bosAciklama}>{tr('Henüz antrenman yok.', 'No workouts yet.')}</Text>
          ) : gecmis.map(log => (
            <View key={log.id} style={s.gecmisKart}>
              <View style={{ flex: 1 }}>
                <Text style={s.gecmisAdi}>{log.antrenman_adi}</Text>
                <Text style={s.gecmisBilgi}>
                  {log.tarih}  ·  {log.toplam_set} set{log.sure_dakika ? `  ·  ${log.sure_dakika} dk` : ''}
                </Text>
              </View>
              <TouchableOpacity style={s.silButon} activeOpacity={0.7}
                onPress={() => antrenmanSilHandler(log.id, log.antrenman_adi)}>
                <Text style={{ fontSize: 16 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ══ TEK MODAL — içinde ekran geçişi var ══ */}
      <Modal visible={gosterAktif} animationType="slide">
        {aktifEkran === 'picker'    ? renderPicker()    :
         aktifEkran === 'bitir'     ? renderBitir()     :
                                      renderAntrenman()}
      </Modal>

      {/* ══ Özet Modal (antrenman bittikten sonra) ══ */}
      <Modal visible={gosterOzet} animationType="fade" transparent>
        <View style={s.ozetOverlay}>
          <View style={s.ozetModal}>
            <Text style={s.ozetBaslik}>🎉 {tr('Tebrikler!', 'Great job!')}</Text>
            {(ozet?.sure_dakika ?? 0) > 0 && (
              <View style={s.ozetSatir}>
                <Text style={s.ozetEtiket}>⏱ {tr('Süre', 'Duration')}</Text>
                <Text style={s.ozetDeger}>{ozet.sure_dakika} dk</Text>
              </View>
            )}
            <View style={s.ozetSatir}>
              <Text style={s.ozetEtiket}>✓ {tr('Tamamlanan Set', 'Completed Sets')}</Text>
              <Text style={s.ozetDeger}>{ozet?.toplam_set ?? 0}</Text>
            </View>
            <View style={s.ozetSatir}>
              <Text style={s.ozetEtiket}>🏋️ {tr('Toplam Hacim', 'Total Volume')}</Text>
              <Text style={s.ozetDeger}>{ozet?.toplam_kg_hacmi ?? 0} kg</Text>
            </View>
            <TouchableOpacity style={[s.baslatButon, { marginTop: 20 }]} activeOpacity={0.75} onPress={() => setGosterOzet(false)}>
              <Text style={s.baslatYazi}>💪 {tr('Harika!', 'Awesome!')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ Şablon Oluşturma Modal ══ */}
      <Modal visible={gosterSablon} animationType="slide">
        <KeyboardAvoidingView style={[s.kap, { paddingTop: 56 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalBar}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => { setGosterSablon(false); setSablonAdi(''); }}>
              <Text style={{ color: renkler.kirmizi, fontSize: 15 }}>{tr('İptal', 'Cancel')}</Text>
            </TouchableOpacity>
            <Text style={s.modalBaslik}>{tr('Yeni Şablon', 'New Template')}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={sablonKaydet}>
              <Text style={{ color: renkler.ana, fontSize: 15, fontWeight: '700' }}>{tr('Kaydet', 'Save')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={s.etiket}>{tr('Şablon Adı', 'Template Name')}</Text>
            <TextInput style={s.aramaInput} value={sablonAdi} onChangeText={setSablonAdi}
              placeholder={tr('örn: Push Day, Bacak Günü...', 'e.g. Push Day, Leg Day...')}
              placeholderTextColor={renkler.yaziAcik} autoFocus />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:                { flex: 1, backgroundColor: r.arkaplan },
    header:             { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: r.kart, borderBottomWidth: 1, borderBottomColor: r.sinir },
    headerBaslik:       { fontSize: 26, fontWeight: '800', color: r.yazi },
    headerAlt:          { fontSize: 13, color: r.yaziAcik, marginTop: 2 },
    istatistikSatir:    { flexDirection: 'row', padding: 16, gap: 10 },
    istatistikKart:     { flex: 1, backgroundColor: r.kart, borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    istatistikSayi:     { fontSize: 26, fontWeight: '800', color: r.ana },
    istatistikEtiket:   { fontSize: 11, color: r.yaziAcik, marginTop: 4, textAlign: 'center' },
    bolum:              { marginHorizontal: 16, marginBottom: 24 },
    bolumSatir:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    bolumBaslik:        { fontSize: 16, fontWeight: '700', color: r.yazi, marginBottom: 4 },
    bolumAciklama:      { fontSize: 13, color: r.yaziAcik, lineHeight: 18 },
    baslatButon:        { backgroundColor: r.ana, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12, shadowColor: r.ana, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    baslatYazi:         { color: '#fff', fontSize: 16, fontWeight: '800' },
    yeniSablonButon:    { backgroundColor: r.ana + '22', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: r.ana },
    yeniSablonYazi:     { color: r.ana, fontSize: 13, fontWeight: '700' },
    bosKart:            { backgroundColor: r.kart, borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 8 },
    bosEmoji:           { fontSize: 32, marginBottom: 8 },
    bosBaslik:          { fontSize: 15, fontWeight: '700', color: r.yazi, marginBottom: 6 },
    bosAciklama:        { fontSize: 13, color: r.yaziAcik, textAlign: 'center', lineHeight: 18 },
    sablonKart:         { backgroundColor: r.kart, borderRadius: 14, padding: 16, marginRight: 12, minWidth: 150, borderWidth: 1, borderColor: r.sinir },
    sablonEmoji:        { fontSize: 20, color: r.ana, marginBottom: 8 },
    sablonAdi:          { fontSize: 14, fontWeight: '700', color: r.yazi, marginBottom: 4 },
    sablonEgSayisi:     { fontSize: 12, color: r.yaziAcik },
    gecmisKart:         { flexDirection: 'row', alignItems: 'center', backgroundColor: r.kart, borderRadius: 14, padding: 14, marginBottom: 8 },
    gecmisAdi:          { fontSize: 14, fontWeight: '700', color: r.yazi },
    gecmisBilgi:        { fontSize: 12, color: r.yaziAcik, marginTop: 3 },
    silButon:           { padding: 8, borderRadius: 10, backgroundColor: r.kirmizi + '18' },
    timerBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: r.kart, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: r.sinir },
    aktifAdi:           { fontSize: 16, fontWeight: '700', color: r.yazi, flex: 1, marginRight: 12 },
    bitirButon:         { backgroundColor: r.kirmizi, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
    bitirYazi:          { color: '#fff', fontSize: 14, fontWeight: '700' },
    egzersizBlok:       { backgroundColor: r.kart, borderRadius: 16, padding: 16, marginBottom: 12 },
    egzersizBaslikSatir:{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
    egzersizAdi:        { fontSize: 16, fontWeight: '800', color: r.yazi, marginBottom: 2 },
    egzersizKas:        { fontSize: 12, color: r.yaziAcik, marginBottom: 12, textTransform: 'capitalize' },
    setSatirBaslik:     { flexDirection: 'row', marginBottom: 6 },
    setBaslik:          { fontSize: 11, color: r.yaziAcik, fontWeight: '600', textAlign: 'center' },
    setSatir:           { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
    setNo:              { fontSize: 14, fontWeight: '700', color: r.yaziAcik, textAlign: 'center' },
    setInput:           { borderWidth: 1.5, borderColor: r.sinir, borderRadius: 10, padding: 10, fontSize: 15, color: r.yazi, textAlign: 'center', backgroundColor: r.arkaplan },
    setInputTamamlandi: { backgroundColor: r.ana + '18', borderColor: r.ana },
    tamamlaButon:       { backgroundColor: r.sinir, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    tamamlaAktif:       { backgroundColor: r.ana },
    setEkleButon:       { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
    egzersizEkleButon:  { backgroundColor: r.kart, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: r.ana, borderStyle: 'dashed' },
    egzersizEkleYazi:   { color: r.ana, fontSize: 15, fontWeight: '700' },
    sureSatir:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    sureInput:          { flex: 1, borderWidth: 1.5, borderColor: r.sinir, borderRadius: 12, padding: 14, fontSize: 24, fontWeight: '700', color: r.yazi, textAlign: 'center', backgroundColor: r.arkaplan },
    sureBirim:          { fontSize: 16, color: r.yaziAcik, fontWeight: '600' },
    modalBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: r.sinir },
    modalBaslik:        { fontSize: 16, fontWeight: '700', color: r.yazi },
    aramaInput:         { marginHorizontal: 16, marginVertical: 12, borderWidth: 1.5, borderColor: r.sinir, borderRadius: 12, padding: 13, fontSize: 15, color: r.yazi, backgroundColor: r.arkaplan },
    kasFiltre:          { marginBottom: 8, maxHeight: 44 },
    kasButon:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: r.sinir, marginRight: 8 },
    kasButonAktif:      { backgroundColor: r.ana },
    kasYazi:            { fontSize: 13, color: r.yazi, fontWeight: '600', textTransform: 'capitalize' },
    egzersizSatir:      { flexDirection: 'row', alignItems: 'center', backgroundColor: r.kart, borderRadius: 14, padding: 14, marginBottom: 8 },
    egzersizSatirAdi:   { fontSize: 14, fontWeight: '700', color: r.yazi },
    egzersizSatirKas:   { fontSize: 12, color: r.yaziAcik, marginTop: 2, textTransform: 'capitalize' },
    ekleIkon:           { width: 34, height: 34, borderRadius: 17, backgroundColor: r.ana, alignItems: 'center', justifyContent: 'center' },
    ozetOverlay:        { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 24 },
    ozetModal:          { backgroundColor: r.kart, borderRadius: 24, padding: 28 },
    ozetBaslik:         { fontSize: 22, fontWeight: '800', color: r.yazi, textAlign: 'center', marginBottom: 20 },
    ozetSatir:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: r.sinir },
    ozetEtiket:         { fontSize: 14, color: r.yaziAcik },
    ozetDeger:          { fontSize: 16, fontWeight: '700', color: r.yazi },
    etiket:             { fontSize: 13, fontWeight: '600', color: r.yazi, marginBottom: 8 },
  });
