import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, FlatList, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  aiAnalizCalistir, aiOnerileriGetir, aiOneriOkundu,
  aiSohbet, gunlukTakipGetir, antrenmanGecmisi, kiloGecmisGetir, makroHedefGetir,
} from '../../services/api';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

interface Mesaj { id: string; rol: 'user' | 'assistant'; metin: string; }

const ORNEK_SORULAR_TR = [
  'Bu hafta neden kilo veremedim?',
  'Protein hedefime nasıl ulaşırım?',
  'Antrenman programımı değiştirir misin?',
  'Bugün ne yemeliyim?',
];
const ORNEK_SORULAR_EN = [
  "Why didn't I lose weight this week?",
  'How can I hit my protein goal?',
  'Can you adjust my workout plan?',
  'What should I eat today?',
];

export default function KocEkrani() {
  const { renkler } = useTemaStore();
  const { t, dil }  = useDilStore();
  const ORNEK_SORULAR = dil === 'tr' ? ORNEK_SORULAR_TR : ORNEK_SORULAR_EN;

  // ── State ─────────────────────────────────────────────────────────────────
  const [oneriler, setOneriler]         = useState<any[]>([]);
  const [mesajlar, setMesajlar]         = useState<Mesaj[]>([]);
  const [girdi, setGirdi]               = useState('');
  const [yazıyor, setYaziyor]           = useState(false);
  const [yukleniyor, setYukleniyor]     = useState(true);
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);

  // Akıllı uyarı hesaplamaları için
  const [uyarilar, setUyarilar]         = useState<string[]>([]);
  const [beslenmeSkoru, setBeslenmeSkoru] = useState(0);
  const [antrenmanSkor, setAntrenmanSkor] = useState(0);
  const [kiloTrend, setKiloTrend]       = useState<'up' | 'down' | 'stable'>('stable');

  const scrollRef = useRef<ScrollView>(null);

  // ── Veri Yükle ────────────────────────────────────────────────────────────
  const veriYukle = async () => {
    try {
      const [oneriR, gunlukR, antrenmanR, kiloR, hedefR] = await Promise.all([
        aiOnerileriGetir(),
        gunlukTakipGetir(),
        antrenmanGecmisi(7),
        kiloGecmisGetir(),
        makroHedefGetir(),
      ]);
      setOneriler(oneriR.data);

      // Beslenme skoru (bugünün kalorisi / hedef, 0-100)
      const kaloriHedef = hedefR.data?.kalori_hedef ?? 2000;
      const bugunKalori = gunlukR.data?.toplam_kalori ?? 0;
      const skor = Math.min(100, Math.round((bugunKalori / kaloriHedef) * 100));
      setBeslenmeSkoru(skor);

      // Antrenman skoru (son 7 günde kaç antrenman)
      const antrenmanSayisi = antrenmanR.data?.length ?? 0;
      setAntrenmanSkor(Math.min(100, Math.round((antrenmanSayisi / 4) * 100)));

      // Kilo trendi
      const kilolar = kiloR.data ?? [];
      if (kilolar.length >= 2) {
        const fark = kilolar[kilolar.length - 1].kilo_kg - kilolar[0].kilo_kg;
        setKiloTrend(fark > 0.3 ? 'up' : fark < -0.3 ? 'down' : 'stable');
      }

      // Akıllı uyarılar
      const yeniUyarilar: string[] = [];
      const proteinHedef = hedefR.data?.protein_hedef ?? 150;
      const bugunProtein = gunlukR.data?.toplam_protein ?? 0;
      if (bugunProtein < proteinHedef * 0.7 && bugunKalori > 0) {
        yeniUyarilar.push(dil === 'tr'
          ? '⚠️ Bugün protein hedefinin çok gerisinde kaldın'
          : '⚠️ You\'re well below your protein goal today');
      }
      if (bugunKalori > kaloriHedef * 1.2) {
        yeniUyarilar.push(dil === 'tr'
          ? '📊 Bugün kalori hedefini aştın'
          : '📊 You exceeded your calorie goal today');
      }
      if (antrenmanSayisi === 0) {
        yeniUyarilar.push(dil === 'tr'
          ? '💪 Bu hafta henüz antrenman yapmadın'
          : '💪 No workouts yet this week');
      }
      setUyarilar(yeniUyarilar);
    } catch {}
    finally { setYukleniyor(false); }
  };

  useFocusEffect(useCallback(() => { veriYukle(); }, []));

  // ── Analiz tetikle ────────────────────────────────────────────────────────
  const analizCalistir = async () => {
    setAnalizYukleniyor(true);
    try {
      await aiAnalizCalistir();
      await veriYukle();
    } catch {}
    finally { setAnalizYukleniyor(false); }
  };

  // ── Öneri okundu ──────────────────────────────────────────────────────────
  const oneriOku = async (id: string) => {
    await aiOneriOkundu(id);
    setOneriler(prev => prev.filter(o => o.id !== id));
  };

  // ── Sohbet ────────────────────────────────────────────────────────────────
  const mesajGonder = async (metin?: string) => {
    const gonderilecek = (metin || girdi).trim();
    if (!gonderilecek) return;
    setGirdi('');
    const yeniMesaj: Mesaj = { id: Date.now().toString(), rol: 'user', metin: gonderilecek };
    setMesajlar(prev => [...prev, yeniMesaj]);
    setYaziyor(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const gecmis = mesajlar.slice(-10).map(m => ({
        role: m.rol === 'user' ? 'user' : 'assistant',
        content: m.metin,
      }));
      const r = await aiSohbet(gonderilecek, gecmis);
      const cevap: Mesaj = { id: (Date.now() + 1).toString(), rol: 'assistant', metin: r.data.cevap };
      setMesajlar(prev => [...prev, cevap]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      const hata: Mesaj = {
        id: (Date.now() + 1).toString(), rol: 'assistant',
        metin: dil === 'tr' ? 'Üzgünüm, şu an yanıt oluşturamıyorum. Tekrar dene.' : 'Sorry, I can\'t respond right now. Please try again.',
      };
      setMesajlar(prev => [...prev, hata]);
    }
    finally { setYaziyor(false); }
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
    <KeyboardAvoidingView style={s.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerBaslik}>🤖 {t('aiKoc')}</Text>
        <TouchableOpacity style={s.analizButon} onPress={analizCalistir} disabled={analizYukleniyor}>
          {analizYukleniyor
            ? <ActivityIndicator size="small" color={renkler.ana} />
            : <Text style={s.analizYazi}>🔄 {dil === 'tr' ? 'Analiz Et' : 'Analyze'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} ref={scrollRef} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}>

        {/* Skor kartlar */}
        <View style={s.skorSatir}>
          <View style={s.skorKart}>
            <Text style={[s.skorSayi, { color: beslenmeSkoru >= 70 ? renkler.ana : '#f59e0b' }]}>
              {beslenmeSkoru}%
            </Text>
            <Text style={s.skorEtiket}>{t('beslenmeSkoru')}</Text>
          </View>
          <View style={s.skorKart}>
            <Text style={[s.skorSayi, { color: antrenmanSkor >= 50 ? renkler.ana : '#f59e0b' }]}>
              {antrenmanSkor}%
            </Text>
            <Text style={s.skorEtiket}>{t('antrenmanTutarliligi')}</Text>
          </View>
          <View style={s.skorKart}>
            <Text style={[s.skorSayi, { fontSize: 28 }]}>
              {kiloTrend === 'up' ? '📈' : kiloTrend === 'down' ? '📉' : '➡️'}
            </Text>
            <Text style={s.skorEtiket}>{t('kiloTrendi')}</Text>
          </View>
        </View>

        {/* Öneri banner */}
        {oneriler.length > 0 && (
          <View style={s.oneriKap}>
            <Text style={s.oneriBaslik}>💡 {t('yeniOneri')}</Text>
            {oneriler.map(oneri => (
              <View key={oneri.id} style={s.oneriKart}>
                <Text style={s.oneriMetin}>{oneri.mesaj}</Text>
                <TouchableOpacity onPress={() => oneriOku(oneri.id)}>
                  <Text style={s.oneriKapat}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Akıllı uyarılar */}
        {uyarilar.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
            <Text style={s.bolumYazi}>{t('uyarilar')}</Text>
            {uyarilar.map((u, i) => (
              <View key={i} style={s.uyariKart}>
                <Text style={s.uyariMetin}>{u}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sohbet */}
        <View style={s.sohbetKap}>
          <Text style={s.bolumYazi}>{t('sohbet')}</Text>

          {/* Mesajlar */}
          {mesajlar.length === 0 && (
            <View>
              <Text style={[s.bosYazi, { marginBottom: 12 }]}>{t('ornekSorular')}</Text>
              {ORNEK_SORULAR.map((soru, i) => (
                <TouchableOpacity key={i} style={s.ornekSoruButon} onPress={() => mesajGonder(soru)}>
                  <Text style={s.ornekSoruYazi}>{soru}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {mesajlar.map(m => (
            <View key={m.id} style={[s.mesajBalon, m.rol === 'user' ? s.mesajUser : s.mesajAI]}>
              <Text style={[s.mesajMetin, m.rol === 'user' && { color: '#fff' }]}>{m.metin}</Text>
            </View>
          ))}

          {yazıyor && (
            <View style={[s.mesajBalon, s.mesajAI]}>
              <Text style={s.mesajMetin}>{t('yazıyor')}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Input */}
      <View style={s.inputKap}>
        <TextInput
          style={s.input}
          value={girdi}
          onChangeText={setGirdi}
          placeholder={t('mesajGonder')}
          placeholderTextColor={renkler.yaziAcik}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[s.gonderButon, (!girdi.trim() || yazıyor) && s.gonderDevre]}
          onPress={() => mesajGonder()}
          disabled={!girdi.trim() || yazıyor}
        >
          {yazıyor
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.gonderYazi}>↑</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:            { flex: 1, backgroundColor: r.arkaplan },
    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: r.kart, borderBottomWidth: 1, borderBottomColor: r.sinir },
    headerBaslik:   { fontSize: 22, fontWeight: '800', color: r.yazi },
    analizButon:    { backgroundColor: r.ana + '22', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    analizYazi:     { color: r.ana, fontSize: 13, fontWeight: '600' },
    skorSatir:      { flexDirection: 'row', padding: 16, gap: 10 },
    skorKart:       { flex: 1, backgroundColor: r.kart, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    skorSayi:       { fontSize: 22, fontWeight: '800', color: r.ana },
    skorEtiket:     { fontSize: 11, color: r.yaziAcik, marginTop: 4, textAlign: 'center' },
    oneriKap:       { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fef3c7', borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
    oneriBaslik:    { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 8 },
    oneriKart:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
    oneriMetin:     { flex: 1, fontSize: 13, color: '#78350f', lineHeight: 20 },
    oneriKapat:     { color: '#92400e', fontSize: 16, marginLeft: 8, fontWeight: '700' },
    uyariKart:      { backgroundColor: r.kart, borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
    uyariMetin:     { fontSize: 13, color: r.yazi, lineHeight: 20 },
    bolumYazi:      { fontSize: 14, fontWeight: '700', color: r.yazi, marginBottom: 10 },
    bosYazi:        { fontSize: 13, color: r.yaziAcik },
    sohbetKap:      { marginHorizontal: 16, marginTop: 8 },
    ornekSoruButon: { backgroundColor: r.kart, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: r.sinir },
    ornekSoruYazi:  { fontSize: 13, color: r.yazi },
    mesajBalon:     { maxWidth: '85%', borderRadius: 16, padding: 12, marginBottom: 8 },
    mesajUser:      { alignSelf: 'flex-end', backgroundColor: r.ana, borderBottomRightRadius: 4 },
    mesajAI:        { alignSelf: 'flex-start', backgroundColor: r.kart, borderBottomLeftRadius: 4 },
    mesajMetin:     { fontSize: 14, color: r.yazi, lineHeight: 22 },
    inputKap:       { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: r.kart, borderTopWidth: 1, borderTopColor: r.sinir, gap: 8 },
    input:          { flex: 1, borderWidth: 1.5, borderColor: r.sinir, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: r.yazi, backgroundColor: r.arkaplan, maxHeight: 100 },
    gonderButon:    { width: 42, height: 42, borderRadius: 21, backgroundColor: r.ana, alignItems: 'center', justifyContent: 'center' },
    gonderDevre:    { opacity: 0.4 },
    gonderYazi:     { color: '#fff', fontSize: 18, fontWeight: '700' },
  });
