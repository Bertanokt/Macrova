import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTemaStore } from '../store/tema';
import { useDilStore } from '../store/dil';

// ── Türkçe içerik ─────────────────────────────────────────────────────────────
const GIZLILIK_TR = {
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
        'Kişisel verilerinizi üçüncü taraflarla satmıyor veya kiralamıyoruz. Yalnızca hizmet sağlayıcılarımızla (Supabase, Render) teknik operasyon kapsamında paylaşım yapılır.',
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

const KOSULLAR_TR = {
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

// ── English content ───────────────────────────────────────────────────────────
const GIZLILIK_EN = {
  baslik: 'Privacy Policy',
  tarih:  'Last updated: May 2026',
  bolumler: [
    {
      baslik: '1. Data We Collect',
      icerik: [
        '• Account info: First name, last name, email address',
        '• Health data: Age, gender, height, weight, activity level, nutrition goal',
        '• Usage data: Daily food log, water intake, weight history',
        '• Technical data: IP address (security purposes, stored 15 min), app errors',
      ],
    },
    {
      baslik: '2. How We Use Your Data',
      icerik: [
        '• To calculate personalised calorie and macro targets',
        '• To record and display your nutrition tracking',
        '• To maintain account security',
        '• To improve the app (anonymous statistics only)',
      ],
    },
    {
      baslik: '3. Data Storage',
      icerik: [
        'Your data is stored encrypted on Supabase (AWS infrastructure, Frankfurt region). Passwords are hashed with bcrypt and are never stored in plain text.',
      ],
    },
    {
      baslik: '4. Data Sharing',
      icerik: [
        'We do not sell or rent your personal data to third parties. Data is shared only with our service providers (Supabase, Render) for technical operation purposes.',
      ],
    },
    {
      baslik: '5. Your Rights (GDPR)',
      icerik: [
        '• Right of access: You can find out which of your data is processed',
        '• Right to rectification: You can correct inaccurate data',
        '• Right to erasure: You can permanently delete your account and all data (Profile > Delete Account)',
        '• Right to object: You can object to data processing',
      ],
    },
    {
      baslik: '6. Cookies',
      icerik: [
        'The mobile app does not use cookies. Session data is stored in your device\'s secure storage (Keychain/Keystore).',
      ],
    },
    {
      baslik: '7. Children Under 13',
      icerik: [
        'Macrova is not intended for children under 13 and does not knowingly collect data from them.',
      ],
    },
    {
      baslik: '8. Contact',
      icerik: ['For privacy-related questions: privacy@macrova.app'],
    },
    {
      baslik: '9. Policy Updates',
      icerik: ['We may update this policy. You will be notified in-app for significant changes.'],
    },
  ],
};

const KOSULLAR_EN = {
  baslik: 'Terms of Service',
  tarih:  'Last updated: May 2026',
  bolumler: [
    {
      baslik: '1. Purpose of the Service',
      icerik: [
        'Macrova is a mobile application designed to help users track their daily calorie and macro nutrient intake.',
        '',
        '⚠️  MEDICAL DISCLAIMER: Macrova is NOT a medical or healthcare application. Nothing in the app constitutes medical advice. Please consult a doctor or registered dietitian before making decisions about your diet or weight management.',
      ],
    },
    {
      baslik: '2. Age Requirement',
      icerik: [
        'Macrova is not suitable for users under the age of 13 and does not knowingly accept registrations from them. Accounts found to violate this policy will be terminated immediately.',
      ],
    },
    {
      baslik: '3. Account Responsibility',
      icerik: [
        '• You are responsible for keeping your account credentials (email, password) secure.',
        '• You may not share your account with others.',
        '• If you believe your account has been compromised, change your password immediately.',
        '• You are responsible for all activity carried out under your account.',
      ],
    },
    {
      baslik: '4. Prohibited Use',
      icerik: [
        '• Reverse engineering, copying, or distributing the app without permission',
        '• Using automated tools (bots, scrapers, etc.) to overload the system',
        '• Attempting to exploit security vulnerabilities',
        '• Attempting unauthorised access to other users\' accounts',
        '• Providing false or misleading personal information',
      ],
    },
    {
      baslik: '5. Disclaimer of Warranties',
      icerik: [
        '• The app is provided "as is" with no guarantee of uninterrupted or error-free operation.',
        '• Nutritional values in the database are for general reference; they may differ from packaging.',
        '• Macrova accepts no liability for decisions made based on information provided by the app.',
      ],
    },
    {
      baslik: '6. Account Suspension and Termination',
      icerik: [
        'Macrova may close your account without prior notice in cases of terms violation, illegal use, or 24 months of inactivity.',
        '',
        'To delete your own account: Profile → Delete Account',
      ],
    },
    {
      baslik: '7. Changes',
      icerik: [
        'We may update these terms. You will be notified in-app for significant changes.',
      ],
    },
    {
      baslik: '8. Governing Law',
      icerik: [
        'These terms are governed by the laws of the Republic of Turkey. Istanbul courts have jurisdiction over disputes.',
      ],
    },
    {
      baslik: '9. Contact',
      icerik: ['For any questions: support@macrova.app'],
    },
  ],
};

// ── Ekran ─────────────────────────────────────────────────────────────────────
export default function LegalEkrani() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { renkler } = useTemaStore();
  const { dil } = useDilStore();

  const icerik = slug === 'kosullar'
    ? (dil === 'tr' ? KOSULLAR_TR : KOSULLAR_EN)
    : (dil === 'tr' ? GIZLILIK_TR : GIZLILIK_EN);

  const s = makeStyles(renkler);

  return (
    <View style={s.kap}>
      {/* Başlık barı */}
      <View style={s.bar}>
        <TouchableOpacity onPress={() => router.back()} style={s.geriButon}>
          <Text style={s.geriYazi}>{dil === 'tr' ? '← Geri' : '← Back'}</Text>
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
