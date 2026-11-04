
import { useEffect, useState } from "react";
import {
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Thermometer,
  Droplets,
  Clock,
  Info,
  Wifi
} from "lucide-react";

import {
  getRiskCurrent,
  getRiskHistory
} from "../services/api";

const colors = {
  normal: "#168653",
  observation_required: "#b7791f",
  elevated: "#d65b24",
  high: "#c62828"
};

const labels = {
  normal: "Normal",
  observation_required: "Observation Required",
  elevated: "Elevated",
  high: "High"
};

const cardStyle = {
  background: "#ffffff",
  color: "#1f2937",
  border: "1px solid #dce3eb",
  borderRadius: 14,
  padding: 20,
  minWidth: 0,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
};

function Panel({ title, icon: Icon, children }) {
  return (
    <section style={cardStyle}>
      <h3 style={{
        display: "flex",
        gap: 9,
        alignItems: "center",
        marginTop: 0,
        marginBottom: 18,
        color: "#172033",
        fontSize: 17
      }}>
        {Icon && <Icon size={19} color="#2563a6" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function SmallCard({ title, value, detail, icon: Icon, color }) {
  return (
    <div style={cardStyle}>
      <div style={{
        color: "#64748b",
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 12
      }}>
        {title}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
        {Icon && <Icon size={22} color={color || "#2563a6"} />}
        <strong style={{
          fontSize: 23,
          color: color || "#1f2937"
        }}>
          {value}
        </strong>
      </div>

      {detail && (
        <p style={{
          fontSize: 13,
          color: "#64748b",
          marginBottom: 0,
          marginTop: 10
        }}>
          {detail}
        </p>
      )}
    </div>
  );
}

export default function RiskDashboard() {
  const [risk, setRisk] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [current, past] = await Promise.all([
        getRiskCurrent(),
        getRiskHistory(50)
      ]);

      setRisk(current);
      setHistory(past.items || []);
    } catch (err) {
      setError(err.message || "Unable to load environmental risk data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const timer = setInterval(() => {
      loadData();
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  if (loading && !risk) {
    return (
      <div style={{ padding: 30, color: "#1f2937" }}>
        Loading environmental risk assessment...
      </div>
    );
  }

  if (error && !risk) {
    return (
      <div style={{ ...cardStyle, padding: 25 }}>
        <p style={{ color: "#c62828" }}>{error}</p>
        <button onClick={loadData}>Try again</button>
      </div>
    );
  }

  if (!risk) return null;

  const color = colors[risk.category] || "#64748b";
  const latest = risk.latest_reading || {};
  const trends = risk.trends || {};

  return (
    <div style={{
      display: "grid",
      gap: 20,
      color: "#1f2937"
    }}>

      {/* HEADER */}

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12
      }}>
        <div>
          <div style={{
            color: "#2563a6",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1
          }}>
            PHASE 7 · ENVIRONMENTAL INTELLIGENCE
          </div>

          <p style={{
            marginBottom: 0,
            color: "#64748b",
            fontSize: 14
          }}>
            Environmental assessment using stored sensor observations.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            padding: "11px 16px",
            borderRadius: 9,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#1f2937",
            cursor: "pointer",
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontWeight: 600
          }}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{
          padding: 12,
          background: "#fff1f0",
          color: "#b42318",
          borderRadius: 8
        }}>
          {error}
        </div>
      )}

      {/* MAIN METRICS */}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 16
      }}>

        {/* RISK INDICATOR */}

        <div style={cardStyle}>
          <div style={{
            color: "#64748b",
            fontWeight: 800,
            fontSize: 12
          }}>
            ENVIRONMENTAL RISK INDICATOR
          </div>

          <div style={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            margin: "24px auto",
            display: "grid",
            placeItems: "center",
            background: `conic-gradient(${color} ${Math.max(0, Math.min(100, risk.indicator)) * 3.6}deg, #e5eaf0 0deg)`
          }}>
            <div style={{
              width: 122,
              height: 122,
              borderRadius: "50%",
              background: "#ffffff",
              display: "grid",
              placeContent: "center",
              textAlign: "center"
            }}>
              <strong style={{
                fontSize: 36,
                color: "#172033"
              }}>
                {risk.indicator}
              </strong>

              <span style={{
                fontSize: 12,
                color: "#64748b"
              }}>
                / 100
              </span>
            </div>
          </div>

          <div style={{
            textAlign: "center",
            fontWeight: 800,
            color,
            fontSize: 16
          }}>
            {labels[risk.category] || risk.category}
          </div>

          <p style={{
            textAlign: "center",
            fontSize: 12,
            color: "#64748b"
          }}>
            Experimental indicator · Not scientifically validated
          </p>
        </div>

        {/* SENSOR HEALTH */}

        <div style={cardStyle}>
          <div style={{
            color: "#64748b",
            fontSize: 12,
            fontWeight: 800
          }}>
            SENSOR HEALTH
          </div>

          <h2 style={{
            color: risk.sensor_health?.status === "online"
              ? "#168653"
              : "#c62828",
            margin: "12px 0"
          }}>
            {risk.sensor_health?.status || "Unknown"}
          </h2>

          <p style={{ color: "#64748b", fontSize: 13 }}>
            <Wifi size={15} style={{ verticalAlign: "middle" }} />
            {" "}Connection: {risk.sensor_health?.connection_status || "Unknown"}
          </p>

          <hr style={{ border: 0, borderTop: "1px solid #e5eaf0" }} />

          <div style={{
            color: "#64748b",
            fontSize: 12,
            fontWeight: 800
          }}>
            DATA QUALITY
          </div>

          <h2 style={{
            margin: "10px 0",
            color: "#172033"
          }}>
            {risk.data_quality?.status || "Unknown"}
          </h2>

          <p style={{
            fontSize: 13,
            color: "#64748b"
          }}>
            {risk.data_quality?.valid_readings ?? 0} valid readings /
            {" "}{risk.data_quality?.total_readings ?? 0} checked
          </p>
        </div>

        {/* TEMPERATURE */}

        <SmallCard
          title="WATER TEMPERATURE"
          value={latest.temperature != null
            ? `${latest.temperature} °C`
            : "Unavailable"}
          detail="Latest stored measurement"
          icon={Thermometer}
        />

        {/* TURBIDITY */}

        <SmallCard
          title="WATER TURBIDITY"
          value={latest.turbidity != null
            ? `${latest.turbidity} NTU`
            : "Unavailable"}
          detail="Latest stored measurement"
          icon={Droplets}
        />
      </div>

      {/* AI EXPLANATION */}

      <Panel title="AI Risk Explanation" icon={Activity}>
        <p style={{
          lineHeight: 1.8,
          color: "#374151",
          fontSize: 15
        }}>
          {risk.explanation}
        </p>

        <p style={{
          fontSize: 12,
          color: "#64748b"
        }}>
          Assessed at: {risk.assessed_at
            ? new Date(risk.assessed_at).toLocaleString()
            : "Unknown"}
        </p>
      </Panel>

      {/* FACTORS AND WARNINGS */}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16
      }}>

        <Panel title="Contributing Factors" icon={Activity}>
          {risk.factors?.length ? (
            risk.factors.map((factor, index) => (
              <div key={index} style={{
                padding: 13,
                marginBottom: 10,
                borderRadius: 9,
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                color: "#1f2937"
              }}>
                <strong>
                  {factor.type || factor.parameter || `Factor ${index + 1}`}
                </strong>

                <p style={{
                  fontSize: 13,
                  color: "#475569",
                  marginBottom: 0
                }}>
                  {factor.explanation ||
                    factor.description ||
                    JSON.stringify(factor)}
                </p>

                {factor.points != null && (
                  <strong style={{ color: "#b7791f" }}>
                    +{factor.points} points
                  </strong>
                )}
              </div>
            ))
          ) : (
            <p style={{ color: "#64748b" }}>
              No contributing factors detected.
            </p>
          )}
        </Panel>

        <Panel title="Active Warnings" icon={AlertTriangle}>
          {risk.warnings?.length ? (
            risk.warnings.map((warning, index) => (
              <div key={index} style={{
                padding: 13,
                marginBottom: 10,
                borderRadius: 9,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#7c2d12"
              }}>
                <strong>
                  {(warning.type || "Warning").replaceAll("_", " ")}
                </strong>

                <p style={{
                  marginBottom: 0,
                  marginTop: 6,
                  fontSize: 13
                }}>
                  {warning.explanation}
                </p>
              </div>
            ))
          ) : (
            <p style={{ color: "#64748b" }}>
              No active warnings.
            </p>
          )}
        </Panel>
      </div>

      {/* TRENDS */}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 16
      }}>
        <Panel title="Temperature Trend" icon={Thermometer}>
          <h2 style={{ color: "#2563a6" }}>
            {trends.temperature?.direction || "Unknown"}
          </h2>

          <p style={{ color: "#64748b" }}>
            Change: {trends.temperature?.change ?? "Unavailable"} °C
          </p>

          <p style={{ color: "#475569", fontSize: 13 }}>
            {trends.temperature?.explanation || ""}
          </p>
        </Panel>

        <Panel title="Turbidity Trend" icon={Droplets}>
          <h2 style={{ color: "#2563a6" }}>
            {trends.turbidity?.direction || "Unknown"}
          </h2>

          <p style={{ color: "#64748b" }}>
            Change: {trends.turbidity?.change ?? "Unavailable"} NTU
          </p>

          <p style={{ color: "#475569", fontSize: 13 }}>
            {trends.turbidity?.explanation || ""}
          </p>
        </Panel>
      </div>

      {/* RECOMMENDED ACTIONS */}

      <Panel title="Recommended Monitoring Actions" icon={ShieldCheck}>
        {risk.recommended_actions?.length ? (
          <ul style={{
            lineHeight: 2,
            color: "#374151",
            paddingLeft: 22
          }}>
            {risk.recommended_actions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#64748b" }}>
            No additional actions recommended.
          </p>
        )}
      </Panel>

      {/* RISK HISTORY */}

      <Panel title="Environmental Risk History" icon={Clock}>
        {history.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#ffffff",
              color: "#1f2937",
              fontSize: 14
            }}>
              <thead>
                <tr style={{ background: "#e8eef5" }}>
                  {["Time", "Severity", "Description", "Status"].map(item => (
                    <th key={item} style={{
                      padding: 13,
                      textAlign: "left",
                      color: "#172033",
                      borderBottom: "2px solid #cbd5e1",
                      whiteSpace: "nowrap"
                    }}>
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {history.map(item => (
                  <tr key={item.id}>
                    <td style={{
                      padding: 12,
                      color: "#334155",
                      borderBottom: "1px solid #e2e8f0"
                    }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </td>

                    <td style={{
                      padding: 12,
                      color: colors[item.severity] || "#334155",
                      fontWeight: 700,
                      borderBottom: "1px solid #e2e8f0"
                    }}>
                      {labels[item.severity] || item.severity}
                    </td>

                    <td style={{
                      padding: 12,
                      color: "#334155",
                      borderBottom: "1px solid #e2e8f0"
                    }}>
                      {item.description}
                    </td>

                    <td style={{
                      padding: 12,
                      color: "#334155",
                      borderBottom: "1px solid #e2e8f0"
                    }}>
                      {item.resolved ? "Resolved" : "Active"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{
            color: "#64748b",
            background: "#f1f5f9",
            padding: 15,
            borderRadius: 8
          }}>
            No environmental risk events have been recorded yet.
            Automatic risk history recording is not enabled yet.
          </p>
        )}
      </Panel>

      {/* LIMITATIONS */}

      <div style={{
        padding: 16,
        borderRadius: 10,
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#1e40af",
        fontSize: 13,
        display: "flex",
        gap: 10,
        lineHeight: 1.7
      }}>
        <Info size={19} style={{ flexShrink: 0 }} />

        <span>
          <strong>Important scientific limitation:</strong> This is an
          experimental software indicator, not a certified environmental
          measurement. Turbidity alone does not confirm pollution, and
          sensor failure does not prove environmental danger.
        </span>
      </div>

    </div>
  );
}
