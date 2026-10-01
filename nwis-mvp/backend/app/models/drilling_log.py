from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DrillingLog(Base):
	__tablename__ = "drilling_logs"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
	timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
	depth: Mapped[float | None] = mapped_column(Float)
	rop: Mapped[float | None] = mapped_column(Float)
	wob: Mapped[float | None] = mapped_column(Float)
	rpm: Mapped[float | None] = mapped_column(Float)
	torque: Mapped[float | None] = mapped_column(Float)
	standpipe_pressure: Mapped[float | None] = mapped_column(Float)
	mud_density: Mapped[float | None] = mapped_column(Float)
	event_label: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

	well = relationship("Well", back_populates="drilling_logs")
