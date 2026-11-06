import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "aide_studio.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models to ensure they are registered with Base.metadata
    from app.db import models  # noqa
    Base.metadata.create_all(bind=engine)
    
    # Ensure a default project exists
    db = SessionLocal()
    try:
        default_proj = db.query(models.Project).filter_by(id="default").first()
        if not default_proj:
            default_proj = models.Project(
                id="default",
                name="Systematic Review Project",
                description="Default literature extraction workspace"
            )
            db.add(default_proj)
            db.commit()
    finally:
        db.close()

