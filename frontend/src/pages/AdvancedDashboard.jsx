import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Thermometer, Droplets, Battery, Wifi, WifiOff,
  ShieldCheck, BrainCircuit, AlertTriangle, RefreshCw, Clock3
} from "lucide-react";

import {
  getSensorLatest,
  getSensorHistory,
  getSensorStatus,
  getSensorDevice,
  getRiskCurrent,
  getAISummary,
  getAlerts
} from "../services/api";

import MetricCard from "../components/MetricCard";
import LineChart from "../components/LineChart";
import "../styles/AdvancedDashboard.css";

const number = (value, digits = 2) =>
  value == null || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toFixed(digits);

export default function AdvancedDashboard() {
  const [data, setData] = useState({
    latest: null,
    history: [],
    status: null,
    device: null,
    risk: null,
    ai: null,
    alerts: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      getSensorLatest(),
      getSensorHistory(60),
      getSensorStatus(),
      getSensorDevice(),
      getRiskCurrent(),
      getAISummary(),
      getAlerts(5, true)
    ]);

    const value = (index) =>
      results[index].status === "fulfilled"
        ? results[index].value
        : null;

    const failed = results.filter(
      (item) => item.status === "rejected"
    );

    setData({
      latest: value(0),
      history: value(1)?.items || [],
      status: value(2),
      device: value(3),
      risk: value(4),
      ai: value(5),
      alerts: value(6) || []
    });

    setError(
      failed.length === results.length
        ? "Unable to connect to the backend."
        : failed.length
          ? `${failed.length} data source(s) could not be loaded.`
          : ""
    );

    setUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const temperatures = useMemo(
    () =>
      data.history
        .slice()
        .reverse()
        .map((item) => Number(item.temperature))
        .filter(Number.isFinite),
    [data.history]
  );

  const turbidities = useMemo(
    () =>
      data.history
        .slice()
        .reverse()
        .map((item) => Number(item.turbidity))
        .filter(Number.isFinite),
    [data.history]
  );

  const disconnected =
    data.status?.failure_mode === true ||
    data.latest?.sensor_status === "offline";

  const riskValue =
    data.risk?.indicator ?? data.risk?.risk_score ?? null;

  const riskCategory =
    data.risk?.category ?? data.risk?.status ?? "Awaiting assessment";

  return (
    <div className="advanced-dashboard">

      <div className="advanced-status-bar">
        <div>
          <span className="advanced-live-dot" />
          <b>OCEAN MONITORING SYSTEM</b>
          <span className="advanced-source-tag">SIMULATOR FEED</span>
        </div>

        <div className="advanced-refresh">
          <Clock3 size={14} />
          {updated
            ? `Updated ${updated.toLocaleTimeString()}`
            : "Connecting..."}
          <button onClick={refresh} title="Refresh dashboard">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && (
        <div className="advanced-error">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {loading && !data.latest ? (
        <div className="advanced-loading">
          <RefreshCw size={22} />
          <p>Connecting to Ocean Eye AI...</p>
        </div>
      ) : (
        <>
          <div className="advanced-section-heading">
            <div>
              <span className="eyebrow">REAL-TIME DEMONSTRATION DATA</span>
              <h2>Ocean conditions</h2>
            </div>
            <span className="advanced-source-tag">SYNTHETIC DATA</span>
          </div>

          <div className="metric-grid">
            <MetricCard
              icon={Thermometer}
              label="Water temperature"
              value={number(data.latest?.temperature)}
              unit="°C"
              detail="Latest simulated reading"
            />

            <MetricCard
              icon={Droplets}
              label="Turbidity"
              value={number(data.latest?.turbidity)}
              unit="NTU"
              detail="Latest simulated reading"
              tone="blue"
            />

            <MetricCard
              icon={Battery}
              label="Device battery"
              value={number(data.device?.battery_level, 1)}
              unit="%"
              detail={data.device?.device_name || "Monitoring device"}
              tone="purple"
            />

            <MetricCard
              icon={Activity}
              label="Sensor connection"
              value={disconnected ? "OFFLINE" : "ONLINE"}
              unit=""
              detail={data.latest?.device_id || "Simulator device"}
              tone={disconnected ? "red" : "green"}
            />
          </div>

          <div className="advanced-section-heading">
            <div>
              <span className="eyebrow">DEVICE INTELLIGENCE</span>
              <h2>Monitoring station</h2>
            </div>
          </div>

          <section className="advanced-panel">
            <div className="advanced-device-row">
              <div className="advanced-device-icon">
                <Activity size={22} />
              </div>

              <div className="advanced-device-info">
                <b>
                  {data.device?.device_name || "Ocean Monitoring Unit"}
                </b>
                <span>
                  Device ID: {data.latest?.device_id || data.device?.device_id || "Waiting for device"}
                </span>
              </div>

              <span className={disconnected ? "advanced-offline" : "advanced-online"}>
                {disconnected ? <WifiOff size={14} /> : <Wifi size={14} />}
                {disconnected ? "Disconnected" : "Connected"}
              </span>
            </div>

            <div className="advanced-device-details">
              <div>
                <small>Latitude</small>
                <b>{number(data.latest?.latitude, 5)}</b>
              </div>
              <div>
                <small>Longitude</small>
                <b>{number(data.latest?.longitude, 5)}</b>
              </div>
              <div>
                <small>Battery</small>
                <b>{number(data.device?.battery_level, 1)}%</b>
              </div>
              <div>
                <small>Last reading</small>
                <b>
                  {data.latest?.timestamp
                    ? new Date(data.latest.timestamp).toLocaleTimeString()
                    : "—"}
                </b>
              </div>
            </div>
          </section>

          <div className="advanced-section-heading">
            <div>
              <span className="eyebrow">ENVIRONMENTAL INTELLIGENCE</span>
              <h2>Risk assessment</h2>
            </div>
          </div>

          <section className="advanced-panel">
            <div className="advanced-intelligence-row">
              <div className="advanced-intelligence-icon">
                <ShieldCheck size={23} />
              </div>
              <div>
                <b>{riskCategory}</b>
                <p>
                  Environmental risk assessment from the stored analysis system.
                </p>
              </div>
              <div className="advanced-risk-score">
                <strong>{riskValue ?? "—"}</strong>
                <small>Indicator</small>
              </div>
            </div>

            {data.risk?.explanation && (
              <p className="advanced-explanation">
                {data.risk.explanation}
              </p>
            )}

            {data.risk?.limitations?.length > 0 && (
              <p className="advanced-muted">
                Limitations: {data.risk.limitations.join(" ")}
              </p>
            )}
          </section>

          <div className="advanced-section-heading">
            <div>
              <span className="eyebrow">SENSOR HISTORY</span>
              <h2>Measurement trends</h2>
            </div>
            <span className="advanced-source-tag">SIMULATED</span>
          </div>

          <div className="chart-grid">
            {temperatures.length > 1 && (
              <LineChart
                title="Water temperature"
                subtitle="Historical simulator readings · °C"
                values={temperatures}
              />
            )}

            {turbidities.length > 1 && (
              <LineChart
                title="Turbidity"
                subtitle="Historical simulator readings · NTU"
                values={turbidities}
                color="#68aef3"
              />
            )}
          </div>

          {temperatures.length <= 1 && turbidities.length <= 1 && (
            <section className="advanced-panel">
              <p className="advanced-muted">
                Waiting for enough sensor readings to display historical charts.
              </p>
            </section>
          )}

          <div className="advanced-section-heading">
            <div>
              <span className="eyebrow">AI ANALYSIS ENGINE</span>
              <h2>Latest intelligence</h2>
            </div>
          </div>

          <section className="advanced-panel">
            <div className="advanced-intelligence-row">
              <div className="advanced-intelligence-icon">
                <BrainCircuit size={23} />
              </div>
              <div>
                <b>Ocean Eye AI analysis</b>
                <p>
                  {data.ai?.status || "Analysis status unavailable"}
                </p>
              </div>
              <div className="advanced-risk-score">
                <strong>{data.ai?.anomaly_count ?? "—"}</strong>
                <small>Anomalies</small>
              </div>
            </div>

            <div className="advanced-ai-details">
              <div>
                <small>Readings analyzed</small>
                <b>{data.ai?.readings_analyzed ?? "—"}</b>
              </div>
              <div>
                <small>Analysis engine</small>
                <b>{data.ai?.analysis_engine || "Ocean Eye AI"}</b>
              </div>
            </div>

            {data.ai?.scientific_note && (
              <p className="advanced-explanation">
                {data.ai.scientific_note}
              </p>
            )}

            {Array.isArray(data.ai?.observations) &&
              data.ai.observations.length > 0 && (
                <ul className="advanced-observations">
                  {data.ai.observations.slice(0, 4).map((item, index) => (
                    <li key={index}>
                      {typeof item === "string"
                        ? item
                        : item.description || JSON.stringify(item)}
                    </li>
                  ))}
                </ul>
              )}
          </section>

          <div className="advanced-section-heading">
            <div>
              <span className="eyebrow">SYSTEM NOTIFICATIONS</span>
              <h2>Active alerts</h2>
            </div>
            <span className="advanced-source-tag">PERSISTENT DATABASE</span>
          </div>

          <section className="advanced-panel">
            {data.alerts.length === 0 ? (
              <div className="advanced-empty">
                <ShieldCheck size={22} />
                <b>No active stored alerts</b>
                <p>No unresolved alerts were returned by the database.</p>
              </div>
            ) : (
              <div className="advanced-alert-list">
                {data.alerts.map((alert) => (
                  <div className="advanced-alert" key={alert.id}>
                    <AlertTriangle size={18} />
                    <div>
                      <b>{alert.severity} alert</b>
                      <p>{alert.description}</p>
                      <small>
                        {alert.timestamp
                          ? new Date(alert.timestamp).toLocaleString()
                          : ""}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <p className="advanced-disclaimer">
        Ocean Eye AI development dashboard. Simulator readings, persistent
        database observations and AI assessments are displayed as separate
        data sources. Simulator readings are not real ocean measurements.
      </p>
    </div>
  );
}