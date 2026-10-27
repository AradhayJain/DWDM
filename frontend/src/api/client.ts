import {
  OverviewMetrics, DatasetProfile, PreprocessingResult, ReductionResult,
  WarehouseSchema, OlapResult, AssociationResult, ClassificationResult,
  ClusteringResult, TimeSeriesResult, SequenceResult, TextMiningResult,
  SpatialResult, MultimediaResult, PipelineStatus, StageStatus
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.detail) errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    } catch (_) {}
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  // Health & Overview
  getHealth: () => request<{ status: string; service: string }>('/health'),
  getOverview: () => request<OverviewMetrics>('/overview'),

  // Dataset
  getDatasetProfile: (csvPath?: string) =>
    request<DatasetProfile>(`/dataset/profile${csvPath ? `?csv_path=${encodeURIComponent(csvPath)}` : ''}`),

  uploadDataset: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/dataset/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  // Preprocessing & Reduction
  runPreprocessing: (params: any) =>
    request<PreprocessingResult>('/preprocessing/run', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  runReduction: (params: any) =>
    request<ReductionResult>('/reduction/run', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Warehouse & OLAP
  getWarehouseSchema: (type: 'star' | 'snowflake' = 'star') =>
    request<WarehouseSchema>(`/warehouse/schema?schema_type=${type}`),

  runEtl: (csvPath?: string) =>
    request<any>(`/warehouse/etl/run${csvPath ? `?csv_path=${encodeURIComponent(csvPath)}` : ''}`, {
      method: 'POST',
    }),

  runOlapQuery: (params: any) =>
    request<OlapResult>('/olap/query', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Association Rules
  mineAssociationRules: (params: any) =>
    request<AssociationResult>('/association/mine', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Classification & Clustering
  trainClassification: (params: any) =>
    request<ClassificationResult>('/classification/train', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  runClustering: (params: any) =>
    request<ClusteringResult>('/clustering/run', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Unit 6 Complex Data Mining
  analyzeTimeSeries: (params: any) =>
    request<TimeSeriesResult>('/timeseries/analyze', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  analyzeSequences: (params: any) =>
    request<SequenceResult>('/sequences/analyze', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  analyzeText: (params: any) =>
    request<TextMiningResult>('/text/analyze', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  analyzeSpatial: (params: any) =>
    request<SpatialResult>('/spatial/analyze', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  uploadSpatial: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/spatial/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Spatial upload failed');
    return res.json();
  },

  analyzeMultimedia: (params?: any) =>
    request<MultimediaResult>('/multimedia/analyze', {
      method: 'POST',
      body: JSON.stringify(params || { use_sample_if_empty: true }),
    }),

  uploadMultimedia: async (files: FileList) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    const res = await fetch(`${API_BASE}/multimedia/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Multimedia upload failed');
    return res.json();
  },

  // Pipeline Orchestrator
  getPipelineStatus: () => request<PipelineStatus>('/pipeline/status'),
  runFullPipeline: (background = true) =>
    request<any>(`/pipeline/run?background=${background}`, { method: 'POST' }),
  runStage: (stageId: number) =>
    request<any>(`/pipeline/stages/${stageId}/run`, { method: 'POST' }),

  // Experiments List
  getExperiments: () => request<any[]>('/experiments'),

  // Reports
  getLatestReport: () => request<any>('/reports/latest'),
};
