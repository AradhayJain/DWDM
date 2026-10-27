import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, Filter, Scissors, Warehouse, GitBranch,
  Layers, ShoppingCart, GitMerge, UserCheck, TrendingUp, ListOrdered,
  FileText, Sparkles, MapPin, Image as ImageIcon, Briefcase, FileBarChart,
  Settings, ChevronDown, ChevronRight, Activity, BookOpen
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [unit6Open, setUnit6Open] = useState(true);

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/data-explorer', label: 'Data Explorer', icon: Database, badge: 'Exp 1' },
    { to: '/preprocessing', label: 'Preprocessing', icon: Filter, badge: 'Exp 2' },
    { to: '/reduction', label: 'Data Reduction', icon: Scissors, badge: 'Exp 3' },
    { to: '/warehouse', label: 'Data Warehouse', icon: Warehouse, badge: 'Exp 4' },
    { to: '/etl', label: 'ETL Pipeline', icon: GitBranch, badge: 'Exp 6' },
    { to: '/olap', label: 'OLAP Explorer', icon: Layers, badge: 'Exp 5' },
    { to: '/association', label: 'Association Rules', icon: ShoppingCart, badge: 'Exp 7-9' },
    { to: '/classification', label: 'Classification', icon: GitMerge, badge: 'Exp 10-11' },
    { to: '/clustering', label: 'Clustering & Outliers', icon: UserCheck, badge: 'Exp 12' },
    { to: '/timeseries', label: 'Time-Series & Forecast', icon: TrendingUp },
    { to: '/sequences', label: 'Sequence Mining', icon: ListOrdered },
    { to: '/text-mining', label: 'Text Mining', icon: FileText },
  ];

  const unit6SubItems = [
    { to: '/unit6', label: 'Unit 6 Overview Hub', icon: Sparkles },
    { to: '/unit6/multidimensional', label: '6A. Multidimensional OLAP', icon: Layers },
    { to: '/unit6/spatial', label: '6B. Spatial Database Mining', icon: MapPin },
    { to: '/unit6/multimedia', label: '6C. Multimedia Image Mining', icon: ImageIcon },
    { to: '/unit6/timeseries-sequences', label: '6D. Time-Series & Sequences', icon: TrendingUp },
    { to: '/unit6/text', label: '6E. Text Database Mining', icon: FileText },
    { to: '/unit6/applications-trends', label: '6F. Applications & Trends', icon: Briefcase },
  ];

  const bottomItems = [
    { to: '/experiments', label: 'Experiments Syllabus', icon: BookOpen },
    { to: '/reports', label: 'Audit Reports & PDF', icon: FileBarChart },
    { to: '/settings', label: 'Settings & Database', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-slate-300 z-50 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-600/30">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Retail Intelligence Lab
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">DTU SE425 • DWDM</p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-xs">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Core Data Pipeline
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4 opacity-80" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Unit 6 Section */}
          <div className="pt-4">
            <button
              onClick={() => setUnit6Open(!unit6Open)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-primary-400">
                <Sparkles className="w-3.5 h-3.5" />
                Unit 6 Complex Mining
              </span>
              {unit6Open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {unit6Open && (
              <div className="mt-1 pl-2 space-y-0.5 border-l border-slate-800 ml-3">
                {unit6SubItems.map((sub) => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-600/30 text-primary-200 border-l-2 border-primary-500'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                      }`
                    }
                  >
                    <sub.icon className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate">{sub.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 pb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Audit & System
          </div>

          {bottomItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <item.icon className="w-4 h-4 opacity-80" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              SQLite Warehouse
            </span>
            <span className="font-mono text-slate-500">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
