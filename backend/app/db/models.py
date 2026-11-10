import uuid
from datetime import datetime
from sqlalchemy import (
    Column, 
    String, 
    Integer, 
    Text, 
    Boolean, 
    DateTime, 
    ForeignKey
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, default="Systematic Review Project")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    coding_forms = relationship("CodingForm", back_populates="project", cascade="all, delete-orphan")
    records = relationship("ProjectRecord", back_populates="project", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), default="default", index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    total_pages = Column(Integer, default=1)
    title = Column(String, nullable=True)
    author = Column(String, nullable=True)
    status = Column(String, default="uploaded")  # 'uploaded', 'extracted', 'verified'
    file_hash = Column(String, nullable=True, index=True)  # SHA-256 for duplicate detection
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="documents")
    extractions = relationship("Extraction", back_populates="document", cascade="all, delete-orphan")

class CodingForm(Base):
    __tablename__ = "coding_forms"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), default="default", index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    row_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="coding_forms")
    prompts = relationship("Prompt", back_populates="coding_form", cascade="all, delete-orphan", order_by="Prompt.prompt_order")

class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coding_form_id = Column(String, ForeignKey("coding_forms.id"), index=True)
    prompt_order = Column(Integer, default=0)
    text = Column(Text, nullable=False)
    field_name = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    coding_form = relationship("CodingForm", back_populates="prompts")

class Extraction(Base):
    __tablename__ = "extractions"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), index=True)
    prompt_id = Column(Integer, nullable=False)
    prompt_text = Column(Text, nullable=False)
    answer = Column(Text, nullable=False, default="")
    source_quote = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    confidence = Column(String, default="medium")
    is_recorded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document = relationship("Document", back_populates="extractions")

class ProjectRecord(Base):
    __tablename__ = "project_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), default="default", index=True)
    document_name = Column(String, nullable=False)
    row_index = Column(Integer, default=1)
    data_json = Column(Text, nullable=False, default="{}")  # Stored as serialized JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="records")

