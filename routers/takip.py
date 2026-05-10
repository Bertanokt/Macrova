from fastapi import APIRouter, HTTPException, Depends, Query
from models.schemas import OgunEkle, OgunKayit, GunlukMakro, HaftalikOzet, SuEkle
from utils.supabase_client import supabase
from utils.jwt_utils import mevcut_kullanici
from datetime import date, timedelta
from typing import List
from collections import defaultdict

router = APIRouter()


def _makro_hesapla(miktar_gram: float, yemek: dict) -> dict:
    """100g değerlerinden gerçek miktara oran hesapla."""
    oran = miktar_gram / 100
    return {
        "kalori": round(yemek["kalori_100g"] * oran, 1),
        "protein": round(yemek["protein_100g"] * oran, 1),
        "karbonhidrat": round(yemek["karbonhidrat_100g"] * oran, 1),
        "yag": round(yemek["yag_100g"] * oran, 1),
    }


@router.post("/ogun-ekle", response_model=OgunKayit, summary="Günlük öğüne yemek ekle")
def ogun_ekle(veri: OgunEkle, kullanici_id: str = Depends(mevcut_kullanici)):
    yemek_sonuc = supabase.table("yemekler").select("*").eq("id", veri.yemek_id).execute()
    if not yemek_sonuc.data:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")

    tarih = str(veri.tarih) if veri.tarih else str(date.today())

    kayit = {
        "kullanici_id": kullanici_id,
        "tarih": tarih,
        "ogun": veri.ogun.value,
        "yemek_id": veri.yemek_id,
        "miktar_gram": veri.miktar_gram,
    }
    sonuc = supabase.table("gunluk_takip").insert(kayit).execute()
    if not sonuc.data:
        raise HTTPException(status_code=500, detail="Öğün kaydedilemedi")

    yemek = yemek_sonuc.data[0]
    makrolar = _makro_hesapla(veri.miktar_gram, yemek)

    return {**sonuc.data[0], "yemek": yemek, **makrolar}


@router.get("/gunluk", response_model=GunlukMakro, summary="Günün öğünleri ve toplam makro")
def gunluk_takip(
    tarih: str = Query(default=None, description="YYYY-MM-DD formatında tarih"),
    kullanici_id: str = Depends(mevcut_kullanici),
):
    hedef_tarih = tarih if tarih else str(date.today())

    sonuc = (
        supabase.table("gunluk_takip")
        .select("*, yemekler(*)")
        .eq("kullanici_id", kullanici_id)
        .eq("tarih", hedef_tarih)
        .execute()
    )

    ogunler: dict = defaultdict(list)
    toplam = {"kalori": 0.0, "protein": 0.0, "karbonhidrat": 0.0, "yag": 0.0}

    for kayit in sonuc.data:
        yemek = kayit["yemekler"]
        makrolar = _makro_hesapla(kayit["miktar_gram"], yemek)

        ogun_kayit = {
            "id": kayit["id"],
            "yemek_id": kayit["yemek_id"],
            "yemek_isim": yemek["isim"],
            "yemek_isim_en": yemek.get("isim_en"),
            "miktar_gram": kayit["miktar_gram"],
            **makrolar,
        }
        ogunler[kayit["ogun"]].append(ogun_kayit)
        for k in toplam:
            toplam[k] += makrolar[k]

    return GunlukMakro(
        tarih=hedef_tarih,
        toplam_kalori=round(toplam["kalori"], 1),
        toplam_protein=round(toplam["protein"], 1),
        toplam_karbonhidrat=round(toplam["karbonhidrat"], 1),
        toplam_yag=round(toplam["yag"], 1),
        ogunler=dict(ogunler),
    )


@router.get("/haftalik", response_model=List[HaftalikOzet], summary="Son 7 günün özeti")
def haftalik_ozet(kullanici_id: str = Depends(mevcut_kullanici)):
    bitis = date.today()
    baslangic = bitis - timedelta(days=6)

    sonuc = (
        supabase.table("gunluk_takip")
        .select("*, yemekler(*)")
        .eq("kullanici_id", kullanici_id)
        .gte("tarih", str(baslangic))
        .lte("tarih", str(bitis))
        .execute()
    )

    gun_verileri: dict = defaultdict(lambda: {
        "kalori": 0.0, "protein": 0.0, "karbonhidrat": 0.0, "yag": 0.0, "ogun_sayisi": 0
    })

    for kayit in sonuc.data:
        yemek = kayit["yemekler"]
        makrolar = _makro_hesapla(kayit["miktar_gram"], yemek)
        t = kayit["tarih"]
        gun_verileri[t]["kalori"] += makrolar["kalori"]
        gun_verileri[t]["protein"] += makrolar["protein"]
        gun_verileri[t]["karbonhidrat"] += makrolar["karbonhidrat"]
        gun_verileri[t]["yag"] += makrolar["yag"]
        gun_verileri[t]["ogun_sayisi"] += 1

    ozet = []
    for gun_sayac in range(7):
        t = str(baslangic + timedelta(days=gun_sayac))
        veri = gun_verileri.get(t, {"kalori": 0, "protein": 0, "karbonhidrat": 0, "yag": 0, "ogun_sayisi": 0})
        ozet.append(HaftalikOzet(
            tarih=t,
            toplam_kalori=round(veri["kalori"], 1),
            toplam_protein=round(veri["protein"], 1),
            toplam_karbonhidrat=round(veri["karbonhidrat"], 1),
            toplam_yag=round(veri["yag"], 1),
            ogun_sayisi=veri["ogun_sayisi"],
        ))

    return ozet


@router.delete("/ogun/{kayit_id}", summary="Öğün kaydını sil")
def ogun_sil(kayit_id: str, kullanici_id: str = Depends(mevcut_kullanici)):
    mevcut = (
        supabase.table("gunluk_takip")
        .select("id")
        .eq("id", kayit_id)
        .eq("kullanici_id", kullanici_id)
        .execute()
    )
    if not mevcut.data:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")

    supabase.table("gunluk_takip").delete().eq("id", kayit_id).execute()
    return {"mesaj": "Kayıt silindi"}


# ─── Su Takibi ────────────────────────────────────────────

@router.post("/su-ekle", summary="Su girişi ekle")
def su_ekle(veri: SuEkle, kullanici_id: str = Depends(mevcut_kullanici)):
    tarih = str(veri.tarih) if veri.tarih else str(date.today())

    sonuc = supabase.table("su_takip").insert({
        "kullanici_id": kullanici_id,
        "miktar_ml": veri.miktar_ml,
        "tarih": tarih,
    }).execute()

    if not sonuc.data:
        raise HTTPException(status_code=500, detail="Su girişi kaydedilemedi")
    return sonuc.data[0]


@router.get("/su-gunluk", summary="Günlük su takibi")
def su_gunluk(
    tarih: str = Query(default=None, description="YYYY-MM-DD formatında tarih"),
    kullanici_id: str = Depends(mevcut_kullanici),
):
    hedef_tarih = tarih if tarih else str(date.today())

    sonuc = (
        supabase.table("su_takip")
        .select("*")
        .eq("kullanici_id", kullanici_id)
        .eq("tarih", hedef_tarih)
        .execute()
    )

    toplam_ml = sum(k["miktar_ml"] for k in sonuc.data)
    hedef_ml = 2500

    return {
        "tarih": hedef_tarih,
        "toplam_ml": toplam_ml,
        "hedef_ml": hedef_ml,
        "yuzde": min(100, round(toplam_ml / hedef_ml * 100)),
        "kayitlar": sonuc.data,
    }
