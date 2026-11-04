import { useEffect, useState } from "react";
import { RefreshCw, Wifi, WifiOff, LoaderCircle } from "lucide-react";
import { getHealth } from "../services/api";

export default function ConnectionStatus() {
  const [state, setState] = useState("checking");
  const [updated, setUpdated] = useState(null);
  const [error, setError] = useState("");
  const check = async () => {
    setState("checking"); setError("");
    try { await getHealth(); setState("online"); setUpdated(new Date()); }
    catch (e) { setState("offline"); setError(e.message || "Unable to reach API"); }
  };
  useEffect(() => { check(); const timer = setInterval(check, 30000); return () => clearInterval(timer); }, []);
  return <div className={`connection-status ${state}`} role="status" aria-live="polite">
    <span className="connection-symbol">{state === "checking" ? <LoaderCircle className="spin" size={16}/> : state === "online" ? <Wifi size={16}/> : <WifiOff size={16}/>}</span>
    <span><b>{state === "checking" ? "Checking backend…" : state === "online" ? "Backend connected" : "Backend disconnected"}</b>
      <small>{state === "online" ? `Health endpoint verified${updated ? ` · ${updated.toLocaleTimeString()}` : ""}` : state === "offline" ? error : "Contacting FastAPI health endpoint"}</small></span>
    <button onClick={check} aria-label="Refresh backend connection" title="Refresh connection"><RefreshCw size={15}/></button>
  </div>;
}
