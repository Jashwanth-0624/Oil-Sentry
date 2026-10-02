FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered output for live logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app:/app/backend

WORKDIR /app

# Install system dependencies for PostgreSQL, compilation, and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy all application packages (backend, ml models, rag knowledge base, dataset)
COPY backend/ ./backend/
COPY ml/ ./ml/
COPY rag/ ./rag/
COPY data/ ./data/
COPY frontend/dist/ ./frontend/dist/

WORKDIR /app/backend

# Expose default HTTP/WebSocket port
EXPOSE 10000

# Start Uvicorn bound to 0.0.0.0 and dynamically respect cloud provider $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
