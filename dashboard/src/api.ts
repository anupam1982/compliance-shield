const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function fetchRepoRiskLearning() {
  const response = await fetch(
    `${API_BASE}/api/metrics/repo-risk-learning`
  );

  if (!response.ok) {
    throw new Error("Failed to load repository risk learning");
  }

  const result = await response.json();

  return result.data;
}