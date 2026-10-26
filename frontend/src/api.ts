export type GraphNode = { id: string; labels: string[]; username?: string; full_name?: string; name?: string; bio?: string; description?: string; language?: string; stars?: number; category?: string; domain?: string; level?: string; html_url?: string };
export type GraphEdge = { id: string; type: string; source: string; target: string };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };
const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || 'Request failed');
  return body.data as T;
};
export const api = {
  health: () => request<{ status: string }>('/health'),
  stats: () => request<Record<string, number>>('/stats'),
  graph: () => request<Graph>('/graph?limit=200'),
  entities: (type: string) => request<GraphNode[]>(`/${type}?limit=200`),
  gaps: (username: string) => request<{ skill: string; domain: string; relevance: number }[]>(`/skills/gaps?username=${encodeURIComponent(username)}`),
  path: (from: string, to: string) => request<Graph>(`/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  preview: (repositoryUrl: string) => request<RepoPreview>('/import/github/preview', { method: 'POST', body: JSON.stringify({ repositoryUrl }) }),
  importRepo: (repositoryUrl: string) => request<{ repository: GraphNode; metadata: RepoPreview }>('/import/github', { method: 'POST', body: JSON.stringify({ repositoryUrl }) }),
  aiStatus: () => request<{ configured: boolean; provider: string | null }>('/ai/status')
};
export type RepoPreview = { full_name: string; name: string; owner: string; description: string; language: string | null; stars: number; forks: number; topics: string[]; html_url: string; source: string };
