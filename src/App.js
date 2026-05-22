import { useState, useEffect } from 'react';
import './App.css';
import FloatingLines from './FloatingLines.js';

// Kp scale bands (NOAA G-scale)
const KP_BANDS = [
  { min: 0, max: 1, label: 'Quiet',       color: '#4ade80' },
  { min: 1, max: 2, label: 'Unsettled',   color: '#a3e635' },
  { min: 2, max: 3, label: 'Active',      color: '#facc15' },
  { min: 3, max: 4, label: 'Minor Risk',  color: '#fb923c' },
  { min: 4, max: 5, label: 'G1 Minor',   color: '#f87171' },
  { min: 5, max: 6, label: 'G2 Moderate',color: '#c084fc' },
  { min: 6, max: 9, label: 'G3+',        color: '#e879f9' },
];

function kpColor(kp) {
  const band = KP_BANDS.find(b => kp >= b.min && kp < b.max);
  return band ? band.color : '#e879f9';
}

function formatUTC(isoStr) {
  const d = new Date(isoStr);
  const mo  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hr  = String(d.getUTCHours()).padStart(2, '0');
  return `${mo}/${day} ${hr}:00 UTC`;
}

// ── Kp progress bar ──────────────────────────────────────────────────────────
function KpBar({ value, label }) {
  const color = kpColor(value);
  const pct = Math.min((value / 9) * 100, 100);
  return (
    <div className="kp-bar-row">
      <span className="kp-bar-label">{label}</span>
      <div className="kp-bar-track">
        <div className="kp-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="kp-bar-value" style={{ color }}>{value.toFixed(2)}</span>
    </div>
  );
}

// ── Generic stat card ────────────────────────────────────────────────────────
function StatCard({ title, accent, children }) {
  return (
    <div className="stat-card" style={{ borderTopColor: accent }}>
      <div className="stat-card-title">{title}</div>
      {children}
    </div>
  );
}

// ── Outlook row (label + value) ──────────────────────────────────────────────
function OutlookRow({ label, value, valueColor, small }) {
  return (
    <div className="outlook-row">
      <span className="outlook-label">{label}</span>
      {small
        ? <span className="outlook-value-sm" style={valueColor ? { color: valueColor } : {}}>{value}</span>
        : <span className="outlook-value"    style={valueColor ? { color: valueColor } : {}}>{value}</span>
      }
    </div>
  );
}

// ── SVG forecast line chart ──────────────────────────────────────────────────
function ForecastChart({ times, scenarios, weighted }) {
  const W = 700, H = 200;
  const PL = 48, PR = 28, PT = 28, PB = 40;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const maxKp = 6;
  const n = times.length;

  const xPos = (i)  => PL + (i / (n - 1)) * plotW;
  const yPos = (kp) => PT + (1 - Math.min(kp, maxKp) / maxKp) * plotH;

  const pathD = (vals) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');

  const gridKps = [1, 2, 3, 4, 5];
  const xTickIdxs = times.map((_, i) => i).filter(i => i % 4 === 0);

  const legend = [
    { label: 'Weighted Avg', color: '#38bdf8', sw: 2.5 },
    { label: 'Active',       color: '#ff0000', sw: 1.5 },
    { label: 'Moderate',     color: '#ff9900', sw: 1.5 },
    { label: 'Quiet',        color: '#189947', sw: 1.5 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="forecast-chart" preserveAspectRatio="xMidYMid meet">
      {/* Horizontal grid lines */}
      {gridKps.map(kp => (
        <g key={kp}>
          <line
            x1={PL} y1={yPos(kp)} x2={W - PR} y2={yPos(kp)}
            stroke={kp === 5 ? '#ef444470' : '#1e2d40'}
            strokeWidth={kp === 5 ? 1.5 : 1}
            strokeDasharray={kp === 5 ? '6 3' : '3 3'}
          />
          <text x={PL - 6} y={yPos(kp) + 4} textAnchor="end" className="chart-label">{kp}</text>
        </g>
      ))}
      <text x={PL - 6} y={yPos(0) + 4} textAnchor="end" className="chart-label">0</text>

      {/* G1 storm threshold annotation */}
      <text x={W - PR + 3} y={yPos(5) + 4} className="chart-label" fill="#ef4444">G1</text>

      {/* Scenario lines */}
      <path d={pathD(scenarios.Quiet)}    stroke="#189947" strokeWidth="1.5" fill="none" opacity="0.65" />
      <path d={pathD(scenarios.Moderate)} stroke="#ff9900" strokeWidth="1.5" fill="none" opacity="0.65" />
      <path d={pathD(scenarios.Active)}   stroke="#ff0000" strokeWidth="1.5" fill="none" opacity="0.65" />

      {/* Weighted average — primary line */}
      <path d={pathD(weighted)} stroke="#38bdf8" strokeWidth="2.5" fill="none" />

      {/* X axis baseline */}
      <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="#1e293b" strokeWidth="1" />

      {/* X tick marks + labels */}
      {xTickIdxs.map(i => {
        const d = new Date(times[i]);
        const day = d.getUTCDate();
        const hr  = String(d.getUTCHours()).padStart(2, '0');
        return (
          <g key={i}>
            <line x1={xPos(i)} y1={PT + plotH} x2={xPos(i)} y2={PT + plotH + 4} stroke="#334155" strokeWidth="1" />
            <text x={xPos(i)} y={PT + plotH + 14} textAnchor="middle" className="chart-label">{day}</text>
            <text x={xPos(i)} y={PT + plotH + 24} textAnchor="middle" className="chart-label">{hr}Z</text>
          </g>
        );
      })}

      {/* Legend */}
      {legend.map(({ label, color, sw }, i) => (
        <g key={label} transform={`translate(${PL + 8 + i * 148}, ${PT - 18})`}>
          <line x1="0" y1="5" x2="16" y2="5" stroke={color} strokeWidth={sw} />
          <text x="20" y="9" className="chart-label" fill="#94a3b8">{label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [fileList,    setFileList]    = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [data,        setData]        = useState(null);
  const [error,       setError]       = useState(null);

  // Load the manifest of available result files
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/data-files.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(list => {
        setFileList(list);
        if (list.length > 0) setSelectedFile(list[0].file);
      })
      .catch(e => setError(`Could not load file list: ${e.message}`));
  }, []);

  // Load data whenever the selected file changes
  useEffect(() => {
    if (!selectedFile) return;
    setData(null);
    setError(null);
    fetch(`${process.env.PUBLIC_URL}/data/${selectedFile}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message));
  }, [selectedFile]);

  if (error) return <div className="app-state app-error">Failed to load data: {error}</div>;
  if (!data)  return <div className="app-state app-loading">Loading…</div>;

  const { latest, forecast, metrics, counts, sources } = data;
  const catColor = kpColor(latest.predicted_kp);

  return (
    <div className="app">
      {/* ── Background ── */}
      <div className="app-bg">
        <FloatingLines
          enabledWaves={["top","middle","bottom"]}
          lineCount={8}
          lineDistance={8}
          bendRadius={8}
          bendStrength={-2}
          interactive
          parallax={true}
          animationSpeed={1}
          gradientStart="#45f5bf"
          gradientMid="#7C3AED"
          gradientEnd="#ff0000"
          globalEvents
        />
      </div>

      {/* ── Header ── */}

      <header className="app-header">
        <div className="header-left" > 
          <span className="app-title">GGSP~</span> 
          <span className="app-subtitle">Gabe's Geomagnetic Storm Prediction System</span>
        </div>
        
        <div className="header-right">
          <span className="header-date">Latest: {formatUTC(latest.time)}</span>
          <div className="header-sources">
            <a className="source-link" href={sources.plasma} target="_blank" rel="noreferrer">Plasma</a>
            <a className="source-link" href={sources.mag}    target="_blank" rel="noreferrer">Mag</a>
            <a className="source-link" href={sources.kp}     target="_blank" rel="noreferrer">Kp</a>
            <a className="source-link" href={sources.omni}   target="_blank" rel="noreferrer">OMNI</a>
          </div>
        </div>
      </header>

{/* ── Main content ── */}
      <main className="app-main">


      <div className ='welcome-card'>

      <h1>Welcome! </h1>
        <h4 style={{ padding: '5px' }}>GGSP predicts geomagnetic storms with real-time data analyzed through a linear regression model.</h4>
        <p>If you want to learn more about the ML aspects of our model, the repository can be found here:</p>
          <a className="github-link"href="https://github.com/chickens5/SUN">GitHub</a>
        
      </div>

        <div className="data-selector">
          {fileList.length > 1 && (
            <select
              className="file-picker"
              value={selectedFile ?? ''}
              onChange={e => setSelectedFile(e.target.value)}
            >
              {fileList.map(f => (
                <option key={f.file} value={f.file}>{f.label}</option>
              ))}
            </select>
          )}
          {fileList.length === 1 && (
            <span className="file-picker-label">{fileList[0].label}</span>
          )}
        </div>

        {/* ── Top stat cards ── */}
        <div className="stats-row">

          <StatCard title="Current Conditions" accent={catColor}>
            <div className="current-category" style={{ color: catColor }}>
              {latest.category.toUpperCase()}
            </div>
            <KpBar value={latest.predicted_kp} label="Predicted Kp" />
            <KpBar value={latest.observed_kp}  label="Observed Kp"  />
            <div className="stat-time">{formatUTC(latest.time)}</div>
          </StatCard>

          <StatCard title="72-Hour Storm Outlook" accent="#38bdf8">
            <OutlookRow
              label="Storm Probability"
              value={`${forecast.storm_chance_percent.toFixed(0)}%`}
              valueColor={forecast.storm_chance_percent > 20 ? '#f87171' : '#4ade80'}
            />
            <OutlookRow
              label="Mean Weighted Kp"
              value={forecast.mean_weighted_kp.toFixed(2)}
              valueColor={kpColor(forecast.mean_weighted_kp)}
            />
            <OutlookRow
              label="Peak Weighted Kp"
              value={forecast.peak_weighted_kp.toFixed(2)}
              valueColor={kpColor(forecast.peak_weighted_kp)}
            />
            <OutlookRow label="Forecast Seed" value={forecast.forecast_seed_source} small />
          </StatCard>

          <StatCard title="Model Performance" accent="#a78bfa">
            <OutlookRow label="MAE"            value={metrics.mae.toFixed(4)}           />
            <OutlookRow label="R²"             value={metrics.r2.toFixed(4)}            />
            <OutlookRow label="Baseline MAE"   value={metrics.baseline_mae.toFixed(4)}  />
            <OutlookRow label="Test Samples"   value={metrics.test_count.toLocaleString()} />
          </StatCard>

          <StatCard title="Data Ingestion" accent="#fb923c">
            <OutlookRow label="Plasma Rows"   value={counts.plasma_rows.toLocaleString()}   />
            <OutlookRow label="Mag Rows"      value={counts.mag_rows.toLocaleString()}       />
            <OutlookRow label="Kp Rows"       value={counts.kp_rows.toLocaleString()}        />
            <OutlookRow label="OMNI 3h Rows"  value={counts.omni_3h_rows.toLocaleString()}   />
          </StatCard>

        </div>

        {/* ── Forecast chart ── */}
        <section className="card chart-section">
          <h2 className="section-title">72-Hour Kp Forecast — 3h Steps</h2>
          <ForecastChart
            times={forecast.times}
            scenarios={forecast.kp_by_scenario}
            weighted={forecast.kp_weighted}
          />
        </section>

        {/* ── Scenario table ── */}
        <section className="card table-section">
          <h2 className="section-title">Scenario Breakdown</h2>
          <div className="table-wrapper">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Time (UTC)</th>
                  <th style={{ color: '#189947' }}>Quiet</th>
                  <th style={{ color: '#ff9900' }}>Moderate</th>
                  <th style={{ color: '#ff0000' }}>Active</th>
                  <th style={{ color: '#38bdf8' }}>Weighted</th>
                </tr>
              </thead>
              <tbody>
                {forecast.times.map((t, i) => {
                  const w = forecast.kp_weighted[i];
                  return (
                    <tr key={t} className={i % 2 === 0 ? 'tr-even' : 'tr-odd'}>
                      <td className="td-time">{formatUTC(t)}</td>
                      <td style={{ color: kpColor(forecast.kp_by_scenario.Quiet[i]) }}>
                        {forecast.kp_by_scenario.Quiet[i].toFixed(2)}
                      </td>
                      <td style={{ color: kpColor(forecast.kp_by_scenario.Moderate[i]) }}>
                        {forecast.kp_by_scenario.Moderate[i].toFixed(2)}
                      </td>
                      <td style={{ color: kpColor(forecast.kp_by_scenario.Active[i]) }}>
                        {forecast.kp_by_scenario.Active[i].toFixed(2)}
                      </td>
                      <td style={{ color: kpColor(w), fontWeight: 600 }}>{w.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="app-footer">
       <h3>GGSP · ML Kp Prediction | Data: NOAA SWPC + OMNI</h3>
      </footer>
    </div>
  );
}
