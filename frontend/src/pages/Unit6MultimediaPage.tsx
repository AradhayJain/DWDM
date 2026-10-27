import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Play, 
  AlertCircle, 
  Copy, 
  Layers, 
  Eye, 
  Fingerprint, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api/client';
import { MultimediaResult } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const Unit6MultimediaPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MultimediaResult | null>(null);
  const [useSample, setUseSample] = useState<boolean>(true);

  const fetchMultimedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeMultimedia({ use_sample_if_empty: useSample });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze multimedia images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMultimedia();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.uploadMultimedia(files);
      setData(res);
      setUseSample(false);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image assets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                DTU SE425 Practical Unit 6C
              </span>
              <span>•</span>
              <span className="text-slate-500">Multimedia Mining</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Multimedia Database Mining & Perceptual Hashing
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Extracts high-dimensional visual metadata, detects exact byte-level duplicates using MD5 hashes, 
              identifies visually identical/resized images using DCT Perceptual Hashing (pHash), and clusters 
              product catalog assets via normalized RGB color histograms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-colors">
              <Upload className="w-4 h-4 mr-1.5 text-slate-500" />
              <span>Upload Product Images</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleUpload} 
                className="hidden" 
              />
            </label>

            <button
              onClick={fetchMultimedia}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Play className="w-4 h-4 mr-1.5 fill-current" />
              <span>{loading ? 'Analyzing...' : 'Run Image Analysis'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox"
              checked={useSample}
              onChange={(e) => setUseSample(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-slate-700">Use Packaged Retail Image Catalog (if upload folder empty)</span>
          </label>
          <span>Supports JPEG, PNG, WebP, BMP formats</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Image Files"
            value={data.total_images}
            subtitle="Parsed and dimension-indexed"
            icon={ImageIcon}
          />
          <MetricCard 
            title="Exact Byte Duplicates"
            value={data.exact_duplicates?.length || 0}
            subtitle="Identical MD5 binary hashes"
            icon={Fingerprint}
          />
          <MetricCard 
            title="Perceptual Similar Pairs"
            value={data.perceptual_duplicates?.length || 0}
            subtitle="pHash Hamming distance ≤ 6"
            icon={Eye}
          />
          <MetricCard 
            title="Visual Color Clusters"
            value={data.visual_clusters?.length || 0}
            subtitle="24-bin RGB feature K-Means"
            icon={Layers}
          />
        </div>
      )}

      {/* Duplicate Detection Highlights */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exact Duplicates */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Exact File Duplicates (MD5 Hash)</h3>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                100% Binary Identical
              </span>
            </div>

            {data.exact_duplicates && data.exact_duplicates.length > 0 ? (
              <div className="space-y-3">
                {data.exact_duplicates.map((dup, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-500 text-[10px] truncate max-w-xs">
                        MD5: {dup.hash}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                        {dup.count} Duplicate Files
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dup.filenames.map((fname, fidx) => (
                        <span key={fidx} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-medium">
                          {fname}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No exact duplicate files detected. Each image in this catalog has a unique byte sequence.
              </div>
            )}
          </div>

          {/* Perceptual Duplicates (pHash) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Perceptual Duplicates (DCT pHash)</h3>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Visual Similarity Metric
              </span>
            </div>

            {data.perceptual_duplicates && data.perceptual_duplicates.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {data.perceptual_duplicates.map((pair, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">
                        {pair.image_1} <span className="text-slate-400 font-normal">↔</span> {pair.image_2}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Hamming Distance: <span className="font-mono font-semibold text-slate-700">{pair.hamming_distance} bits</span> / 64
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-indigo-600">
                        {pair.similarity}%
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {pair.is_exact_file_match ? 'Same File' : 'Perceptual Match'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No perceptual duplicate pairs within Hamming distance threshold (≤ 6).
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Color Clustering */}
      {data && data.visual_clusters && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Visual Catalog Clusters (Color Histogram Features)</h3>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700">
              K-Means on 24-Dimensional RGB Signature
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.visual_clusters.map((cluster) => (
              <div key={cluster.cluster_id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>Visual Theme {cluster.cluster_id}</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[11px]">
                    {cluster.image_count} Images
                  </span>
                </div>
                <div className="divide-y divide-slate-200/60 pt-1">
                  {cluster.images.map((imgName, i) => (
                    <div key={i} className="py-1 text-xs text-slate-600 truncate">
                      • {imgName}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Image Metadata Table */}
      {data && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Image Asset Index & Extracted Metadata</h3>
              <p className="text-xs text-slate-500">Structured feature extraction across spatial, cryptographic, and frequency domains</p>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {data.images_metadata?.length || 0} Assets
            </span>
          </div>

          <DataTable 
            columns={[
              { key: 'filename', header: 'Asset Filename' },
              { key: 'format', header: 'Format' },
              { key: 'file_size_kb', header: 'Size (KB)', render: (r: any) => `${r.file_size_kb} KB` },
              { 
                key: 'dimensions', 
                header: 'Resolution (W × H)', 
                render: (r: any) => `${r.width} × ${r.height}` 
              },
              { key: 'aspect_ratio', header: 'Aspect Ratio', render: (r: any) => `${r.aspect_ratio}:1` },
              { 
                key: 'md5_hash', 
                header: 'MD5 Hash', 
                render: (r: any) => (
                  <span className="font-mono text-[10px] text-slate-600 truncate max-w-[120px] block" title={r.md5_hash}>
                    {r.md5_hash.slice(0, 10)}...
                  </span>
                ) 
              },
              { 
                key: 'phash', 
                header: 'Perceptual pHash', 
                render: (r: any) => (
                  <span className="font-mono text-[10px] text-indigo-600 font-semibold" title={r.phash}>
                    {r.phash}
                  </span>
                ) 
              },
              { 
                key: 'dhash', 
                header: 'Difference dHash', 
                render: (r: any) => (
                  <span className="font-mono text-[10px] text-slate-500" title={r.dhash}>
                    {r.dhash}
                  </span>
                ) 
              },
            ]}
            data={data.images_metadata || []}
            pageSize={6}
          />
        </div>
      )}

      {/* Academic Methodology Callout */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <Info className="w-4 h-4 mr-1.5 text-indigo-600" />
          DTU SE425 Theoretical Framework: Cryptographic vs. Perceptual Image Hashing
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          In multimedia data mining, cryptographic hashes such as <strong>MD5</strong> or <strong>SHA-256</strong> 
          exhibit an avalanche effect: altering even a single pixel or changing compression bitrates flips 50% of the output bits. 
          Consequently, cryptographic hashes fail completely at identifying duplicate product photos that have been cropped, watermarked, or compressed for web display.
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          To overcome this limitation, our lab implements <strong>Discrete Cosine Transform (DCT) Perceptual Hashing (pHash)</strong>. 
          pHash computes a low-frequency 64-bit fingerprint of luminance gradients. Visual similarity is measured via 
          <strong> Hamming distance</strong> (the count of divergent bits between two 64-bit vectors). Two images with Hamming distance ≤ 6 
          are mathematically proven to be perceptual duplicates regardless of scaling or JPEG quantization.
        </p>
      </div>
    </div>
  );
};
