import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTemaStore } from '../store/tema';

// ── İçerik tanımları ──────────────────────────────────────────────────────────
const GIZLILIK = {
  baslik: 'Gizlilik Politikası',
  tarih:  'Son güncelleme: Mayıs 2026',
  bolumler: [
    {
      baslik: '1. Topladığımız Veriler',
      icerik: [
        '• Hesap bilgileri: Ad, soyad, e-posta adresi',
        '• Sağlık verileri: Yaş, cinsiyet, boy, kilo, aktivite seviyesi, beslenme hedefi',
        '• Kullanım verileri: Günlük yemek takibi, su tüketimi, kilo geçmişi',
        '• Teknik veriler: IP adresi (güvenlik amaçlı, 15 dk saklama), uygulama hataları',
      ],
    },
    {
      baslik: '2. Verileri Nasıl Kullanırız',
      icerik: [
        '• Kişiselleştirilmiş kalori ve makro hedefleri hesaplamak',
        '• Beslenme takibinizi kaydedip göstermek',
        '• Hesap güvenliğini sağlamak',
        '• Uygulamayı geliştirmek (anonim istatistikler)',
      ],
    },
    {
      baslik: '3. Veri Saklama',
      icerik: [
        'Verileriniz Supabase (AWS altyapısı, Frankfurt bölgesi) üzerinde şifreli olarak saklanır. Şifreleriniz bcrypt algoritmasıyla hashlenir; asla düz metin olarak saklanmaz.',
      ],
    },
    {
      baslik: '4. Veri Paylaşımı',
      icerik: [
        'Kişisel verilerinizi üçüncü taraflarla satmıyor veya kiralamıyoruz. Yalnızca hizmet sağlayıcılarımızla (Supabase, Railway) teknik operasyon kapsamında paylaşım yapılır.',
      ],
    },
    {
      baslik: '5. Haklarınız (KVKK & GDPR)',
      icerik: [
        '• Erişim hakkı: Hangi verilerinizin işlendiğini öğrenebilirsiniz',
        '• Düzeltme hakkı: Yanlış verilerinizi güncelleyebilirsiniz',
        '• Silme hakkı: Hesabınızı ve tüm verilerinizi kalıcı olarak silebilirsiniz (Profil > Hesabı Sil)',
        '• İtiraz hakkı: Veri işlemeye itiraz edebilirsiniz',
      ],
    },
    {
      baslik: '6. Çerezler',
      icerik: [
        'Mobil uygulama çerez kullanmaz. Oturum bilgileri cihazınızın güvenli depolama alanında (Keychain/Keystore) saklanır.',
      ],
    },
    {
      baslik: '7. 13 Yaş Altı',
      icerik: [
        'Macrova, 13 yaşın altındaki kişilere yönelik değildir ve bu kişilerden bilerek veri toplamaz.',
      ],
    },
    {
      baslik: '8. İletişim',
      icerik: ['Gizlilikle ilgili sorularınız için: privacy@macrova.app'],
    },
    {
      baslik: '9. Politika Değişiklikleri',
      icerik: ['Bu politikayı güncelleyebiliriz. Önemli değişikliklerde uygulama içinden bildirim gönderilir.'],
    },
  ],
};

const KOSULLAR = {
  baslik: 'Kullanım Koşulları',
  tarih:  'Son güncelleme: Mayıs 2026',
  bolumler: [
    {
      baslik: '1. Hizmetin Amacı',
      icerik: [
        'Macrova, kullanıcıların günlük kalori ve makro besin takibini kolaylaştırmaya yönelik bir mobil uygulamadır.',
        '',
        '⚠️  TIBBİ UYARI: Macrova bir sağlık veya tıp uygulaması DEĞİLDİR. Uygulama içindeki hiçbir içerik tıbbi tavsiye niteliği taşımaz. Beslenme veya kilo yönetimiyle ilgili kararlar almadan önce mutlaka bir doktor veya diyetisyene danışınız.',
      ],
    },
    {
      baslik: '2. Yaş Sınırı',
      icerik: [
        'Macrova, 13 yaşın altındaki kişilerin kullanımına uygun değildir ve bu kişilerden bilerek kayıt kabul edilmez. Bu koşulu ihlal ettiği tespit edilen hesaplar derhal kapatılır.',
      ],
    },
    {
      baslik: '3. Hesap Sorumluluğu',
      icerik: [
        '• Hesap bilgilerinizin (e-posta, şifre) güvenliğinden siz sorumlusunuz.',
        '• Hesabınızı başkasıyla paylaşamazsınız.',
        '• Güvenliğinizin ihlal edildiğini düşünüyorsanız derhal şifrenizi değiştiriniz.',
        '• Hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz sorumlusunuz.',
      ],
    },
    {
      baslik: '4. Kabul Edilemez Kullanım',
      icerik: [
        '• Uygulamayı tersine mühendislik, kopyalama veya izinsiz dağıtma',
        '• Otomatik araçlar (bot, scraper vb.) ile sisteme yük bindirme',
        '• Güvenlik açıklarını istismar etmeye çalışma',
        '• Başkalarının hesaplarına yetkisiz erişim girişimi',
        '• Yanlış veya yanıltıcı kişisel bilgi girme',
      ],
    },
    {
      baslik: '5. Sorumluluk Reddi',
      icerik: [
        '• Uygulama "olduğu gibi" sunulmaktadır; kesintisiz veya hatasız çalışacağı garanti edilmez.',
        '• Besin değerleri veritabanı genel referans amaçlıdır; ambalaj bilgileriyle farklılık gösterebilir.',
        '• Macrova, uygulamadan alınan bilgilere dayanılarak verilen kararlar sonucunda oluşabilecek zararlar için sorumluluk kabul etmez.',
      ],
    },
    {
      baslik: '6. Hesap Askıya Alma ve Kapatma',
      icerik: [
        'Macrova, koşul ihlali, yasalara aykırı kullanım veya 24 ay hareketsizlik durumunda hesabınızı önceden bildirimde bulunmaksızın kapatabilir.',
        '',
        'Hesabınızı kendiniz silmek için: Profil → Hesabı Sil',
      ],
    },
    {
      baslik: '7. Değişiklikler',
      icerik: [
        'Bu koşulları güncelleyebiliriz. Önemli değişikliklerde uygulama içinden bildirim gönderilir.',
      ],
    },
    {
      baslik: '8. Uygulanacak Hukuk',
      icerik: [
        'Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri yetkilidir.',
      ],
    },
    {
      baslik: '9. İletişim',
      icerik: ['Sorularınız için: support@macrova.app'],
    },
  ],
};

// ── Ekran ─────────────────────────────────────────────────────────────────────
export default function LegalEkrani() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { renkler } = useTemaStore();

  const icerik = slug === 'kosullar' ? KOSULLAR : GIZLILIK;
  const s = makeStyles(renkler);

  return (
    <View style={s.kap}>
      {/* Başlık barı */}
      <View style={s.bar}>
        <TouchableOpacity onPress={() => router.back()} style={s.geriButon}>
          <Text style={s.geriYazi}>← Geri</Text>
        </TouchableOpacity>
        <Text style={s.barBaslik} numberOfLines={1}>{icerik.baslik}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollIcerik}
        showsVerticalScrollIndicator={false}>
        <Text style={s.anaBaslik}>{icerik.baslik}</Text>
        <Text style={s.tarih}>{icerik.tarih}</Text>

        {icerik.bolumler.map((bolum, i) => (
          <View key={i} style={s.bolum}>
            <Text style={s.bolumBaslik}>{bolum.baslik}</Text>
            {bolum.icerik.map((satir, j) => (
              satir === ''
                ? <View key={j} style={{ height: 8 }} />
                : <Text key={j} style={[
                    s.bolumIcerik,
                    satir.startsWith('⚠️') && s.uyariYazi,
                  ]}>{satir}</Text>
            ))}
          </View>
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:          { flex: 1, backgroundColor: r.arkaplan },
    bar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: r.kart, borderBottomWidth: 1, borderBottomColor: r.sinir },
    geriButon:    { width: 60 },
    geriYazi:     { fontSize: 15, color: r.ana, fontWeight: '500' },
    barBaslik:    { flex: 1, fontSize: 16, fontWeight: '700', color: r.yazi, textAlign: 'center' },
    scroll:       { flex: 1 },
    scrollIcerik: { padding: 20 },
    anaBaslik:    { fontSize: 26, fontWeight: '800', color: '#2ecc71', marginBottom: 6 },
    tarih:        { fontSize: 12, color: r.yaziAcik, marginBottom: 24 },
    bolum:        { marginBottom: 20 },
    bolumBaslik:  { fontSize: 16, fontWeight: '700', color: r.yazi, marginBottom: 8 },
    bolumIcerik:  { fontSize: 14, color: r.yaziAcik, lineHeight: 22, marginBottom: 4 },
    uyariYazi:    { color: '#b45309', backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#f59e0b', lineHeight: 22 },
  });
