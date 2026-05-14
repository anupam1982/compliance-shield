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

  async function loadDashboard() {
    try {
      const [summaryData, scansData, reposData, trendsData] = await Promise.all([
        fetchData<Summary>("/api/metrics/summary"),
        fetchData<Scan[]>("/api/metrics/scans"),
        fetchData<RepoSummary[]>("/api/metrics/repos"),
        fetchData<Trend[]>("/api/metrics/trends")
      ]);

      setSummary(summaryData);
      setScans(scansData);
      setRepos(reposData);
      setTrends(trendsData);
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
              <tr key={scan.id}>
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
    </main>
  );
}

export default App;