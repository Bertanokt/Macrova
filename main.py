import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.limiter import limiter

load_dotenv()

from routers import auth, kullanici, yemek, takip

app = FastAPI(
    title="Macrova API",
    description="Türkiye pazarı için beslenme takip uygulaması backend",
    version="1.0.0",
    docs_url="/docs"  if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
)

# ── Rate Limiter ────────────────────────────────────────────────────────────
app.state.limiter = limiter


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Çok fazla istek gönderdiniz. Lütfen bekleyin."},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# ── Security Headers Middleware ─────────────────────────────────────────────
@app.middleware("http")
async def guvenlik_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"]        = "DENY"
    response.headers["X-XSS-Protection"]       = "1; mode=block"
    response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"]   = "default-src 'self'"
    return response

# ── CORS ────────────────────────────────────────────────────────────────────
if os.getenv("ENVIRONMENT") == "production":
    _raw     = os.getenv("ALLOWED_ORIGINS", "https://macrova.app")
    _origins = [o.strip() for o in _raw.split(",") if o.strip()]
else:
    _origins = ["*"]   # Development'ta wildcard

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router'lar ──────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/auth",      tags=["Auth"])
app.include_router(kullanici.router, prefix="/kullanici", tags=["Kullanici"])
app.include_router(yemek.router,     prefix="/yemek",     tags=["Yemek"])
app.include_router(takip.router,     prefix="/takip",     tags=["Takip"])


@app.get("/", tags=["Genel"])
def kok():
    return {"mesaj": "Macrova API çalışıyor", "versiyon": "1.0.0"}


@app.get("/saglik", tags=["Genel"])
def saglik_kontrol():
    return {"durum": "tamam"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
