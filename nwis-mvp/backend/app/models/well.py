from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.core.database import Base


class Well(Base):
	__tablename__ = "wells"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	well_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
	field: Mapped[str | None] = mapped_column(String)
	latitude: Mapped[float | None] = mapped_column(Float)
	longitude: Mapped[float | None] = mapped_column(Float)
	total_depth: Mapped[float | None] = mapped_column(Float)
	well_type: Mapped[str | None] = mapped_column(String)
	status: Mapped[str | None] = mapped_column(String)
	# PostGIS stores POINT coordinates in longitude/latitude order (SRID 4326).
	location = mapped_column(Geometry("POINT", srid=4326, spatial_index=True))

	formations = relationship("Formation", back_populates="well", cascade="all, delete-orphan")
	drilling_logs = relationship("DrillingLog", back_populates="well", cascade="all, delete-orphan")
	events = relationship("Event", back_populates="well", cascade="all, delete-orphan")
