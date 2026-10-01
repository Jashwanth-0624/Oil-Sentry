from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Event(Base):
	__tablename__ = "events"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
	depth: Mapped[float | None] = mapped_column(Float)
	formation: Mapped[str | None] = mapped_column(String)
	event_type: Mapped[str] = mapped_column(String, nullable=False)
	severity: Mapped[str] = mapped_column(String, nullable=False)
	description: Mapped[str | None] = mapped_column(Text)
	cause: Mapped[str | None] = mapped_column(Text)
	mitigation: Mapped[str | None] = mapped_column(Text)
	outcome: Mapped[str | None] = mapped_column(Text)

	well = relationship("Well", back_populates="events")
