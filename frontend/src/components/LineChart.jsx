export default function LineChart({ title, subtitle, values, unit, color = "#48d6d0" }) {
  const w = 560, h = 150, pad = 12;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((v, i) => `${pad + i * (w - pad * 2) / (values.length - 1)},${h - pad - ((v - min) / range) * (h - pad * 2)}`).join(" ");
  const area = `${pad},${h-pad} ${points} ${w-pad},${h-pad}`;
  return <section className="chart-panel">
    <div className="panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="demo-tag">SIMULATED</span></div>
    <div className="chart-wrap"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${title} demonstration trend chart`}>
      {[0,1,2,3].map(i => <line key={i} x1="0" x2={w} y1={pad+i*(h-2*pad)/3} y2={pad+i*(h-2*pad)/3} stroke="rgba(151,194,207,.12)" strokeDasharray="4 6"/> )}
      <polygon points={area} fill={color} opacity=".09"/>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      {values.map((v,i) => <circle key={i} cx={pad+i*(w-pad*2)/(values.length-1)} cy={h-pad-((v-min)/range)*(h-pad*2)} r="3" fill="#071b2a" stroke={color} strokeWidth="2"/> )}
    </svg></div>
    <div className="chart-axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>NOW</span></div>
  </section>;
}
