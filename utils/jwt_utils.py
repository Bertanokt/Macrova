"""
JWT yardımcı fonksiyonları.
- Access token: 15 dakika
- Refresh token: 30 gün
- jti (JWT ID) ile replay attack önleme
- Token blacklist (Supabase token_blacklist tablosu)
"""
import os
import uuid
import warnings
import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWT_SECRET    = os.getenv("JWT_SECRET", "macrova-gizli-anahtar-en-az-32-karakter-olmali!")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_SURE_DAK  = 15   # dakika
REFRESH_TOKEN_SURE_GUN = 30   # gün

if len(JWT_SECRET) < 32:
    warnings.warn(
        "⚠️  JWT_SECRET çok kısa! En az 32 karakter olmalı. Güvenlik riski.",
        RuntimeWarning, stacklevel=2,
    )

security = HTTPBearer()


# ── Şifre ──────────────────────────────────────────────────────────────────

def sifre_hashle(sifre: str) -> str:
    return bcrypt.hashpw(sifre.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def sifre_dogrula(sifre: str, hash: str) -> bool:
    return bcrypt.checkpw(sifre.encode("utf-8"), hash.encode("utf-8"))


# ── Token oluştur ───────────────────────────────────────────────────────────

def token_olustur(kullanici_id: str, token_tipi: str = "access") -> str:
    """Access veya refresh token oluşturur. jti ile tekrar kullanım önlenir."""
    simdi = datetime.utcnow()
    sure  = (
        timedelta(minutes=ACCESS_TOKEN_SURE_DAK)
        if token_tipi == "access"
        else timedelta(days=REFRESH_TOKEN_SURE_GUN)
    )
    payload = {
        "sub":  kullanici_id,
        "exp":  simdi + sure,
        "iat":  simdi,
        "jti":  str(uuid.uuid4()),
        "type": token_tipi,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ── Token çöz ──────────────────────────────────────────────────────────────

def token_coz(token: str, beklenen_tip: str = "access") -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")

    if payload.get("type", "access") != beklenen_tip:
        raise HTTPException(status_code=401, detail="Geçersiz token tipi")

    jti = payload.get("jti")
    if jti:
        try:
            from utils.supabase_client import supabase
            bl = supabase.table("token_blacklist").select("id").eq("jti", jti).execute()
            if bl.data:
                raise HTTPException(
                    status_code=401,
                    detail="Token geçersiz kılınmış. Lütfen tekrar giriş yapın.",
                )
        except HTTPException:
            raise
        except Exception:
            pass  # Tablo henüz oluşturulmamışsa devam et

    return payload


def token_blacklist_ekle(jti: str, kullanici_id: str, sure_gun: int = 1) -> None:
    """Token'ı blacklist'e ekler. Hata olursa sessizce geçer."""
    try:
        from utils.supabase_client import supabase
        supabase.table("token_blacklist").insert({
            "jti": jti,
            "kullanici_id": kullanici_id,
            "gecerlilik_bitis": (datetime.utcnow() + timedelta(days=sure_gun)).isoformat(),
        }).execute()
    except Exception:
        pass


# ── Dependency ─────────────────────────────────────────────────────────────

async def mevcut_kullanici(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    payload = token_coz(credentials.credentials, "access")
    kullanici_id = payload.get("sub")
    if not kullanici_id:
        raise HTTPException(status_code=401, detail="Token içinde kullanıcı bilgisi bulunamadı")
    return kullanici_id
