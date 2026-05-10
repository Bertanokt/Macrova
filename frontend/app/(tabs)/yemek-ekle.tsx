import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { yemekAra, ogunEkle, barkodAra, yemekGuncelle, yemekEkle, Ogun } from '../../services/api';
import { YemekKarti } from '../../components/YemekKarti';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

export default function YemekEkleEkrani() {
  const { renkler } = useTemaStore();
  const { t, dil } = useDilStore();
  const params = useLocalSearchParams();

  const [seciliOgun, setSeciliOgun] = useState<Ogun>((params.ogun as Ogun) ?? 'kahvalti');
  const [arama, setArama] = useState('');
  const [sonuclar, setSonuclar] = useState<any[]>([]);
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
  const [seciliYemek, setSeciliYemek] = useState<any>(null);
  const [miktar, setMiktar] = useState('100');
  const [modalAcik, setModalAcik] = useState(false);
  const [ekleniyorYukleniyor, setEkleniyorYukleniyor] = useState(false);

  const [birim, setBirim] = useState<'gram' | 'ml' | 'adet'>('gram');
  const [adetGram, setAdetGram] = useState('50');

  const [makroDuzenle, setMakroDuzenle] = useState(false);
  const [dKalori, setDKalori] = useState('');
  const [dProtein, setDProtein] = useState('');
  const [dKarb, setDKarb] = useState('');
  const [dYag, setDYag] = useState('');
  const [makroKaydetYukleniyor, setMakroKaydetYukleniyor] = useState(false);

  const [kameraIzni, kameraIzniIste] = useCameraPermissions();
  const [barkodModal, setBarkodModal] = useState(false);
  const [barkodYukleniyor, setBarkodYukleniyor] = useState(false);

  // Özel yemek ekleme
  const [ozelModal, setOzelModal] = useState(false);
  const [ozelIsim, setOzelIsim] = useState('');
  const [ozelKalori, setOzelKalori] = useState('');
  const [ozelProtein, setOzelProtein] = useState('');
  const [ozelKarb, setOzelKarb] = useState('');
  const [ozelYag, setOzelYag] = useState('');
  const [ozelYukleniyor, setOzelYukleniyor] = useState(false);

  const aramaZamanlayici = useRef<any>(null);
  const barkodKilitRef = useRef(false); // useRef → senkron, state gibi gecikmez

  const OGUNLER = [
    { id: 'kahvalti' as Ogun, isim: t('kahvalti'), sembol: '🍳' },
    { id: 'ogle' as Ogun,     isim: t('ogle'),     sembol: '🥗' },
    { id: 'aksam' as Ogun,    isim: t('aksam'),    sembol: '🍽️' },
    { id: 'ara_ogun' as Ogun, isim: t('araOgun'),  sembol: '🍎' },
  ];

  useEffect(() => {
    if (aramaZamanlayici.current) clearTimeout(aramaZamanlayici.current);
    if (arama.trim().length < 2) { setSonuclar([]); return; }
    aramaZamanlayici.current = setTimeout(async () => {
      setAramaYukleniyor(true);
      try {
        const yanit = await yemekAra(arama.trim());
        setSonuclar(yanit.data);
      } catch { setSonuclar([]); }
      finally { setAramaYukleniyor(false); }
    }, 400);
    return () => clearTimeout(aramaZamanlayici.current);
  }, [arama]);

  const yemekSec = (yemek: any) => {
    setSeciliYemek(yemek); setMiktar('100'); setBirim('gram');
    setAdetGram('50'); setMakroDuzenle(false); setModalAcik(true);
  };

  const miktarGramHesapla = (): number => {
    const m = parseFloat(miktar) || 0;
    if (birim === 'adet') return m * (parseFloat(adetGram) || 0);
    return m;
  };

  const makroDuzenlemeAc = () => {
    setDKalori(String(seciliYemek?.kalori_100g ?? ''));
    setDProtein(String(seciliYemek?.protein_100g ?? ''));
    setDKarb(String(seciliYemek?.karbonhidrat_100g ?? ''));
    setDYag(String(seciliYemek?.yag_100g ?? ''));
    setMakroDuzenle(true);
  };

  const makroGuncelleHandler = async () => {
    const k = parseFloat(dKalori), p = parseFloat(dProtein),
          c = parseFloat(dKarb),   y = parseFloat(dYag);
    if ([k, p, c, y].some(isNaN)) {
      Alert.alert(t('hataOlustu'), t('tumAlanlariDoldurun')); return;
    }
    setMakroKaydetYukleniyor(true);
    try {
      const yanit = await yemekGuncelle(seciliYemek.id, {
        kalori_100g: k, protein_100g: p, karbonhidrat_100g: c, yag_100g: y,
      });
      setSeciliYemek(yanit.data); setMakroDuzenle(false);
      Alert.alert('✓', t('makrolarGuncellendi'));
    } catch {
      Alert.alert(t('hataOlustu'), t('guncellenemedi'));
    } finally { setMakroKaydetYukleniyor(false); }
  };

  const ogunEkleHandler = async () => {
    const miktarGram = miktarGramHesapla();
    if (!miktarGram || miktarGram <= 0) {
      Alert.alert(t('hataOlustu'), t('gecerliMiktarGir')); return;
    }
    setEkleniyorYukleniyor(true);
    try {
      await ogunEkle({ ogun: seciliOgun, yemek_id: seciliYemek.id, miktar_gram: miktarGram });
      setModalAcik(false); setArama(''); setSonuclar([]);
      Alert.alert('✓', t('eklendi', { isim: seciliYemekIsim }));
    } catch (hata: any) {
      Alert.alert(t('hataOlustu'), hata.response?.data?.detail ?? '');
    } finally { setEkleniyorYukleniyor(false); }
  };

  const ozelYemekKaydet = async () => {
    const isim = ozelIsim.trim();
    const k = parseFloat(ozelKalori), p = parseFloat(ozelProtein),
          c = parseFloat(ozelKarb),   y = parseFloat(ozelYag);
    if (!isim || [k, p, c, y].some(isNaN)) {
      Alert.alert(t('hataOlustu'), t('tumAlanlariDoldurun')); return;
    }
    setOzelYukleniyor(true);
    try {
      await yemekEkle({ isim, kalori_100g: k, protein_100g: p, karbonhidrat_100g: c, yag_100g: y });
      setOzelModal(false);
      setOzelIsim(''); setOzelKalori(''); setOzelProtein(''); setOzelKarb(''); setOzelYag('');
      setArama(isim); // kayıt sonrası aramaya otomatik yaz → hemen çıksın
      Alert.alert('✓', t('ozelYemekKaydedildi'));
    } catch (e: any) {
      Alert.alert(t('hataOlustu'), e.response?.data?.detail ?? '');
    } finally { setOzelYukleniyor(false); }
  };

  const barkodAcHandler = async () => {
    if (!kameraIzni?.granted) {
      const sonuc = await kameraIzniIste();
      if (!sonuc.granted) {
        Alert.alert(t('izinGerekli'), t('kameraIzniGerekli')); return;
      }
    }
    barkodKilitRef.current = false; // kilidi sıfırla
    setBarkodModal(true);
  };

  const barkodTarandi = async ({ data }: { data: string }) => {
    if (barkodKilitRef.current) return; // senkron kontrol — anında çalışır
    barkodKilitRef.current = true;      // kilitle — sonraki çağrılar geçemez
    setBarkodYukleniyor(true);
    setBarkodModal(false);
    try {
      const yanit = await barkodAra(data);
      yemekSec(yanit.data);
    } catch {
      Alert.alert(t('urunBulunamadi'), t('barkodBulunamadi'));
      barkodKilitRef.current = false; // bulunamazsa tekrar taranabilsin
    } finally {
      setBarkodYukleniyor(false);
    }
  };

  const onizleme = () => {
    if (!seciliYemek) return null;
    const oran = miktarGramHesapla() / 100;
    return {
      kalori:  Math.round(seciliYemek.kalori_100g * oran),
      protein: Math.round(seciliYemek.protein_100g * oran),
      karb:    Math.round(seciliYemek.karbonhidrat_100g * oran),
      yag:     Math.round(seciliYemek.yag_100g * oran),
    };
  };

  const seciliOgunIsim = OGUNLER.find(o => o.id === seciliOgun)?.isim ?? '';
  const seciliYemekIsim = dil === 'en'
    ? (seciliYemek?.isim_en ?? seciliYemek?.isim)
    : seciliYemek?.isim;
  const s = makeStyles(renkler);

  return (
    <KeyboardAvoidingView style={s.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.baslik}>{t('yemekEkleButon')} 🍽️</Text>
      </View>

      {/* Öğün seçici */}
      <View style={s.ogunKap}>
        {OGUNLER.map((o) => (
          <TouchableOpacity key={o.id}
            style={[s.ogunButon, seciliOgun === o.id && s.ogunAktif]}
            onPress={() => setSeciliOgun(o.id)}>
            <Text style={s.ogunSembol}>{o.sembol}</Text>
            <Text style={[s.ogunYazi, seciliOgun === o.id && s.ogunYaziAktif]}>{o.isim}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Arama + Barkod */}
      <View style={s.aramaKap}>
        <Text style={s.aramaIkon}>🔍</Text>
        <TextInput style={s.aramaInput} placeholder={t('yemekAra')}
          placeholderTextColor={renkler.yaziAcik} value={arama}
          onChangeText={setArama} autoCorrect={false} />
        {aramaYukleniyor
          ? <ActivityIndicator size="small" color={renkler.ana} />
          : (
            <TouchableOpacity onPress={barkodAcHandler} style={s.barkodButon} disabled={barkodYukleniyor}>
              {barkodYukleniyor
                ? <ActivityIndicator size="small" color={renkler.ana} />
                : <Text style={s.barkodIkon}>📷</Text>}
            </TouchableOpacity>
          )}
      </View>

      {/* İpucu */}
      {arama.length < 2 && (
        <View style={s.ipucuKap}>
          <Text style={s.ipucuEmoji}>🍽️</Text>
          <Text style={s.ipucuYazi}>{t('enAz2Harf')}</Text>
          <Text style={s.ipucuYazi2}>{t('barkodOkut')}</Text>
          <TouchableOpacity style={s.ozelButon} onPress={() => setOzelModal(true)}>
            <Text style={s.ozelButonYazi}>✏️ {t('ozelYemekEkle')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sonuç listesi */}
      <FlatList data={sonuclar} keyExtractor={(item) => item.id}
        renderItem={({ item }) => <YemekKarti yemek={item} onEkle={yemekSec} />}
        contentContainerStyle={s.liste}
        ListEmptyComponent={
          arama.length >= 2 && !aramaYukleniyor ? (
            <View style={s.bosKap}>
              <Text style={s.bosYazi}>{t('sonucBulunamadi')}</Text>
              <TouchableOpacity style={s.ozelButon} onPress={() => { setOzelIsim(arama); setOzelModal(true); }}>
                <Text style={s.ozelButonYazi}>✏️ {t('ozelYemekEkle')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Miktar giriş modalı */}
      <Modal visible={modalAcik} transparent animationType="slide">
        <TouchableOpacity style={s.modalArka} activeOpacity={1} onPress={() => setModalAcik(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity activeOpacity={1}>
              <View style={s.modal}>

                {/* Başlık + Düzelt butonu */}
                <View style={s.modalBaslikSatir}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalBaslik} numberOfLines={1}>{seciliYemekIsim}</Text>
                    <Text style={s.modalAlt}>{t('oguneEkleniyor', { ogun: seciliOgunIsim })}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={makroDuzenle ? () => setMakroDuzenle(false) : makroDuzenlemeAc}
                    style={s.duzeltButon}>
                    <Text style={s.duzeltYazi}>
                      {makroDuzenle ? `✕ ${t('iptal')}` : `✏️ ${t('duzenle')}`}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Makro düzeltme formu */}
                {makroDuzenle && (
                  <View style={s.duzeltKap}>
                    <Text style={s.duzeltAlt}>{t('gram100Basi')}</Text>
                    <View style={s.duzeltGrid}>
                      <DuzeltInput etiket={`${t('kalori')} (kcal)`} value={dKalori} onChange={setDKalori} renk={renkler.ana} />
                      <DuzeltInput etiket={`${t('protein')} (g)`}   value={dProtein} onChange={setDProtein} renk={renkler.protein} />
                      <DuzeltInput etiket={`${t('karbonhidrat')} (g)`} value={dKarb} onChange={setDKarb} renk={renkler.karb} />
                      <DuzeltInput etiket={`${t('yag')} (g)`}       value={dYag}     onChange={setDYag}     renk={renkler.yag} />
                    </View>
                    <TouchableOpacity
                      style={[s.makroKaydetButon, makroKaydetYukleniyor && { opacity: 0.6 }]}
                      onPress={makroGuncelleHandler} disabled={makroKaydetYukleniyor}>
                      {makroKaydetYukleniyor
                        ? <ActivityIndicator color={renkler.beyaz} size="small" />
                        : <Text style={s.makroKaydetYazi}>{t('kaydet')}</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Birim seçici */}
                <View style={s.birimKap}>
                  {(['gram', 'ml', 'adet'] as const).map((b) => (
                    <TouchableOpacity key={b}
                      style={[s.birimButon, birim === b && s.birimAktif]}
                      onPress={() => { setBirim(b); setMiktar(b === 'adet' ? '1' : '100'); }}>
                      <Text style={[s.birimYazi, birim === b && s.birimYaziAktif]}>
                        {t(b)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Adet → gram dönüşümü */}
                {birim === 'adet' && (
                  <View style={s.adetKap}>
                    <Text style={s.adetYazi}>1 {t('adet')} =</Text>
                    <TextInput style={s.adetInput} value={adetGram}
                      onChangeText={setAdetGram} keyboardType="numeric" selectTextOnFocus />
                    <Text style={s.adetYazi}>{t('gram')}</Text>
                  </View>
                )}

                <View style={s.miktarKap}>
                  <TextInput style={s.miktarInput} value={miktar}
                    onChangeText={setMiktar} keyboardType="numeric" selectTextOnFocus />
                  <Text style={s.miktarBirim}>{birim}</Text>
                </View>

                {onizleme() && (
                  <View style={s.onizleme}>
                    <OnizlemeSatir etiket={t('kalori')} deger={`${onizleme()!.kalori} kcal`} renk={renkler.ana} />
                    <OnizlemeSatir etiket={t('protein')} deger={`${onizleme()!.protein}g`} renk={renkler.protein} />
                    <OnizlemeSatir etiket={t('karbonhidrat')} deger={`${onizleme()!.karb}g`} renk={renkler.karb} />
                    <OnizlemeSatir etiket={t('yag')} deger={`${onizleme()!.yag}g`} renk={renkler.yag} />
                  </View>
                )}

                <TouchableOpacity style={[s.ekleButon, ekleniyorYukleniyor && { opacity: 0.7 }]}
                  onPress={ogunEkleHandler} disabled={ekleniyorYukleniyor}>
                  {ekleniyorYukleniyor
                    ? <ActivityIndicator color={renkler.beyaz} />
                    : <Text style={s.ekleButonYazi}>{t('oguneEkle')}</Text>}
                </TouchableOpacity>

              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Özel Yemek Ekleme Modalı */}
      <Modal visible={ozelModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalArka} activeOpacity={1} onPress={() => setOzelModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity activeOpacity={1}>
              <View style={s.modal}>
                <View style={s.modalBaslikSatir}>
                  <Text style={s.modalBaslik}>✏️ {t('ozelYemekEkle')}</Text>
                  <TouchableOpacity onPress={() => setOzelModal(false)}>
                    <Text style={{ fontSize: 20, color: renkler.yaziAcik, padding: 4 }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.modalAlt}>{t('gram100Basi')}</Text>

                <View style={{ marginTop: 12 }}>
                  <Text style={s.ozelEtiket}>{t('yemekIsmi')}</Text>
                  <TextInput style={s.ozelInput} value={ozelIsim} onChangeText={setOzelIsim}
                    placeholder={t('yemekIsmiPlaceholder')} placeholderTextColor={renkler.yaziAcik} />
                </View>

                <View style={s.duzeltGrid}>
                  <OzelGiris etiket={`${t('kalori')} (kcal)`} value={ozelKalori} onChange={setOzelKalori} renk={renkler.ana} />
                  <OzelGiris etiket={`${t('protein')} (g)`}   value={ozelProtein} onChange={setOzelProtein} renk={renkler.protein} />
                  <OzelGiris etiket={`${t('karbonhidrat')} (g)`} value={ozelKarb} onChange={setOzelKarb} renk={renkler.karb} />
                  <OzelGiris etiket={`${t('yag')} (g)`}       value={ozelYag} onChange={setOzelYag} renk={renkler.yag} />
                </View>

                <TouchableOpacity style={[s.ekleButon, ozelYukleniyor && { opacity: 0.7 }]}
                  onPress={ozelYemekKaydet} disabled={ozelYukleniyor}>
                  {ozelYukleniyor
                    ? <ActivityIndicator color={renkler.beyaz} />
                    : <Text style={s.ekleButonYazi}>{t('kaydet')}</Text>}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Barkod Kamera Modalı */}
      <Modal visible={barkodModal} animationType="slide">
        <View style={s.kameraKap}>
          <Text style={s.kameraBaslik}>{t('barkodOkuyucu')}</Text>
          <CameraView style={s.kamera}
            onBarcodeScanned={barkodTarandi}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }} />
          <View style={s.kameraHedef} />
          <TouchableOpacity style={s.kameraIptal} onPress={() => setBarkodModal(false)}>
            <Text style={s.kameraIptalYazi}>{t('iptal')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function OzelGiris({ etiket, value, onChange, renk }: {
  etiket: string; value: string; onChange: (v: string) => void; renk: string;
}) {
  const { renkler } = useTemaStore();
  return (
    <View style={{ width: '47%', marginTop: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: renk, marginBottom: 4 }}>{etiket}</Text>
      <TextInput
        style={{ borderWidth: 1.5, borderColor: renk, borderRadius: 10, padding: 10,
          fontSize: 18, fontWeight: '800', color: renkler.yazi, backgroundColor: renkler.arkaplan }}
        value={value} onChangeText={onChange} keyboardType="numeric" selectTextOnFocus
        placeholder="0" placeholderTextColor={renkler.yaziAcik} />
    </View>
  );
}

function DuzeltInput({ etiket, value, onChange, renk }: {
  etiket: string; value: string; onChange: (v: string) => void; renk: string;
}) {
  const { renkler } = useTemaStore();
  return (
    <View style={{ width: '47%', backgroundColor: renkler.arkaplan, borderRadius: 10, padding: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', marginBottom: 4, color: renk }}>{etiket}</Text>
      <TextInput
        style={{ fontSize: 20, fontWeight: '800', color: renkler.yazi }}
        value={value} onChangeText={onChange} keyboardType="numeric" selectTextOnFocus />
    </View>
  );
}

function OnizlemeSatir({ etiket, deger, renk }: { etiket: string; deger: string; renk: string }) {
  const { renkler } = useTemaStore();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontSize: 14, color: renkler.yaziAcik }}>{etiket}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: renk }}>{deger}</Text>
    </View>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:             { flex: 1, backgroundColor: r.arkaplan },
    header:          { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    baslik:          { fontSize: 26, fontWeight: '800', color: r.yazi },
    ogunKap:         { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
    ogunButon:       { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: r.kart, borderWidth: 1.5, borderColor: r.sinir },
    ogunAktif:       { borderColor: r.ana, backgroundColor: r.ana + '18' },
    ogunSembol:      { fontSize: 18, marginBottom: 2 },
    ogunYazi:        { fontSize: 10, color: r.yaziAcik, fontWeight: '500' },
    ogunYaziAktif:   { color: r.ana, fontWeight: '700' },
    aramaKap:        { flexDirection: 'row', alignItems: 'center', backgroundColor: r.kart, marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    aramaIkon:       { fontSize: 16, marginRight: 8 },
    aramaInput:      { flex: 1, paddingVertical: 14, fontSize: 15, color: r.yazi },
    barkodButon:     { padding: 6 },
    barkodIkon:      { fontSize: 22 },
    liste:           { paddingHorizontal: 16, paddingBottom: 100 },
    bosKap:          { alignItems: 'center', marginTop: 32 },
    bosYazi:         { textAlign: 'center', color: r.yaziAcik, fontSize: 14, marginBottom: 16 },
    ipucuKap:        { alignItems: 'center', marginTop: 60 },
    ipucuEmoji:      { fontSize: 48, marginBottom: 12 },
    ipucuYazi:       { fontSize: 14, color: r.yaziAcik, textAlign: 'center' },
    ipucuYazi2:      { fontSize: 13, color: r.yaziAcik, marginTop: 6 },
    ozelButon:       { marginTop: 20, backgroundColor: r.ana + '18', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1.5, borderColor: r.ana },
    ozelButonYazi:   { fontSize: 14, fontWeight: '700', color: r.ana },
    ozelEtiket:      { fontSize: 13, fontWeight: '600', color: r.yaziAcik, marginBottom: 6 },
    ozelInput:       { borderWidth: 1.5, borderColor: r.sinir, borderRadius: 12, padding: 12, fontSize: 16, fontWeight: '600', color: r.yazi, backgroundColor: r.arkaplan, marginBottom: 4 },
    modalArka:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal:           { backgroundColor: r.kart, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalBaslikSatir:{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 8 },
    modalBaslik:     { fontSize: 18, fontWeight: '800', color: r.yazi, marginBottom: 2 },
    modalAlt:        { fontSize: 12, color: r.yaziAcik },
    birimKap:        { flexDirection: 'row', gap: 8, marginBottom: 12 },
    birimButon:      { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: r.arkaplan, borderWidth: 1.5, borderColor: r.sinir },
    birimAktif:      { borderColor: r.ana, backgroundColor: r.ana + '18' },
    birimYazi:       { fontSize: 14, fontWeight: '600', color: r.yaziAcik },
    birimYaziAktif:  { color: r.ana },
    adetKap:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: r.arkaplan, borderRadius: 10, padding: 10 },
    adetYazi:        { fontSize: 14, color: r.yaziAcik },
    adetInput:       { flex: 1, fontSize: 18, fontWeight: '700', color: r.yazi, textAlign: 'center', borderBottomWidth: 1.5, borderBottomColor: r.ana },
    miktarKap:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: r.ana, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 },
    miktarInput:     { flex: 1, fontSize: 32, fontWeight: '800', color: r.yazi, paddingVertical: 12 },
    miktarBirim:     { fontSize: 16, color: r.yaziAcik, fontWeight: '500' },
    onizleme:        { backgroundColor: r.arkaplan, borderRadius: 12, padding: 14, marginBottom: 20 },
    ekleButon:       { backgroundColor: r.ana, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: r.ana, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    ekleButonYazi:   { color: r.beyaz, fontSize: 16, fontWeight: '700' },
    duzeltButon:     { backgroundColor: r.arkaplan, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2, borderWidth: 1, borderColor: r.sinir },
    duzeltYazi:      { fontSize: 12, color: r.yaziAcik, fontWeight: '600' },
    duzeltKap:       { backgroundColor: r.arkaplan, borderRadius: 12, padding: 12, marginBottom: 16 },
    duzeltAlt:       { fontSize: 11, color: r.yaziAcik, textAlign: 'center', marginBottom: 10 },
    duzeltGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    makroKaydetButon:{ backgroundColor: r.yaziAcik, borderRadius: 10, padding: 10, alignItems: 'center' },
    makroKaydetYazi: { color: r.beyaz, fontSize: 14, fontWeight: '700' },
    kameraKap:       { flex: 1, backgroundColor: '#000' },
    kameraBaslik:    { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', paddingTop: 60, paddingBottom: 20 },
    kamera:          { flex: 1 },
    kameraHedef:     { position: 'absolute', top: '35%', left: '15%', right: '15%', height: '20%', borderWidth: 2, borderColor: r.ana, borderRadius: 12 },
    kameraIptal:     { position: 'absolute', bottom: 60, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
    kameraIptalYazi: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
