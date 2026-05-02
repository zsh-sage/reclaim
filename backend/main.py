import os
import logging
from dotenv import load_dotenv

# Load .env into os.environ BEFORE LangChain imports so LangSmith tracing activates
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlmodel import Session, select

from core.config import settings
from core.database import engine, init_db
from engine.llm import check_glm_health
from api.rate_limit import limiter
from api.auth import router as auth_router
from api.documents import router as documents_router
from api.notifications import router as notifications_router
from api.payouts import router as payouts_router
from api.employee import router as employee_router
from api.policies import router as policies_router
from api.reimbursements import router as reimbursements_router
from api.drafts import router as drafts_router
from api.departments import router as departments_router
from api.test_ui import router as test_ui_router
from api.push import router as push_router
from api import deps
from core.models import User

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for development purposes)
    # In production, use Alembic migrations
    init_db()
    check_glm_health()
    # Initialize VAPID keys for push notifications
    from core.push_service import init_vapid_keys
    init_vapid_keys()
    yield
    # Clean up on shutdown
    engine.dispose()
    
# ─── Silencing Annoying Health Check Logs ──────────────────────────────────────
class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Suppress access logs for /health
        return record.getMessage().find("/health") == -1

# Filter out uvicorn access logs for health checks
logging.getLogger("uvicorn.access").addFilter(EndpointFilter())
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Set all CORS enabled origins
origins = settings.FRONTEND_URL.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(documents_router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(notifications_router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(policies_router, prefix=f"{settings.API_V1_STR}/policies", tags=["policies"])
app.include_router(reimbursements_router, prefix=f"{settings.API_V1_STR}/reimbursements", tags=["reimbursements"])
app.include_router(payouts_router, prefix=f"{settings.API_V1_STR}/payouts", tags=["payouts"])
app.include_router(employee_router, prefix=f"{settings.API_V1_STR}/employee", tags=["employee"])
app.include_router(departments_router, prefix=f"{settings.API_V1_STR}/departments", tags=["departments"])
app.include_router(drafts_router, prefix=f"{settings.API_V1_STR}/drafts", tags=["drafts"])
# DISPOSABLE — Remove before production
app.include_router(test_ui_router, prefix="/test", tags=["test-ui"])
app.include_router(push_router, prefix=f"{settings.API_V1_STR}/push", tags=["push"])

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
