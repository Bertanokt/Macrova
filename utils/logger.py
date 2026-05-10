"""
Güvenlik loglama modülü.
JSON formatında başarısız girişleri ve şüpheli aktiviteleri loglar.
"""
import json
import logging
from datetime import datetime, timedelta


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict = {
            "zaman": datetime.utcnow().isoformat() + "Z",
            "seviye": record.levelname,
            "mesaj": record.getMessage(),
        }
        if hasattr(record, "ekstra"):
            entry.update(record.ekstra)
        return json.dumps(entry, ensure_ascii=False)


def _logger_olustur(isim: str) -> logging.Logger:
    log = logging.getLogger(isim)
    if not log.handlers:
        log.setLevel(logging.INFO)
        h = logging.StreamHandler()
        h.setFormatter(JsonFormatter())
        log.addHandler(h)
    return log


guvenlik_log = _logger_olustur("macrova.guvenlik")


def basarisiz_giris_logla(ip: str, email: str) -> bool:
    """
    Başarısız giriş kaydeder. Son 15 dk'da 5+ deneme varsa True döner (IP blok).
    Supabase tablosu yoksa sadece loglar.
    """
    guvenlik_log.warning(
        "Başarısız giriş denemesi",
        extra={"ekstra": {"ip": ip, "email": email}},
    )
    try:
        from utils.supabase_client import supabase
        supabase.table("failed_logins").insert({
            "ip_adresi": ip,
            "email": email,
            "deneme_zamani": datetime.utcnow().isoformat(),
        }).execute()

        since = (datetime.utcnow() - timedelta(minutes=15)).isoformat()
        sonuc = (
            supabase.table("failed_logins")
            .select("id", count="exact")
            .eq("ip_adresi", ip)
            .gte("deneme_zamani", since)
            .execute()
        )
        return (sonuc.count or 0) >= 5
    except Exception:
        return False


def ip_bloklu_mu(ip: str) -> bool:
    """Son 15 dk'da 5+ başarısız deneme varsa True döner."""
    try:
        from utils.supabase_client import supabase
        since = (datetime.utcnow() - timedelta(minutes=15)).isoformat()
        sonuc = (
            supabase.table("failed_logins")
            .select("id", count="exact")
            .eq("ip_adresi", ip)
            .gte("deneme_zamani", since)
            .execute()
        )
        return (sonuc.count or 0) >= 5
    except Exception:
        return False


def guvenlik_olayi_logla(olay: str, detay: dict) -> None:
    guvenlik_log.warning(olay, extra={"ekstra": detay})
