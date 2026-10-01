from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Formation(Base):
	__tablename__ = "formations"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
	formation_name: Mapped[str] = mapped_column(String, nullable=False)
	top_depth: Mapped[float | None] = mapped_column(Float)
	bottom_depth: Mapped[float | None] = mapped_column(Float)
	lithology: Mapped[str | None] = mapped_column(String)
	pressure: Mapped[float | None] = mapped_column(Float)
	temperature: Mapped[float | None] = mapped_column(Float)

	well = relationship("Well", back_populates="formations")
