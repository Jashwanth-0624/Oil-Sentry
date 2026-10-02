import threading
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.alerts import router as alerts_router
from app.api.rag import router as rag_router
from app.api.reports import router as reports_router
from app.api.risk import router as risk_router
from app.api.similarity import router as similarity_router
from app.api.websocket import router as websocket_router
from app.api.intelligence import router as intelligence_router
from app.api.wells import router as wells_router
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app import models

app = FastAPI(title="eRTMAC-NWIS API")
raw_frontend_url = settings.frontend_url or "http://localhost:5173"
frontend_url_clean = raw_frontend_url.rstrip("/")

allowed_origins = {
	frontend_url_clean,
	f"{frontend_url_clean}/",
	"https://oil-sentry.vercel.app",
	"https://oil-sentry.vercel.app/",
	"http://localhost:5173",
	"http://127.0.0.1:5173",
	"http://localhost:3000",
	"http://127.0.0.1:3000",
}
for url in raw_frontend_url.split(","):
	u = url.strip().rstrip("/")
	if u:
		allowed_origins.add(u)
		allowed_origins.add(f"{u}/")

app.add_middleware(
	CORSMiddleware,
	allow_origins=list(allowed_origins),
	allow_origin_regex=r"https://.*\.vercel\.app",
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(wells_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(similarity_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(rag_router, prefix="/api")
app.include_router(intelligence_router, prefix="/api")
app.include_router(websocket_router)



def _background_seed_if_empty() -> None:
	try:
		from sqlalchemy.orm import Session
		from app.models.well import Well
		with Session(engine) as session:
			well_count = session.query(Well).count()
			if well_count == 0:
				print("No wells found in database. Starting background dataset loading...")
				try:
					from data.load_data import main as seed_data
					seed_data()
					print("Background dataset loading completed successfully.")
				except Exception as seed_err:
					print(f"Background dataset auto-seeding error: {seed_err}")
			else:
				print(f"Database already populated with {well_count} wells.")
	except Exception as check_err:
		print(f"Database readiness check notice: {check_err}")


@app.on_event("startup")
def create_tables() -> None:
	if engine is not None:
		try:
			with engine.begin() as connection:
				connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
		except Exception as postgis_err:
			print(f"PostGIS extension notice (may already exist or managed by cloud provider): {postgis_err}")

		try:
			with engine.begin() as connection:
				connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
		except Exception:
			# pgvector is optional and may be managed by cloud provider.
			pass
		Base.metadata.create_all(bind=engine)

		# Run data seeding in a background daemon thread so Uvicorn opens the port INSTANTLY!
		threading.Thread(target=_background_seed_if_empty, daemon=True).start()



@app.get("/health")
def health() -> dict[str, str]:
	return {"status": "healthy"}


@app.get("/db-test")
def database_test(database: Session = Depends(get_db)) -> dict[str, str]:
	try:
		database.execute(text("SELECT 1"))
		return {"database": "connected"}
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Database connection failed: {exc}") from exc


candidate_paths = [
	Path(__file__).resolve().parents[2] / "frontend" / "dist",
	Path(__file__).resolve().parents[3] / "nwis-mvp" / "frontend" / "dist",
	Path(__file__).resolve().parents[3] / "frontend" / "dist",
]
frontend_dist = next((p for p in candidate_paths if (p / "index.html").exists()), candidate_paths[0])

if (frontend_dist / "index.html").exists():
	if (frontend_dist / "assets").exists():
		app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend_assets")

	@app.get("/")
	def serve_index() -> FileResponse:
		return FileResponse(frontend_dist / "index.html")

	@app.get("/{full_path:path}")
	async def serve_spa(full_path: str = ""):
		if full_path.startswith("api") or full_path.startswith("ws") or full_path in ("health", "db-test", "docs", "openapi.json"):
			raise HTTPException(status_code=404, detail="Not Found")
		target_file = frontend_dist / full_path
		if full_path and target_file.is_file():
			return FileResponse(target_file)
		return FileResponse(frontend_dist / "index.html")
else:
	@app.get("/")
	def root() -> dict[str, str]:
		return {"message": "NWIS API is running"}
