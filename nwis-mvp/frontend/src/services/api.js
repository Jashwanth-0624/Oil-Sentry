/**
 * Centralized API client for eRTMAC-NWIS FastAPI backend.
 */
import axios from "axios";

export function resolveApiBaseUrl() {
  const envUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname || "";
    // If hosted on Vercel, Netlify, or any remote frontend host, talk to the live Render backend
    if (hostname.includes("vercel.app") || hostname.includes("netlify.app")) {
      return "https://oil-sentry-backend.onrender.com";
    }
    // If hosted directly on Render, relative calls work seamlessly on same-origin
    if (hostname.includes("onrender.com")) {
      return "";
    }
    // If running locally on localhost, point to live Render backend for convenience
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "https://oil-sentry-backend.onrender.com";
    }
    return "";
  }

  return "https://oil-sentry-backend.onrender.com";
}

const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const base = resolveApiBaseUrl();
  if (base) {
    config.baseURL = base;
  } else {
    delete config.baseURL;
  }
  return config;
});

/**
 * Fetch all available wells in the catalog.
 */
export async function getWells() {
  const response = await api.get("/api/wells");
  return response.data;
}

/**
 * Fetch detailed information for a single well.
 */
export async function getWell(wellId) {
  const response = await api.get(`/api/wells/${encodeURIComponent(wellId)}`);
  return response.data;
}

/**
 * Fetch geographically and geologically similar offset wells.
 */
export async function getSimilarWells(wellId, radiusKm = 10, limit = 5) {
  const response = await api.get(
    `/api/wells/${encodeURIComponent(wellId)}/similar`,
    {
      params: { radius_km: radiusKm, limit },
    }
  );
  return response.data;
}

/**
 * Request ML drilling risk prediction for a specific well.
 */
export async function getWellRisk(wellId, payload) {
  const response = await api.post(
    `/api/wells/${encodeURIComponent(wellId)}/risk`,
    payload
  );
  return response.data;
}

/**
 * Fetch full consolidated intelligence for a well.
 */
export async function getWellIntelligence(
  wellId,
  radiusKm = 10,
  similarLimit = 5
) {
  const response = await api.get(
    `/api/wells/${encodeURIComponent(wellId)}/intelligence`,
    {
      params: { radius_km: radiusKm, similar_limit: similarLimit },
    }
  );
  return response.data;
}

/**
 * Run standalone ML drilling risk prediction.
 */
export async function predictRisk(payload) {
  const response = await api.post("/api/risk/predict", payload);
  return response.data;
}

/**
 * Query the grounded RAG intelligence knowledge base.
 */
export async function queryRag(question, topK = 5, wellId = null, field = null, formation = null) {
  const payload = { question, top_k: topK };
  if (wellId) payload.well_id = wellId;
  if (field) payload.field = field;
  if (formation) payload.formation = formation;

  const response = await api.post("/api/rag/query", payload);
  return response.data;
}

export async function queryIntelligence(wellId, question) {
  // Grounded synthesis can legitimately take longer than ordinary catalog calls.
  // Keep this request-specific so a slow model response does not affect the rest
  // of the dashboard.
  const response = await api.post(
    "/api/intelligence/query",
    { well_id: wellId, question },
    { timeout: 55000 }
  );
  return response.data;
}

/**
 * Fetch operational alerts with optional filters.
 */
export async function getAlerts(params = {}) {
  const response = await api.get("/api/alerts", { params });
  return response.data;
}

/**
 * Fetch a single operational alert by ID.
 */
export async function getAlert(alertId) {
  const response = await api.get(`/api/alerts/${alertId}`);
  return response.data;
}

/**
 * Fetch operational alerts for a specific well.
 */
export async function getWellAlerts(wellId, params = {}) {
  const response = await api.get(`/api/wells/${encodeURIComponent(wellId)}/alerts`, { params });
  return response.data;
}

/**
 * Acknowledge an operational alert.
 */
export async function acknowledgeAlert(alertId) {
  const response = await api.post(`/api/alerts/${alertId}/acknowledge`);
  return response.data;
}

/**
 * Fetch complete structured operational intelligence report data for a well.
 */
export async function getWellReport(wellId) {
  const response = await api.get(`/api/reports/wells/${encodeURIComponent(wellId)}`);
  return response.data;
}

/**
 * Generate full URL to stream/download the PDF operational intelligence report.
 */
export function getWellReportPdfUrl(wellId) {
  const base = resolveApiBaseUrl();
  const prefix = base ? base : (typeof window !== "undefined" ? window.location.origin : "");
  return `${prefix}/api/reports/wells/${encodeURIComponent(wellId)}/pdf`;
}

/**
 * Health check endpoint.
 */
export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}

/**
 * Database connectivity test endpoint.
 */
export async function checkDbTest() {
  const response = await api.get("/db-test");
  return response.data;
}

export default api;

