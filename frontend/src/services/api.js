const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.detail || `Backend returned HTTP ${response.status}`
    );
  }

  return payload;
}

// Health
export function getHealth() {
  return request("/api/health");
}

// SIMULATOR DATA
export function getSensorLatest() {
  return request("/api/sensors/latest");
}

export async function getSensorHistory(limit = 60) {
  const result = await request(`/api/sensors/history?limit=${limit}`);
  return { ...result, data_mode: "SIMULATED" };
}

export function getSensorStatus() {
  return request("/api/sensors/status");
}

export function getSensorDevice() {
  return request("/api/sensors/device");
}

export function triggerAbnormalReading() {
  return request("/api/sensors/simulate/abnormal", {
    method: "POST",
  });
}

export function setSensorFailure(disconnected) {
  return request(
    `/api/sensors/simulate/failure?disconnected=${disconnected}`,
    { method: "POST" }
  );
}

// PERSISTENT DATABASE
export function getDatabaseStatus() {
  return request("/api/database/status");
}

export function getStoredReadings(limit = 500, startDate, endDate) {
  const params = new URLSearchParams({ limit: String(limit) });

  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  return request(`/api/readings/history?${params}`);
}

export function getLatestStoredReading() {
  return request("/api/readings/latest");
}

export function getDevices() {
  return request("/api/devices");
}

export function getAlerts(limit = 100, unresolvedOnly = false) {
  return request(
    `/api/alerts?limit=${limit}&unresolved_only=${unresolvedOnly}`
  );
}

export function getStoredPredictions(limit = 100) {
  return request(`/api/predictions?limit=${limit}`);
}

// AI ANALYSIS
export function getAIAnalysis() {
  return request("/api/ai/analyze");
}

export function getAISummary() {
  return request("/api/ai/summary");
}

export function getAIAnomalies(limit = 500) {
  return request(`/api/ai/anomalies?limit=${limit}`);
}

export function getAITrends() {
  return request("/api/ai/trends");
}

// PREDICTIONS
export function getTemperaturePrediction(horizon = "1hour") {
  return request(`/api/predictions/${horizon}`);
}

export function getAllTemperaturePredictions() {
  return request("/api/predictions/temperature");
}

export function getPredictionPerformance() {
  return request("/api/predictions/performance");
}

// ENVIRONMENTAL RISK
export function getRiskCurrent() {
  return request("/api/risk/current");
}

export function getRiskHistory(limit = 50) {
  return request(`/api/risk/history?limit=${limit}`);
}

export function getRiskExplanation() {
  return request("/api/risk/explanation");
}

export function getRiskStatus() {
  return request("/api/risk/status");
}

// PHASE 8 - AI CHATBOT
export function sendChatMessage(message, conversationId = "default") {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
  });
}

export function getChatHistory(conversationId = "default", limit = 100) {
  return request(
    `/api/chat/history?conversation_id=${encodeURIComponent(conversationId)}&limit=${limit}`
  );
}

export function clearChatHistory(conversationId = "default") {
  return request(
    `/api/chat/history?conversation_id=${encodeURIComponent(conversationId)}`,
    { method: "DELETE" }
  );
}