import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

const translations = {
  tr: {
    // Genel
    kaydet: 'Kaydet', iptal: 'İptal', sil: 'Sil', duzenle: 'Düzenle',
    tamam: 'Tamam', yukleniyor: 'Yükleniyor...', hataOlustu: 'Hata oluştu', tekrarDene: 'Tekrar dene',
    // Auth
    girisYap: 'Giriş Yap', kayitOl: 'Kayıt Ol', eposta: 'E-posta', sifre: 'Şifre',
    hesabinYokMu: 'Hesabın yok mu?', zatenHesabinVarMu: 'Zaten hesabın var mı?',
    isim: 'İsim', soyisim: 'Soyisim', devamEt: 'Devam Et', geri: 'Geri',
    beslenme: 'Beslenme takibiniz, akıllıca',
    // Kayıt adımları
    kisiselBilgiler: 'Kişisel Bilgiler', vucutOlculeri: 'Vücut Ölçüleri', hedefiNe: 'Hedefin Ne?',
    boy: 'Boy (cm)', kilo: 'Kilo (kg)', yas: 'Yaş', erkek: 'Erkek', kadin: 'Kadın',
    kiloVer: 'Kilo Ver', kiloAl: 'Kilo Al', koru: 'Koru',
    cut: 'Cut', aggressiveCut: 'Aggressive Cut', bulk: 'Bulk', dirtyBulk: 'Dirty Bulk',
    hareketsiz: 'Hareketsiz', azHareketli: 'Az Hareketli',
    ortaHareketli: 'Orta Hareketli', cokHareketli: 'Çok Hareketli', ekstraAktif: 'Ekstra Aktif',
    // Ana sayfa
    gunaydin: 'Günaydın', iyiGunler: 'İyi Günler', iyiAksamlar: 'İyi Akşamlar',
    kalanKcal: 'kalori kaldı', tuketilen: 'yendi', hedef: 'hedef',
    kalori: 'Kalori', protein: 'Protein', karbonhidrat: 'Karb', yag: 'Yağ',
    kahvalti: 'Kahvaltı', ogle: 'Öğle', aksam: 'Akşam', araOgun: 'Ara Öğün',
    yemekEkleButon: 'Yemek Ekle', haftalikOzet: 'Son 7 Gün',
    suTakibi: 'Su Takibi', gunlukHedef: 'Günlük Hedef', bugunOgunler: 'Bugünün Öğünleri',
    yemekYok: 'Ekle +', yemekVar: '%{sayi} yemek',
    // Yemek ekleme
    yemekAra: 'Yemek ara... (örn: tavuk, elma)', barkodTara: 'Barkod Tara',
    ekle: 'Ekle', urunBulunamadi: 'Ürün Bulunamadı', makrolarıDuzelt: 'Makroları Düzelt',
    oguneEkle: 'Öğüne Ekle', sonucBulunamadi: 'Sonuç bulunamadı',
    enAz2Harf: 'Yemek aramak için en az 2 harf girin',
    barkodOkut: 'veya 📷 ile barkod okut',
    barkodOkuyucu: 'Barkodu Okut',
    gram: 'gram', ml: 'ml', adet: 'adet', adetGram: '1 adet = %{gram} gram',
    // Kilo
    kiloTakibi: 'Kilo Takibi', bugunkunKiloGir: 'Bugünkü Kilonu Gir',
    kiloGecmisi: 'Son Kayıtlar', mevcutKilo: 'Güncel', degisim: 'Değişim', kayitSayisi: 'Kayıt',
    kiloKaydedildi: 'Kilo kaydedildi!', gecerliKiloGir: 'Geçerli bir kilo girin (20-300 kg)',
    ayniGuneGuncellenir: 'Aynı güne girilen kayıt güncellenir',
    // Profil
    profil: 'Profil', bilgileriGuncelle: 'Bilgileri Güncelle',
    dil: 'Dil', turkce: 'Türkçe', ingilizce: 'İngilizce',
    gorunum: 'Görünüm', koyuMod: 'Koyu Mod', acikMod: 'Açık Mod', sistem: 'Sistem',
    cikisYap: 'Çıkış Yap', gunlukKaloriHedefi: 'Günlük Kalori Hedefi',
    hesapBilgileri: 'Hesap', ayarlar: 'Ayarlar', hakkinda: 'Hakkında',
    cikisOnay: 'Hesabından çıkmak istediğine emin misin?',
    adaptifTdee: 'Adaptif TDEE aktif', standartHesap: 'Standart hesaplama',
    hedefAktivite: 'Hedef & Aktivite', gunlukMakrolar: 'Günlük Makro Hedefleri',
    // Yemek ekleme (ek)
    gecerliMiktarGir: 'Geçerli bir miktar girin',
    makrolarGuncellendi: 'Makrolar güncellendi',
    guncellenemedi: 'Güncellenemedi',
    izinGerekli: 'İzin Gerekli',
    kameraIzniGerekli: 'Kamera iznine ihtiyaç var',
    barkodBulunamadi: 'Bu ürün veritabanında bulunamadı. Aramadan manuel ekleyebilirsin.',
    eklendi: '%{isim} eklendi!',
    gram100Basi: '100g başına değerler',
    ozelYemekEkle: 'Özel Yemek Ekle',
    ozelYemekKaydedildi: 'Yemek kaydedildi! Artık aramada çıkacak.',
    yemekIsmi: 'Yemek İsmi',
    yemekIsmiPlaceholder: 'örn: Proteinocean Whey',
    oguneEkleniyor: '%{ogun} öğününe ekleniyor',
    // Auth (ek)
    cinsiyet: 'Cinsiyet', hedefiniz: 'Hedefiniz', aktiviteSeviyeniz: 'Aktivite Seviyeniz',
    sifreMinKarakter: 'Şifre en az 6 karakter olmalı',
    girisHatasi: 'Giriş Hatası', kayitHatasi: 'Kayıt Hatası',
    adimOf: 'Adım %{n} / 3', hesapOlustur: 'Hesap Oluştur',
    girisBasarisiz: 'Giriş başarısız. Bilgilerinizi kontrol edin.',
    kayitBasarisiz: 'Kayıt başarısız. Tekrar deneyin.',
    emailSifreGir: 'Lütfen email ve şifrenizi girin',
    tumAlanlariDoldurun: 'Tüm alanları doldurun',
    hesapBilgileri2: 'Hesap Bilgileri', fizikselBilgiler: 'Fiziksel Bilgiler',
    hedefVeAktivite: 'Hedef ve Aktivite',
    grafikMinKayit: 'Grafik için en az 2 kilo kaydı gerekli',
    // Yasal
    yasal: 'Yasal', gizlilikPolitikasi: 'Gizlilik Politikası', kullanımKosullari: 'Kullanım Koşulları',
    // Antrenman
    antrenman: 'Antrenman', antrenmanBaslat: 'Antrenman Başlat', antrenmanBitir: 'Antrenmanı Bitir',
    buHaftaAntrenman: 'Bu hafta', aylikAntrenman: 'Bu ay', toplamSure: 'Toplam süre',
    sablonlar: 'Şablonlar', yeniSablon: 'Yeni Şablon', sablonAdi: 'Şablon Adı',
    egzersizEkle: 'Egzersiz Ekle', setEkle: 'Set Ekle', setTamamla: 'Tamamla',
    gecmisAntreman: 'Geçmiş', aktifAntrenman: 'Aktif Antrenman', sure: 'Süre',
    onceki: 'Önceki', kg: 'KG', tekrar: 'Tekrar', set: 'Set',
    antrenmanTamamlandi: 'Antrenman Tamamlandı!', toplamSet: 'Toplam Set',
    toplamHacim: 'Toplam Hacim', dakika: 'dk', boslukBaslat: 'Boş Başlat',
    kasGrubu: 'Kas Grubu', tumKasGruplari: 'Tümü',
    // AI Koç
    koc: 'Koç', aiKoc: 'AI Koç', sohbet: 'Sohbet', uyarilar: 'Akıllı Uyarılar',
    mesajGonder: 'Mesaj gönder...', yazıyor: 'Koç yazıyor...', gonderiyor: 'Gönderiliyor...',
    ornekSorular: 'Örnek sorular:', yeniOneri: 'Koçundan yeni öneri var',
    beslenmeSkoru: 'Beslenme', antrenmanTutarliligi: 'Antrenman', kiloTrendi: 'Kilo Trendi',
    aiServisiYok: 'AI servisi şu an kullanılamıyor',
  },
  en: {
    // General
    kaydet: 'Save', iptal: 'Cancel', sil: 'Delete', duzenle: 'Edit',
    tamam: 'OK', yukleniyor: 'Loading...', hataOlustu: 'An error occurred', tekrarDene: 'Try again',
    // Auth
    girisYap: 'Sign In', kayitOl: 'Sign Up', eposta: 'Email', sifre: 'Password',
    hesabinYokMu: "Don't have an account?", zatenHesabinVarMu: 'Already have an account?',
    isim: 'First Name', soyisim: 'Last Name', devamEt: 'Continue', geri: 'Back',
    beslenme: 'Your nutrition, intelligently',
    // Registration steps
    kisiselBilgiler: 'Personal Info', vucutOlculeri: 'Body Measurements', hedefiNe: "What's Your Goal?",
    boy: 'Height (cm)', kilo: 'Weight (kg)', yas: 'Age', erkek: 'Male', kadin: 'Female',
    kiloVer: 'Lose Weight', kiloAl: 'Gain Weight', koru: 'Maintain',
    cut: 'Cut', aggressiveCut: 'Aggressive Cut', bulk: 'Bulk', dirtyBulk: 'Dirty Bulk',
    hareketsiz: 'Sedentary', azHareketli: 'Lightly Active',
    ortaHareketli: 'Moderately Active', cokHareketli: 'Very Active', ekstraAktif: 'Extra Active',
    // Home
    gunaydin: 'Good Morning', iyiGunler: 'Good Afternoon', iyiAksamlar: 'Good Evening',
    kalanKcal: 'calories remaining', tuketilen: 'eaten', hedef: 'goal',
    kalori: 'Calories', protein: 'Protein', karbonhidrat: 'Carbs', yag: 'Fat',
    kahvalti: 'Breakfast', ogle: 'Lunch', aksam: 'Dinner', araOgun: 'Snack',
    yemekEkleButon: 'Add Food', haftalikOzet: 'Last 7 Days',
    suTakibi: 'Water Tracking', gunlukHedef: 'Daily Goal', bugunOgunler: "Today's Meals",
    yemekYok: 'Add +', yemekVar: '%{sayi} items',
    // Add food
    yemekAra: 'Search food... (e.g. chicken, apple)', barkodTara: 'Scan Barcode',
    ekle: 'Add', urunBulunamadi: 'Product Not Found', makrolarıDuzelt: 'Edit Macros',
    oguneEkle: 'Add to Meal', sonucBulunamadi: 'No results found',
    enAz2Harf: 'Enter at least 2 characters to search',
    barkodOkut: 'or scan barcode with 📷',
    barkodOkuyucu: 'Scan Barcode',
    gram: 'gram', ml: 'ml', adet: 'pcs', adetGram: '1 piece = %{gram} g',
    // Weight
    kiloTakibi: 'Weight Tracking', bugunkunKiloGir: "Enter Today's Weight",
    kiloGecmisi: 'Recent Records', mevcutKilo: 'Current', degisim: 'Change', kayitSayisi: 'Records',
    kiloKaydedildi: 'Weight saved!', gecerliKiloGir: 'Enter a valid weight (20-300 kg)',
    ayniGuneGuncellenir: 'Same day entry will be updated',
    // Profile
    profil: 'Profile', bilgileriGuncelle: 'Update Info',
    dil: 'Language', turkce: 'Turkish', ingilizce: 'English',
    gorunum: 'Appearance', koyuMod: 'Dark Mode', acikMod: 'Light Mode', sistem: 'System',
    cikisYap: 'Sign Out', gunlukKaloriHedefi: 'Daily Calorie Goal',
    hesapBilgileri: 'Account', ayarlar: 'Settings', hakkinda: 'About',
    cikisOnay: 'Are you sure you want to sign out?',
    adaptifTdee: 'Adaptive TDEE active', standartHesap: 'Standard calculation',
    hedefAktivite: 'Goal & Activity', gunlukMakrolar: 'Daily Macro Goals',
    // Add food (extra)
    gecerliMiktarGir: 'Enter a valid amount',
    makrolarGuncellendi: 'Macros updated',
    guncellenemedi: 'Could not update',
    izinGerekli: 'Permission Required',
    kameraIzniGerekli: 'Camera access is required',
    barkodBulunamadi: 'Product not found. You can add it manually via search.',
    eklendi: '%{isim} added!',
    gram100Basi: 'Values per 100g',
    ozelYemekEkle: 'Add Custom Food',
    ozelYemekKaydedildi: 'Food saved! It will now appear in search.',
    yemekIsmi: 'Food Name',
    yemekIsmiPlaceholder: 'e.g. Proteinocean Whey',
    oguneEkleniyor: 'Adding to %{ogun}',
    // Auth (extra)
    cinsiyet: 'Gender', hedefiniz: 'Your Goal', aktiviteSeviyeniz: 'Your Activity Level',
    sifreMinKarakter: 'Password must be at least 6 characters',
    girisHatasi: 'Login Error', kayitHatasi: 'Registration Error',
    adimOf: 'Step %{n} of 3', hesapOlustur: 'Create Account',
    girisBasarisiz: 'Login failed. Check your credentials.',
    kayitBasarisiz: 'Registration failed. Try again.',
    emailSifreGir: 'Please enter your email and password',
    tumAlanlariDoldurun: 'Fill in all fields',
    hesapBilgileri2: 'Account Info', fizikselBilgiler: 'Physical Info',
    hedefVeAktivite: 'Goal & Activity',
    grafikMinKayit: 'At least 2 weight entries needed for chart',
    // Legal
    yasal: 'Legal', gizlilikPolitikasi: 'Privacy Policy', kullanımKosullari: 'Terms of Service',
    // Workout
    antrenman: 'Workout', antrenmanBaslat: 'Start Workout', antrenmanBitir: 'Finish Workout',
    buHaftaAntrenman: 'This week', aylikAntrenman: 'This month', toplamSure: 'Total time',
    sablonlar: 'Templates', yeniSablon: 'New Template', sablonAdi: 'Template Name',
    egzersizEkle: 'Add Exercise', setEkle: 'Add Set', setTamamla: 'Done',
    gecmisAntreman: 'History', aktifAntrenman: 'Active Workout', sure: 'Time',
    onceki: 'Previous', kg: 'KG', tekrar: 'Reps', set: 'Set',
    antrenmanTamamlandi: 'Workout Complete!', toplamSet: 'Total Sets',
    toplamHacim: 'Total Volume', dakika: 'min', boslukBaslat: 'Empty Start',
    kasGrubu: 'Muscle Group', tumKasGruplari: 'All',
    // AI Coach
    koc: 'Coach', aiKoc: 'AI Coach', sohbet: 'Chat', uyarilar: 'Smart Alerts',
    mesajGonder: 'Send a message...', yazıyor: 'Coach is typing...', gonderiyor: 'Sending...',
    ornekSorular: 'Example questions:', yeniOneri: 'New advice from your coach',
    beslenmeSkoru: 'Nutrition', antrenmanTutarliligi: 'Workout', kiloTrendi: 'Weight Trend',
    aiServisiYok: 'AI service is currently unavailable',
  },
};

const i18n = new I18n(translations);
const phoneLocale = getLocales()[0]?.languageCode ?? 'tr';
i18n.locale = phoneLocale === 'tr' ? 'tr' : 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'tr';

export default i18n;
export type DilKodu = 'tr' | 'en';
