-- ═══════════════════════════════════════════════════════════════════════════
-- MACROVA — Antrenman & AI Tabloları + 65 Egzersiz Seed Verisi
-- Supabase → SQL Editor'a yapıştırıp "Run" a basın
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. EGZERSİZLER ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS egzersizler (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  isim       TEXT        NOT NULL,
  kas_grubu  TEXT        NOT NULL,  -- göğüs | sırt | omuz | biceps | triceps | bacak | karın
  aciklama   TEXT,
  ekipman    TEXT,                  -- barbell | dumbbell | makine | kablo | vücut_ağırlığı
  zorluk     TEXT        DEFAULT 'orta',  -- başlangıç | orta | ileri
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE egzersizler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "egzersizler_okuma" ON egzersizler;
CREATE POLICY "egzersizler_okuma" ON egzersizler
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── 2. ANTRENMAN_ŞABLONLARI ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS antrenman_sablonlari (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isim         TEXT        NOT NULL,
  aciklama     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE antrenman_sablonlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sablonlar_kullanici" ON antrenman_sablonlari;
CREATE POLICY "sablonlar_kullanici" ON antrenman_sablonlari
  FOR ALL USING (auth.uid() = kullanici_id);

-- ─── 3. ŞABLON_EGZERSİZLERİ ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sablon_egzersizleri (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sablon_id   UUID        NOT NULL REFERENCES antrenman_sablonlari(id) ON DELETE CASCADE,
  egzersiz_id UUID        NOT NULL REFERENCES egzersizler(id),
  sira        INT         DEFAULT 1,
  hedef_set   INT,
  hedef_rep   TEXT,
  hedef_kg    NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sablon_egzersizleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sablon_egzersizleri_kullanici" ON sablon_egzersizleri;
CREATE POLICY "sablon_egzersizleri_kullanici" ON sablon_egzersizleri
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM antrenman_sablonlari s
      WHERE s.id = sablon_id AND s.kullanici_id = auth.uid()
    )
  );

-- ─── 4. ANTRENMAN_LOGLARI ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS antrenman_loglari (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tarih         DATE        NOT NULL DEFAULT CURRENT_DATE,
  sablon_id     UUID        REFERENCES antrenman_sablonlari(id),
  antrenman_adi TEXT,
  sure_dakika   INT,
  notlar        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE antrenman_loglari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "antrenman_loglari_kullanici" ON antrenman_loglari;
CREATE POLICY "antrenman_loglari_kullanici" ON antrenman_loglari
  FOR ALL USING (auth.uid() = kullanici_id);

-- ─── 5. SET_LOGLARI ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS set_loglari (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  antrenman_log_id UUID        NOT NULL REFERENCES antrenman_loglari(id) ON DELETE CASCADE,
  egzersiz_id      UUID        NOT NULL REFERENCES egzersizler(id),
  set_no           INT         NOT NULL,
  kg               NUMERIC,
  tekrar           INT,
  tamamlandi       BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE set_loglari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "set_loglari_kullanici" ON set_loglari;
CREATE POLICY "set_loglari_kullanici" ON set_loglari
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM antrenman_loglari l
      WHERE l.id = antrenman_log_id AND l.kullanici_id = auth.uid()
    )
  );

-- ─── 6. AI_ÖNERİLER ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_oneriler (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oneri_tipi   TEXT        NOT NULL DEFAULT 'genel',  -- beslenme | antrenman | genel
  mesaj        TEXT        NOT NULL,
  okundu       BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_oneriler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_oneriler_kullanici" ON ai_oneriler;
CREATE POLICY "ai_oneriler_kullanici" ON ai_oneriler
  FOR ALL USING (auth.uid() = kullanici_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- EGZERSİZ SEED VERİSİ — 65 Egzersiz
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO egzersizler (isim, kas_grubu, aciklama, ekipman, zorluk) VALUES

-- ── GÖĞÜS (10 egzersiz) ────────────────────────────────────────────────────
('Barbell Düz Bench Press',   'göğüs', 'Düz bankta barbelle yapılan temel göğüs egzersizi. Pektoral kasları, ön deltoid ve tricepsi çalıştırır.',           'barbell',          'orta'),
('Dumbbell Düz Bench Press',  'göğüs', 'Düz bankta dumbbell ile yapılır. Daha geniş hareket açısı ve denge gerektirir.',                                     'dumbbell',         'orta'),
('İncline Barbell Press',     'göğüs', 'Yüksek eğimli bankta barbell ile üst göğüsü hedefler.',                                                              'barbell',          'orta'),
('İncline Dumbbell Press',    'göğüs', 'Yüksek eğimli bankta dumbbell ile üst göğüs ve ön deltoid çalışır.',                                                 'dumbbell',         'orta'),
('Decline Bench Press',       'göğüs', 'Aşağı eğimli bankta alt göğüs kaslarını hedefler.',                                                                  'barbell',          'orta'),
('Dumbbell Göğüs Flyes',      'göğüs', 'Düz bankta kanatlama hareketi. Göğüs kasını izole eder ve germe hareketini artırır.',                                'dumbbell',         'orta'),
('Kablo Crossover',           'göğüs', 'Kablo makinesiyle yapılan crossover. Göğüsü tüm açılardan çalıştırır.',                                              'kablo',            'orta'),
('Şınav',                     'göğüs', 'Klasik vücut ağırlığı egzersizi. Göğüs, triceps ve omuz kaslarını çalıştırır.',                                      'vücut_ağırlığı',   'başlangıç'),
('Paralel Bar Dips (Göğüs)',  'göğüs', 'Öne eğilerek yapılan dips. Alt ve orta göğüs kaslarını yoğun çalıştırır.',                                           'vücut_ağırlığı',   'orta'),
('Pec Deck Makinesi',         'göğüs', 'Göğüs makinesiyle yapılan izolasyon egzersizi. Güvenli ve kontrollü göğüs çalışması.',                               'makine',           'başlangıç'),

-- ── SIRT (10 egzersiz) ─────────────────────────────────────────────────────
('Deadlift',                  'sırt',  'Tüm posterior zinciri çalıştıran temel bileşik egzersiz. Sırt, gluteus ve hamstringları güçlendirir.',               'barbell',          'ileri'),
('Barfiks (Geniş Tutuş)',     'sırt',  'Lat ve bicepsi güçlendiren klasik çekiş egzersizi. Geniş tutuşla lat kasını daha çok hedefler.',                     'vücut_ağırlığı',   'orta'),
('Lat Pulldown',              'sırt',  'Kablo makinesiyle lat kaslarını çalıştıran egzersiz. Barfikse hazırlık için idealdir.',                               'makine',           'başlangıç'),
('Oturarak Kablo Çekiş',      'sırt',  'Orta ve alt sırt kaslarını hedefleyen kablo egzersizi. Oturarak yapılır.',                                            'kablo',            'başlangıç'),
('Öne Eğik Barbell Çekiş',   'sırt',  'Öne eğilip barbell çekerek orta ve üst sırt kaslarını güçlendirir.',                                                 'barbell',          'orta'),
('Tek El Dumbbell Çekiş',     'sırt',  'Bench desteğiyle tek elle yapılan row. Latissimus dorsi ve orta sırt kaslarını izole eder.',                         'dumbbell',         'orta'),
('T-Bar Çekiş',               'sırt',  'T-bar aparatıyla yapılan sırt çekiş egzersizi. Orta sırt kalınlığını artırır.',                                      'barbell',          'orta'),
('Face Pull',                 'sırt',  'Kablo ile yüz hizasına çekiş. Arka deltoid ve rotator cuff kaslarını güçlendirir.',                                  'kablo',            'başlangıç'),
('Hyperextension',            'sırt',  'Sırt uzatma bankında erektör spina kaslarını çalıştırır. Bel sağlığı için önemlidir.',                               'makine',           'başlangıç'),
('Kablo Düz Kol Çekiş',      'sırt',  'Kolları düz tutarak kablo çekişi. Lat kasını izole eder.',                                                            'kablo',            'orta'),

-- ── OMUZ (8 egzersiz) ──────────────────────────────────────────────────────
('Barbell Omuz Press',        'omuz',  'Barbell ile baş üstü itme. Tüm deltoid kaslarını ve tricepsi çalıştırır.',                                           'barbell',          'orta'),
('Dumbbell Omuz Press',       'omuz',  'Dumbbell ile oturarak veya ayakta omuz press. Daha geniş hareket açısı sağlar.',                                     'dumbbell',         'orta'),
('Lateral Raise',             'omuz',  'Kolları yanlara kaldırma. Orta deltoid kasını izole eder ve omuz genişliği sağlar.',                                 'dumbbell',         'başlangıç'),
('Ön Kol Kaldırma',           'omuz',  'Kolları öne kaldırma hareketi. Ön deltoid kasını hedefler.',                                                         'dumbbell',         'başlangıç'),
('Arka Deltoid Fly',          'omuz',  'Öne eğilerek dumbbell kanatlama. Arka deltoid ve trapez kaslarını çalıştırır.',                                      'dumbbell',         'başlangıç'),
('Dik Çekiş',                 'omuz',  'Barbell veya dumbbell ile çene hizasına dik çekiş. Trapez ve ön deltoid kaslarını çalıştırır.',                      'barbell',          'orta'),
('Arnold Press',              'omuz',  'Arnold Schwarzenegger tarafından popülerleştirilen rotasyonlu omuz press. Tüm deltoid başlarını aktive eder.',        'dumbbell',         'orta'),
('Kablo Lateral Raise',       'omuz',  'Kablo makinesiyle lateral raise. Sabit gerilim sayesinde orta deltoidde sürekli kas aktivasyonu sağlar.',            'kablo',            'orta'),

-- ── BİCEPS (7 egzersiz) ────────────────────────────────────────────────────
('Barbell Curl',              'biceps','Barbell ile iki kol curl. Biceps kütlesi için temel egzersiz.',                                                       'barbell',          'başlangıç'),
('Dumbbell Curl',             'biceps','Dumbbell ile alternatif veya eş zamanlı curl. Bağımsız kas gelişimi sağlar.',                                         'dumbbell',         'başlangıç'),
('Hammer Curl',               'biceps','Nötr tutuşla dumbbell curl. Brachialis ve brachioradialis kaslarını da çalıştırır.',                                 'dumbbell',         'başlangıç'),
('Konsantrasyon Curl',        'biceps','Tek elle yoğunlaştırılmış curl. Biceps peak kasını izole etmek için idealdir.',                                      'dumbbell',         'başlangıç'),
('Preacher Curl',             'biceps','Preacher bench üzerinde curl. Biceps alt kısmını izole eder ve hile yapmayı önler.',                                 'barbell',          'orta'),
('Kablo Curl',                'biceps','Kablo makinesiyle curl. Hareket boyunca sabit gerilim sağlar.',                                                       'kablo',            'başlangıç'),
('İncline Dumbbell Curl',     'biceps','Eğimli bankta uzanarak yapılan curl. Biceps uzun başını tam açar.',                                                   'dumbbell',         'orta'),

-- ── TRİCEPS (7 egzersiz) ───────────────────────────────────────────────────
('Skull Crusher',             'triceps','Yatarak barbelle alın üzerine indirme. Triceps uzun ve lateral başını çalıştırır.',                                  'barbell',          'orta'),
('Tricep Pushdown',           'triceps','Kablo makinesiyle aşağı itme. Tricepsi izole eden etkili egzersiz.',                                                 'kablo',            'başlangıç'),
('Overhead Tricep Extension', 'triceps','Baş üstünde dumbbell veya kablo ile tricep uzatma. Uzun başı hedefler.',                                             'dumbbell',         'orta'),
('Dar Tutuş Bench Press',    'triceps','Dar tutuşla bench press. Triceps ve iç göğüsü güçlendirir.',                                                         'barbell',          'orta'),
('Tricep Dips',               'triceps','Dik durarak paralel barda dips. Tricepsin tüm başlarını çalıştırır.',                                                'vücut_ağırlığı',   'orta'),
('Tricep Kickback',           'triceps','Öne eğilerek kol germe hareketi. Tricepsi izole eder.',                                                              'dumbbell',         'başlangıç'),
('Kablo Overhead Extension',  'triceps','Kablo ile baş üstü tricep uzatma. Uzun başta sabit gerilim sağlar.',                                                'kablo',            'orta'),

-- ── BACAK (13 egzersiz) ────────────────────────────────────────────────────
('Barbell Squat',             'bacak', 'Barbell ile klasik squat. Quadriceps, hamstring ve gluteusu çalıştıran kral egzersiz.',                              'barbell',          'ileri'),
('Ön Squat (Front Squat)',    'bacak', 'Barbell ön omuzda squat. Quadriceps ve core kaslarını daha yoğun çalıştırır.',                                       'barbell',          'ileri'),
('Leg Press',                 'bacak', 'Bacak press makinesi. Quadriceps, hamstring ve gluteus çalışır. Sırt üzerine yük biniş riski düşük.',               'makine',           'başlangıç'),
('Hack Squat',                'bacak', 'Hack squat makinesiyle bacak çalışması. Quadriceps izolasyonu sağlar.',                                               'makine',           'orta'),
('Lunge (Öne Adım)',          'bacak', 'Öne adım atarak yapılan squat varyasyonu. Quadriceps, gluteus ve denge kaslarını çalıştırır.',                       'dumbbell',         'orta'),
('Romen Deadlift (RDL)',      'bacak', 'Diz hafif bükükte hamstring odaklı deadlift. Hamstring ve gluteus için en etkili egzersizlerden biri.',              'barbell',          'orta'),
('Leg Curl (Yatarak)',        'bacak', 'Yatarak bacak bükme makinesi. Hamstring kaslarını izole eder.',                                                       'makine',           'başlangıç'),
('Leg Extension',             'bacak', 'Bacak uzatma makinesi. Quadriceps kaslarını izole eder.',                                                             'makine',           'başlangıç'),
('Ayakta Baldır Kaldırma',    'bacak', 'Smith makinesi veya step üzerinde baldır kaldırma. Gastrocnemius kasını geliştirir.',                                'makine',           'başlangıç'),
('Oturarak Baldır Kaldırma',  'bacak', 'Oturarak baldır kaldırma makinesi. Soleus kasını hedefler.',                                                         'makine',           'başlangıç'),
('Bulgar Squat',              'bacak', 'Arka ayak bankta; öne bacak quadriceps ve gluteusu çalıştırır. Denge ve güç gerektirir.',                            'dumbbell',         'ileri'),
('Hip Thrust',                'bacak', 'Bench desteğiyle kalça itme. Gluteus maksimus için en etkili egzersiz.',                                              'barbell',          'orta'),
('Sumo Squat',                'bacak', 'Geniş duruşla squat. İç uyluk (adduktor) ve gluteusu daha fazla çalıştırır.',                                       'dumbbell',         'başlangıç'),

-- ── KARIN / CORE (10 egzersiz) ─────────────────────────────────────────────
('Crunch',                    'karın', 'Klasik karın kasılma egzersizi. Rectus abdominis üst kısmını hedefler.',                                              'vücut_ağırlığı',   'başlangıç'),
('Plank',                     'karın', 'İzometrik core egzersizi. Tüm core kaslarını, omuzları ve sırtı çalıştırır.',                                        'vücut_ağırlığı',   'başlangıç'),
('Rus Dönüşü (Russian Twist)','karın', 'Oturarak gövde rotasyonu. Oblik kasları ve core stabilitesini geliştirir.',                                          'vücut_ağırlığı',   'başlangıç'),
('Yatarak Bacak Kaldırma',    'karın', 'Düz yatarken bacakları kaldırma. Alt karın kaslarını ve hip flexorları çalıştırır.',                                 'vücut_ağırlığı',   'orta'),
('Kablo Crunch',              'karın', 'Kablo makinesiyle crunch. Ağırlık ekleyerek karın kasları güçlendirilebilir.',                                        'kablo',            'orta'),
('Ab Wheel Rollout',          'karın', 'Ab tekerleğiyle uzanma hareketi. Tüm core kaslarını zorlu biçimde çalıştırır.',                                      'makine',           'ileri'),
('Asılı Bacak Kaldırma',      'karın', 'Barfikste asılırken bacakları kaldırma. Alt karın ve core için çok etkili.',                                         'vücut_ağırlığı',   'ileri'),
('Mountain Climber',          'karın', 'Plank pozisyonunda alternatif diz çekiş. Core ve kardiyovasküler sistemi aynı anda çalıştırır.',                     'vücut_ağırlığı',   'orta'),
('Mekik (Sit-Up)',            'karın', 'Tam menzilli karın hareketi. Rectus abdominis ve hip flexorları çalıştırır.',                                        'vücut_ağırlığı',   'başlangıç'),
('Yan Plank',                 'karın', 'Yan izometrik tutuş. Oblik kasları ve lateral core stabilitesini geliştirir.',                                       'vücut_ağırlığı',   'başlangıç')

ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- KONTROL: Kaç egzersiz eklendi?
-- ═══════════════════════════════════════════════════════════════════════════
SELECT kas_grubu, COUNT(*) as adet
FROM egzersizler
GROUP BY kas_grubu
ORDER BY kas_grubu;
