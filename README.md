# Macrova Backend

Türkiye pazarı için beslenme takip uygulaması — FastAPI + Supabase.

---

## Kurulum

### 1. Gereksinimler

- Python 3.10+
- Supabase hesabı (ücretsiz tier yeterli)

### 2. Bağımlılıkları yükle

```bash
cd backend
pip install -r requirements.txt
```

### 3. Ortam değişkenlerini ayarla

```bash
cp .env.example .env
```

`.env` dosyasını açıp doldurun:

| Değişken | Nasıl bulunur |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase → Project Settings → API → `service_role` key (gizli tut) |
| `JWT_SECRET` | Rastgele güçlü bir string (örn: `openssl rand -hex 32`) |
| `JWT_ALGORITHM` | `HS256` olarak bırak |

### 4. Supabase tablolarını oluştur

Supabase Dashboard → SQL Editor'e gidin:

1. `supabase_schema.sql` içeriğini yapıştırıp çalıştırın
2. `supabase_seed.sql` içeriğini yapıştırıp çalıştırın (55 Türk yemeği)

### 5. Sunucuyu başlat

```bash
cd backend
uvicorn main:app --reload
```

API `http://localhost:8000` adresinde çalışır.
Swagger dokümantasyonu: `http://localhost:8000/docs`

---

## Endpoint Listesi

### Auth

| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/auth/kayit` | Yeni kullanıcı kaydı |
| POST | `/auth/giris` | Giriş yap, JWT token al |

### Kullanıcı

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/kullanici/profil` | Profil bilgilerini getir |
| PUT | `/kullanici/profil` | Profil güncelle |
| POST | `/kullanici/kilo` | Kilo girişi ekle |
| GET | `/kullanici/kilo-gecmis` | Son 30 günün kilo verileri |
| GET | `/kullanici/makro-hedef` | Güncel makro hedefleri |

### Yemek

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/yemek/ara?q=tavuk` | Yemek ara |
| GET | `/yemek/{id}` | Yemek detayı |
| POST | `/yemek/ekle` | Yeni yemek ekle |

### Takip

| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/takip/ogun-ekle` | Öğüne yemek ekle |
| GET | `/takip/gunluk?tarih=2024-01-15` | Günün öğünleri + toplam makro |
| GET | `/takip/haftalik` | Son 7 günün özeti |
| DELETE | `/takip/ogun/{id}` | Öğün kaydını sil |

---

## Kimlik Doğrulama

Tüm `/kullanici`, `/yemek`, `/takip` endpointleri JWT token gerektirir.

```
Authorization: Bearer <token>
```

Token `/auth/giris` veya `/auth/kayit` ile alınır, 30 gün geçerlidir.

---

## Algoritma

### BMR (Harris-Benedict)
- **Erkek:** `88.362 + (13.397 × kg) + (4.799 × cm) − (5.677 × yaş)`
- **Kadın:** `447.593 + (9.247 × kg) + (3.098 × cm) − (4.330 × yaş)`

### TDEE
`BMR × aktivite katsayısı` (1.2 → 1.9 arası)

### Kalori Hedefi
| Hedef | Kalori |
|---|---|
| Kilo ver | TDEE − 500 kcal |
| Kilo al | TDEE + 300 kcal |
| Koru | TDEE |

### Makro Dağılımı
- **Protein:** 2 g/kg vücut ağırlığı
- **Yağ:** kalorilerin %25'i
- **Karbonhidrat:** kalan kalori

### Adaptif TDEE
Her kilo girişinde son 2 haftanın gerçek kalori alımı ve kilo değişimi karşılaştırılır.
7700 kcal = 1 kg kuralıyla hesaplanan gerçek TDEE, mevcut değerle %40/%60 oranında harmanlanır.

---

## Deploy (Render.com) — Ücretsiz, 7/24

### Adım 1 — GitHub'a push et

```bash
git add .
git commit -m "feat: render deploy config"
git push origin main
```

### Adım 2 — Render'da servis oluştur

1. [render.com](https://render.com) → **GitHub ile giriş yap**
2. **New → Web Service** tıkla
3. GitHub reposunu seç → **Connect**
4. Ayarlar otomatik `render.yaml`'dan okunur, elle girmene gerek yok

### Adım 3 — Environment Variables ekle

Render Dashboard → **Environment** sekmesine gir, şu değerleri ekle:

| Key | Değer |
|-----|-------|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase → Project Settings → API → `service_role` key |
| `JWT_SECRET` | `openssl rand -hex 32` ile üret |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` ile üret (farklı bir değer) |
| `ALLOWED_ORIGINS` | Deploy sonrası Render'ın verdiği URL (örn: `https://macrova-api.onrender.com`) |

### Adım 4 — Deploy et

**Manual Deploy → Deploy latest commit** tıkla.  
İlk deploy ~3-5 dakika sürer.

### Adım 5 — Frontend URL'ini güncelle

Deploy tamamlandıktan sonra Render'ın verdiği URL'i (örn: `https://macrova-api-xxxx.onrender.com`) kopyala ve  
`frontend/services/api.ts` içindeki şu satırı güncelle:

```ts
return 'https://macrova-api-xxxx.onrender.com';  // gerçek URL ile değiştir
```

> **Not:** Render free tier 15 dakika hareketsizlik sonrası uyur (cold start ~30 sn).  
> İlk istekte gecikme normaldir.

---

## Klasör Yapısı

```
backend/
├── main.py              # FastAPI uygulaması
├── requirements.txt
├── .env                 # Ortam değişkenleri (git'e ekleme!)
├── routers/
│   ├── auth.py          # Kayıt ve giriş
│   ├── kullanici.py     # Profil ve kilo takibi
│   ├── yemek.py         # Yemek arama ve ekleme
│   └── takip.py         # Günlük öğün takibi
├── models/
│   └── schemas.py       # Pydantic modelleri
└── utils/
    ├── algoritma.py     # BMR/TDEE/makro hesaplamaları
    ├── jwt_utils.py     # Token ve şifre işlemleri
    └── supabase_client.py
```
