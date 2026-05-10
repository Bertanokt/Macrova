import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date
from enum import Enum


# ── Yardımcı ───────────────────────────────────────────────────────────────

def _xss_temizle(s: str) -> str:
    """Tehlikeli HTML karakterlerini kaldırır (XSS önleme)."""
    return re.sub(r'[<>"\']', '', s).strip()


# ── Enum'lar ────────────────────────────────────────────────────────────────

class CinsiyetEnum(str, Enum):
    erkek = "erkek"
    kadin = "kadin"


class HedefEnum(str, Enum):
    cut            = "cut"
    aggressive_cut = "aggressive_cut"
    koru           = "koru"
    bulk           = "bulk"
    dirty_bulk     = "dirty_bulk"


class AktiviteSeviyesiEnum(str, Enum):
    sedanter     = "sedanter"
    hafif_aktif  = "hafif_aktif"
    orta_aktif   = "orta_aktif"
    cok_aktif    = "cok_aktif"
    ekstra_aktif = "ekstra_aktif"


class OgunEnum(str, Enum):
    kahvalti = "kahvalti"
    ogle     = "ogle"
    aksam    = "aksam"
    ara_ogun = "ara_ogun"


class KaynakEnum(str, Enum):
    sistem    = "sistem"
    kullanici = "kullanici"


# ── Auth ────────────────────────────────────────────────────────────────────

class KullaniciKayit(BaseModel):
    email:             EmailStr
    sifre:             str
    isim:              str
    soyisim:           str
    yas:               int
    cinsiyet:          CinsiyetEnum
    boy_cm:            float
    kilo_kg:           float
    hedef:             HedefEnum
    aktivite_seviyesi: AktiviteSeviyesiEnum

    @field_validator("sifre")
    @classmethod
    def sifre_guclu(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalıdır")
        if not re.search(r'[A-Z]', v):
            raise ValueError("Şifre en az 1 büyük harf içermelidir")
        if not re.search(r'\d', v):
            raise ValueError("Şifre en az 1 rakam içermelidir")
        if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>?/\\|`~]', v):
            raise ValueError("Şifre en az 1 özel karakter içermelidir (!@#$ vb.)")
        return v

    @field_validator("isim", "soyisim")
    @classmethod
    def isim_dogrula(cls, v: str) -> str:
        v = _xss_temizle(v)
        if len(v) < 2 or len(v) > 50:
            raise ValueError("İsim 2-50 karakter arasında olmalıdır")
        if not re.match(r'^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\-]+$', v):
            raise ValueError("İsim yalnızca harf, boşluk ve tire içerebilir")
        return v

    @field_validator("yas")
    @classmethod
    def yas_aralik(cls, v: int) -> int:
        if not (13 <= v <= 120):
            raise ValueError("Geçerli bir yaş giriniz (13-120)")
        return v

    @field_validator("boy_cm")
    @classmethod
    def boy_aralik(cls, v: float) -> float:
        if not (100.0 <= v <= 250.0):
            raise ValueError("Geçerli bir boy giriniz (100-250 cm)")
        return v

    @field_validator("kilo_kg")
    @classmethod
    def kilo_aralik(cls, v: float) -> float:
        if not (20.0 <= v <= 500.0):
            raise ValueError("Geçerli bir kilo giriniz (20-500 kg)")
        return v


class KullaniciGiris(BaseModel):
    email: EmailStr
    sifre: str


class TokenYanit(BaseModel):
    access_token:  str
    refresh_token: Optional[str] = None
    token_type:    str = "bearer"
    kullanici_id:  str


class SifreDegistir(BaseModel):
    eski_sifre: str
    yeni_sifre: str

    @field_validator("yeni_sifre")
    @classmethod
    def yeni_sifre_guclu(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalıdır")
        if not re.search(r'[A-Z]', v):
            raise ValueError("Şifre en az 1 büyük harf içermelidir")
        if not re.search(r'\d', v):
            raise ValueError("Şifre en az 1 rakam içermelidir")
        if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>?/\\|`~]', v):
            raise ValueError("Şifre en az 1 özel karakter içermelidir")
        return v


class HesapSil(BaseModel):
    sifre: str


class SifreSifirlamaIste(BaseModel):
    email: EmailStr


class SifreSifirlama(BaseModel):
    token:     str
    yeni_sifre: str

    @field_validator("yeni_sifre")
    @classmethod
    def sifre_guclu(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalıdır")
        if not re.search(r'[A-Z]', v):
            raise ValueError("Şifre en az 1 büyük harf içermelidir")
        if not re.search(r'\d', v):
            raise ValueError("Şifre en az 1 rakam içermelidir")
        if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>?/\\|`~]', v):
            raise ValueError("Şifre en az 1 özel karakter içermelidir")
        return v


# ── Kullanıcı ───────────────────────────────────────────────────────────────

class KullaniciProfil(BaseModel):
    id:                str
    email:             str
    isim:              str
    soyisim:           str
    yas:               int
    cinsiyet:          str
    boy_cm:            float
    kilo_kg:           float
    hedef:             str
    aktivite_seviyesi: str
    created_at:        Optional[str] = None


class ProfilGuncelle(BaseModel):
    isim:              Optional[str]                    = None
    soyisim:           Optional[str]                    = None
    yas:               Optional[int]                    = None
    boy_cm:            Optional[float]                  = None
    kilo_kg:           Optional[float]                  = None
    hedef:             Optional[HedefEnum]              = None
    aktivite_seviyesi: Optional[AktiviteSeviyesiEnum]  = None

    @field_validator("isim", "soyisim", mode="before")
    @classmethod
    def isim_temizle(cls, v):
        if v is None:
            return v
        v = _xss_temizle(str(v))
        if len(v) < 2 or len(v) > 50:
            raise ValueError("İsim 2-50 karakter arasında olmalıdır")
        return v


class KiloGirisi(BaseModel):
    kilo_kg: float
    tarih:   Optional[date] = None

    @field_validator("kilo_kg")
    @classmethod
    def kilo_aralik(cls, v: float) -> float:
        if not (20.0 <= v <= 500.0):
            raise ValueError("Geçerli bir kilo giriniz (20-500 kg)")
        return v


class KiloKayit(BaseModel):
    id:         str
    kilo_kg:    float
    tarih:      str
    created_at: Optional[str] = None


# ── Yemek ───────────────────────────────────────────────────────────────────

class YemekEkle(BaseModel):
    isim:             str
    kalori_100g:      float
    protein_100g:     float
    karbonhidrat_100g: float
    yag_100g:         float
    kategori:         Optional[str] = None
    barkod:           Optional[str] = None

    @field_validator("isim")
    @classmethod
    def isim_dogrula(cls, v: str) -> str:
        v = _xss_temizle(v)
        if len(v) < 1 or len(v) > 200:
            raise ValueError("Yemek ismi 1-200 karakter arasında olmalıdır")
        return v

    @field_validator("kalori_100g")
    @classmethod
    def kalori_aralik(cls, v: float) -> float:
        if not (0 <= v <= 9000):
            raise ValueError("Kalori 0-9000 kcal arasında olmalıdır")
        return v

    @field_validator("protein_100g", "karbonhidrat_100g", "yag_100g")
    @classmethod
    def makro_aralik(cls, v: float) -> float:
        if not (0 <= v <= 100):
            raise ValueError("Makro değer 0-100 g arasında olmalıdır")
        return v


class YemekGuncelle(BaseModel):
    kalori_100g:       Optional[float] = None
    protein_100g:      Optional[float] = None
    karbonhidrat_100g: Optional[float] = None
    yag_100g:          Optional[float] = None


class YemekDetay(BaseModel):
    id:                str
    isim:              str
    isim_en:           Optional[str]   = None
    kalori_100g:       float
    protein_100g:      float
    karbonhidrat_100g: float
    yag_100g:          float
    kategori:          Optional[str]   = None
    barkod:            Optional[str]   = None
    kaynak:            str


# ── Takip ───────────────────────────────────────────────────────────────────

class OgunEkle(BaseModel):
    tarih:       Optional[date] = None
    ogun:        OgunEnum
    yemek_id:    str
    miktar_gram: float

    @field_validator("miktar_gram")
    @classmethod
    def miktar_aralik(cls, v: float) -> float:
        if not (1 <= v <= 5000):
            raise ValueError("Miktar 1-5000 gram arasında olmalıdır")
        return v


class OgunKayit(BaseModel):
    id:          str
    tarih:       str
    ogun:        str
    yemek_id:    str
    miktar_gram: float
    yemek:       Optional[YemekDetay] = None
    kalori:      Optional[float]      = None
    protein:     Optional[float]      = None
    karbonhidrat: Optional[float]     = None
    yag:         Optional[float]      = None


class GunlukMakro(BaseModel):
    tarih:               str
    toplam_kalori:       float
    toplam_protein:      float
    toplam_karbonhidrat: float
    toplam_yag:          float
    ogunler:             dict


class HaftalikOzet(BaseModel):
    tarih:               str
    toplam_kalori:       float
    toplam_protein:      float
    toplam_karbonhidrat: float
    toplam_yag:          float
    ogun_sayisi:         int


class MakroHedef(BaseModel):
    kalori_hedef:       float
    protein_hedef:      float
    karbonhidrat_hedef: float
    yag_hedef:          float
    hesaplama_tipi:     str


# ── Su Takibi ───────────────────────────────────────────────────────────────

class SuEkle(BaseModel):
    miktar_ml: int
    tarih:     Optional[date] = None

    @field_validator("miktar_ml")
    @classmethod
    def miktar_aralik(cls, v: int) -> int:
        if not (1 <= v <= 5000):
            raise ValueError("Su miktarı 1-5000 ml arasında olmalıdır")
        return v
