from fastapi import APIRouter, HTTPException, Depends
from models.schemas import (
    KullaniciProfil, ProfilGuncelle, KiloGirisi, KiloKayit, MakroHedef, HesapSil,
)
from utils.supabase_client import supabase
from utils.jwt_utils import mevcut_kullanici, sifre_dogrula
from utils.algoritma import tam_hedef_hesapla, adaptif_tdee_hesapla, makro_dagilim_hesapla
from datetime import date, timedelta
from typing import List

router = APIRouter()


def _kullanici_getir(kullanici_id: str) -> dict:
    sonuc = supabase.table("kullanicilar").select("*").eq("id", kullanici_id).execute()
    if not sonuc.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return sonuc.data[0]


@router.get("/profil", response_model=KullaniciProfil, summary="Profil bilgileri")
def profil_getir(kullanici_id: str = Depends(mevcut_kullanici)):
    kullanici = _kullanici_getir(kullanici_id)
    kullanici.pop("sifre_hash", None)
    return kullanici


@router.put("/profil", response_model=KullaniciProfil, summary="Profil güncelle")
def profil_guncelle(veri: ProfilGuncelle, kullanici_id: str = Depends(mevcut_kullanici)):
    guncelleme = {k: v for k, v in veri.model_dump().items() if v is not None}
    if not guncelleme:
        raise HTTPException(status_code=400, detail="Güncellenecek alan bulunamadı")

    # Enum değerlerini string'e çevir
    if "hedef" in guncelleme:
        guncelleme["hedef"] = guncelleme["hedef"].value
    if "aktivite_seviyesi" in guncelleme:
        guncelleme["aktivite_seviyesi"] = guncelleme["aktivite_seviyesi"].value

    sonuc = supabase.table("kullanicilar").update(guncelleme).eq("id", kullanici_id).execute()
    if not sonuc.data:
        raise HTTPException(status_code=500, detail="Profil güncellenemedi")

    # Profil değişince makro hedeflerini yeniden hesapla
    kullanici = sonuc.data[0]
    hedefler = tam_hedef_hesapla(
        cinsiyet=kullanici["cinsiyet"],
        kilo_kg=kullanici["kilo_kg"],
        boy_cm=kullanici["boy_cm"],
        yas=kullanici["yas"],
        aktivite_seviyesi=kullanici["aktivite_seviyesi"],
        hedef=kullanici["hedef"],
    )
    supabase.table("makro_hedefler").insert({
        "kullanici_id": kullanici_id,
        "kalori_hedef": hedefler["kalori_hedef"],
        "protein_hedef": hedefler["protein_hedef"],
        "karbonhidrat_hedef": hedefler["karbonhidrat_hedef"],
        "yag_hedef": hedefler["yag_hedef"],
        "hafta_basi": str(date.today()),
        "hesaplama_tipi": "standart",
    }).execute()

    kullanici.pop("sifre_hash", None)
    return kullanici


@router.post("/kilo", response_model=KiloKayit, summary="Kilo girişi ekle")
def kilo_ekle(veri: KiloGirisi, kullanici_id: str = Depends(mevcut_kullanici)):
    tarih = str(veri.tarih) if veri.tarih else str(date.today())

    # Aynı güne ait kayıt varsa güncelle
    mevcut = supabase.table("kilo_takip").select("id").eq("kullanici_id", kullanici_id).eq("tarih", tarih).execute()
    if mevcut.data:
        sonuc = supabase.table("kilo_takip").update({"kilo_kg": veri.kilo_kg}).eq("id", mevcut.data[0]["id"]).execute()
    else:
        sonuc = supabase.table("kilo_takip").insert({
            "kullanici_id": kullanici_id,
            "kilo_kg": veri.kilo_kg,
            "tarih": tarih,
        }).execute()

    if not sonuc.data:
        raise HTTPException(status_code=500, detail="Kilo kaydedilemedi")

    # Kullanıcı profilindeki güncel kiloyu da güncelle
    supabase.table("kullanicilar").update({"kilo_kg": veri.kilo_kg}).eq("id", kullanici_id).execute()

    # Adaptif TDEE güncelleme denemesi
    _adaptif_tdee_guncelle(kullanici_id)

    return sonuc.data[0]


@router.get("/kilo-gecmis", response_model=List[KiloKayit], summary="Son 30 günün kilo verileri")
def kilo_gecmis(kullanici_id: str = Depends(mevcut_kullanici)):
    bitis = date.today()
    baslangic = bitis - timedelta(days=30)

    sonuc = (
        supabase.table("kilo_takip")
        .select("*")
        .eq("kullanici_id", kullanici_id)
        .gte("tarih", str(baslangic))
        .lte("tarih", str(bitis))
        .order("tarih", desc=False)
        .execute()
    )
    return sonuc.data


@router.get("/makro-hedef", response_model=MakroHedef, summary="Güncel makro hedefler")
def makro_hedef_getir(kullanici_id: str = Depends(mevcut_kullanici)):
    sonuc = (
        supabase.table("makro_hedefler")
        .select("*")
        .eq("kullanici_id", kullanici_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not sonuc.data:
        raise HTTPException(status_code=404, detail="Makro hedef bulunamadı")
    return sonuc.data[0]


def _adaptif_tdee_guncelle(kullanici_id: str):
    """Son 2 haftanın verisiyle TDEE'yi güncellemeyi dener."""
    try:
        baslangic = date.today() - timedelta(days=14)

        kilo_kayitlari_raw = (
            supabase.table("kilo_takip")
            .select("tarih, kilo_kg")
            .eq("kullanici_id", kullanici_id)
            .gte("tarih", str(baslangic))
            .execute()
        )

        # Günlük kalori toplamlarını çek
        takip_kayitlari = (
            supabase.table("gunluk_takip")
            .select("tarih, yemek_id, miktar_gram, yemekler(kalori_100g)")
            .eq("kullanici_id", kullanici_id)
            .gte("tarih", str(baslangic))
            .execute()
        )

        # Gün bazında kalori topla
        gun_kalori: dict = {}
        for kayit in takip_kayitlari.data:
            t = kayit["tarih"]
            kalori = (kayit["yemekler"]["kalori_100g"] / 100) * kayit["miktar_gram"]
            gun_kalori[t] = gun_kalori.get(t, 0) + kalori

        kalori_listesi = [{"tarih": t, "toplam_kalori": v} for t, v in gun_kalori.items()]
        kilo_listesi = [
            {"tarih": date.fromisoformat(k["tarih"]), "kilo_kg": k["kilo_kg"]}
            for k in kilo_kayitlari_raw.data
        ]

        mevcut_hedef = (
            supabase.table("makro_hedefler")
            .select("*")
            .eq("kullanici_id", kullanici_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not mevcut_hedef.data:
            return

        mevcut_tdee = mevcut_hedef.data[0]["kalori_hedef"]
        kullanici = _kullanici_getir(kullanici_id)

        yeni_tdee = adaptif_tdee_hesapla(mevcut_tdee, kilo_listesi, kalori_listesi)
        if yeni_tdee is None:
            return

        from utils.algoritma import kalori_hedef_hesapla
        yeni_kalori = kalori_hedef_hesapla(yeni_tdee, kullanici["hedef"])
        yeni_makrolar = makro_dagilim_hesapla(yeni_kalori, kullanici["kilo_kg"])

        supabase.table("makro_hedefler").insert({
            "kullanici_id": kullanici_id,
            "kalori_hedef": yeni_makrolar["kalori_hedef"],
            "protein_hedef": yeni_makrolar["protein_hedef"],
            "karbonhidrat_hedef": yeni_makrolar["karbonhidrat_hedef"],
            "yag_hedef": yeni_makrolar["yag_hedef"],
            "hafta_basi": str(date.today()),
            "hesaplama_tipi": "adaptif",
        }).execute()
    except Exception:
        pass  # Adaptif hesaplama arka planda — hata fırlatma


# ── Hesap Sil ──────────────────────────────────────────────────────────────

@router.delete("/hesap-sil", summary="Hesabı ve tüm verileri kalıcı olarak sil")
def hesap_sil(veri: HesapSil, kullanici_id: str = Depends(mevcut_kullanici)):
    """Şifre onayı isteyerek kullanıcı hesabını ve tüm verilerini siler."""
    sonuc = supabase.table("kullanicilar").select("sifre_hash").eq("id", kullanici_id).execute()
    if not sonuc.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if not sifre_dogrula(veri.sifre, sonuc.data[0]["sifre_hash"]):
        raise HTTPException(status_code=401, detail="Şifre hatalı")

    # Tüm kullanıcı verilerini sil (bağımlılık sırasına göre)
    for tablo in ["gunluk_takip", "kilo_takip", "su_takip", "makro_hedefler"]:
        supabase.table(tablo).delete().eq("kullanici_id", kullanici_id).execute()

    supabase.table("kullanicilar").delete().eq("id", kullanici_id).execute()
    return {"mesaj": "Hesabınız ve tüm verileriniz kalıcı olarak silindi"}
