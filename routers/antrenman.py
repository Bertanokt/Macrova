from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from utils.supabase_client import supabase
from utils.jwt_utils import mevcut_kullanici
from datetime import date, timedelta
from typing import Optional, List

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class SablonEgzersizi(BaseModel):
    egzersiz_id: str
    sira: int = 1
    hedef_set: Optional[int] = None
    hedef_rep: Optional[str] = None
    hedef_kg: Optional[float] = None


class SablonOlustur(BaseModel):
    isim: str
    aciklama: Optional[str] = None
    egzersizler: List[SablonEgzersizi] = []


class AntrenmaniBaslat(BaseModel):
    sablon_id: Optional[str] = None
    antrenman_adi: Optional[str] = None
    tarih: Optional[str] = None


class SetEkle(BaseModel):
    antrenman_log_id: str
    egzersiz_id: str
    set_no: int
    kg: Optional[float] = None
    tekrar: Optional[int] = None
    tamamlandi: bool = False


class SetGuncelle(BaseModel):
    kg: Optional[float] = None
    tekrar: Optional[int] = None
    tamamlandi: Optional[bool] = None


class AntrenmaniTamamla(BaseModel):
    sure_dakika: Optional[int] = None
    notlar: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/egzersizler", summary="Egzersiz listesi")
def egzersiz_listesi(
    kas_grubu: Optional[str] = Query(None),
    arama: Optional[str] = Query(None),
    kullanici_id: str = Depends(mevcut_kullanici),
):
    q = supabase.table("egzersizler").select("*")
    if kas_grubu:
        q = q.eq("kas_grubu", kas_grubu)
    if arama:
        q = q.ilike("isim", f"%{arama}%")
    return q.order("isim").execute().data


@router.post("/sablon-olustur", summary="Antrenman şablonu oluştur")
def sablon_olustur(veri: SablonOlustur, kullanici_id: str = Depends(mevcut_kullanici)):
    sablon_sonuc = supabase.table("antrenman_sablonlari").insert({
        "kullanici_id": kullanici_id,
        "isim": veri.isim,
        "aciklama": veri.aciklama,
    }).execute()
    if not sablon_sonuc.data:
        raise HTTPException(status_code=500, detail="Şablon oluşturulamadı")
    sablon_id = sablon_sonuc.data[0]["id"]
    for eg in veri.egzersizler:
        supabase.table("sablon_egzersizleri").insert({
            "sablon_id": sablon_id,
            "egzersiz_id": eg.egzersiz_id,
            "sira": eg.sira,
            "hedef_set": eg.hedef_set,
            "hedef_rep": eg.hedef_rep,
            "hedef_kg": eg.hedef_kg,
        }).execute()
    return sablon_sonuc.data[0]


@router.get("/sablonlar", summary="Kullanıcının şablonları")
def sablonlar(kullanici_id: str = Depends(mevcut_kullanici)):
    return (
        supabase.table("antrenman_sablonlari")
        .select("*, sablon_egzersizleri(*, egzersizler(*))")
        .eq("kullanici_id", kullanici_id)
        .order("created_at", desc=True)
        .execute()
    ).data


@router.post("/baslat", summary="Antrenman başlat")
def antrenman_baslat(veri: AntrenmaniBaslat, kullanici_id: str = Depends(mevcut_kullanici)):
    tarih = veri.tarih or str(date.today())
    antrenman_adi = veri.antrenman_adi
    if not antrenman_adi and veri.sablon_id:
        sablon = supabase.table("antrenman_sablonlari").select("isim").eq("id", veri.sablon_id).execute()
        if sablon.data:
            antrenman_adi = sablon.data[0]["isim"]
    sonuc = supabase.table("antrenman_loglari").insert({
        "kullanici_id": kullanici_id,
        "tarih": tarih,
        "sablon_id": veri.sablon_id,
        "antrenman_adi": antrenman_adi or "Antrenman",
    }).execute()
    if not sonuc.data:
        raise HTTPException(status_code=500, detail="Antrenman başlatılamadı")
    log = sonuc.data[0]
    if veri.sablon_id:
        eg_sonuc = (
            supabase.table("sablon_egzersizleri")
            .select("*, egzersizler(*)")
            .eq("sablon_id", veri.sablon_id)
            .order("sira")
            .execute()
        )
        log["sablon_egzersizleri"] = eg_sonuc.data
    return log


@router.post("/set-ekle", summary="Set ekle")
def set_ekle(veri: SetEkle, kullanici_id: str = Depends(mevcut_kullanici)):
    kontrol = (
        supabase.table("antrenman_loglari")
        .select("id")
        .eq("id", veri.antrenman_log_id)
        .eq("kullanici_id", kullanici_id)
        .execute()
    )
    if not kontrol.data:
        raise HTTPException(status_code=404, detail="Antrenman bulunamadı")
    sonuc = supabase.table("set_loglari").insert({
        "antrenman_log_id": veri.antrenman_log_id,
        "egzersiz_id": veri.egzersiz_id,
        "set_no": veri.set_no,
        "kg": veri.kg,
        "tekrar": veri.tekrar,
        "tamamlandi": veri.tamamlandi,
    }).execute()
    if not sonuc.data:
        raise HTTPException(status_code=500, detail="Set kaydedilemedi")
    return sonuc.data[0]


@router.put("/set-guncelle/{set_id}", summary="Set güncelle")
def set_guncelle(set_id: str, veri: SetGuncelle, kullanici_id: str = Depends(mevcut_kullanici)):
    guncelleme = {k: v for k, v in veri.model_dump().items() if v is not None}
    if not guncelleme:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")
    sonuc = supabase.table("set_loglari").update(guncelleme).eq("id", set_id).execute()
    return sonuc.data[0] if sonuc.data else {"mesaj": "Güncellendi"}


@router.post("/bitir/{antrenman_log_id}", summary="Antrenmanı tamamla")
def antrenman_bitir(
    antrenman_log_id: str,
    veri: AntrenmaniTamamla,
    kullanici_id: str = Depends(mevcut_kullanici),
):
    kontrol = (
        supabase.table("antrenman_loglari")
        .select("id")
        .eq("id", antrenman_log_id)
        .eq("kullanici_id", kullanici_id)
        .execute()
    )
    if not kontrol.data:
        raise HTTPException(status_code=404, detail="Antrenman bulunamadı")
    sonuc = supabase.table("antrenman_loglari").update({
        "sure_dakika": veri.sure_dakika,
        "notlar": veri.notlar,
    }).eq("id", antrenman_log_id).execute()
    setler = (
        supabase.table("set_loglari")
        .select("kg, tekrar, tamamlandi")
        .eq("antrenman_log_id", antrenman_log_id)
        .execute()
    )
    toplam_set = len([s for s in setler.data if s.get("tamamlandi")])
    toplam_hacim = sum((s.get("kg") or 0) * (s.get("tekrar") or 0) for s in setler.data)
    return {
        "antrenman": sonuc.data[0] if sonuc.data else {},
        "ozet": {
            "toplam_set": toplam_set,
            "toplam_kg_hacmi": round(toplam_hacim, 1),
            "sure_dakika": veri.sure_dakika,
        },
    }


@router.get("/gecmis", summary="Antrenman geçmişi")
def antrenman_gecmis(
    limit: int = Query(default=10, le=50),
    kullanici_id: str = Depends(mevcut_kullanici),
):
    loglar = (
        supabase.table("antrenman_loglari")
        .select("*")
        .eq("kullanici_id", kullanici_id)
        .order("tarih", desc=True)
        .limit(limit)
        .execute()
    ).data
    for log in loglar:
        setler = (
            supabase.table("set_loglari")
            .select("id, kg, tamamlandi")
            .eq("antrenman_log_id", log["id"])
            .execute()
        ).data
        log["toplam_set"] = len([s for s in setler if s.get("tamamlandi")])
        log["max_kg"] = max((s.get("kg") or 0 for s in setler), default=0)
    return loglar


@router.get("/istatistik", summary="Antrenman istatistikleri")
def antrenman_istatistik(kullanici_id: str = Depends(mevcut_kullanici)):
    bugun = date.today()
    hafta_basi = bugun - timedelta(days=bugun.weekday())
    ay_basi    = bugun.replace(day=1)
    son_30_gun = bugun - timedelta(days=30)

    bu_hafta = (
        supabase.table("antrenman_loglari")
        .select("id, sure_dakika")
        .eq("kullanici_id", kullanici_id)
        .gte("tarih", str(hafta_basi))
        .execute()
    ).data
    bu_ay = (
        supabase.table("antrenman_loglari")
        .select("id")
        .eq("kullanici_id", kullanici_id)
        .gte("tarih", str(ay_basi))
        .execute()
    ).data
    son_30 = (
        supabase.table("antrenman_loglari")
        .select("id, sure_dakika")
        .eq("kullanici_id", kullanici_id)
        .gte("tarih", str(son_30_gun))
        .execute()
    ).data
    return {
        "bu_hafta_antrenman_sayisi": len(bu_hafta),
        "bu_ay_antrenman_sayisi": len(bu_ay),
        "son_30_gun_toplam_sure": sum(a.get("sure_dakika") or 0 for a in son_30),
    }


@router.delete("/sablon-sil/{sablon_id}", summary="Şablon sil")
def sablon_sil(sablon_id: str, kullanici_id: str = Depends(mevcut_kullanici)):
    kontrol = (
        supabase.table("antrenman_sablonlari")
        .select("id")
        .eq("id", sablon_id)
        .eq("kullanici_id", kullanici_id)
        .execute()
    )
    if not kontrol.data:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    supabase.table("sablon_egzersizleri").delete().eq("sablon_id", sablon_id).execute()
    supabase.table("antrenman_sablonlari").delete().eq("id", sablon_id).execute()
    return {"mesaj": "Şablon silindi"}


@router.delete("/sil/{antrenman_log_id}", summary="Antrenman sil")
def antrenman_sil(antrenman_log_id: str, kullanici_id: str = Depends(mevcut_kullanici)):
    kontrol = (
        supabase.table("antrenman_loglari")
        .select("id")
        .eq("id", antrenman_log_id)
        .eq("kullanici_id", kullanici_id)
        .execute()
    )
    if not kontrol.data:
        raise HTTPException(status_code=404, detail="Antrenman bulunamadı")
    supabase.table("set_loglari").delete().eq("antrenman_log_id", antrenman_log_id).execute()
    supabase.table("antrenman_loglari").delete().eq("id", antrenman_log_id).execute()
    return {"mesaj": "Antrenman silindi"}


@router.get("/egzersiz-gecmis/{egzersiz_id}", summary="Egzersiz geçmişi")
def egzersiz_gecmis(egzersiz_id: str, kullanici_id: str = Depends(mevcut_kullanici)):
    loglar = (
        supabase.table("antrenman_loglari")
        .select("id, tarih")
        .eq("kullanici_id", kullanici_id)
        .execute()
    ).data
    if not loglar:
        return []
    log_ids   = [l["id"] for l in loglar]
    log_tarih = {l["id"]: l["tarih"] for l in loglar}
    setler = (
        supabase.table("set_loglari")
        .select("*")
        .eq("egzersiz_id", egzersiz_id)
        .in_("antrenman_log_id", log_ids)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    ).data
    gecmis: dict = {}
    for s in setler:
        tarih = log_tarih.get(s["antrenman_log_id"], "")
        if tarih not in gecmis:
            gecmis[tarih] = {"tarih": tarih, "setler": [], "max_kg": 0}
        gecmis[tarih]["setler"].append(s)
        gecmis[tarih]["max_kg"] = max(gecmis[tarih]["max_kg"], s.get("kg") or 0)
    return sorted(gecmis.values(), key=lambda x: x["tarih"], reverse=True)
