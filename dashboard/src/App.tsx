import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface Summary {
  totalScans: number;
  totalViolations: number;
  repositories: number;
  avgDurationMs: number;
}

interface Scan {
  id: number;
  owner: string;
  repo: string;
  scan_type: string;
  pr_number: number | null;
  scan_mode: string;
  violations_found: number;
  scanned_files: number;
  skipped_files: number;
  duration_ms: number;
  triggered_by: string | null;
  created_at: string;
}

interface RepoSummary {
  owner: string;
  repo: string;
  total_scans: number;
  last_scan_at: string;
  total_violations: number;
  avg_duration_ms: number;
}

interface Trend {
  scan_date: string;
  scans: number;
  violations: number;
}

interface SeverityAnalytics {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface RiskAnalytics {
  owner: string;
  repo: string;
  max_risk_score: number;
  avg_risk_score: number;
  last_scan_at: string;
}

interface ScanViolation {
  id: number;
  file_name: string;
  line_number: number | null;
  severity: string;
  indicator: string | null;
  message: string;
  suggested_fix: string | null;
  created_at: string;
}

interface ScanDetails {
  scan: Scan & {
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    risk_score: number;
  };
  violations: ScanViolation[];
}

interface RepositoryLeaderboardItem {
  owner: string;
  repo: string;
  total_scans: number;
  max_risk_score: number;
  avg_risk_score: number;
  critical_findings: number;
  high_findings: number;
  total_violations: number;
  last_scan_at: string;
}

interface OrgPosture {
  governanceScore: number;
  riskLevel: string;
  totalRepos: number;
  criticalRepos: number;
  totalViolations: number;
  totalCritical: number;
  totalHigh: number;
  executiveSummary: string;
}

interface OverrideGovernanceSummary {
  active_overrides: number;
  expired_overrides: number;
  total_overrides: number;
}

interface GovernanceDebt {
  debtScore: number;
  level: string;
}

async function fetchData<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  const json = await response.json();
  return json.data;
}

function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SeverityAnalytics | null>(null);
  const [risk, setRisk] = useState<RiskAnalytics[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanDetails | null>(null);
  const [scanDetailsLoading, setScanDetailsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<RepositoryLeaderboardItem[]>([]);
  const [orgPosture, setOrgPosture] = useState<OrgPosture | null>(null);
  const [
    overrideSummary,
    setOverrideSummary
  ] = useState<OverrideGovernanceSummary | null>(
    null
  );
  const [governanceDebt, setGovernanceDebt] = useState<GovernanceDebt | null>(null);

  async function openScanDetails(scanId: number) {
    try {
      setScanDetailsLoading(true);
  
      const details = await fetchData<ScanDetails>(
        `/api/metrics/scans/${scanId}`
      );
  
      setSelectedScan(details);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load scan details"
      );
    } finally {
      setScanDetailsLoading(false);
    }
  }

  async function loadDashboard() {
    try {
      const [
        summaryData,
        scansData,
        reposData,
        trendsData,
        severityData,
        riskData,
        leaderboardData,
        orgPostureData,
        overrideSummaryData,
        governanceDebtData
      ] = await Promise.all([
        fetchData<Summary>("/api/metrics/summary"),
        fetchData<Scan[]>("/api/metrics/scans"),
        fetchData<RepoSummary[]>("/api/metrics/repos"),
        fetchData<Trend[]>("/api/metrics/trends"),
        fetchData<SeverityAnalytics>("/api/metrics/severity"),
        fetchData<RiskAnalytics[]>("/api/metrics/risk"),
        fetchData<RepositoryLeaderboardItem[]>("/api/metrics/repo-leaderboard"),
        fetchData<OrgPosture>("/api/metrics/org-posture"),
        fetchData<OverrideGovernanceSummary>("/api/metrics/override-summary"),
        fetchData<GovernanceDebt>("/api/metrics/governance-debt")
      ]);
      
      setSummary(summaryData);
      setScans(scansData);
      setRepos(reposData);
      setTrends(trendsData);
      setSeverity(severityData);
      setRisk(riskData);
      setLeaderboard(leaderboardData);
      setOrgPosture(orgPostureData);
      setOverrideSummary(overrideSummaryData);
      setGovernanceDebt(governanceDebtData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Compliance Shield</p>
          <h1>Security Governance Dashboard</h1>
          <p className="subtitle">
            Monitor scans, violations, repository posture, and operational trends.
          </p>
        </div>

        <button onClick={loadDashboard}>Refresh</button>
      </section>
      {orgPosture && (
      <section className="org-posture-panel">
        <div>
          <p className="eyebrow">Enterprise Governance</p>
          <h2>Organization Security Posture</h2>
          <p>{orgPosture.executiveSummary}</p>
        </div>

        <div className="posture-score">
          <span>Governance Score</span>
          <strong>{orgPosture.governanceScore}/100</strong>
          <em>{orgPosture.riskLevel}</em>
        </div>

        <div className="posture-stats">
          <span>Repos: {orgPosture.totalRepos}</span>
          <span>Critical repos: {orgPosture.criticalRepos}</span>
          <span>Critical findings: {orgPosture.totalCritical}</span>
          <span>High findings: {orgPosture.totalHigh}</span>
        </div>
      </section>
    )}
    {overrideSummary && (
  <section className="panel">
    <div className="panel-header">
      <div>
        <p className="eyebrow">
          Governance
        </p>

        <h2>Override Governance</h2>
      </div>
    </div>

    <div className="cards">
      <div className="card">
        <p>Active Overrides</p>

        <strong>
          {overrideSummary.active_overrides}
        </strong>
      </div>

      <div className="card">
        <p>Expired Overrides</p>

        <strong>
          {overrideSummary.expired_overrides}
        </strong>
      </div>

      <div className="card">
        <p>Total Overrides</p>

        <strong>
          {overrideSummary.total_overrides}
        </strong>
      </div>
    </div>
  </section>
)}
{governanceDebt && (
  <section className="panel">
    <div className="panel-header">
      <div>
        <p className="eyebrow">
          Governance Debt
        </p>

        <h2>
          Governance Debt Score
        </h2>
      </div>
    </div>

    <div className="card">
      <p>Current Debt Level</p>

      <strong>
        {governanceDebt.debtScore}/100
      </strong>

      <p>
        Risk Level:
        {" "}
        {governanceDebt.level}
      </p>
    </div>
  </section>
)}
      {error && <div className="error">{error}</div>}

      <section className="cards">
        <div className="card">
          <p>Total scans</p>
          <strong>{summary?.totalScans ?? 0}</strong>
        </div>
        <div className="card">
          <p>Total violations</p>
          <strong>{summary?.totalViolations ?? 0}</strong>
        </div>
        <div className="card">
          <p>Repositories</p>
          <strong>{summary?.repositories ?? 0}</strong>
        </div>
        <div className="card">
          <p>Avg duration</p>
          <strong>{summary?.avgDurationMs ?? 0} ms</strong>
        </div>
      </section>

      <section className="cards">
      <div className="card severity-critical">
        <p>Critical</p>
        <strong>{severity?.critical ?? 0}</strong>
      </div>
      <div className="card severity-high">
        <p>High</p>
        <strong>{severity?.high ?? 0}</strong>
      </div>
      <div className="card severity-medium">
        <p>Medium</p>
        <strong>{severity?.medium ?? 0}</strong>
      </div>
      <div className="card severity-low">
        <p>Low</p>
        <strong>{severity?.low ?? 0}</strong>
      </div>
    </section>

      <section className="cards">
        <div className="card risk-score">
          <p>Risk score</p>
          <strong>
            {risk.length > 0 ? risk[0].max_risk_score : 0}
          </strong>
        </div>
      </section>

      <section className="panel">
        <h2>Scan Trends</h2>
        <div className="chart">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scan_date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="scans" />
              <Line type="monotone" dataKey="violations" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h2>Repositories</h2>
        <table>
          <thead>
            <tr>
              <th>Repository</th>
              <th>Total scans</th>
              <th>Total violations</th>
              <th>Avg duration</th>
              <th>Last scan</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => (
              <tr key={`${repo.owner}/${repo.repo}`}>
                <td>{repo.owner}/{repo.repo}</td>
                <td>{repo.total_scans}</td>
                <td>{repo.total_violations}</td>
                <td>{repo.avg_duration_ms} ms</td>
                <td>{new Date(repo.last_scan_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
      <h2>Repository Risk Ranking</h2>
      <table>
        <thead>
          <tr>
            <th>Repository</th>
            <th>Max risk score</th>
            <th>Avg risk score</th>
            <th>Last scan</th>
          </tr>
        </thead>
        <tbody>
          {risk.map((item: RiskAnalytics) => (
            <tr key={`${item.owner}/${item.repo}`}>
              <td>{item.owner}/{item.repo}</td>
              <td>
                <span className="risk-badge">{item.max_risk_score}/100</span>
              </td>
              <td>{item.avg_risk_score}/100</td>
              <td>{new Date(item.last_scan_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>

      <section className="panel">
        <h2>Recent Scans</h2>
        <table>
          <thead>
            <tr>
              <th>Repository</th>
              <th>Type</th>
              <th>PR</th>
              <th>Mode</th>
              <th>Violations</th>
              <th>Files</th>
              <th>Triggered by</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => (
              <tr
              key={scan.id}
              className="clickable-row"
              onClick={() => openScanDetails(scan.id)}
              >
                <td>{scan.owner}/{scan.repo}</td>
                <td>{scan.scan_type}</td>
                <td>{scan.pr_number ?? "-"}</td>
                <td>{scan.scan_mode}</td>
                <td>{scan.violations_found}</td>
                <td>{scan.scanned_files}</td>
                <td>{scan.triggered_by ?? "-"}</td>
                <td>{new Date(scan.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
  <div className="panel-header">
    <div>
      <p className="eyebrow">
        Governance
      </p>

      <h2>Top Risky Repositories</h2>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Repository</th>
        <th>Max Risk</th>
        <th>Avg Risk</th>
        <th>Critical</th>
        <th>Violations</th>
        <th>Scans</th>
      </tr>
    </thead>

    <tbody>
      {leaderboard.map((repo) => (
        <tr key={`${repo.owner}-${repo.repo}`}>
          <td>
            <strong>
              {repo.owner}/{repo.repo}
            </strong>
          </td>

          <td>
            <span
              className={`risk-pill ${
                repo.max_risk_score >= 80
                  ? "risk-critical"
                  : repo.max_risk_score >= 60
                  ? "risk-high"
                  : repo.max_risk_score >= 30
                  ? "risk-medium"
                  : "risk-low"
              }`}
            >
              {repo.max_risk_score}
            </span>
          </td>

          <td>{repo.avg_risk_score}</td>

          <td>{repo.critical_findings}</td>

          <td>{repo.total_violations}</td>

          <td>{repo.total_scans}</td>
        </tr>
      ))}
    </tbody>
  </table>
</section>
      {selectedScan && (
  <div className="modal-backdrop" onClick={() => setSelectedScan(null)}>
    <div className="modal" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <div>
          <p className="eyebrow">Scan Detail</p>
          <h2>
            {selectedScan.scan.owner}/{selectedScan.scan.repo}
          </h2>
        </div>

        <button onClick={() => setSelectedScan(null)}>Close</button>
      </div>

      <section className="detail-grid">
        <div className="detail-card">
          <p>Scan type</p>
          <strong>{selectedScan.scan.scan_type}</strong>
        </div>

        <div className="detail-card">
          <p>PR</p>
          <strong>{selectedScan.scan.pr_number ?? "-"}</strong>
        </div>

        <div className="detail-card">
          <p>Risk score</p>
          <strong>{selectedScan.scan.risk_score}/100</strong>
        </div>

        <div className="detail-card">
          <p>Violations</p>
          <strong>{selectedScan.scan.violations_found}</strong>
        </div>

        <div className="detail-card">
          <p>Files scanned</p>
          <strong>{selectedScan.scan.scanned_files}</strong>
        </div>

        <div className="detail-card">
          <p>Duration</p>
          <strong>{selectedScan.scan.duration_ms} ms</strong>
        </div>
      </section>

      <section className="severity-strip">
        <span>Critical: {selectedScan.scan.critical_count}</span>
        <span>High: {selectedScan.scan.high_count}</span>
        <span>Medium: {selectedScan.scan.medium_count}</span>
        <span>Low: {selectedScan.scan.low_count}</span>
      </section>

      <h3>Findings</h3>

      {selectedScan.violations.length === 0 ? (
        <p className="empty-state">No violations stored for this scan.</p>
      ) : (
        <div className="findings-list">
          {selectedScan.violations.map((violation) => (
            <div key={violation.id} className="finding-card">
              <div className="finding-header">
                <span className={`severity-pill ${violation.severity}`}>
                  {violation.severity.toUpperCase()}
                </span>

                <code>
                  {violation.file_name}
                  {violation.line_number ? `:${violation.line_number}` : ""}
                </code>
              </div>

              <p>{violation.message}</p>

              {violation.indicator && (
                <p>
                  <strong>Indicator:</strong>{" "}
                  <code>{violation.indicator}</code>
                </p>
              )}

              {violation.suggested_fix && (
                <p>
                  <strong>Suggested fix:</strong>{" "}
                  {violation.suggested_fix}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

{scanDetailsLoading && (
  <div className="loading-toast">Loading scan details...</div>
)}
    </main>
  );
}

export default App;