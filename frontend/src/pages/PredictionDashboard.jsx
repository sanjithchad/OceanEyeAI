
import { useEffect, useMemo, useState } from "react";
import { Activity, BrainCircuit, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { getSensorHistory, getTemperaturePrediction, getPredictionPerformance } from "../services/api";

const horizons = [
  ["1hour", "1 HOUR"],
  ["6hours", "6 HOURS"],
  ["24hours", "24 HOURS"],
  ["3days", "3 DAYS"],
  ["7days", "7 DAYS"],
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function ForecastChart({ history, prediction }) {
  const points = useMemo(() => {
    return (history || [])
      .map(item => ({
        time: new Date(item.timestamp || item.created_at),
        value: Number(item.temperature),
      }))
      .filter(item => Number.isFinite(item.value) && !Number.isNaN(item.time.getTime()))
      .slice(-50);
  }, [history]);

  if (!points.length || !prediction || !Number.isFinite(Number(prediction.predicted_temperature_c))) {
    return <div className="prediction-empty">Historical chart data is not available yet.</div>;
  }

  const values = [
    ...points.map(point => point.value),
    Number(prediction.predicted_temperature_c),
    Number(prediction.uncertainty?.lower_c),
    Number(prediction.uncertainty?.upper_c),
  ].filter(Number.isFinite);

  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = Math.max(max - min, 1);
  const x = index => 12 + (index / Math.max(points.length, 1)) * 76;
  const y = value => 88 - ((value - min) / range) * 72;

  const actualLine = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const lastX = x(points.length - 1);
  const futureX = 98;
  const lastValue = points[points.length - 1].value;
  const predicted = Number(prediction.predicted_temperature_c);
  const upper = Number(prediction.uncertainty?.upper_c);
  const lower = Number(prediction.uncertainty?.lower_c);
  const band = Number.isFinite(upper) && Number.isFinite(lower)
    ? `${lastX},${y(upper)} ${futureX},${y(upper)} ${futureX},${y(lower)} ${lastX},${y(lower)}`
    : "";

  return (
    <div className="prediction-chart">
      <svg viewBox="0 0 100 100" role="img" aria-label="Historical temperatures and experimental forecast">
        {[20, 40, 60, 80].map(level => (
          <line key={level} x1="8" x2="98" y1={level} y2={level} stroke="#244451" strokeDasharray="1.5 2" />
        ))}
        {band && <polygon points={band} fill="#e3b75e" opacity=".16" />}
        <polyline points={actualLine} fill="none" stroke="#58d5d0" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <line x1={lastX} y1={y(lastValue)} x2={futureX} y2={y(predicted)} stroke="#e5b75f" strokeWidth="1.8" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
        <circle cx={lastX} cy={y(lastValue)} r="1.8" fill="#58d5d0" />
        <circle cx={futureX} cy={y(predicted)} r="2.2" fill="#e5b75f" />
      </svg>
      <div className="prediction-chart-legend">
        <span><i className="legend-actual" /> Historical readings</span>
        <span><i className="legend-forecast" /> Experimental forecast</span>
        <span><i className="legend-band" /> Uncertainty range</span>
      </div>
      <div className="prediction-chart-axis">
        <span>Historical</span><span>{prediction.horizon}</span>
      </div>
    </div>
  );
}

export default function PredictionDashboard() {
  const [horizon, setHorizon] = useState("1hour");
  const [prediction, setPrediction] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData(selectedHorizon = horizon) {
    setLoading(true);
    setError("");

    try {
      const [forecast, metrics, readings] = await Promise.all([
        getTemperaturePrediction(selectedHorizon),
        getPredictionPerformance(),
        getSensorHistory(60),
      ]);

      setPrediction(forecast);
      setPerformance(metrics);
      setHistory(readings.items || []);
    } catch (err) {
      setError(err.message || "Unable to load prediction data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(horizon);
  }, [horizon]);

  const quality = prediction?.data_quality?.status;
  const qualityText = {
    experimental: "Experimental forecast",
    insufficient_historical_coverage: "Insufficient history for this horizon",
    insufficient_data: "Insufficient training data",
  }[quality] || "Awaiting prediction data";

  return (
    <div className="prediction-page">
      <div className="notice prediction-warning">
        <AlertTriangle size={17} />
        <span><b>Experimental predictions.</b> These statistical estimates are not scientifically validated ocean forecasts. Long-range forecasts require substantially more historical data.</span>
      </div>

      <div className="prediction-toolbar">
        <div>
          <div className="eyebrow">FORECAST CONFIGURATION</div>
          <h2>Temperature forecast</h2>
          <p>Select a forecast horizon to inspect the estimated water temperature.</p>
        </div>
        <button className="prediction-refresh" onClick={() => loadData()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="horizon-selector" aria-label="Forecast horizon">
        {horizons.map(([value, label]) => (
          <button key={value} className={horizon === value ? "selected" : ""} onClick={() => setHorizon(value)}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="prediction-error"><AlertTriangle size={16} />{error}</div>}

      {loading ? (
        <div className="prediction-loading"><RefreshCw size={19} className="spin" /> Loading prediction data...</div>
      ) : prediction?.status === "prediction_generated" ? (
        <>
          <div className="prediction-metrics">
            <div className="prediction-stat">
              <span>CURRENT TEMPERATURE</span>
              <strong>{prediction.current_temperature_c}°C</strong>
              <small>Latest stored reading</small>
            </div>
            <div className="prediction-stat highlighted">
              <span>PREDICTED TEMPERATURE</span>
              <strong>{prediction.predicted_temperature_c}°C</strong>
              <small>{prediction.horizon} from now · Experimental</small>
            </div>
            <div className="prediction-stat">
              <span>MODEL SELECTED</span>
              <strong className="model-name">{prediction.model_name?.replaceAll("_", " ")}</strong>
              <small>Selected using holdout MAE</small>
            </div>
          </div>

          <div className="panel prediction-main-panel">
            <div className="panel-heading">
              <div>
                <h3><TrendingUp size={14} /> Temperature forecast visualization</h3>
                <p>Historical readings followed by the selected forecast</p>
              </div>
              <span className="demo-tag">EXPERIMENTAL</span>
            </div>
            <ForecastChart history={history} prediction={prediction} />
          </div>

          <div className="prediction-details-grid">
            <div className="panel">
              <div className="panel-heading"><div><h3>Uncertainty estimate</h3><p>Approximate interval, not calibrated confidence</p></div></div>
              <div className="uncertainty-values">
                <div><small>LOWER ESTIMATE</small><b>{prediction.uncertainty?.lower_c}°C</b></div>
                <div><small>UPPER ESTIMATE</small><b>{prediction.uncertainty?.upper_c}°C</b></div>
              </div>
              <p className="prediction-footnote">{prediction.uncertainty?.method}</p>
            </div>
            <div className="panel">
              <div className="panel-heading"><div><h3>Data quality</h3><p>Historical coverage available to the model</p></div></div>
              <div className="quality-status">{qualityText}</div>
              <div className="quality-row"><span>Valid readings</span><b>{prediction.data_quality?.valid_readings}</b></div>
              <div className="quality-row"><span>History coverage</span><b>{prediction.data_quality?.historical_coverage_hours} hours</b></div>
              <div className="quality-row"><span>Forecast time</span><b>{formatDate(prediction.prediction_timestamp)}</b></div>
            </div>
          </div>
        </>
      ) : (
        <div className="prediction-empty">{prediction?.message || "No prediction is currently available."}</div>
      )}

      <div className="section-title prediction-performance-title">
        <div><span className="eyebrow">MODEL EVALUATION</span><h2>Prediction performance</h2></div>
        <span className="section-caption">CHRONOLOGICAL 80/20 SPLIT</span>
      </div>

      {performance?.status === "evaluated" ? (
        <div className="panel performance-panel">
          <div className="panel-heading">
            <div><h3><BrainCircuit size={14} /> Model comparison</h3><p>Holdout evaluation · Lower error is better</p></div>
            <span className="demo-tag">{performance.selected_model?.replaceAll("_", " ")}</span>
          </div>
          <div className="performance-table">
            <div className="performance-row performance-header"><span>MODEL</span><span>MAE (°C)</span><span>RMSE (°C)</span></div>
            {Object.entries(performance.models || {}).map(([name, metrics]) => (
              <div className="performance-row" key={name}>
                <span>{name.replaceAll("_", " ")}</span><b>{metrics.mae ?? "—"}</b><b>{metrics.rmse ?? "—"}</b>
              </div>
            ))}
          </div>
          <p className="prediction-footnote">MAPE is omitted because percentage errors are not meaningful for Celsius temperatures. The current holdout evaluation does not validate accuracy at each forecast horizon.</p>
          <div className="quality-row"><span>Valid historical readings</span><b>{performance.valid_readings}</b></div>
          <div className="quality-row"><span>Historical coverage</span><b>{performance.historical_coverage_hours} hours</b></div>
        </div>
      ) : (
        <div className="panel prediction-empty">{performance?.message || "Model evaluation is not available yet."}</div>
      )}
    </div>
  );
}
