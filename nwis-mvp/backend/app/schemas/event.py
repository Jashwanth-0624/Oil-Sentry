from pydantic import BaseModel


class HistoricalEvent(BaseModel):
	event: str
	status: str
