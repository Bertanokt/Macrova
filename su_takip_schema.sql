-- =============================================
-- Macrova - Su Takip Tablosu
-- Supabase SQL Editor'de çalıştırın
-- =============================================

CREATE TABLE IF NOT EXISTS su_takip (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kullanici_id  UUID NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
    miktar_ml     INTEGER NOT NULL CHECK (miktar_ml > 0),
    tarih         DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_su_takip_kullanici_tarih
    ON su_takip (kullanici_id, tarih DESC);
