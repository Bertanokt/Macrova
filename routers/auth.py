from fastapi import APIRouter, HTTPException, Depends, Request, Body
from fastapi.security import HTTPAuthorizationCredentials
from models.schemas import (
    KullaniciKayit, KullaniciGiris, TokenYanit,
    SifreDegistir, HesapSil, SifreSifirlamaIste, SifreSifirlama,
)
from utils.supabase_client import supabase
from utils.jwt_utils import (
    sifre_hashle, sifre_dogrula, token_olustur, token_coz,
    token_blacklist_ekle, REFRESH_TOKEN_SURE_GUN, security, mevcut_kullanici,
)
from utils.algoritma import tam_hedef_hesapla
from utils.limiter import limiter
from utils.logger import basarisiz_giris_logla, ip_bloklu_mu, guvenlik_olayi_logla
from datetime import date

router = APIRouter()


# ── Kayıt ───────────────────────────────────────────────────────────────────

@router.post("/kayit", response_model=TokenYanit, summary="Yeni kullanıcı kaydı")
@limiter.limit("5/hour")
def kayit(request: Request, veri: KullaniciKayit):
    mevcut = supabase.table("kullanicilar").select("id").eq("email", str(veri.email)).execute()
    if mevcut.data:
        # Enumeration önleme: email var/yok belli etme
        raise HTTPException(status_code=400, detail="Bu bilgilerle kayıt oluşturulamadı")

    sifre_hash = sifre_hashle(veri.sifre)
    kullanici_veri = {
        "email":             str(veri.email),
        "sifre_hash":        sifre_hash,
        "isim":              veri.isim,
        "soyisim":           veri.soyisim,
        "yas":               veri.yas,
        "cinsiyet":          veri.cinsiyet.value,
        "boy_cm":            veri.boy_cm,
        "kilo_kg":           veri.kilo_kg,
        "hedef":             veri.hedef.value,
        "aktivite_seviyesi": veri.aktivite_seviyesi.value,
    }

    sonuc = supabase.table("kullanicilar").insert(kullanici_veri).execute()
    if not sonuc.data:
        raise HTTPException(status_code=500, detail="Kullanıcı oluşturulamadı")

    kullanici    = sonuc.data[0]
    kullanici_id = kullanici["id"]

    hedefler = tam_hedef_hesapla(
        cinsiyet=veri.cinsiyet.value,
        kilo_kg=veri.kilo_kg,
        boy_cm=veri.boy_cm,
        yas=veri.yas,
        aktivite_seviyesi=veri.aktivite_seviyesi.value,
        hedef=veri.hedef.value,
    )
    supabase.table("makro_hedefler").insert({
        "kullanici_id":       kullanici_id,
        "kalori_hedef":       hedefler["kalori_hedef"],
        "protein_hedef":      hedefler["protein_hedef"],
        "karbonhidrat_hedef": hedefler["karbonhidrat_hedef"],
        "yag_hedef":          hedefler["yag_hedef"],
        "hafta_basi":         str(date.today()),
        "hesaplama_tipi":     "standart",
    }).execute()

    supabase.table("kilo_takip").insert({
        "kullanici_id": kullanici_id,
        "kilo_kg":      veri.kilo_kg,
        "tarih":        str(date.today()),
    }).execute()

    access  = token_olustur(kullanici_id, "access")
    refresh = token_olustur(kullanici_id, "refresh")
    return TokenYanit(access_token=access, refresh_token=refresh, kullanici_id=kullanici_id)


# ── Giriş ───────────────────────────────────────────────────────────────────

@router.post("/giris", response_model=TokenYanit, summary="Kullanıcı girişi")
@limiter.limit("10/15minutes")
def giris(request: Request, veri: KullaniciGiris):
    ip = request.client.host if request.client else "unknown"

    if ip_bloklu_mu(ip):
        raise HTTPException(status_code=429, detail="Çok fazla başarısız giriş. 15 dakika bekleyin.")

    sonuc = supabase.table("kullanicilar").select("*").eq("email", str(veri.email)).execute()

    # Enumeration önleme: kullanıcı yok veya şifre yanlış → aynı hata
    if not sonuc.data or not sifre_dogrula(veri.sifre, sonuc.data[0]["sifre_hash"]):
        blokla = basarisiz_giris_logla(ip, str(veri.email))
        if blokla:
            raise HTTPException(status_code=429, detail="Çok fazla başarısız giriş. 15 dakika bekleyin.")
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

    kullanici = sonuc.data[0]
    access    = token_olustur(kullanici["id"], "access")
    refresh   = token_olustur(kullanici["id"], "refresh")
    return TokenYanit(access_token=access, refresh_token=refresh, kullanici_id=kullanici["id"])


# ── Token Yenile ────────────────────────────────────────────────────────────

@router.post("/token-yenile", summary="Refresh token ile yeni access token al")
@limiter.limit("30/hour")
def token_yenile(request: Request, refresh_token: str = Body(..., embed=True)):
    payload      = token_coz(refresh_token, "refresh")
    kullanici_id = payload.get("sub")
    if not kullanici_id:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token")

    # Token rotation: eski refresh'i blacklist'e al
    eski_jti = payload.get("jti")
    if eski_jti:
        token_blacklist_ekle(eski_jti, kullanici_id, sure_gun=REFRESH_TOKEN_SURE_GUN)

    new_access  = token_olustur(kullanici_id, "access")
    new_refresh = token_olustur(kullanici_id, "refresh")
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


# ── Çıkış ───────────────────────────────────────────────────────────────────

@router.post("/cikis", summary="Oturumu kapat ve token'ı geçersiz kıl")
def cikis(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload      = token_coz(credentials.credentials, "access")
        jti          = payload.get("jti")
        kullanici_id = payload.get("sub", "")
        if jti:
            token_blacklist_ekle(jti, kullanici_id, sure_gun=1)
    except HTTPException:
        pass  # Token zaten geçersizse de çıkış başarılı say
    return {"mesaj": "Başarıyla çıkış yapıldı"}


# ── Şifre Değiştir ──────────────────────────────────────────────────────────

@router.put("/sifre-degistir", summary="Şifre değiştir")
@limiter.limit("5/hour")
def sifre_degistir(
    request: Request,
    veri: SifreDegistir,
    kullanici_id: str = Depends(mevcut_kullanici),
):
    sonuc = supabase.table("kullanicilar").select("sifre_hash").eq("id", kullanici_id).execute()
    if not sonuc.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if not sifre_dogrula(veri.eski_sifre, sonuc.data[0]["sifre_hash"]):
        raise HTTPException(status_code=401, detail="Mevcut şifre hatalı")

    yeni_hash = sifre_hashle(veri.yeni_sifre)
    supabase.table("kullanicilar").update({"sifre_hash": yeni_hash}).eq("id", kullanici_id).execute()
    return {"mesaj": "Şifre başarıyla güncellendi"}


# ── Şifre Sıfırlama ─────────────────────────────────────────────────────────

@router.post("/sifre-sifirlama-iste", summary="Şifre sıfırlama talebi")
@limiter.limit("3/hour")
def sifre_sifirlama_iste(request: Request, veri: SifreSifirlamaIste):
    sonuc = supabase.table("kullanicilar").select("id").eq("email", str(veri.email)).execute()
    if sonuc.data:
        reset_token = token_olustur(sonuc.data[0]["id"], "access")
        # TODO: production'da gerçek email gönder
        guvenlik_olayi_logla(
            "Şifre sıfırlama talebi",
            {"email": str(veri.email), "reset_token_log": reset_token[:20] + "..."},
        )
    # Enumeration önleme: her zaman aynı mesaj
    return {"mesaj": "Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi"}


@router.post("/sifre-sifirlama", summary="Token ile şifre sıfırla")
@limiter.limit("5/hour")
def sifre_sifirlama(request: Request, veri: SifreSifirlama):
    try:
        payload      = token_coz(veri.token, "access")
        kullanici_id = payload.get("sub")
        if not kullanici_id:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş sıfırlama bağlantısı")

    yeni_hash = sifre_hashle(veri.yeni_sifre)
    supabase.table("kullanicilar").update({"sifre_hash": yeni_hash}).eq("id", kullanici_id).execute()

    jti = payload.get("jti")
    if jti:
        token_blacklist_ekle(jti, kullanici_id)

    return {"mesaj": "Şifre başarıyla sıfırlandı"}
