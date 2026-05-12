-- ── Antrenman v2 migration ───────────────────────────────────────────────────
-- 1. antrenman_loglari: tamamlandi bayragi ekle (kaydetme = TRUE setlemek icin)
ALTER TABLE antrenman_loglari
  ADD COLUMN IF NOT EXISTS tamamlandi BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. set_loglari: egzersiz_sira ekle (hangi sirada eklendigi)
ALTER TABLE set_loglari
  ADD COLUMN IF NOT EXISTS egzersiz_sira INTEGER NOT NULL DEFAULT 0;
