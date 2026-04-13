from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers.routers_applications import router as applications_router
from routers.routers_gmail import router as gmail_router
from routers.routers_scan import router as scan_router
from gmail_oauth import router as gmail_oauth_router

app = FastAPI(
    title="ApplyWisely API",
    description="Application tracker and Gmail agent.",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications_router)
app.include_router(scan_router)
app.include_router(gmail_router)
app.include_router(gmail_oauth_router)


@app.on_event("startup")
def on_startup():
    init_db()
    print("✓ Database tables created / verified")


@app.get("/health")
def health():
    return {"api": "ok"}


@app.get("/")
def root():
    return {"message": "ApplyWisely API — visit /docs"}
