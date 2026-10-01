# Oil-Sentry

**eRTMAC-NWIS** — AI-Powered Nearby Wells Intelligence & Real-time Drilling Hazard Decision Support Platform.

## Features
- **Spatial Offset Well Analytics**: PostGIS-powered geospatial similarity matching within dynamic search radii.
- **Machine Learning Risk Classification**: XGBoost multiclass model for predicting drilling hazards (Stuck Pipe, Mud Loss, High Torque).
- **Native pgvector RAG Intelligence**: Cosine distance similarity search over historical operational drilling reports with Gemini AI generation.
- **Real-Time Live Telemetry Streaming**: 1 Hz streaming WebSocket architecture simulating multi-channel drilling sensor dynamics.
- **Interactive Operations Dashboard**: High-density petroleum engineering UI built with React, Leaflet, and Recharts.

## Deployment on Render
Deploy using Render Blueprints (`render.yaml`), which automatically provisions:
1. **Managed PostgreSQL**: Pre-configured with PostGIS extension.
2. **Docker Web Service**: Serves the unified FastAPI backend and React frontend dashboard with live WebSockets.
