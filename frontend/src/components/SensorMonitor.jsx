import { useEffect, useMemo, useState } from "react";
import { Activity, Battery, MapPin, Radio, RefreshCw, ShieldAlert, Thermometer, Droplets, Wifi, WifiOff } from "lucide-react";
import MetricCard from "./MetricCard";
import LineChart from "./LineChart";
import { getSensorDevice, getSensorHistory, getSensorLatest, getSensorStatus, setSensorFailure, triggerAbnormalReading } from "../services/api";

const fmt = (value, digits = 2) => value == null ? "—" : Number(value).toFixed(digits);

export default function SensorMonitor({ compact = false }) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [device, setDevice] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastPoll, setLastPoll] = useState(null);

  async function refresh() {
    try {
      const [reading, series, state, unit] = await Promise.all([
        getSensorLatest(), getSensorHistory(60), getSensorStatus(), getSensorDevice()
      ]);
      setLatest(reading); setHistory(series.items || []); setStatus(state); setDevice(unit);
      setError(""); setLastPoll(new Date());
    } catch (err) { setError(err.message || "Unable to reach the simulator API"); }
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const temperatures = useMemo(() => history.slice().reverse().map(x => x.temperature).filter(x => x != null), [history]);
  const turbidities = useMemo(() => history.slice().reverse().map(x => x.turbidity).filter(x => x != null), [history]);
  const disconnected = status?.failure_mode === true;

  async function runAction(action) {
    setBusy(true); setError("");
    try { await action(); await refresh(); }
    catch (err) { setError(err.message || "Action failed"); }
    finally { setBusy(false); }
  }

  return <div className="sensor-monitor">
    <div className="sim-banner"><span className="sim-pulse"/><b>SIMULATED SENSOR FEED</b><span>All values are synthetic · not real ocean observations</span><span className="poll-note">{lastPoll ? `Updated ${lastPoll.toLocaleTimeString()}` : "Connecting…"}</span></div>
    {error && <div className="sensor-error" role="alert">{error}</div>}
    <div className="sensor-device-strip">
      <div className="device-identity"><span className="device-icon"><Radio size={18}/></span><div><b>{device?.device_name || "Ocean Monitoring Unit"}</b><small>{device?.device_id || "Waiting for device"}</small></div></div>
      <span className={`device-state ${disconnected ? "offline" : "online"}`}>{disconnected ? <WifiOff size={13}/> : <Wifi size={13}/>} {disconnected ? "DISCONNECTED (SIMULATED)" : "CONNECTED (SIMULATED)"}</span>
      <div className="battery-indicator"><Battery size={15}/><b>{fmt(device?.battery_level, 1)}%</b><small>Battery</small></div>
    </div>
    <div className="metric-grid">
      <MetricCard icon={Thermometer} label="Water temperature" value={fmt(latest?.temperature)} unit="°C" detail={latest?.sensor_status === "offline" ? "Sensor unavailable" : "Auto-generated simulated reading"}/>
      <MetricCard icon={Droplets} label="Turbidity" value={fmt(latest?.turbidity)} unit="NTU" detail={latest?.sensor_status === "offline" ? "Sensor unavailable" : "Auto-generated simulated reading"} tone="blue"/>
      <MetricCard icon={MapPin} label="Demonstration GPS" value={latest ? `${fmt(latest.latitude, 4)}, ${fmt(latest.longitude, 4)}` : "—"} unit="" detail="Configurable demo coordinates" tone="purple"/>
      <MetricCard icon={Activity} label="Sensor condition" value={latest?.sensor_status?.toUpperCase() || "STARTING"} unit="" detail={`Device ${latest?.device_id || "pending"}`} tone="green"/>
    </div>
    {!compact && <>
      <div className="section-title chart-section-title"><div><span className="eyebrow">AUTO-REFRESH · 3 SECOND POLLING</span><h2>Simulated sensor history</h2></div><span className="section-caption">LATEST {history.length} READINGS</span></div>
      <div className="chart-grid">
        <LineChart title="Water temperature" subtitle="Generated readings · °C" values={temperatures.length > 1 ? temperatures : [0, 0.1]} />
        <LineChart title="Turbidity" subtitle="Generated readings · NTU" values={turbidities.length > 1 ? turbidities : [0, 0.1]} color="#68aef3" />
      </div>
      <section className="panel simulator-controls">
        <div className="panel-heading"><div><h3>Simulator test controls</h3><p>Trigger test conditions to verify alerts and disconnected states</p></div><span className="demo-tag">SIMULATION ONLY</span></div>
        <div className="control-actions">
          <button disabled={busy || disconnected} onClick={() => runAction(triggerAbnormalReading)}><ShieldAlert size={15}/> Generate abnormal reading</button>
          <button disabled={busy || disconnected} onClick={() => runAction(() => setSensorFailure(true))}><WifiOff size={15}/> Simulate disconnection</button>
          <button disabled={busy || !disconnected} onClick={() => runAction(() => setSensorFailure(false))}><RefreshCw size={15}/> Restore connection</button>
          <button disabled={busy} onClick={refresh}><RefreshCw size={15}/> Refresh now</button>
        </div>
        {latest?.alerts?.length > 0 && <div className="sim-alert"><ShieldAlert size={15}/><span>{latest.alerts.join(" · ")}</span></div>}
      </section>
      <section className="panel reading-details"><div className="panel-heading"><div><h3>Latest reading details</h3><p>Device metadata and generated timestamp</p></div><span className="demo-tag">SIMULATED</span></div>
        <div className="detail-grid"><div><small>Reading ID</small><b>{latest?.id || "Waiting…"}</b></div><div><small>Timestamp (UTC)</small><b>{latest?.timestamp ? new Date(latest.timestamp).toLocaleString() : "—"}</b></div><div><small>Device ID</small><b>{latest?.device_id || "—"}</b></div><div><small>Connection</small><b>{latest?.connection_status || "—"}</b></div></div>
      </section>
    </>}
  </div>;
}
