import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, FlatList,
  RefreshControl, KeyboardAvoidingView, Platform, SafeAreaView, Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  antrenmanIstatistik, sablonlariGetir, antrenmanGecmisi,
  egzersizleriGetir, antrenmanBaslat, setEkle, setGuncelle,
  antrenmanBitir, sablonOlustur, antrenmanSil, sablonSil, egzersizOlustur,
  antrenmanLogDetay, setSil, egzersizGuncelleDB, egzersizSilDB, sonPerformansGetir,
} from '../../services/api';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

const KAS_TR = ['Tümü','göğüs','sırt','omuz','biceps','triceps','bacak','karın','kardiyo'];
const KAS_EN = ['All','chest','back','shoulder','biceps','triceps','leg','abs','cardio'];

interface AktifSet { id?: string; set_no: number; kg: string; tekrar: string; tamamlandi: boolean; }
interface AktifEgzersiz { egzersiz: any; setler: AktifSet[]; }

// aktif antrenman modalı içi ekranlar
type AktifEkran = 'antrenman' | 'picker' | 'bitir' | 'ozelhareket';
// şablon modalı içi ekranlar
type SablonEkran = 'form' | 'picker' | 'ozelhareket';

export default function AntrenmanEkrani() {
  const { renkler } = useTemaStore();
  const { dil }     = useDilStore();
  const KG          = dil === 'tr' ? KAS_TR : KAS_EN;
  const tr          = (t: string, e: string) => dil === 'tr' ? t : e;

  // ── Ana ekran ──────────────────────────────────────────────────────────────
  const [istatistik, setIstatistik]   = useState<any>(null);
  const [sablonlar, setSablonlar]     = useState<any[]>([]);
  const [gecmis, setGecmis]           = useState<any[]>([]);
  const [yukleniyor, setYukleniyor]   = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  // ── Aktif antrenman ────────────────────────────────────────────────────────
  const [aktifLogId, setAktifLogId]             = useState<string | null>(null);
  const [aktifAdi, setAktifAdi]                 = useState('');
  const [aktifEgzersizler, setAktifEgzersizler] = useState<AktifEgzersiz[]>([]);
  const [gosterAktif, setGosterAktif]           = useState(false);
  const [aktifEkran, setAktifEkran]             = useState<AktifEkran>('antrenman');
  const [bitirSure, setBitirSure]               = useState('');
  const [gosterOzet, setGosterOzet]             = useState(false);
  const [ozet, setOzet]                         = useState<any>(null);

  // ── Şablon ────────────────────────────────────────────────────────────────
  const [gosterSablon, setGosterSablon]         = useState(false);
  const [sablonEkrani, setSablonEkrani]         = useState<SablonEkran>('form');
  const [sablonAdi, setSablonAdi]               = useState('');
  const [sablonEgzersizleri, setSablonEgzersizleri] = useState<any[]>([]);

  // ── Egzersiz picker (hem antrenman hem şablon için) ────────────────────────
  const [egzersizler, setEgzersizler]   = useState<any[]>([]);
  const [seciliKas, setSeciliKas]       = useState(KG[0]);
  const [egArama, setEgArama]           = useState('');
  const [egYukleniyor, setEgYukleniyor] = useState(false);
  const [egHata, setEgHata]             = useState(false);

  // ── Son performans (aktif antrenman sırasında gösterim için) ──────────────
  const [sonPerfMap, setSonPerfMap] = useState<{[id: string]: any}>({});

  const sonPerfYukle = async (egzersizId: string) => {
    if (sonPerfMap[egzersizId] !== undefined) return;
    try {
      const r = await sonPerformansGetir(egzersizId);
      setSonPerfMap(prev => ({ ...prev, [egzersizId]: r.data ?? null }));
    } catch {
      setSonPerfMap(prev => ({ ...prev, [egzersizId]: null }));
    }
  };

  // ── Egzersiz yöneticisi ───────────────────────────────────────────────────
  const [gosterEgzersizMgr, setGosterEgzersizMgr] = useState(false);
  const [mgrDuzenle, setMgrDuzenle]               = useState<any>(null); // null=liste, {}=yeni, {id}=düzenle

  // ── Özel hareket oluşturma / düzenleme ────────────────────────────────────
  const [ozelIsim, setOzelIsim]             = useState('');
  const [ozelKas, setOzelKas]               = useState('');
  const [ozelEkipman, setOzelEkipman]       = useState('');
  const [ozelYukleniyor, setOzelYukleniyor] = useState(false);
  const [duzenleEg, setDuzenleEg]           = useState<any>(null); // null = oluştur, obje = düzenle

  // ── Veri yükle ─────────────────────────────────────────────────────────────
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

  // ── Egzersiz picker yükle ──────────────────────────────────────────────────
  const egzersizlerYukle = async (kas?: string, arama?: string) => {
    setEgYukleniyor(true); setEgHata(false);
    try {
      const kg  = kas && kas !== KG[0] ? kas : undefined;
      // 1 karakter yeterli
      const ara = arama && arama.length >= 1 ? arama : undefined;
      const r   = await egzersizleriGetir(kg, ara);
      setEgzersizler(r.data || []);
    } catch { setEgHata(true); }
    finally  { setEgYukleniyor(false); }
  };

  const pickerAc = (hedef: 'antrenman' | 'sablon') => {
    setSeciliKas(KG[0]); setEgArama('');
    egzersizlerYukle();
    if (hedef === 'antrenman') setAktifEkran('picker');
    else setSablonEkrani('picker');
  };

  // ── YouTube ────────────────────────────────────────────────────────────────
  const youtubeAc = (isim: string) => {
    const sorgu = encodeURIComponent(`${isim} nasıl yapılır`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${sorgu}`);
  };

  // ── Özel hareket kaydet / güncelle ────────────────────────────────────────
  const ozelHareketKaydet = async (hedef: 'antrenman' | 'sablon') => {
    if (!ozelIsim.trim()) { Alert.alert(tr('Uyarı', 'Warning'), tr('Hareket adı zorunlu.', 'Name required.')); return; }
    if (!ozelKas)         { Alert.alert(tr('Uyarı', 'Warning'), tr('Kas grubu seç.', 'Select muscle group.')); return; }
    setOzelYukleniyor(true);
    try {
      if (duzenleEg) {
        // Düzenleme modu
        await egzersizGuncelleDB(duzenleEg.id, { isim: ozelIsim.trim(), kas_grubu: ozelKas, ekipman: ozelEkipman || 'yok' });
        setDuzenleEg(null);
        setOzelIsim(''); setOzelKas(''); setOzelEkipman('');
        egzersizlerYukle(seciliKas, egArama); // listeyi yenile
        if (hedef === 'antrenman') setAktifEkran('picker');
        else setSablonEkrani('picker');
      } else {
        // Oluşturma modu
        const r = await egzersizOlustur({ isim: ozelIsim.trim(), kas_grubu: ozelKas, ekipman: ozelEkipman || 'yok' });
        setOzelIsim(''); setOzelKas(''); setOzelEkipman('');
        if (hedef === 'antrenman') egzersizSecAntrenman(r.data);
        else egzersizSecSablon(r.data);
      }
    } catch {
      Alert.alert(tr('Hata', 'Error'), tr('İşlem başarısız.', 'Operation failed.'));
    } finally { setOzelYukleniyor(false); }
  };

  // ── Egzersiz uzun bas seçenekleri ─────────────────────────────────────────
  const egzersizSecenekleri = (item: any, hedef: 'antrenman' | 'sablon') => {
    Alert.alert(item.isim, tr('Ne yapmak istiyorsun?', 'What would you like to do?'), [
      { text: tr('✎ Düzenle', '✎ Edit'), onPress: () => {
        setDuzenleEg(item);
        setOzelIsim(item.isim);
        setOzelKas(item.kas_grubu);
        setOzelEkipman(item.ekipman === 'yok' ? '' : (item.ekipman || ''));
        if (hedef === 'antrenman') setAktifEkran('ozelhareket');
        else setSablonEkrani('ozelhareket');
      }},
      { text: tr('🗑 Sil', '🗑 Delete'), style: 'destructive', onPress: () =>
        Alert.alert(
          tr('Emin misin?', 'Are you sure?'),
          tr(`"${item.isim}" silinecek.`, `"${item.isim}" will be deleted.`),
          [
            { text: tr('İptal', 'Cancel'), style: 'cancel' },
            { text: tr('Sil', 'Delete'), style: 'destructive', onPress: async () => {
              try {
                await egzersizSilDB(item.id);
                setEgzersizler(prev => prev.filter(e => e.id !== item.id));
              } catch {
                Alert.alert(tr('Hata', 'Error'), tr('Silinemedi.', 'Could not delete.'));
              }
            }},
          ]
        )
      },
      { text: tr('İptal', 'Cancel'), style: 'cancel' },
    ]);
  };

  // Antrenman için egzersiz seç
  const egzersizSecAntrenman = (eg: any) => {
    setAktifEgzersizler(prev => [...prev, {
      egzersiz: eg,
      setler: [{ set_no: 1, kg: '', tekrar: '', tamamlandi: false }],
    }]);
    sonPerfYukle(eg.id);
    setAktifEkran('antrenman');
  };

  // Şablon için egzersiz seç
  const egzersizSecSablon = (eg: any) => {
    if (!sablonEgzersizleri.find(e => e.id === eg.id)) {
      setSablonEgzersizleri(prev => [...prev, eg]);
    }
    setSablonEkrani('form');
  };

  // ── Antrenman başlat ────────────────────────────────────────────────────────
  const antrenmanBaslatHandler = async (sablon?: any) => {
    try {
      const yanit = await antrenmanBaslat({
        sablon_id: sablon?.id,
        antrenman_adi: sablon?.isim || tr('Antrenman', 'Workout'),
      });
      setAktifLogId(yanit.data.id);
      setAktifAdi(yanit.data.antrenman_adi);
      const egzersizListesi = sablon?.sablon_egzersizleri?.length
        ? sablon.sablon_egzersizleri.map((se: any) => ({
            egzersiz: se.egzersizler,
            setler: Array.from({ length: se.hedef_set || 3 }, (_, i) => ({
              set_no: i + 1, kg: String(se.hedef_kg || ''),
              tekrar: se.hedef_rep?.split('-')[0] || '', tamamlandi: false,
            })),
          }))
        : [];
      setAktifEgzersizler(egzersizListesi);
      setSonPerfMap({});
      egzersizListesi.forEach(ae => { if (ae.egzersiz?.id) sonPerfYukle(ae.egzersiz.id); });
      setAktifEkran('antrenman');
      setGosterAktif(true);
    } catch {
      Alert.alert(tr('Hata', 'Error'), tr('Antrenman başlatılamadı.', 'Could not start workout.'));
    }
  };

  // ── Set işlemleri ──────────────────────────────────────────────────────────
  const setGuncelleFn = (ei: number, si: number, alan: 'kg' | 'tekrar', v: string) => {
    setAktifEgzersizler(prev => {
      const yeni = [...prev];
      yeni[ei] = { ...yeni[ei], setler: yeni[ei].setler.map((s, i) => i === si ? { ...s, [alan]: v } : s) };
      return yeni;
    });
  };

  const setTamamlaFn = async (ei: number, si: number) => {
    if (!aktifLogId) return;
    const eg = aktifEgzersizler[ei], set = eg.setler[si];
    try {
      if (set.id) {
        await setGuncelle(set.id, { tamamlandi: !set.tamamlandi });
      } else {
        const r = await setEkle({
          antrenman_log_id: aktifLogId, egzersiz_id: eg.egzersiz.id,
          set_no: set.set_no, kg: parseFloat(set.kg) || undefined,
          tekrar: parseInt(set.tekrar) || undefined, tamamlandi: true,
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
    Alert.alert(tr('Egzersizi Kaldır', 'Remove Exercise'), tr('Bu egzersizi kaldırmak istiyor musun?', 'Remove?'), [
      { text: tr('İptal', 'Cancel'), style: 'cancel' },
      { text: tr('Kaldır', 'Remove'), style: 'destructive', onPress: () => setAktifEgzersizler(prev => prev.filter((_, i) => i !== ei)) },
    ]);
  };

  // ── Set sil ───────────────────────────────────────────────────────────────
  const setSilFn = async (ei: number, si: number) => {
    const set = aktifEgzersizler[ei].setler[si];
    if (set.id) { try { await setSil(set.id); } catch {} }
    setAktifEgzersizler(prev => {
      const yeni = [...prev];
      const setler = yeni[ei].setler
        .filter((_, i) => i !== si)
        .map((s, i) => ({ ...s, set_no: i + 1 }));
      yeni[ei] = { ...yeni[ei], setler };
      return yeni;
    });
  };

  // ── Geçmiş antrenmanı tekrarla ────────────────────────────────────────────
  const antrenmanTekrarla = async (log: any) => {
    try {
      const r = await antrenmanLogDetay(log.id);
      const { antrenman_adi, egzersizler: egList } = r.data;
      if (!egList?.length) {
        Alert.alert(tr('Bilgi', 'Info'), tr('Bu antrenmanın hareket kaydı yok.', 'No exercises found.'));
        return;
      }
      const yanit = await antrenmanBaslat({ antrenman_adi });
      setAktifLogId(yanit.data.id);
      setAktifAdi(yanit.data.antrenman_adi);
      const tekrarListesi = egList.map((eg: any) => ({
        egzersiz: eg,
        setler: [{ set_no: 1, kg: '', tekrar: '', tamamlandi: false }],
      }));
      setAktifEgzersizler(tekrarListesi);
      setSonPerfMap({});
      tekrarListesi.forEach((ae: any) => { if (ae.egzersiz?.id) sonPerfYukle(ae.egzersiz.id); });
      setAktifEkran('antrenman');
      setGosterAktif(true);
    } catch {
      Alert.alert(tr('Hata', 'Error'), tr('Antrenman yüklenemedi.', 'Could not load workout.'));
    }
  };

  // ── Antrenman bitir ────────────────────────────────────────────────────────
  const antrenmanKaydet = async () => {
    if (!aktifLogId) return;
    const dakika = parseInt(bitirSure) || 0;
    try {
      const r = await antrenmanBitir(aktifLogId, { sure_dakika: dakika || undefined });
      const egzersizListesi = aktifEgzersizler.map(ae => ae.egzersiz?.isim).filter(Boolean);
      const tamamlananSet   = aktifEgzersizler.reduce((t, ae) => t + ae.setler.filter(s => s.tamamlandi).length, 0);
      setOzet({ sure_dakika: dakika, toplam_set: r.data?.ozet?.toplam_set ?? tamamlananSet, egzersizler: egzersizListesi });
      setGosterAktif(false); setGosterOzet(true);
      setBitirSure(''); setAktifLogId(null); setAktifEgzersizler([]); setSonPerfMap({});
      veriYukle();
    } catch { Alert.alert(tr('Hata', 'Error'), tr('Kaydedilemedi.', 'Could not save.')); }
  };

  const antrenmanKaydetme = async () => {
    if (!aktifLogId) return;
    try { await antrenmanSil(aktifLogId); } catch {}
    setGosterAktif(false);
    setBitirSure(''); setAktifLogId(null); setAktifEgzersizler([]);
  };

  // ── Geçmiş sil ────────────────────────────────────────────────────────────
  const gecmisSilHandler = (logId: string, adi: string) => {
    Alert.alert(tr('Antrenmanı Sil', 'Delete Workout'), tr(`"${adi}" silinecek.`, `"${adi}" will be deleted.`), [
      { text: tr('İptal', 'Cancel'), style: 'cancel' },
      { text: tr('Sil', 'Delete'), style: 'destructive', onPress: async () => {
        try { await antrenmanSil(logId); setGecmis(prev => prev.filter(l => l.id !== logId)); } catch {}
      }},
    ]);
  };

  // ── Şablon silme ──────────────────────────────────────────────────────────
  const sablonSilHandler = (sablon: any) => {
    Alert.alert(tr('Şablonu Sil', 'Delete Template'), tr(`"${sablon.isim}" silinecek.`, `"${sablon.isim}" will be deleted.`), [
      { text: tr('İptal', 'Cancel'), style: 'cancel' },
      { text: tr('Sil', 'Delete'), style: 'destructive', onPress: async () => {
        try {
          await sablonSil(sablon.id);
          setSablonlar(prev => prev.filter(s => s.id !== sablon.id));
        } catch (e: any) {
          Alert.alert(tr('Hata', 'Error'), e?.response?.data?.detail || tr('Silinemedi.', 'Could not delete.'));
        }
      }},
    ]);
  };

  // ── Şablon kaydet ─────────────────────────────────────────────────────────
  const sablonKaydetHandler = async () => {
    if (!sablonAdi.trim()) { Alert.alert(tr('Uyarı', 'Warning'), tr('Şablon adı girin.', 'Enter template name.')); return; }
    try {
      await sablonOlustur({
        isim: sablonAdi,
        egzersizler: sablonEgzersizleri.map((eg, i) => ({ egzersiz_id: eg.id, sira: i + 1 })),
      });
      setSablonAdi(''); setSablonEgzersizleri([]); setGosterSablon(false); veriYukle();
    } catch {}
  };

  const s = makeStyles(renkler);

  if (yukleniyor) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: renkler.arkaplan }}>
      <ActivityIndicator size="large" color={renkler.ana} />
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ORTAK EGZERSİZ PİCKER — hem antrenman hem şablon için kullanılıyor
  // ═══════════════════════════════════════════════════════════════════════════
  const renderPicker = (hedef: 'antrenman' | 'sablon') => {
    const geri = () => hedef === 'antrenman' ? setAktifEkran('antrenman') : setSablonEkrani('form');
    const sec  = (item: any) => hedef === 'antrenman' ? egzersizSecAntrenman(item) : egzersizSecSablon(item);
    const ozelAc = () => hedef === 'antrenman' ? setAktifEkran('ozelhareket') : setSablonEkrani('ozelhareket');

    return (
      <SafeAreaView style={[s.kap, { paddingTop: 0 }]}>
        <View style={s.modalBar}>
          <TouchableOpacity activeOpacity={0.7} onPress={geri}>
            <Text style={{ color: renkler.ana, fontSize: 15, fontWeight: '600' }}>← {tr('Geri', 'Back')}</Text>
          </TouchableOpacity>
          <Text style={s.modalBaslik}>{tr('Egzersiz Seç', 'Select Exercise')}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={ozelAc}>
            <Text style={{ color: renkler.ana, fontSize: 13, fontWeight: '700' }}>+ {tr('Özel', 'Custom')}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={s.aramaInput}
          placeholder={tr('🔍 Egzersiz ara...', '🔍 Search...')}
          placeholderTextColor={renkler.yaziAcik}
          value={egArama}
          onChangeText={v => { setEgArama(v); egzersizlerYukle(seciliKas, v); }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 50, marginBottom: 8 }}
          contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}>
          {KG.map(k => (
            <TouchableOpacity key={k}
              style={[s.kasButon, seciliKas === k && s.kasButonAktif]}
              activeOpacity={0.7}
              onPress={() => { setSeciliKas(k); egzersizlerYukle(k, egArama); }}>
              <Text style={[s.kasYazi, seciliKas === k && { color: '#fff' }]} numberOfLines={1}>
                {(k === 'kardiyo' || k === 'cardio') ? '🏃 ' + k : k}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {egYukleniyor ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={renkler.ana} />
        ) : egHata ? (
          <View style={[s.bosKart, { margin: 16 }]}>
            <Text style={s.bosEmoji}>⚠️</Text>
            <Text style={s.bosBaslik}>{tr('Yüklenemedi', 'Failed to load')}</Text>
            <TouchableOpacity activeOpacity={0.7} style={{ marginTop: 8 }}
              onPress={() => egzersizlerYukle(seciliKas, egArama)}>
              <Text style={{ color: renkler.ana, fontWeight: '600' }}>{tr('Tekrar dene', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : egzersizler.length === 0 ? (
          <View style={[s.bosKart, { margin: 16 }]}>
            <Text style={s.bosEmoji}>🔍</Text>
            <Text style={s.bosBaslik}>{tr('Sonuç yok', 'No results')}</Text>
            <TouchableOpacity activeOpacity={0.7} style={[s.ozelButon, { marginTop: 12 }]} onPress={ozelAc}>
              <Text style={s.ozelButonYazi}>+ {tr('Özel hareket oluştur', 'Create custom exercise')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={egzersizler}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              <TouchableOpacity activeOpacity={0.7} style={s.ozelButon} onPress={ozelAc}>
                <Text style={s.ozelButonYazi}>+ {tr('Listede yok? Özel hareket oluştur', 'Not here? Create custom')}</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const isKardiyo = item.kas_grubu === 'kardiyo' || item.kas_grubu === 'cardio';
              const secilenMi = hedef === 'sablon' && sablonEgzersizleri.some(e => e.id === item.id);
              return (
                <TouchableOpacity style={[s.egzersizSatir, secilenMi && { borderColor: renkler.ana, borderWidth: 1.5 }]}
                  activeOpacity={0.7} onPress={() => sec(item)}
                  onLongPress={() => egzersizSecenekleri(item, hedef)}
                  delayLongPress={400}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.egzersizSatirAdi}>{item.isim}</Text>
                    <Text style={s.egzersizSatirKas}>
                      {isKardiyo ? '🏃 ' : ''}{item.kas_grubu}  ·  {item.ekipman}
                    </Text>
                  </View>
                  {/* YouTube butonu */}
                  <TouchableOpacity
                    style={s.ytButon}
                    activeOpacity={0.7}
                    onPress={() => youtubeAc(item.isim)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
                    <Text style={{ fontSize: 17 }}>▶️</Text>
                  </TouchableOpacity>
                  {/* Ekle butonu */}
                  <View style={[s.ekleIkon, isKardiyo && { backgroundColor: '#FF6B35' }, secilenMi && { backgroundColor: renkler.yesil ?? '#34C759' }]}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 22 }}>
                      {secilenMi ? '✓' : '+'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AKTİF ANTRENMAN ekranı
  // ═══════════════════════════════════════════════════════════════════════════
  const renderAntrenman = () => (
    <KeyboardAvoidingView style={[s.kap, { paddingTop: 0 }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <SafeAreaView style={{ flex: 1 }}>
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
            <Text style={s.bosAciklama}>{tr('Aşağıdaki butona bas.', 'Tap the button below.')}</Text>
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
                  {/* Son performans */}
                  {sonPerfMap[ae.egzersiz?.id] && (
                    <View style={s.sonPerfKart}>
                      <Text style={s.sonPerfYazi}>
                        📅 {sonPerfMap[ae.egzersiz.id].tarih}{'  '}
                        {sonPerfMap[ae.egzersiz.id].setler
                          .map((sp: any) => `${sp.kg ?? '?'}kg×${sp.tekrar ?? '?'}`)
                          .join('  ·  ')}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => egzersizSilFn(ei)} activeOpacity={0.7} style={{ padding: 6 }}>
                  <Text style={{ color: renkler.kirmizi, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={s.setSatirBaslik}>
                <Text style={[s.setBaslik, { flex: 0.5 }]}>Set</Text>
                {kardiyo
                  ? <><Text style={[s.setBaslik, { flex: 2 }]}>⏱ {tr('Süre (dk)', 'Min')}</Text><Text style={[s.setBaslik, { flex: 1.5 }]}>📍 km</Text></>
                  : <><Text style={[s.setBaslik, { flex: 1 }]}>kg</Text><Text style={[s.setBaslik, { flex: 1 }]}>{tr('Tekrar', 'Reps')}</Text></>
                }
                <Text style={[s.setBaslik, { flex: 0.7 }]}>✓</Text>
              </View>

              {ae.setler.map((set, si) => (
                <View key={si} style={s.setSatir}>
                  <Text style={[s.setNo, { flex: 0.5 }]}>{set.set_no}</Text>
                  {kardiyo ? (
                    <>
                      <TextInput style={[s.setInput, { flex: 2 }, set.tamamlandi && s.setTamamla]}
                        value={set.tekrar} onChangeText={v => setGuncelleFn(ei, si, 'tekrar', v)}
                        keyboardType="number-pad" placeholder="dk" placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi} />
                      <TextInput style={[s.setInput, { flex: 1.5 }, set.tamamlandi && s.setTamamla]}
                        value={set.kg} onChangeText={v => setGuncelleFn(ei, si, 'kg', v)}
                        keyboardType="decimal-pad" placeholder="km" placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi} />
                    </>
                  ) : (
                    <>
                      <TextInput style={[s.setInput, { flex: 1 }, set.tamamlandi && s.setTamamla]}
                        value={set.kg} onChangeText={v => setGuncelleFn(ei, si, 'kg', v)}
                        keyboardType="decimal-pad" placeholder="0" placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi} />
                      <TextInput style={[s.setInput, { flex: 1 }, set.tamamlandi && s.setTamamla]}
                        value={set.tekrar} onChangeText={v => setGuncelleFn(ei, si, 'tekrar', v)}
                        keyboardType="number-pad" placeholder="0" placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi} />
                    </>
                  )}
                  <TouchableOpacity style={[s.tamamlaButon, { flex: 0.7 }, set.tamamlandi && s.tamamlaAktif]}
                    activeOpacity={0.7} onPress={() => setTamamlaFn(ei, si)}>
                    <Text style={{ color: set.tamamlandi ? '#fff' : renkler.yaziAcik, fontSize: 16, fontWeight: '700' }}>✓</Text>
                  </TouchableOpacity>
                  {ae.setler.length > 1 && (
                    <TouchableOpacity style={s.setSilButon} activeOpacity={0.7} onPress={() => setSilFn(ei, si)}>
                      <Text style={{ color: renkler.kirmizi, fontSize: 13, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  )}
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

        <TouchableOpacity style={s.egzersizEkleButon} activeOpacity={0.7} onPress={() => pickerAc('antrenman')}>
          <Text style={s.egzersizEkleYazi}>+ {tr('Egzersiz / Kardiyo Ekle', 'Add Exercise / Cardio')}</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BİTİR ekranı — kaydet / kaydetme
  // ═══════════════════════════════════════════════════════════════════════════
  const renderBitir = () => (
    <KeyboardAvoidingView style={s.kap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={s.ozetModal}>
            <Text style={s.ozetBaslik}>🏁 {tr('Antrenmanı Bitir', 'Finish Workout')}</Text>

            <Text style={[s.aciklama, { marginBottom: 10 }]}>
              {tr('Kaç dakika antrenman yaptın?', 'How many minutes did you workout?')}
            </Text>
            <View style={s.sureSatir}>
              <TextInput style={s.sureInput} value={bitirSure} onChangeText={setBitirSure}
                keyboardType="number-pad" placeholder="60" placeholderTextColor={renkler.yaziAcik} />
              <Text style={s.sureBirim}>{tr('dakika', 'min')}</Text>
            </View>
            <Text style={[s.aciklama, { fontSize: 12, marginTop: 4, marginBottom: 24 }]}>
              {tr('Boş bırakabilirsin.', 'You can skip this.')}
            </Text>

            {/* Kaydet */}
            <TouchableOpacity style={s.kaydetButon} activeOpacity={0.75} onPress={antrenmanKaydet}>
              <Text style={s.kaydetYazi}>💾 {tr('Kaydet', 'Save Workout')}</Text>
              <Text style={s.kaydetAlt}>{tr('Geçmişe ekle, AI koç yorumlasın', 'Save to history for AI analysis')}</Text>
            </TouchableOpacity>

            {/* Kaydetme */}
            <TouchableOpacity style={s.kaydetmeButon} activeOpacity={0.7}
              onPress={() => Alert.alert(
                tr('Kaydedilmesin mi?', 'Discard Workout?'),
                tr('Bu antrenman kaydedilmeyecek ve silinecek.', 'This workout will be discarded.'),
                [
                  { text: tr('İptal', 'Cancel'), style: 'cancel' },
                  { text: tr('Sil', 'Discard'), style: 'destructive', onPress: antrenmanKaydetme },
                ]
              )}>
              <Text style={s.kaydetmeYazi}>{tr('Kaydetme', "Don't Save")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setAktifEkran('antrenman'); setBitirSure(''); }}
              style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: renkler.yaziAcik, fontSize: 14 }}>← {tr('Geri dön', 'Go back')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // EGZERSİZ YÖNETİCİSİ — liste
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMgrListe = () => (
    <SafeAreaView style={[s.kap, { paddingTop: 0 }]}>
      <View style={s.modalBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => { setGosterEgzersizMgr(false); }}>
          <Text style={{ color: renkler.kirmizi, fontSize: 15, fontWeight: '600' }}>✕ {tr('Kapat', 'Close')}</Text>
        </TouchableOpacity>
        <Text style={s.modalBaslik}>📚 {tr('Hareketler', 'Exercises')}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => {
          setOzelIsim(''); setOzelKas(''); setOzelEkipman('');
          setMgrDuzenle({});
        }}>
          <Text style={{ color: renkler.ana, fontSize: 13, fontWeight: '700' }}>+ {tr('Ekle', 'Add')}</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={s.aramaInput}
        placeholder={tr('🔍 Hareket ara...', '🔍 Search...')}
        placeholderTextColor={renkler.yaziAcik}
        value={egArama}
        onChangeText={v => { setEgArama(v); egzersizlerYukle(seciliKas, v); }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 50, marginBottom: 8 }}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}>
        {KG.map(k => (
          <TouchableOpacity key={k} style={[s.kasButon, seciliKas === k && s.kasButonAktif]}
            activeOpacity={0.7} onPress={() => { setSeciliKas(k); egzersizlerYukle(k, egArama); }}>
            <Text style={[s.kasYazi, seciliKas === k && { color: '#fff' }]} numberOfLines={1}>{k}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {egYukleniyor ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={renkler.ana} />
      ) : (
        <FlatList
          data={egzersizler}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={[s.egzersizSatir, { gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.egzersizSatirAdi}>{item.isim}</Text>
                <Text style={s.egzersizSatirKas}>{item.kas_grubu}  ·  {item.ekipman}</Text>
              </View>
              {/* YouTube */}
              <TouchableOpacity style={s.ytButon} activeOpacity={0.7}
                onPress={() => youtubeAc(item.isim)}>
                <Text style={{ fontSize: 15 }}>▶️</Text>
              </TouchableOpacity>
              {/* Düzenle */}
              <TouchableOpacity style={s.ytButon} activeOpacity={0.7}
                onPress={() => {
                  setOzelIsim(item.isim);
                  setOzelKas(item.kas_grubu);
                  setOzelEkipman(item.ekipman === 'yok' ? '' : (item.ekipman || ''));
                  setMgrDuzenle(item);
                }}>
                <Text style={{ fontSize: 15 }}>✎</Text>
              </TouchableOpacity>
              {/* Sil */}
              <TouchableOpacity
                style={[s.ytButon, { backgroundColor: renkler.kirmizi + '18' }]}
                activeOpacity={0.7}
                onPress={() => Alert.alert(
                  tr('Sil', 'Delete'), `"${item.isim}" ${tr('silinecek.', 'will be deleted.')}`,
                  [
                    { text: tr('İptal', 'Cancel'), style: 'cancel' },
                    { text: tr('Sil', 'Delete'), style: 'destructive', onPress: async () => {
                      try {
                        await egzersizSilDB(item.id);
                        setEgzersizler(prev => prev.filter(e => e.id !== item.id));
                      } catch {
                        Alert.alert(tr('Hata', 'Error'), tr('Silinemedi.', 'Could not delete.'));
                      }
                    }},
                  ]
                )}>
                <Text style={{ fontSize: 15, color: renkler.kirmizi }}>🗑</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // EGZERSİZ YÖNETİCİSİ — düzenleme / ekleme formu
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMgrForm = () => {
    const kaydet = async () => {
      if (!ozelIsim.trim()) { Alert.alert(tr('Uyarı', 'Warning'), tr('Hareket adı zorunlu.', 'Name required.')); return; }
      if (!ozelKas)         { Alert.alert(tr('Uyarı', 'Warning'), tr('Kas grubu seç.', 'Select muscle group.')); return; }
      setOzelYukleniyor(true);
      try {
        if (mgrDuzenle?.id) {
          await egzersizGuncelleDB(mgrDuzenle.id, { isim: ozelIsim.trim(), kas_grubu: ozelKas, ekipman: ozelEkipman || 'yok' });
        } else {
          await egzersizOlustur({ isim: ozelIsim.trim(), kas_grubu: ozelKas, ekipman: ozelEkipman || 'yok' });
        }
        egzersizlerYukle(seciliKas, egArama);
        setMgrDuzenle(null);
        setOzelIsim(''); setOzelKas(''); setOzelEkipman('');
      } catch {
        Alert.alert(tr('Hata', 'Error'), tr('İşlem başarısız.', 'Operation failed.'));
      } finally { setOzelYukleniyor(false); }
    };

    return (
      <KeyboardAvoidingView style={s.kap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.modalBar}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => { setMgrDuzenle(null); setOzelIsim(''); setOzelKas(''); setOzelEkipman(''); }}>
              <Text style={{ color: renkler.ana, fontSize: 15, fontWeight: '600' }}>← {tr('Geri', 'Back')}</Text>
            </TouchableOpacity>
            <Text style={s.modalBaslik}>{mgrDuzenle?.id ? `✎ ${tr('Düzenle', 'Edit')}` : `+ ${tr('Yeni Hareket', 'New Exercise')}`}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={s.etiket}>{tr('Hareket Adı', 'Exercise Name')} *</Text>
            <TextInput style={s.aramaInput} value={ozelIsim} onChangeText={setOzelIsim}
              placeholder="örn: Incline Dumbbell Press" placeholderTextColor={renkler.yaziAcik} autoFocus />

            <Text style={[s.etiket, { marginTop: 20 }]}>{tr('Kas Grubu', 'Muscle Group')} *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {KG.filter(k => k !== KG[0]).map(k => (
                <TouchableOpacity key={k} style={[s.kasButon, ozelKas === k && s.kasButonAktif]}
                  activeOpacity={0.7} onPress={() => setOzelKas(k)}>
                  <Text style={[s.kasYazi, ozelKas === k && { color: '#fff' }]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.etiket}>{tr('Ekipman', 'Equipment')} ({tr('opsiyonel', 'optional')})</Text>
            <TextInput style={s.aramaInput} value={ozelEkipman} onChangeText={setOzelEkipman}
              placeholder="örn: barbell, dumbbell, machine..." placeholderTextColor={renkler.yaziAcik} />

            <TouchableOpacity style={[s.baslatButon, { marginTop: 28 }]}
              activeOpacity={0.75} onPress={kaydet} disabled={ozelYukleniyor}>
              {ozelYukleniyor
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.baslatYazi}>{mgrDuzenle?.id ? `✓ ${tr('Güncelle', 'Update')}` : `✓ ${tr('Ekle', 'Add')}`}</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ÖZEL HAREKET OLUŞTURMA
  // ═══════════════════════════════════════════════════════════════════════════
  const renderOzelHareket = (hedef: 'antrenman' | 'sablon') => {
    const geri = () => hedef === 'antrenman' ? setAktifEkran('picker') : setSablonEkrani('picker');
    return (
      <KeyboardAvoidingView style={s.kap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.modalBar}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => {
              geri();
              if (duzenleEg) { setDuzenleEg(null); setOzelIsim(''); setOzelKas(''); setOzelEkipman(''); }
            }}>
              <Text style={{ color: renkler.ana, fontSize: 15, fontWeight: '600' }}>← {tr('Geri', 'Back')}</Text>
            </TouchableOpacity>
            <Text style={s.modalBaslik}>
              {duzenleEg ? `✎ ${tr('Düzenle', 'Edit')}` : `✏️ ${tr('Özel Hareket', 'Custom Exercise')}`}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={s.etiket}>{tr('Hareket Adı', 'Exercise Name')} *</Text>
            <TextInput style={s.aramaInput} value={ozelIsim} onChangeText={setOzelIsim}
              placeholder={tr('örn: Kürek Çekme, Leg Curl...', 'e.g. Cable Row, Leg Curl...')}
              placeholderTextColor={renkler.yaziAcik} autoFocus />

            <Text style={[s.etiket, { marginTop: 20 }]}>{tr('Kas Grubu', 'Muscle Group')} *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {KG.filter(k => k !== KG[0]).map(k => (
                <TouchableOpacity key={k}
                  style={[s.kasButon, ozelKas === k && s.kasButonAktif]}
                  activeOpacity={0.7} onPress={() => setOzelKas(k)}>
                  <Text style={[s.kasYazi, ozelKas === k && { color: '#fff' }]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.etiket}>{tr('Ekipman', 'Equipment')} ({tr('opsiyonel', 'optional')})</Text>
            <TextInput style={s.aramaInput} value={ozelEkipman} onChangeText={setOzelEkipman}
              placeholder={tr('örn: dumbbell, barbell, yok...', 'e.g. dumbbell, barbell, none...')}
              placeholderTextColor={renkler.yaziAcik} />

            <TouchableOpacity style={[s.baslatButon, { marginTop: 28 }]}
              activeOpacity={0.75} onPress={() => ozelHareketKaydet(hedef)}
              disabled={ozelYukleniyor}>
              {ozelYukleniyor
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.baslatYazi}>
                    {duzenleEg ? `✓ ${tr('Güncelle', 'Update')}` : `✓ ${tr('Hareketi Ekle', 'Add Exercise')}`}
                  </Text>
              }
            </TouchableOpacity>

            <Text style={[s.aciklama, { textAlign: 'center', marginTop: 12 }]}>
              {duzenleEg
                ? tr('Değişiklikler kaydedilecek.', 'Changes will be saved.')
                : tr('Hareket veritabanına kaydedilir ve sonra da kullanabilirsin.', 'Exercise is saved and can be reused.')}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ŞABLON OLUŞTURMA MODAL içi
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSablonForm = () => (
    <KeyboardAvoidingView style={[s.kap, { paddingTop: 56 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.modalBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => { setGosterSablon(false); setSablonAdi(''); setSablonEgzersizleri([]); }}>
          <Text style={{ color: renkler.kirmizi, fontSize: 15 }}>{tr('İptal', 'Cancel')}</Text>
        </TouchableOpacity>
        <Text style={s.modalBaslik}>{tr('Yeni Şablon', 'New Template')}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={sablonKaydetHandler}>
          <Text style={{ color: renkler.ana, fontSize: 15, fontWeight: '700' }}>{tr('Kaydet', 'Save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={s.etiket}>{tr('Şablon Adı', 'Template Name')}</Text>
        <TextInput style={s.aramaInput} value={sablonAdi} onChangeText={setSablonAdi}
          placeholder={tr('örn: Push Day, Bacak Günü...', 'e.g. Push Day, Leg Day...')}
          placeholderTextColor={renkler.yaziAcik} autoFocus />

        <Text style={[s.etiket, { marginTop: 16 }]}>{tr('Egzersizler', 'Exercises')} ({sablonEgzersizleri.length})</Text>

        {sablonEgzersizleri.map((eg, i) => (
          <View key={eg.id} style={s.sablonEgzersizSatir}>
            <Text style={{ fontSize: 13, color: renkler.yaziAcik, width: 20 }}>{i + 1}.</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: renkler.yazi }}>{eg.isim}</Text>
              <Text style={{ fontSize: 12, color: renkler.yaziAcik }}>{eg.kas_grubu}</Text>
            </View>
            <TouchableOpacity onPress={() => setSablonEgzersizleri(prev => prev.filter(e => e.id !== eg.id))} activeOpacity={0.7} style={{ padding: 6 }}>
              <Text style={{ color: renkler.kirmizi, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.egzersizEkleButon} activeOpacity={0.7} onPress={() => pickerAc('sablon')}>
          <Text style={s.egzersizEkleYazi}>+ {tr('Egzersiz Ekle', 'Add Exercise')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ANA EKRAN
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={s.kap}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriYukle(); }} tintColor={renkler.ana} />}>

        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerBaslik}>🏋️ {tr('Antrenman', 'Workout')}</Text>
            <Text style={s.headerAlt}>{tr('Egzersiz ve kardiyo takibi', 'Exercise & cardio tracking')}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}
            style={{ backgroundColor: renkler.ana + '18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: renkler.ana }}
            onPress={() => { egzersizlerYukle(); setGosterEgzersizMgr(true); }}>
            <Text style={{ color: renkler.ana, fontSize: 12, fontWeight: '700' }}>📚 {tr('Hareketler', 'Exercises')}</Text>
          </TouchableOpacity>
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
          <Text style={s.aciklama}>{tr('Boş başlat, egzersizleri kendin ekle.', 'Start empty, add exercises as you go.')}</Text>
          <TouchableOpacity style={s.baslatButon} activeOpacity={0.75} onPress={() => antrenmanBaslatHandler()}>
            <Text style={s.baslatYazi}>{tr('Boş Antrenman Başlat', 'Start Empty Workout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Şablonlar */}
        <View style={s.bolum}>
          <View style={s.bolumSatir}>
            <View style={{ flex: 1 }}>
              <Text style={s.bolumBaslik}>📋 {tr('Şablonlarım', 'My Templates')}</Text>
              <Text style={s.aciklama}>{tr('Tıkla başlat · Uzun bas sil', 'Tap to start · Long press to delete')}</Text>
            </View>
            <TouchableOpacity style={s.yeniSablonButon} activeOpacity={0.7} onPress={() => { setSablonEkrani('form'); setGosterSablon(true); }}>
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
                <TouchableOpacity key={sab.id} style={s.sablonKart} activeOpacity={0.7}
                  onPress={() => antrenmanBaslatHandler(sab)}
                  onLongPress={() => sablonSilHandler(sab)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={s.sablonAdi} numberOfLines={1}>{sab.isim}</Text>
                    <TouchableOpacity onPress={() => sablonSilHandler(sab)} activeOpacity={0.7} style={{ padding: 2, marginLeft: 8 }}>
                      <Text style={{ color: renkler.kirmizi, fontSize: 14 }}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.sablonEgSayisi}>{sab.sablon_egzersizleri?.length ?? 0} {tr('egzersiz', 'exercises')}</Text>
                  <Text style={[s.aciklama, { fontSize: 11, marginTop: 6 }]}>▶ {tr('Başlat', 'Start')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Geçmiş */}
        <View style={s.bolum}>
          <Text style={s.bolumBaslik}>🕐 {tr('Son Antrenmanlar', 'Recent Workouts')}</Text>
          {gecmis.length === 0 ? (
            <Text style={s.aciklama}>{tr('Henüz antrenman yok.', 'No workouts yet.')}</Text>
          ) : gecmis.map(log => (
            <View key={log.id} style={s.gecmisKart}>
              <View style={{ flex: 1 }}>
                <Text style={s.gecmisAdi}>{log.antrenman_adi}</Text>
                <Text style={s.gecmisBilgi}>{log.tarih}  ·  {log.toplam_set} set{log.sure_dakika ? `  ·  ${log.sure_dakika} dk` : ''}</Text>
              </View>
              <TouchableOpacity style={[s.silButon, { marginRight: 8, backgroundColor: renkler.ana + '18' }]}
                activeOpacity={0.7} onPress={() => antrenmanTekrarla(log)}>
                <Text style={{ fontSize: 16 }}>🔁</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.silButon} activeOpacity={0.7} onPress={() => gecmisSilHandler(log.id, log.antrenman_adi)}>
                <Text style={{ fontSize: 16 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ══ TEK MODAL — aktif antrenman ══ */}
      <Modal visible={gosterAktif} animationType="slide">
        {aktifEkran === 'picker'      ? renderPicker('antrenman')      :
         aktifEkran === 'bitir'       ? renderBitir()                  :
         aktifEkran === 'ozelhareket' ? renderOzelHareket('antrenman') :
                                        renderAntrenman()}
      </Modal>

      {/* ══ Özet Modal ══ */}
      <Modal visible={gosterOzet} animationType="fade" transparent>
        <View style={s.ozetOverlay}>
          <View style={s.ozetModal}>
            <Text style={s.ozetBaslik}>🎉 {tr('Antrenman Kaydedildi!', 'Workout Saved!')}</Text>

            {(ozet?.sure_dakika ?? 0) > 0 && (
              <View style={s.ozetSatir}>
                <Text style={s.ozetEtiket}>⏱ {tr('Süre', 'Duration')}</Text>
                <Text style={s.ozetDeger}>{ozet.sure_dakika} dk</Text>
              </View>
            )}

            <View style={s.ozetSatir}>
              <Text style={s.ozetEtiket}>✓ {tr('Tamamlanan Set', 'Sets Completed')}</Text>
              <Text style={s.ozetDeger}>{ozet?.toplam_set ?? 0}</Text>
            </View>

            {ozet?.egzersizler?.length > 0 && (
              <View style={[s.ozetSatir, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={[s.ozetEtiket, { marginBottom: 6 }]}>💪 {tr('Yapılan Hareketler', 'Exercises Done')}</Text>
                {ozet.egzersizler.map((isim: string, i: number) => (
                  <Text key={i} style={{ color: renkler.yazi, fontSize: 14, marginBottom: 2 }}>• {isim}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity style={[s.baslatButon, { marginTop: 20 }]} activeOpacity={0.75} onPress={() => setGosterOzet(false)}>
              <Text style={s.baslatYazi}>💪 {tr('Harika!', 'Awesome!')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ Egzersiz Yöneticisi Modal ══ */}
      <Modal visible={gosterEgzersizMgr} animationType="slide">
        {mgrDuzenle ? renderMgrForm() : renderMgrListe()}
      </Modal>

      {/* ══ Şablon Modal ══ */}
      <Modal visible={gosterSablon} animationType="slide">
        {sablonEkrani === 'picker'      ? renderPicker('sablon')      :
         sablonEkrani === 'ozelhareket' ? renderOzelHareket('sablon') :
                                          renderSablonForm()}
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:                 { flex: 1, backgroundColor: r.arkaplan },
    header:              { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: r.kart, borderBottomWidth: 1, borderBottomColor: r.sinir, flexDirection: 'row', alignItems: 'center' },
    headerBaslik:        { fontSize: 26, fontWeight: '800', color: r.yazi },
    headerAlt:           { fontSize: 13, color: r.yaziAcik, marginTop: 2 },
    istatistikSatir:     { flexDirection: 'row', padding: 16, gap: 10 },
    istatistikKart:      { flex: 1, backgroundColor: r.kart, borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    istatistikSayi:      { fontSize: 26, fontWeight: '800', color: r.ana },
    istatistikEtiket:    { fontSize: 11, color: r.yaziAcik, marginTop: 4, textAlign: 'center' },
    bolum:               { marginHorizontal: 16, marginBottom: 24 },
    bolumSatir:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    bolumBaslik:         { fontSize: 16, fontWeight: '700', color: r.yazi, marginBottom: 4 },
    aciklama:            { fontSize: 13, color: r.yaziAcik, lineHeight: 18 },
    baslatButon:         { backgroundColor: r.ana, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12, shadowColor: r.ana, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    baslatYazi:          { color: '#fff', fontSize: 16, fontWeight: '800' },
    yeniSablonButon:     { backgroundColor: r.ana + '22', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: r.ana },
    yeniSablonYazi:      { color: r.ana, fontSize: 13, fontWeight: '700' },
    bosKart:             { backgroundColor: r.kart, borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 8 },
    bosEmoji:            { fontSize: 32, marginBottom: 8 },
    bosBaslik:           { fontSize: 15, fontWeight: '700', color: r.yazi, marginBottom: 6 },
    bosAciklama:         { fontSize: 13, color: r.yaziAcik, textAlign: 'center', lineHeight: 18 },
    sablonKart:          { backgroundColor: r.kart, borderRadius: 14, padding: 14, marginRight: 12, width: 160, borderWidth: 1, borderColor: r.sinir },
    sablonAdi:           { fontSize: 14, fontWeight: '700', color: r.yazi, flex: 1 },
    sablonEgSayisi:      { fontSize: 12, color: r.yaziAcik, marginTop: 6 },
    gecmisKart:          { flexDirection: 'row', alignItems: 'center', backgroundColor: r.kart, borderRadius: 14, padding: 14, marginBottom: 8 },
    gecmisAdi:           { fontSize: 14, fontWeight: '700', color: r.yazi },
    gecmisBilgi:         { fontSize: 12, color: r.yaziAcik, marginTop: 3 },
    silButon:            { padding: 8, borderRadius: 10, backgroundColor: r.kirmizi + '18' },
    // Aktif antrenman
    timerBar:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: r.kart, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: r.sinir },
    aktifAdi:            { fontSize: 16, fontWeight: '700', color: r.yazi, flex: 1, marginRight: 12 },
    bitirButon:          { backgroundColor: r.kirmizi, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
    bitirYazi:           { color: '#fff', fontSize: 14, fontWeight: '700' },
    egzersizBlok:        { backgroundColor: r.kart, borderRadius: 16, padding: 16, marginBottom: 12 },
    egzersizBaslikSatir: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
    egzersizAdi:         { fontSize: 16, fontWeight: '800', color: r.yazi, marginBottom: 2 },
    egzersizKas:         { fontSize: 12, color: r.yaziAcik, marginBottom: 12, textTransform: 'capitalize' },
    setSatirBaslik:      { flexDirection: 'row', marginBottom: 6 },
    setBaslik:           { fontSize: 11, color: r.yaziAcik, fontWeight: '600', textAlign: 'center' },
    setSatir:            { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
    setNo:               { fontSize: 14, fontWeight: '700', color: r.yaziAcik, textAlign: 'center' },
    setInput:            { borderWidth: 1.5, borderColor: r.sinir, borderRadius: 10, padding: 10, fontSize: 15, color: r.yazi, textAlign: 'center', backgroundColor: r.arkaplan },
    setTamamla:          { backgroundColor: r.ana + '18', borderColor: r.ana },
    tamamlaButon:        { backgroundColor: r.sinir, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    tamamlaAktif:        { backgroundColor: r.ana },
    setSilButon:         { width: 26, height: 26, borderRadius: 8, backgroundColor: r.kirmizi + '18', alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
    sonPerfKart:         { backgroundColor: r.ana + '12', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
    sonPerfYazi:         { fontSize: 11, color: r.ana, fontWeight: '600' },
    setEkleButon:        { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
    egzersizEkleButon:   { backgroundColor: r.kart, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8, borderWidth: 1.5, borderColor: r.ana, borderStyle: 'dashed' },
    egzersizEkleYazi:    { color: r.ana, fontSize: 15, fontWeight: '700' },
    // Bitir ekranı
    kaydetButon:         { backgroundColor: r.ana, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, shadowColor: r.ana, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
    kaydetYazi:          { color: '#fff', fontSize: 16, fontWeight: '800' },
    kaydetAlt:           { color: '#ffffff99', fontSize: 12, marginTop: 3 },
    kaydetmeButon:       { borderWidth: 1.5, borderColor: r.sinir, borderRadius: 14, padding: 14, alignItems: 'center' },
    kaydetmeYazi:        { color: r.yaziAcik, fontSize: 15, fontWeight: '600' },
    sureSatir:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    sureInput:           { flex: 1, borderWidth: 1.5, borderColor: r.sinir, borderRadius: 12, padding: 14, fontSize: 24, fontWeight: '700', color: r.yazi, textAlign: 'center', backgroundColor: r.arkaplan },
    sureBirim:           { fontSize: 16, color: r.yaziAcik, fontWeight: '600' },
    // Picker
    modalBar:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: r.sinir },
    modalBaslik:         { fontSize: 16, fontWeight: '700', color: r.yazi },
    aramaInput:          { marginHorizontal: 16, marginVertical: 10, borderWidth: 1.5, borderColor: r.sinir, borderRadius: 12, padding: 13, fontSize: 15, color: r.yazi, backgroundColor: r.arkaplan },
    kasButon:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: r.sinir, marginRight: 8, height: 36, justifyContent: 'center' },
    kasButonAktif:       { backgroundColor: r.ana },
    kasYazi:             { fontSize: 12, color: r.yazi, fontWeight: '600' },
    egzersizSatir:       { flexDirection: 'row', alignItems: 'center', backgroundColor: r.kart, borderRadius: 14, padding: 14, marginBottom: 8 },
    egzersizSatirAdi:    { fontSize: 14, fontWeight: '700', color: r.yazi },
    egzersizSatirKas:    { fontSize: 12, color: r.yaziAcik, marginTop: 2, textTransform: 'capitalize' },
    ekleIkon:            { width: 38, height: 38, borderRadius: 19, backgroundColor: r.ana, alignItems: 'center', justifyContent: 'center' },
    ytButon:             { width: 34, height: 34, borderRadius: 10, backgroundColor: r.sinir, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    ozelButon:           { borderWidth: 1.5, borderColor: r.ana, borderStyle: 'dashed', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
    ozelButonYazi:       { color: r.ana, fontSize: 14, fontWeight: '700' },
    // Şablon oluşturma
    sablonEgzersizSatir: { flexDirection: 'row', alignItems: 'center', backgroundColor: r.kart, borderRadius: 12, padding: 12, marginBottom: 8 },
    // Özet
    ozetOverlay:         { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 24 },
    ozetModal:           { backgroundColor: r.kart, borderRadius: 24, padding: 24 },
    ozetBaslik:          { fontSize: 20, fontWeight: '800', color: r.yazi, textAlign: 'center', marginBottom: 16 },
    ozetSatir:           { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: r.sinir, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ozetEtiket:          { fontSize: 13, color: r.yaziAcik },
    ozetDeger:           { fontSize: 15, fontWeight: '700', color: r.yazi },
    etiket:              { fontSize: 13, fontWeight: '600', color: r.yazi, marginBottom: 8 },
  });
