import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { OverviewPage } from './pages/OverviewPage';
import { DataExplorerPage } from './pages/DataExplorerPage';
import { PreprocessingPage } from './pages/PreprocessingPage';
import { ReductionPage } from './pages/ReductionPage';
import { WarehousePage } from './pages/WarehousePage';
import { EtlPage } from './pages/EtlPage';
import { OlapPage } from './pages/OlapPage';
import { AssociationPage } from './pages/AssociationPage';
import { ClassificationPage } from './pages/ClassificationPage';
import { ClusteringPage } from './pages/ClusteringPage';
import { TimeSeriesPage } from './pages/TimeSeriesPage';
import { SequencePage } from './pages/SequencePage';
import { TextMiningPage } from './pages/TextMiningPage';
import { Unit6HubPage } from './pages/Unit6HubPage';
import { Unit6SpatialPage } from './pages/Unit6SpatialPage';
import { Unit6MultimediaPage } from './pages/Unit6MultimediaPage';
import { Unit6ApplicationsTrendsPage } from './pages/Unit6ApplicationsTrendsPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          {/* Core Pipeline */}
          <Route index element={<OverviewPage />} />
          <Route path="data-explorer" element={<DataExplorerPage />} />
          <Route path="explorer" element={<DataExplorerPage />} />
          <Route path="preprocessing" element={<PreprocessingPage />} />
          <Route path="reduction" element={<ReductionPage />} />
          <Route path="warehouse" element={<WarehousePage />} />
          <Route path="etl" element={<EtlPage />} />
          <Route path="olap" element={<OlapPage />} />
          <Route path="association" element={<AssociationPage />} />
          <Route path="classification" element={<ClassificationPage />} />
          <Route path="clustering" element={<ClusteringPage />} />
          <Route path="timeseries" element={<TimeSeriesPage />} />
          <Route path="sequences" element={<SequencePage />} />
          <Route path="text-mining" element={<TextMiningPage />} />
          <Route path="text" element={<TextMiningPage />} />

          {/* Unit 6 Complex Data Mining */}
          <Route path="unit6" element={<Unit6HubPage />} />
          <Route path="unit6/multidimensional" element={<OlapPage />} />
          <Route path="unit6/spatial" element={<Unit6SpatialPage />} />
          <Route path="unit6/multimedia" element={<Unit6MultimediaPage />} />
          <Route path="unit6/timeseries-sequences" element={<TimeSeriesPage />} />
          <Route path="unit6/timeseries-sequence" element={<TimeSeriesPage />} />
          <Route path="unit6/text" element={<TextMiningPage />} />
          <Route path="unit6/applications-trends" element={<Unit6ApplicationsTrendsPage />} />

          {/* Syllabus, Reporting, and Administration */}
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
