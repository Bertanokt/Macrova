import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, FlatList,
  RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  antrenmanIstatistik, sablonlariGetir, antrenmanGecmisi,
  egzersizleriGetir, antrenmanBaslat, setEkle, setGuncelle, antrenmanBitir,
  sablonOlustur,
} from '../../services/api';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

const KAS_GRUPLARI_TR = ['Tümü', 'göğüs', 'sırt', 'omuz', 'kol', 'bacak', 'karın'];
const KAS_GRUPLARI_EN = ['All',  'chest', 'back', 'shoulder', 'arm', 'leg',  'abs'];

// ── Tipler ────────────────────────────────────────────────────────────────────
interface AktifSet { id?: string; set_no: number; kg: string; tekrar: string; tamamlandi: boolean; }
interface AktifEgzersiz { egzersiz: any; setler: AktifSet[]; }

export default function AntrenmanEkrani() {
  const { renkler } = useTemaStore();
  const { t, dil }  = useDilStore();
  const KAS_GRUPLARI = dil === 'tr' ? KAS_GRUPLARI_TR : KAS_GRUPLARI_EN;

  // ── Veri state ──
  const [istatistik, setIstatistik] = useState<any>(null);
  const [sablonlar, setSablonlar]   = useState<any[]>([]);
  const [gecmis, setGecmis]         = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  // ── Aktif antrenman state ──
  const [aktifLogId, setAktifLogId]     = useState<string | null>(null);
  const [aktifAdi, setAktifAdi]         = useState('');
  const [aktifEgzersizler, setAktifEgzersizler] = useState<AktifEgzersiz[]>([]);
  const [sure, setSure]                 = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Modal state ──
  const [gosterAktif, setGosterAktif]         = useState(false);
  const [gosterEgPicker, setGosterEgPicker]   = useState(false);
  const [gosterOzet, setGosterOzet]           = useState(false);
  const [gosterSablon, setGosterSablon]       = useState(false);
  const [ozet, setOzet]                       = useState<any>(null);

  // ── Egzersiz picker state ──
  const [egzersizler, setEgzersizler]   = useState<any[]>([]);
  const [seciliKas, setSeciliKas]       = useState(KAS_GRUPLARI[0]);
  const [egArama, setEgArama]           = useState('');
  const [egYukleniyor, setEgYukleniyor] = useState(false);

  // ── Şablon oluşturma state ──
  const [sablonAdi, setSablonAdi]           = useState('');
  const [sablonEgzersizler, setSablonEgzersizler] = useState<any[]>([]);

  // ── Veri Yükle ───────────────────────────────────────────────────────────
  const veriYukle = async () => {
    try {
      const [ist, sab, gec] = await Promise.all([
        antrenmanIstatistik(), sablonlariGetir(), antrenmanGecmisi(5),
      ]);
      setIstatistik(ist.data);
      setSablonlar(sab.data);
      setGecmis(gec.data);
    } catch {}
    finally { setYukleniyor(false); setYenileniyor(false); }
  };

  useFocusEffect(useCallback(() => { veriYukle(); }, []));

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gosterAktif) {
      setSure(0);
      timerRef.current = setInterval(() => setSure(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gosterAktif]);

  const sureFmt = (sn: number) => {
    const d = Math.floor(sn / 60);
    const s = sn % 60;
    return `${String(d).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Antrenman Başlat ──────────────────────────────────────────────────────
  const antrenmanBaslatHandler = async (sablon?: any) => {
    try {
      const yanit = await antrenmanBaslat({
        sablon_id: sablon?.id,
        antrenman_adi: sablon?.isim || t('antrenman'),
      });
      setAktifLogId(yanit.data.id);
      setAktifAdi(yanit.data.antrenman_adi);
      // Şablondan egzersizleri yükle
      if (sablon?.sablon_egzersizleri?.length) {
        const egList = sablon.sablon_egzersizleri.map((se: any) => ({
          egzersiz: se.egzersizler,
          setler: Array.from({ length: se.hedef_set || 3 }, (_, i) => ({
            set_no: i + 1, kg: String(se.hedef_kg || ''), tekrar: se.hedef_rep?.split('-')[0] || '', tamamlandi: false,
          })),
        }));
        setAktifEgzersizler(egList);
      } else {
        setAktifEgzersizler([]);
      }
      setGosterAktif(true);
    } catch {
      Alert.alert(t('hataOlustu'), t('tekrarDene'));
    }
  };

  // ── Egzersiz Picker ───────────────────────────────────────────────────────
  const egzersizlerYukle = async (kas?: string, arama?: string) => {
    setEgYukleniyor(true);
    try {
      const kg  = kas && kas !== KAS_GRUPLARI[0] ? kas : undefined;
      const ara = arama && arama.length >= 2 ? arama : undefined;
      const r   = await egzersizleriGetir(kg, ara);
      setEgzersizler(r.data);
    } catch {}
    finally { setEgYukleniyor(false); }
  };

  const egzersizSec = (egzersiz: any) => {
    setAktifEgzersizler(prev => [...prev, {
      egzersiz,
      setler: [{ set_no: 1, kg: '', tekrar: '', tamamlandi: false }],
    }]);
    setGosterEgPicker(false);
  };

  // ── Set işlemleri ─────────────────────────────────────────────────────────
  const setGuncelleFn = (egIdx: number, setIdx: number, alan: 'kg' | 'tekrar', deger: string) => {
    setAktifEgzersizler(prev => {
      const yeni = [...prev];
      yeni[egIdx] = {
        ...yeni[egIdx],
        setler: yeni[egIdx].setler.map((s, i) => i === setIdx ? { ...s, [alan]: deger } : s),
      };
      return yeni;
    });
  };

  const setTamamlaFn = async (egIdx: number, setIdx: number) => {
    if (!aktifLogId) return;
    const eg  = aktifEgzersizler[egIdx];
    const set = eg.setler[setIdx];
    try {
      if (set.id) {
        await setGuncelle(set.id, { tamamlandi: !set.tamamlandi });
      } else {
        const r = await setEkle({
          antrenman_log_id: aktifLogId,
          egzersiz_id: eg.egzersiz.id,
          set_no: set.set_no,
          kg: parseFloat(set.kg) || null,
          tekrar: parseInt(set.tekrar) || null,
          tamamlandi: true,
        });
        setAktifEgzersizler(prev => {
          const yeni = [...prev];
          yeni[egIdx] = {
            ...yeni[egIdx],
            setler: yeni[egIdx].setler.map((s, i) =>
              i === setIdx ? { ...s, tamamlandi: true, id: r.data.id } : s
            ),
          };
          return yeni;
        });
        return;
      }
    } catch {}
    setAktifEgzersizler(prev => {
      const yeni = [...prev];
      yeni[egIdx] = {
        ...yeni[egIdx],
        setler: yeni[egIdx].setler.map((s, i) =>
          i === setIdx ? { ...s, tamamlandi: !s.tamamlandi } : s
        ),
      };
      return yeni;
    });
  };

  const yeniSetEkle = (egIdx: number) => {
    setAktifEgzersizler(prev => {
      const yeni = [...prev];
      const setler = yeni[egIdx].setler;
      yeni[egIdx] = {
        ...yeni[egIdx],
        setler: [...setler, { set_no: setler.length + 1, kg: setler[setler.length - 1]?.kg || '', tekrar: setler[setler.length - 1]?.tekrar || '', tamamlandi: false }],
      };
      return yeni;
    });
  };

  // ── Antrenman Bitir ───────────────────────────────────────────────────────
  const antrenmanBitirHandler = async () => {
    if (!aktifLogId) return;
    try {
      const r = await antrenmanBitir(aktifLogId, { sure_dakika: Math.round(sure / 60) });
      setOzet(r.data.ozet);
      setGosterAktif(false);
      setGosterOzet(true);
      veriYukle();
    } catch {
      Alert.alert(t('hataOlustu'), t('tekrarDene'));
    }
  };

  // ── Şablon Kaydet ─────────────────────────────────────────────────────────
  const sablonKaydet = async () => {
    if (!sablonAdi.trim()) { Alert.alert(t('hataOlustu'), t('tumAlanlariDoldurun')); return; }
    try {
      await sablonOlustur({ isim: sablonAdi, egzersizler: [] });
      setSablonAdi(''); setSablonEgzersizler([]); setGosterSablon(false);
      veriYukle();
    } catch {}
  };

  const s = makeStyles(renkler);

  if (yukleniyor) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: renkler.arkaplan }}>
        <ActivityIndicator size="large" color={renkler.ana} />
      </View>
    );
  }

  return (
    <View style={s.kap}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriYukle(); }} tintColor={renkler.ana} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerBaslik}>🏋️ {t('antrenman')}</Text>
        </View>

        {/* İstatistik kartlar */}
        <View style={s.istatistikSatir}>
          <View style={s.istatistikKart}>
            <Text style={s.istatistikSayi}>{istatistik?.bu_hafta_antrenman_sayisi ?? 0}</Text>
            <Text style={s.istatistikEtiket}>{t('buHaftaAntrenman')}</Text>
          </View>
          <View style={s.istatistikKart}>
            <Text style={s.istatistikSayi}>{istatistik?.bu_ay_antrenman_sayisi ?? 0}</Text>
            <Text style={s.istatistikEtiket}>{t('aylikAntrenman')}</Text>
          </View>
          <View style={s.istatistikKart}>
            <Text style={s.istatistikSayi}>{istatistik?.son_30_gun_toplam_sure ?? 0}</Text>
            <Text style={s.istatistikEtiket}>{t('toplamSure')} ({t('dakika')})</Text>
          </View>
        </View>

        {/* Başlat butonu */}
        <TouchableOpacity style={s.baslatButon} onPress={() => antrenmanBaslatHandler()}>
          <Text style={s.baslatYazi}>⚡ {t('antrenmanBaslat')}</Text>
        </TouchableOpacity>

        {/* Şablonlar */}
        <View style={s.bolumBaslik}>
          <Text style={s.bolumYazi}>{t('sablonlar')}</Text>
          <TouchableOpacity onPress={() => setGosterSablon(true)}>
            <Text style={[s.bolumYazi, { color: renkler.ana }]}>+ {t('yeniSablon')}</Text>
          </TouchableOpacity>
        </View>

        {sablonlar.length === 0 ? (
          <Text style={s.bosYazi}>{dil === 'tr' ? 'Henüz şablon yok' : 'No templates yet'}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
            {sablonlar.map(sab => (
              <TouchableOpacity key={sab.id} style={s.sablonKart} onPress={() => antrenmanBaslatHandler(sab)}>
                <Text style={s.sablonAdi}>{sab.isim}</Text>
                <Text style={s.sablonEgSayisi}>
                  {sab.sablon_egzersizleri?.length ?? 0} {dil === 'tr' ? 'egzersiz' : 'exercises'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Geçmiş */}
        <Text style={[s.bolumYazi, { marginHorizontal: 16, marginTop: 24 }]}>{t('gecmisAntreman')}</Text>
        {gecmis.length === 0 ? (
          <Text style={s.bosYazi}>{dil === 'tr' ? 'Henüz antrenman yok' : 'No workouts yet'}</Text>
        ) : (
          gecmis.map(log => (
            <View key={log.id} style={s.gecmisKart}>
              <View style={{ flex: 1 }}>
                <Text style={s.gecmisAdi}>{log.antrenman_adi}</Text>
                <Text style={s.gecmisBilgi}>{log.tarih}  ·  {log.toplam_set} {t('set')}</Text>
              </View>
              {log.sure_dakika ? (
                <Text style={s.gecmisSure}>{log.sure_dakika} {t('dakika')}</Text>
              ) : null}
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Aktif Antrenman Modal ── */}
      <Modal visible={gosterAktif} animationType="slide">
        <View style={[s.kap, { paddingTop: 0 }]}>
          {/* Timer bar */}
          <View style={s.timerBar}>
            <Text style={s.timerYazi}>⏱ {sureFmt(sure)}</Text>
            <Text style={s.aktifAdi}>{aktifAdi}</Text>
            <TouchableOpacity style={s.bitirButon} onPress={() => {
              Alert.alert(t('antrenmanBitir'), dil === 'tr' ? 'Antrenmanı bitirmek istiyor musun?' : 'Finish your workout?', [
                { text: t('iptal'), style: 'cancel' },
                { text: t('antrenmanBitir'), style: 'destructive', onPress: antrenmanBitirHandler },
              ]);
            }}>
              <Text style={s.bitirYazi}>✓ {t('antrenmanBitir')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {aktifEgzersizler.map((ae, egIdx) => (
              <View key={egIdx} style={s.egzersizBlok}>
                <Text style={s.egzersizAdi}>{ae.egzersiz?.isim}</Text>
                <Text style={s.egzersizKas}>{ae.egzersiz?.kas_grubu}</Text>

                {/* Set başlık */}
                <View style={s.setSatirBaslik}>
                  <Text style={[s.setBaslik, { flex: 0.5 }]}>{t('set')}</Text>
                  <Text style={[s.setBaslik, { flex: 1 }]}>{t('onceki')}</Text>
                  <Text style={[s.setBaslik, { flex: 1 }]}>{t('kg')}</Text>
                  <Text style={[s.setBaslik, { flex: 1 }]}>{t('tekrar')}</Text>
                  <Text style={[s.setBaslik, { flex: 0.6 }]}>✓</Text>
                </View>

                {ae.setler.map((set, setIdx) => (
                  <View key={setIdx} style={s.setSatir}>
                    <Text style={[s.setNo, { flex: 0.5 }]}>{set.set_no}</Text>
                    <Text style={[s.setOnceki, { flex: 1 }]}>—</Text>
                    <TextInput
                      style={[s.setInput, { flex: 1 }, set.tamamlandi && s.setInputTamamlandi]}
                      value={set.kg} onChangeText={v => setGuncelleFn(egIdx, setIdx, 'kg', v)}
                      keyboardType="decimal-pad" placeholder="0"
                      placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi}
                    />
                    <TextInput
                      style={[s.setInput, { flex: 1 }, set.tamamlandi && s.setInputTamamlandi]}
                      value={set.tekrar} onChangeText={v => setGuncelleFn(egIdx, setIdx, 'tekrar', v)}
                      keyboardType="number-pad" placeholder="0"
                      placeholderTextColor={renkler.yaziAcik} editable={!set.tamamlandi}
                    />
                    <TouchableOpacity style={[s.tamamlaButon, { flex: 0.6 }, set.tamamlandi && s.tamamlaAktif]}
                      onPress={() => setTamamlaFn(egIdx, setIdx)}>
                      <Text style={{ color: set.tamamlandi ? '#fff' : renkler.yaziAcik, fontSize: 16 }}>✓</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={s.setEkleButon} onPress={() => yeniSetEkle(egIdx)}>
                  <Text style={{ color: renkler.ana, fontSize: 13, fontWeight: '600' }}>+ {t('setEkle')}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={s.egzersizEkleButon} onPress={() => {
              setGosterEgPicker(true);
              egzersizlerYukle();
            }}>
              <Text style={s.egzersizEkleYazi}>+ {t('egzersizEkle')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Egzersiz Seçici Modal ── */}
      <Modal visible={gosterEgPicker} animationType="slide">
        <View style={[s.kap, { paddingTop: 56 }]}>
          <View style={s.modalBar}>
            <TouchableOpacity onPress={() => setGosterEgPicker(false)}>
              <Text style={{ color: renkler.ana, fontSize: 15 }}>← {t('iptal')}</Text>
            </TouchableOpacity>
            <Text style={s.modalBaslik}>{t('egzersizEkle')}</Text>
            <View style={{ width: 60 }} />
          </View>

          <TextInput style={s.aramaInput} placeholder={dil === 'tr' ? 'Egzersiz ara...' : 'Search exercise...'}
            placeholderTextColor={renkler.yaziAcik} value={egArama}
            onChangeText={v => { setEgArama(v); egzersizlerYukle(seciliKas, v); }} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.kasFiltre}>
            {KAS_GRUPLARI.map(kg => (
              <TouchableOpacity key={kg} style={[s.kasButon, seciliKas === kg && s.kasButonAktif]}
                onPress={() => { setSeciliKas(kg); egzersizlerYukle(kg, egArama); }}>
                <Text style={[s.kasYazi, seciliKas === kg && { color: '#fff' }]}>{kg}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {egYukleniyor ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={renkler.ana} />
          ) : (
            <FlatList
              data={egzersizler}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.egzersizSatir} onPress={() => egzersizSec(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.egzersizSatirAdi}>{item.isim}</Text>
                    <Text style={s.egzersizSatirKas}>{item.kas_grubu} · {item.ekipman}</Text>
                  </View>
                  <Text style={{ color: renkler.ana, fontSize: 18 }}>+</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* ── Özet Modal ── */}
      <Modal visible={gosterOzet} animationType="fade" transparent>
        <View style={s.ozetOverlay}>
          <View style={s.ozetModal}>
            <Text style={s.ozetBaslik}>🎉 {t('antrenmanTamamlandi')}</Text>
            <View style={s.ozetSatir}>
              <Text style={s.ozetEtiket}>{t('toplamSet')}</Text>
              <Text style={s.ozetDeger}>{ozet?.toplam_set ?? 0}</Text>
            </View>
            <View style={s.ozetSatir}>
              <Text style={s.ozetEtiket}>{t('toplamHacim')}</Text>
              <Text style={s.ozetDeger}>{ozet?.toplam_kg_hacmi ?? 0} kg</Text>
            </View>
            <View style={s.ozetSatir}>
              <Text style={s.ozetEtiket}>{t('sure')}</Text>
              <Text style={s.ozetDeger}>{ozet?.sure_dakika ?? 0} {t('dakika')}</Text>
            </View>
            <TouchableOpacity style={s.baslatButon} onPress={() => setGosterOzet(false)}>
              <Text style={s.baslatYazi}>{t('tamam')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Şablon Oluşturma Modal ── */}
      <Modal visible={gosterSablon} animationType="slide">
        <KeyboardAvoidingView style={[s.kap, { paddingTop: 56 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalBar}>
            <TouchableOpacity onPress={() => setGosterSablon(false)}>
              <Text style={{ color: renkler.ana, fontSize: 15 }}>← {t('iptal')}</Text>
            </TouchableOpacity>
            <Text style={s.modalBaslik}>{t('yeniSablon')}</Text>
            <TouchableOpacity onPress={sablonKaydet}>
              <Text style={{ color: renkler.ana, fontSize: 15, fontWeight: '700' }}>{t('kaydet')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={s.etiket}>{t('sablonAdi')}</Text>
            <TextInput style={s.aramaInput} value={sablonAdi} onChangeText={setSablonAdi}
              placeholder={dil === 'tr' ? 'örn: Push Day' : 'e.g. Push Day'}
              placeholderTextColor={renkler.yaziAcik} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:              { flex: 1, backgroundColor: r.arkaplan },
    header:           { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: r.kart, borderBottomWidth: 1, borderBottomColor: r.sinir },
    headerBaslik:     { fontSize: 24, fontWeight: '800', color: r.yazi },
    istatistikSatir:  { flexDirection: 'row', padding: 16, gap: 10 },
    istatistikKart:   { flex: 1, backgroundColor: r.kart, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    istatistikSayi:   { fontSize: 26, fontWeight: '800', color: r.ana },
    istatistikEtiket: { fontSize: 11, color: r.yaziAcik, marginTop: 4, textAlign: 'center' },
    baslatButon:      { marginHorizontal: 16, backgroundColor: r.ana, borderRadius: 16, padding: 18, alignItems: 'center', shadowColor: r.ana, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    baslatYazi:       { color: '#fff', fontSize: 17, fontWeight: '800' },
    bolumBaslik:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
    bolumYazi:        { fontSize: 15, fontWeight: '700', color: r.yazi },
    bosYazi:          { color: r.yaziAcik, marginHorizontal: 16, marginTop: 8, fontSize: 13 },
    sablonKart:       { backgroundColor: r.kart, borderRadius: 14, padding: 16, marginRight: 12, marginBottom: 8, minWidth: 140, borderWidth: 1, borderColor: r.sinir },
    sablonAdi:        { fontSize: 14, fontWeight: '700', color: r.yazi, marginBottom: 4 },
    sablonEgSayisi:   { fontSize: 12, color: r.yaziAcik },
    gecmisKart:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: r.kart, borderRadius: 14, padding: 14, marginBottom: 8 },
    gecmisAdi:        { fontSize: 14, fontWeight: '700', color: r.yazi },
    gecmisBilgi:      { fontSize: 12, color: r.yaziAcik, marginTop: 3 },
    gecmisSure:       { fontSize: 13, color: r.ana, fontWeight: '600' },
    // Aktif antrenman
    timerBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: r.kart, paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: r.sinir },
    timerYazi:        { fontSize: 18, fontWeight: '800', color: r.ana, width: 80 },
    aktifAdi:         { fontSize: 14, fontWeight: '700', color: r.yazi, flex: 1, textAlign: 'center' },
    bitirButon:       { backgroundColor: r.kirmizi + '22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    bitirYazi:        { color: r.kirmizi, fontSize: 12, fontWeight: '700' },
    egzersizBlok:     { backgroundColor: r.kart, borderRadius: 16, padding: 16, marginBottom: 12 },
    egzersizAdi:      { fontSize: 16, fontWeight: '800', color: r.yazi, marginBottom: 2 },
    egzersizKas:      { fontSize: 12, color: r.yaziAcik, marginBottom: 12, textTransform: 'capitalize' },
    setSatirBaslik:   { flexDirection: 'row', marginBottom: 6 },
    setBaslik:        { fontSize: 11, color: r.yaziAcik, fontWeight: '600', textAlign: 'center' },
    setSatir:         { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    setNo:            { fontSize: 14, fontWeight: '700', color: r.yaziAcik, textAlign: 'center' },
    setOnceki:        { fontSize: 12, color: r.yaziAcik, textAlign: 'center' },
    setInput:         { borderWidth: 1, borderColor: r.sinir, borderRadius: 8, padding: 8, fontSize: 14, color: r.yazi, textAlign: 'center', marginHorizontal: 2, backgroundColor: r.arkaplan },
    setInputTamamlandi: { backgroundColor: r.ana + '22', borderColor: r.ana },
    tamamlaButon:     { backgroundColor: r.sinir, borderRadius: 8, padding: 8, alignItems: 'center', marginLeft: 4 },
    tamamlaAktif:     { backgroundColor: r.ana },
    setEkleButon:     { alignItems: 'center', paddingVertical: 8 },
    egzersizEkleButon:{ backgroundColor: r.kart, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1.5, borderColor: r.ana, borderStyle: 'dashed' },
    egzersizEkleYazi: { color: r.ana, fontSize: 15, fontWeight: '700' },
    // Modal ortak
    modalBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: r.sinir },
    modalBaslik:      { fontSize: 16, fontWeight: '700', color: r.yazi },
    aramaInput:       { marginHorizontal: 16, marginVertical: 12, borderWidth: 1.5, borderColor: r.sinir, borderRadius: 12, padding: 12, fontSize: 15, color: r.yazi, backgroundColor: r.arkaplan },
    kasFiltre:        { paddingLeft: 16, marginBottom: 8 },
    kasButon:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: r.sinir, marginRight: 8 },
    kasButonAktif:    { backgroundColor: r.ana },
    kasYazi:          { fontSize: 13, color: r.yazi, fontWeight: '600', textTransform: 'capitalize' },
    egzersizSatir:    { flexDirection: 'row', alignItems: 'center', backgroundColor: r.kart, borderRadius: 12, padding: 14, marginBottom: 8 },
    egzersizSatirAdi: { fontSize: 14, fontWeight: '700', color: r.yazi },
    egzersizSatirKas: { fontSize: 12, color: r.yaziAcik, marginTop: 2, textTransform: 'capitalize' },
    // Özet modal
    ozetOverlay:      { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 24 },
    ozetModal:        { backgroundColor: r.kart, borderRadius: 24, padding: 28 },
    ozetBaslik:       { fontSize: 22, fontWeight: '800', color: r.yazi, textAlign: 'center', marginBottom: 24 },
    ozetSatir:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: r.sinir },
    ozetEtiket:       { fontSize: 14, color: r.yaziAcik },
    ozetDeger:        { fontSize: 16, fontWeight: '700', color: r.yazi },
    etiket:           { fontSize: 13, fontWeight: '600', color: r.yazi, marginBottom: 8 },
  });
