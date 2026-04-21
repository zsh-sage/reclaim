from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from core.config import settings
from core.database import engine, init_db
from api.auth import router as auth_router
from api import deps
from core.models import User

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for development purposes)
    # In production, use Alembic migrations
    init_db()
    yield
    # Clean up on shutdown
    engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

@app.get("/")
async def root():
    return {"message": "Welcome to GLM SMART API"}

@app.get("/health")
def health_check(db: Session = Depends(deps.get_db)):
    try:
        # Try to execute a simple query to verify DB connection
        db.exec(select(User)).first()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
