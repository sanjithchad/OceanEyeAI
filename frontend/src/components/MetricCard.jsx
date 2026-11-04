export default function MetricCard({ icon: Icon, label, value, unit, detail, tone = "cyan" }) {
  return <article className="metric-card">
    <div className="metric-card-head"><span className={`metric-icon ${tone}`}><Icon size={17}/></span><span className="metric-label">{label}</span><span className="demo-tag">SIMULATED</span></div>
    <div className="metric-value">{value}<small>{unit}</small></div>
    <p>{detail}</p>
  </article>;
}
