# Retrieval-Augmented Generation

Phase 6 adds a historical drilling-knowledge RAG path for the NWIS MVP.

## Synthetic documents

PDFs under `rag/documents/` are **synthetic development reports** generated from the local `nwis` database (`wells`, `formations`, `drilling_logs`, `events`). They are **not** real Oil India Limited drilling documents.

Regenerate:

```powershell
cd nwis-mvp
$env:PYTHONPATH = "$PWD;$PWD\backend"
.\backend\.venv\Scripts\python.exe -m rag.documents.generate_reports
```

## Ingestion

```powershell
.\backend\.venv\Scripts\python.exe -m rag.ingestion.ingest_documents
```

Pipeline:

1. Find `*_drilling_report.pdf` files
2. Extract text with PyMuPDF
3. Clean and split into ~650-word chunks with overlap
4. Embed with `sentence-transformers/all-MiniLM-L6-v2`
5. Rebuild only `rag_documents` (never wells/formations/logs/events)

## Vector storage

The vector store is **PostgreSQL 18.3 + pgvector 0.8.6**.
- **Embedding model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Embedding dimension:** 384
- **Database column:** `rag_documents.embedding` of type `vector(384)`
- **Similarity operator:** native cosine distance `<=>` inside PostgreSQL
- **Cosine similarity:** calculated as `1.0 - cosine_distance`
- The previous temporary JSON fallback has been completely removed.

## Retrieval and generation

- Default `top_k = 5`
- Default minimum cosine similarity = `0.10` (`RAG_MIN_SIMILARITY`), calibrated for the current short synthetic reports
- If no chunk meets the threshold, the API does not call an LLM
- Generation uses `LLM_PROVIDER` / `OPENAI_API_KEY` / `LLM_MODEL`
- Without a key, ingestion and retrieval still work; generation returns a configuration message instead of a fake answer

## API

`POST /api/rag/query`
