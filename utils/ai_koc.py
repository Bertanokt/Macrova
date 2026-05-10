import anthropic
import os
import json
from datetime import date, timedelta

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY ortam değişkeni ayarlanmamış")
        _client = anthropic.Anthropic(api_key=key)
    return _client


MODEL = "claude-haiku-4-5"

HEDEF_MAP = {
    "cut":            "kilo vermek (-500 kcal)",
    "aggressive_cut": "hızlı kilo vermek (-750 kcal)",
    "koru":           "kiloyu korumak",
    "bulk":           "kilo almak (+300 kcal)",
    "dirty_bulk":     "hızlı kilo almak (+600 kcal)",
}


# ── Veri Toplama ─────────────────────────────────────────────────────────────

async def kullanici_verisi_topla(kullanici_id: str, supabase) -> dict:
    bugun       = date.today()
    on_dort_gun = str(bugun - timedelta(days=14))
    yedi_gun    = str(bugun - timedelta(days=7))

    # Besin takibi
    takip = (
        supabase.table("gunluk_takip")
        .select("tarih, miktar_gram, yemekler(kalori_100g, protein_100g)")
        .eq("kullanici_id", kullanici_id)
        .gte("tarih", on_dort_gun)
        .execute()
    ).data

    gun_kalori: dict = {}
    gun_protein: dict = {}
    for k in takip:
        t    = k["tarih"]
        oran = k["miktar_gram"] / 100
        y    = k.get("yemekler") or {}
        gun_kalori[t]  = gun_kalori.get(t, 0)  + (y.get("kalori_100g", 0)  * oran)
        gun_protein[t] = gun_protein.get(t, 0) + (y.get("protein_100g", 0) * oran)

    ort_kalori  = round(sum(gun_kalori.values())  / max(len(gun_kalori), 1))
    ort_protein = round(sum(gun_protein.values()) / max(len(gun_protein), 1))

    # Kilo geçmişi
    kilolar = (
        supabase.table("kilo_takip")
        .select("kilo_kg, tarih")
        .eq("kullanici_id", kullanici_id)
        .gte("tarih", on_dort_gun)
        .order("tarih")
        .execute()
    ).data

    kilo_degisim = 0.0
    son_kilo_tarihi = None
    if kilolar:
        son_kilo_tarihi = kilolar[-1]["tarih"]
        if len(kilolar) >= 2:
            kilo_degisim = round(kilolar[-1]["kilo_kg"] - kilolar[0]["kilo_kg"], 2)

    # Profil + makro hedef
    profil = (supabase.table("kullanicilar").select("hedef").eq("id", kullanici_id).execute()).data
    makro  = (supabase.table("makro_hedefler").select("kalori_hedef, protein_hedef").eq("kullanici_id", kullanici_id).execute()).data

    # Antrenman
    antrenmanlar = (
        supabase.table("antrenman_loglari")
        .select("tarih, antrenman_adi, sure_dakika")
        .eq("kullanici_id", kullanici_id)
        .gte("tarih", yedi_gun)
        .execute()
    ).data

    # Son 5 gün besin takibi
    son_5_gun = [(bugun - timedelta(days=i)).isoformat() for i in range(5)]
    takip_yapilan_gunler = len([g for g in son_5_gun if g in gun_kalori])

    return {
        "hedef":             profil[0]["hedef"] if profil else "koru",
        "kalori_hedef":      makro[0]["kalori_hedef"] if makro else 2000,
        "protein_hedef":     makro[0]["protein_hedef"] if makro else 150,
        "ort_kalori":        ort_kalori,
        "ort_protein":       ort_protein,
        "kilo_degisim":      kilo_degisim,
        "antrenman_sayisi":  len(antrenmanlar),
        "son_kilo_tarihi":   son_kilo_tarihi,
        "takip_gun_sayisi":  len(gun_kalori),
        "takip_yapilan_son_5_gun": takip_yapilan_gunler,
    }


# ── Analiz Fonksiyonları ─────────────────────────────────────────────────────

def _json_parse(metin: str) -> dict:
    """Claude yanıtından JSON çıkar."""
    metin = metin.strip()
    if "```json" in metin:
        metin = metin.split("```json")[1].split("```")[0].strip()
    elif "```" in metin:
        metin = metin.split("```")[1].split("```")[0].strip()
    # JSON başlangıcını bul
    start = metin.find("{")
    end   = metin.rfind("}") + 1
    if start != -1 and end > start:
        metin = metin[start:end]
    return json.loads(metin)


def beslenme_analizi_yap(kullanici_verisi: dict) -> str:
    hedef_aciklama = HEDEF_MAP.get(kullanici_verisi["hedef"], kullanici_verisi["hedef"])
    prompt = f"""Sen Macrova uygulamasının Türkçe konuşan AI fitness ve beslenme koçusun.

Kullanıcı verileri:
- Hedef: {hedef_aciklama}
- Günlük kalori hedefi: {kullanici_verisi['kalori_hedef']} kcal
- Son 7 gün ortalama kalori: {kullanici_verisi['ort_kalori']} kcal
- Son 7 gün ortalama protein: {kullanici_verisi['ort_protein']}g (hedef: {kullanici_verisi['protein_hedef']}g)
- Son 14 gün kilo değişimi: {kullanici_verisi['kilo_degisim']} kg
- 14 günde besin takibi yapılan gün: {kullanici_verisi['takip_gun_sayisi']}

Kısa (2-3 cümle), samimi, motive edici Türkçe analiz yap. Emoji kullanabilirsin.
JSON formatında döndür: {{"tip": "beslenme", "mesaj": "...", "oncelik": "yuksek/orta/dusuk"}}"""

    resp = _get_client().messages.create(
        model=MODEL, max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text


def antrenman_analizi_yap(kullanici_verisi: dict) -> str:
    prompt = f"""Sen Macrova uygulamasının Türkçe konuşan AI fitness koçusun.

Kullanıcı bu hafta {kullanici_verisi['antrenman_sayisi']} antrenman yaptı.
Hedefi: {HEDEF_MAP.get(kullanici_verisi['hedef'], kullanici_verisi['hedef'])}

Bu bilgiye göre kısa bir değerlendirme yap.
JSON formatında döndür: {{"tip": "antrenman", "mesaj": "...", "oncelik": "yuksek/orta/dusuk"}}"""

    resp = _get_client().messages.create(
        model=MODEL, max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text


def sohbet_cevapla(mesaj: str, kullanici_verisi: dict, gecmis_mesajlar: list) -> str:
    sistem = f"""Sen Macrova uygulamasının Türkçe konuşan AI fitness ve beslenme koçusun.

Kullanıcının mevcut durumu:
- Hedef: {HEDEF_MAP.get(kullanici_verisi.get('hedef', ''), kullanici_verisi.get('hedef', 'bilinmiyor'))}
- Günlük kalori hedefi: {kullanici_verisi.get('kalori_hedef', 0)} kcal
- Son 7 gün ort. kalori: {kullanici_verisi.get('ort_kalori', 0)} kcal
- Son 7 gün ort. protein: {kullanici_verisi.get('ort_protein', 0)}g
- Son 14 gün kilo değişimi: {kullanici_verisi.get('kilo_degisim', 0)} kg
- Bu hafta antrenman: {kullanici_verisi.get('antrenman_sayisi', 0)}

Kısa, net, pratik Türkçe cevaplar ver. Maksimum 3-4 cümle. Emoji kullanabilirsin."""

    mesajlar = (gecmis_mesajlar or [])[-10:] + [{"role": "user", "content": mesaj}]
    resp = _get_client().messages.create(
        model=MODEL, max_tokens=500,
        system=sistem,
        messages=mesajlar,
    )
    return resp.content[0].text


# ── Günlük Otomatik Analiz ───────────────────────────────────────────────────

async def gunluk_analiz_calistir(kullanici_id: str, supabase) -> list:
    """Günde 1 kez çalışır; orta/yüksek öncelikli bulgular kaydedilir."""
    bugun = str(date.today())

    # Bugün zaten analiz yapıldı mı?
    son = (
        supabase.table("ai_oneriler")
        .select("id")
        .eq("kullanici_id", kullanici_id)
        .gte("created_at", f"{bugun}T00:00:00")
        .execute()
    ).data
    if son:
        return []

    try:
        veri = await kullanici_verisi_topla(kullanici_id, supabase)
        kaydedilenler = []

        for analiz_fn in [beslenme_analizi_yap, antrenman_analizi_yap]:
            try:
                sonuc = _json_parse(analiz_fn(veri))
                if sonuc.get("oncelik") in ("yuksek", "orta") and sonuc.get("mesaj"):
                    kayit = supabase.table("ai_oneriler").insert({
                        "kullanici_id": kullanici_id,
                        "oneri_tipi":   sonuc.get("tip", "genel"),
                        "mesaj":        sonuc["mesaj"],
                    }).execute()
                    if kayit.data:
                        kaydedilenler.append(kayit.data[0])
            except Exception:
                pass  # Tek analiz başarısız olsa devam et

        return kaydedilenler
    except Exception:
        return []
