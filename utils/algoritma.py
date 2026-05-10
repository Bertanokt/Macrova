from typing import Optional
from datetime import date, timedelta


# --- Harris-Benedict BMR ---

def bmr_hesapla(cinsiyet: str, kilo_kg: float, boy_cm: float, yas: int) -> float:
    """Harris-Benedict denklemi ile bazal metabolizma hızı (kcal/gün)."""
    if cinsiyet == "erkek":
        return 88.362 + (13.397 * kilo_kg) + (4.799 * boy_cm) - (5.677 * yas)
    else:
        return 447.593 + (9.247 * kilo_kg) + (3.098 * boy_cm) - (4.330 * yas)


# Aktivite katsayıları
AKTIVITE_KATSAYI = {
    "sedanter": 1.2,       # Masa başı iş, egzersiz yok
    "hafif_aktif": 1.375,  # Haftada 1-3 gün hafif egzersiz
    "orta_aktif": 1.55,    # Haftada 3-5 gün orta egzersiz
    "cok_aktif": 1.725,    # Haftada 6-7 gün yoğun egzersiz
    "ekstra_aktif": 1.9,   # Çok yoğun egzersiz + fiziksel iş
}


def tdee_hesapla(bmr: float, aktivite_seviyesi: str) -> float:
    """Toplam günlük enerji harcaması (kcal/gün)."""
    katsayi = AKTIVITE_KATSAYI.get(aktivite_seviyesi, 1.2)
    return bmr * katsayi


def kalori_hedef_hesapla(tdee: float, hedef: str) -> float:
    """Hedefe göre günlük kalori hedefi."""
    if hedef == "cut":
        return tdee - 500    # Haftada ~0.5 kg kayıp
    elif hedef == "aggressive_cut":
        return tdee - 750    # Haftada ~0.75 kg kayıp, sert diyet
    elif hedef == "bulk":
        return tdee + 300    # Yavaş ve temiz kilo alımı
    elif hedef == "dirty_bulk":
        return tdee + 600    # Hızlı kilo alımı
    else:  # koru
        return tdee


def makro_dagilim_hesapla(kalori_hedef: float, kilo_kg: float) -> dict:
    """
    Makro besin dağılımı hesapla.
    Protein: 2g/kg vücut ağırlığı
    Yağ: kalorilerin %25'i
    Karbonhidrat: kalan kalori
    """
    protein_g = kilo_kg * 2.0
    protein_kal = protein_g * 4

    yag_kal = kalori_hedef * 0.25
    yag_g = yag_kal / 9

    karb_kal = kalori_hedef - protein_kal - yag_kal
    karb_g = max(0, karb_kal / 4)

    return {
        "protein_hedef": round(protein_g, 1),
        "yag_hedef": round(yag_g, 1),
        "karbonhidrat_hedef": round(karb_g, 1),
        "kalori_hedef": round(kalori_hedef, 0),
    }


def tam_hedef_hesapla(
    cinsiyet: str,
    kilo_kg: float,
    boy_cm: float,
    yas: int,
    aktivite_seviyesi: str,
    hedef: str,
) -> dict:
    """Kullanıcı profilinden makro hedeflerini tek seferde hesapla."""
    bmr = bmr_hesapla(cinsiyet, kilo_kg, boy_cm, yas)
    tdee = tdee_hesapla(bmr, aktivite_seviyesi)
    kalori = kalori_hedef_hesapla(tdee, hedef)
    makrolar = makro_dagilim_hesapla(kalori, kilo_kg)
    return {**makrolar, "bmr": round(bmr, 1), "tdee": round(tdee, 1)}


# --- Adaptif TDEE ---

def adaptif_tdee_hesapla(
    mevcut_tdee: float,
    kilo_kayitlari: list,  # [{"tarih": date, "kilo_kg": float}]
    kalori_kayitlari: list,  # [{"tarih": date, "toplam_kalori": float}]
) -> Optional[float]:
    """
    Son 2 haftanın gerçek verisine göre TDEE'yi güncelle.
    7700 kcal = 1 kg kural kullanılır.
    Yeterli veri yoksa None döner.
    """
    if len(kilo_kayitlari) < 2 or len(kalori_kayitlari) < 7:
        return None

    # Kilo değişimi hesapla (en eski vs en yeni)
    sirali_kilo = sorted(kilo_kayitlari, key=lambda x: x["tarih"])
    ilk_kilo = sirali_kilo[0]["kilo_kg"]
    son_kilo = sirali_kilo[-1]["kilo_kg"]
    gun_farki = (sirali_kilo[-1]["tarih"] - sirali_kilo[0]["tarih"]).days

    if gun_farki < 7:
        return None

    # Günlük ortalama kalori alımı
    ort_kalori = sum(k["toplam_kalori"] for k in kalori_kayitlari) / len(kalori_kayitlari)

    # Gerçek kilo değişiminin kalori karşılığı (günlük)
    gercek_kilo_degisim = son_kilo - ilk_kilo
    gercek_kalori_dengesi_gunluk = (gercek_kilo_degisim * 7700) / gun_farki

    # Beklenen denge = ort_kalori - tdee → tdee = ort_kalori - gercek_denge
    hesaplanan_tdee = ort_kalori - gercek_kalori_dengesi_gunluk

    # Mevcut TDEE ile ağırlıklı ortalama (ani değişimleri yumuşat)
    yeni_tdee = (mevcut_tdee * 0.6) + (hesaplanan_tdee * 0.4)

    # Makul sınırlar içinde tut
    yeni_tdee = max(1000, min(6000, yeni_tdee))
    return round(yeni_tdee, 1)
