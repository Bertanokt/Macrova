import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from utils.supabase_client import supabase
from utils.jwt_utils import mevcut_kullanici
from utils import ai_koc
from typing import List

router = APIRouter()


class SohbetMesaj(BaseModel):
    mesaj: str
    gecmis: List[dict] = []


@router.post("/analiz-calistir", summary="Günlük AI analizi tetikle")
async def analiz_calistir(kullanici_id: str = Depends(mevcut_kullanici)):
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="AI servisi şu an kullanılamıyor")
    oneriler = await ai_koc.gunluk_analiz_calistir(kullanici_id, supabase)
    return {"oneriler": oneriler, "sayi": len(oneriler)}


@router.get("/oneriler", summary="Okunmamış öneriler")
def oneriler_getir(kullanici_id: str = Depends(mevcut_kullanici)):
    return (
        supabase.table("ai_oneriler")
        .select("*")
        .eq("kullanici_id", kullanici_id)
        .eq("okundu", False)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    ).data


@router.put("/oneri-okundu/{oneri_id}", summary="Öneriyi okundu işaretle")
def oneri_okundu(oneri_id: str, kullanici_id: str = Depends(mevcut_kullanici)):
    supabase.table("ai_oneriler").update({"okundu": True}).eq(
        "id", oneri_id
    ).eq("kullanici_id", kullanici_id).execute()
    return {"mesaj": "Okundu olarak işaretlendi"}


@router.post("/sohbet", summary="AI koç ile sohbet")
async def sohbet(veri: SohbetMesaj, kullanici_id: str = Depends(mevcut_kullanici)):
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="AI servisi şu an kullanılamıyor")
    try:
        kullanici_verisi = await ai_koc.kullanici_verisi_topla(kullanici_id, supabase)
        cevap = ai_koc.sohbet_cevapla(veri.mesaj, kullanici_verisi, veri.gecmis)
        return {"cevap": cevap}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="AI yanıt oluşturulamadı. Tekrar deneyin.")
