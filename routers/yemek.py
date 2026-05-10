import httpx
from fastapi import APIRouter, HTTPException, Depends, Query
from models.schemas import YemekEkle, YemekDetay, YemekGuncelle
from utils.supabase_client import supabase
from utils.jwt_utils import mevcut_kullanici
from typing import List

router = APIRouter()

# ── İngilizce → Türkçe çeviri sözlüğü ─────────────────────────────────────
EN_TR: dict[str, str] = {
    # Tavuk
    "chicken": "tavuk", "chicken breast": "tavuk göğsü",
    "chicken thigh": "tavuk but", "chicken leg": "tavuk but",
    "chicken wing": "tavuk kanadı",
    # Dana / Kırmızı et
    "beef": "dana", "ground beef": "dana kıyma", "minced beef": "dana kıyma",
    "steak": "biftek", "veal": "dana",
    # Kuzu
    "lamb": "kuzu", "minced lamb": "kuzu kıyma", "ground lamb": "kuzu kıyma",
    # Hindi
    "turkey": "hindi", "turkey breast": "hindi göğsü",
    # Balık
    "salmon": "somon", "tuna": "ton", "tuna fish": "ton balığı",
    "fish": "balık", "sea bass": "levrek", "sea bream": "çipura",
    # Yumurta
    "egg": "yumurta", "eggs": "yumurta",
    "egg white": "yumurta akı", "egg yolk": "yumurta sarısı",
    # Tahıl
    "rice": "pirinç", "pasta": "makarna", "noodle": "makarna",
    "bulgur": "bulgur", "oat": "yulaf", "oats": "yulaf",
    "bread": "ekmek", "flour": "un", "wheat": "buğday",
    # Baklagil
    "lentil": "mercimek", "lentils": "mercimek",
    "chickpea": "nohut", "chickpeas": "nohut",
    "bean": "fasulye", "beans": "fasulye",
    # Süt ürünleri
    "milk": "süt", "yogurt": "yoğurt", "yoghurt": "yoğurt",
    "cheese": "peynir", "butter": "tereyağı", "cream": "krema",
    "cottage cheese": "lor peyniri",
    # Meyve / Sebze
    "apple": "elma", "banana": "muz", "orange": "portakal",
    "strawberry": "çilek", "grape": "üzüm", "watermelon": "karpuz",
    "tomato": "domates", "cucumber": "salatalık", "potato": "patates",
    "carrot": "havuç", "spinach": "ıspanak", "broccoli": "brokoli",
    "onion": "soğan", "garlic": "sarımsak", "pepper": "biber",
    # Yağ
    "olive oil": "zeytinyağı", "oil": "yağ",
    # Pişirme şekilleri (arama destekli)
    "raw": "çiğ", "cooked": "pişmiş", "boiled": "haşlanmış",
    "grilled": "ızgara", "baked": "fırın", "fried": "kızarmış",
    # Diğer
    "protein powder": "protein tozu", "whey": "whey",
    "almond": "badem", "walnut": "ceviz", "hazelnut": "fındık",
    "honey": "bal", "sugar": "şeker", "salt": "tuz",
}


def _en_tr_cevir(q: str) -> str | None:
    """İngilizce arama terimini Türkçeye çevirir. Değişiklik yoksa None döner."""
    q_lower = q.strip().lower()
    # Tam ifade eşleşmesi (öncelikli)
    if q_lower in EN_TR:
        return EN_TR[q_lower]
    # Kelime kelime çeviri (kısmi eşleşme)
    kelimeler = q_lower.split()
    cevirilen = [EN_TR.get(k, k) for k in kelimeler]
    sonuc = " ".join(cevirilen)
    return sonuc if sonuc != q_lower else None


@router.get("/ara", response_model=List[YemekDetay], summary="Yemek ara")
def yemek_ara(
    q: str = Query(..., min_length=2, description="Arama terimi"),
    kullanici_id: str = Depends(mevcut_kullanici),
):
    arama_terimleri = [q.strip()]

    # İngilizce terim ise Türkçe karşılığını da ara
    cevrilmis = _en_tr_cevir(q)
    if cevrilmis:
        arama_terimleri.append(cevrilmis)

    gorülen_idler: set[str] = set()
    tum_sonuclar: list[dict] = []

    for terim in arama_terimleri:
        # isim VE isim_en kolonlarında ara
        sonuc = (
            supabase.table("yemekler")
            .select("*")
            .or_(f"isim.ilike.%{terim}%,isim_en.ilike.%{terim}%")
            .limit(50)
            .execute()
        )
        for item in sonuc.data:
            if item["id"] not in gorülen_idler:
                gorülen_idler.add(item["id"])
                tum_sonuclar.append(item)

    q_lower = q.strip().lower()
    tr_lower = (cevrilmis or "").lower()
    siralı = sorted(
        tum_sonuclar,
        key=lambda x: (
            not (
                x["isim"].lower().startswith(q_lower)
                or x["isim"].lower().startswith(tr_lower)
                or (x.get("isim_en") or "").lower().startswith(q_lower)
            ),
            x["isim"].lower(),
        ),
    )
    return siralı[:20]


@router.get("/barkod/{barkod_no}", response_model=YemekDetay, summary="Barkod ile yemek ara")
def barkod_ara(barkod_no: str, kullanici_id: str = Depends(mevcut_kullanici)):
    # ── 1. Kendi DB'ye bak (HTTP/2 stale bağlantı için 2 deneme) ──────
    for deneme in range(2):
        try:
            sonuc = supabase.table("yemekler").select("*").eq("barkod", barkod_no).execute()
            if sonuc.data:
                return sonuc.data[0]
            break  # sorgu başarılı ama kayıt yok → Open Food Facts'e geç
        except Exception:
            if deneme == 1:
                pass  # 2. denemede de hata → yine de Open Food Facts'e geç

    # ── 2. Open Food Facts API'sine sor (ücretsiz, kayıt gerektirmez) ─
    try:
        yanit = httpx.get(
            f"https://world.openfoodfacts.org/api/v0/product/{barkod_no}.json",
            timeout=10,
        )
        veri = yanit.json()

        if veri.get("status") != 1:
            raise HTTPException(status_code=404, detail="Bu barkoda ait ürün bulunamadı")

        urun = veri["product"]
        besin = urun.get("nutriments", {})

        # Türkçe isim varsa onu al, yoksa İngilizce
        isim = (
            urun.get("product_name_tr")
            or urun.get("product_name")
            or "Bilinmeyen Ürün"
        )
        # İngilizce ismi ayrı sakla
        isim_en = urun.get("product_name_en") or urun.get("product_name") or None
        if isim_en == isim:
            isim_en = None  # Aynıysa kaydetme

        # ─── Kalori ─────────────────────────────────────────────────────────
        # energy-kcal_100g  → zaten kcal, direkt kullan
        # energy-kj_100g / energy_100g → kilojoule, 4.184'e bölerek çevir
        kalori_kcal = besin.get("energy-kcal_100g") or besin.get("energy-kcal")
        if kalori_kcal is not None:
            kalori = round(float(kalori_kcal or 0), 1)
        else:
            kalori_kj = (
                besin.get("energy-kj_100g")
                or besin.get("energy-kj")
                or besin.get("energy_100g")   # OFF'ta bu kJ cinsinden!
                or besin.get("energy")
                or 0
            )
            kalori = round(float(kalori_kj) / 4.184, 1)

        # ─── Diğer makrolar (_100g yoksa suffix'siz alanı dene) ─────────────
        protein = float(besin.get("proteins_100g") or besin.get("proteins") or 0)
        karb    = float(besin.get("carbohydrates_100g") or besin.get("carbohydrates") or 0)
        yag     = float(besin.get("fat_100g") or besin.get("fat") or 0)

        yemek_veri = {
            "isim": isim,
            "isim_en": isim_en,
            "kalori_100g": kalori,
            "protein_100g": protein,
            "karbonhidrat_100g": karb,
            "yag_100g": yag,
            "barkod": barkod_no,
            "kaynak": "sistem",
        }
        kayit = supabase.table("yemekler").insert(yemek_veri).execute()
        if kayit.data:
            return kayit.data[0]

        raise HTTPException(status_code=500, detail="Ürün kaydedilemedi")

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Bu barkoda ait ürün bulunamadı")


@router.get("/{yemek_id}", response_model=YemekDetay, summary="Yemek detayı")
def yemek_detay(yemek_id: str, kullanici_id: str = Depends(mevcut_kullanici)):
    sonuc = supabase.table("yemekler").select("*").eq("id", yemek_id).execute()
    if not sonuc.data:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")
    return sonuc.data[0]


@router.put("/{yemek_id}", response_model=YemekDetay, summary="Yemek makrolarını güncelle")
def yemek_guncelle(yemek_id: str, veri: YemekGuncelle, kullanici_id: str = Depends(mevcut_kullanici)):
    guncelleme = {k: v for k, v in veri.model_dump().items() if v is not None}
    if not guncelleme:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")
    sonuc = supabase.table("yemekler").update(guncelleme).eq("id", yemek_id).execute()
    if not sonuc.data:
        raise HTTPException(status_code=404, detail="Yemek bulunamadı")
    return sonuc.data[0]


@router.post("/ekle", response_model=YemekDetay, summary="Yeni yemek ekle")
def yemek_ekle(veri: YemekEkle, kullanici_id: str = Depends(mevcut_kullanici)):
    mevcut = supabase.table("yemekler").select("id").ilike("isim", veri.isim).execute()
    if mevcut.data:
        raise HTTPException(status_code=400, detail="Bu isimde bir yemek zaten mevcut")

    yemek_veri = {**veri.model_dump(), "kaynak": "kullanici"}
    sonuc = supabase.table("yemekler").insert(yemek_veri).execute()
    if not sonuc.data:
        raise HTTPException(status_code=500, detail="Yemek eklenemedi")
    return sonuc.data[0]
