from pydantic import BaseModel


class DrillingLog(BaseModel):
	depth: float
	note: str
