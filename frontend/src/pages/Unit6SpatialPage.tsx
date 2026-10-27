import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Upload, 
  Play, 
  AlertCircle, 
  Layers, 
  Globe, 
  Compass, 
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  Cell 
} from 'recharts';
import { api } from '../api/client';
import { SpatialResult } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const Unit6SpatialPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SpatialResult | null>(null);
  const [epsKm, setEpsKm] = useState<number>(150);
  const [minPoints, setMinPoints] = useState<number>(2);
  const [useSample, setUseSample] = useState<boolean>(true);

  const fetchSpatial = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeSpatial({
        use_sample_if_none: useSample,
        dbscan_eps_km: epsKm,
        dbscan_min_points: minPoints
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze spatial dataset');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpatial();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.uploadSpatial(file);
      setData(res);
      setUseSample(false);
    } catch (err: any) {
      setError(err.message || 'Failed to upload spatial CSV file');
    } finally {
      setLoading(false);
    }
  };

  // Color generator for DBSCAN clusters
  const clusterColors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
  const getClusterColor = (clusterId: number) => {
    if (clusterId === -1) return '#ef4444'; // Red for noise/outlier
    return clusterColors[clusterId % clusterColors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                DTU SE425 Practical Unit 6B
              </span>
              <span>•</span>
              <span className="text-slate-500">Spatial Data Mining</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Spatial Database Mining & GIS Density Clustering
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Analyzes country-level transaction revenue from the Online Retail warehouse alongside spatial GPS 
              coordinate datasets. Computes true spherical Haversine distance matrices and applies density-based 
              spatial clustering (DBSCAN) to discover distribution hubs and geographic outliers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-colors">
              <Upload className="w-4 h-4 mr-1.5 text-slate-500" />
              <span>Upload Spatial CSV</span>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>

            <button
              onClick={fetchSpatial}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Play className="w-4 h-4 mr-1.5 fill-current" />
              <span>{loading ? 'Computing...' : 'Run Spatial Analysis'}</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              DBSCAN Neighborhood Radius (Epsilon km)
            </label>
            <div className="flex items-center space-x-2">
              <input 
                type="number"
                min="10"
                max="5000"
                step="10"
                value={epsKm}
                onChange={(e) => setEpsKm(Number(e.target.value))}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500 font-medium">km</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Maximum Haversine radius for spatial density.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Minimum Samples (minPts)
            </label>
            <input 
              type="number"
              min="1"
              max="20"
              value={minPoints}
              onChange={(e) => setMinPoints(Number(e.target.value))}
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Min points within radius to form a core cluster.</p>
          </div>

          <div className="flex items-center pt-4">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input 
                type="checkbox"
                checked={useSample}
                onChange={(e) => setUseSample(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">Use Packaged Retail Spatial Dataset</span>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Metrics */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Spatial Points"
            value={data.total_locations}
            subtitle="Validated lat/long GPS locations"
            icon={MapPin}
          />
          <MetricCard 
            title="Spatial Density Clusters"
            value={data.spatial_clusters?.filter(c => !c.is_noise).length || 0}
            subtitle={`${epsKm} km radius threshold`}
            icon={Layers}
          />
          <MetricCard 
            title="Isolated Outlier Locations"
            value={data.spatial_clusters?.find(c => c.is_noise)?.point_count || 0}
            subtitle="DBSCAN label -1 (remote points)"
            icon={Compass}
          />
          <MetricCard 
            title="Distance Formulation"
            value="Great-Circle"
            subtitle="Haversine spherical metric"
            icon={Globe}
          />
        </div>
      )}

      {/* Visualizations Section */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spatial Scatter Plot (Lat vs Lon) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Geographic Coordinate Map (DBSCAN Clusters)</h3>
                <p className="text-xs text-slate-500">Longitude (X-Axis) vs. Latitude (Y-Axis) colored by spatial cluster</p>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {data.locations?.length || 0} Coordinates
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    dataKey="longitude" 
                    name="Longitude" 
                    unit="°" 
                    tick={{ fontSize: 11 }}
                    domain={['auto', 'auto']}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="latitude" 
                    name="Latitude" 
                    unit="°" 
                    tick={{ fontSize: 11 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const pt = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded shadow-lg space-y-1">
                          <p className="font-bold">{pt.name} ({pt.city}, {pt.country})</p>
                          <p>Lat: {pt.latitude}° | Lon: {pt.longitude}°</p>
                          <p className={pt.cluster_id === -1 ? 'text-red-400 font-semibold' : 'text-indigo-400 font-semibold'}>
                            {pt.cluster_id === -1 ? 'Spatial Outlier' : `Cluster ${pt.cluster_id}`}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Scatter name="Locations" data={data.locations}>
                    {data.locations?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getClusterColor(entry.cluster_id)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs border-t border-slate-100">
              <span className="font-semibold text-slate-600">Clusters:</span>
              {data.spatial_clusters?.map((c) => (
                <div key={c.cluster_id} className="flex items-center space-x-1.5">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getClusterColor(c.cluster_id) }}
                  />
                  <span className="text-slate-600 text-[11px]">{c.name} ({c.point_count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Retail Country Revenue Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Retail Geographic Distribution</h3>
                <p className="text-xs text-slate-500">Top revenue countries from Online Retail transaction log</p>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Warehouse Ground Truth
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.retail_country_revenue?.slice(0, 8)} margin={{ top: 10, right: 10, bottom: 25, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="country" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `£${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(val: number) => [`£${val.toLocaleString()}`, 'Total Revenue']}
                    contentStyle={{ fontSize: '11px', borderRadius: '6px', borderColor: '#e2e8f0' }}
                  />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>UK dominance: {(data.regional_share?.find(r => r.region === 'UK')?.share * 100 || 84).toFixed(1)}% of global volume</span>
              <span>Regional breakdown enabled</span>
            </div>
          </div>
        </div>
      )}

      {/* Tables: Spatial Points & Clusters */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">DBSCAN Spatial Cluster Profiles</h3>
            <p className="text-xs text-slate-500">Clusters derived via precomputed spherical distances</p>
            <div className="divide-y divide-slate-100">
              {data.spatial_clusters?.map((c) => (
                <div key={c.cluster_id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: getClusterColor(c.cluster_id) }}
                    />
                    <span className="font-medium text-slate-800">{c.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    c.is_noise ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {c.point_count} locations
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Spatial Locations & Coordinate Inspection</h3>
            <p className="text-xs text-slate-500">Individual GPS entities with assigned density clusters</p>
            <DataTable 
              columns={[
                { key: 'name', header: 'Store / Location Name' },
                { key: 'city', header: 'City' },
                { key: 'country', header: 'Country' },
                { 
                  key: 'latitude', 
                  header: 'Latitude', 
                  render: (r: any) => `${r.latitude.toFixed(4)}°` 
                },
                { 
                  key: 'longitude', 
                  header: 'Longitude', 
                  render: (r: any) => `${r.longitude.toFixed(4)}°` 
                },
                { 
                  key: 'cluster_id', 
                  header: 'Spatial Cluster', 
                  render: (r: any) => (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.is_outlier ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {r.is_outlier ? 'Outlier (-1)' : `Cluster ${r.cluster_id}`}
                    </span>
                  ) 
                },
              ]}
              data={data.locations || []}
              pageSize={6}
            />
          </div>
        </div>
      )}

      {/* Academic Methodology Callout */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <Info className="w-4 h-4 mr-1.5 text-indigo-600" />
          DTU SE425 Theoretical Distinction: Spatial vs. Relational Geography
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          In standard relational schemas like <code className="text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">Online Retail</code>, 
          the attribute <code className="text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">Country</code> represents a categorical dimension, 
          not a true geometric coordinate. Attempting to run distance-based spatial algorithms like DBSCAN on string names is mathematically invalid.
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          To fulfill the spatial mining syllabus rigorously, this platform implements true 
          <strong> Great-Circle Haversine distance matrices</strong> over dual latitude/longitude degree tuples:
          <br />
          <code className="text-indigo-900 bg-indigo-50/50 block p-2 rounded mt-1 border border-indigo-100 font-mono text-[11px]">
            d = 2R · arcsin(√(sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)))
          </code>
          This ensures clustering correctly respects spherical Earth topology without distortions from Euclidean flat projections.
        </p>
      </div>
    </div>
  );
};
