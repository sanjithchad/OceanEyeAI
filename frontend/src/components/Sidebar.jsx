import {
  Activity, Waves, Thermometer, Droplets, BrainCircuit, ShieldAlert,
  Map, Bot, Bell, FileText, Settings, Menu, X
} from "lucide-react";

const items = [
  ["Dashboard", Activity], ["Live Monitoring", Waves], ["Temperature", Thermometer],
  ["Turbidity", Droplets], ["AI Predictions", BrainCircuit], ["Environmental Risk", ShieldAlert],
  ["Ocean Map", Map], ["AI Assistant", Bot], ["Alerts", Bell], ["Reports", FileText], ["Settings", Settings],
];

export default function Sidebar({ active, onNavigate, mobileOpen, onClose }) {
  return <>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <span className="brand-mark"><Waves size={22}/></span>
        <span className="brand-name">OCEAN<span> EYE</span><small>MARINE INTELLIGENCE</small></span>
        <button className="mobile-close" aria-label="Close menu" onClick={onClose}><X size={19}/></button>
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {items.map(([label, Icon]) => <button key={label} className={`nav-item ${active === label ? "active" : ""}`}
          onClick={() => { onNavigate(label); onClose(); }} aria-current={active === label ? "page" : undefined}>
          <Icon size={17}/><span>{label}</span>{label === "Alerts" && <i className="nav-count">2</i>}
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="network-card"><span className="tiny-pulse"/><div><b>System operational</b><small>API connection monitored</small></div></div>
        <div className="profile"><div className="profile-avatar">OE</div><div><b>Ocean Eye AI</b><small>Development workspace</small></div></div>
      </div>
    </aside>
  </>;
}
