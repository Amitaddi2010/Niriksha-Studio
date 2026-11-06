import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Layers, 
  Cpu, 
  Download, 
  Settings2,
  BookOpen,
  Menu,
  X
} from 'lucide-react';
import type { LMStudioHealth } from '../types';

interface HeaderProps {
  activeTab: 'landing' | 'workbench' | 'spreadsheet' | 'settings';
  setActiveTab: (tab: 'landing' | 'workbench' | 'spreadsheet' | 'settings') => void;
  health: LMStudioHealth | null;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onOpenSettings: () => void;
  onDownloadExcel: () => void;
  hasSpreadsheet: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  health,
  selectedModel,
  onSelectModel,
  onOpenSettings,
  onDownloadExcel,
  hasSpreadsheet
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isConnected = health?.connected && (health?.models?.length ?? 0) > 0;

  return (
    <header className="border-b border-[#e5e7eb] bg-[#ffffff] sticky top-0 z-30 shrink-0 select-none shadow-[rgba(255,255,255,0.6)_0px_0px_2px_0px_inset]">
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-2 max-w-[1920px] mx-auto">
        {/* Brand & Left Navigation */}
        <div className="flex items-center space-x-3 md:space-x-6 min-w-0 shrink-0">
          <div 
            className="flex items-center space-x-2.5 cursor-pointer shrink-0" 
            onClick={() => setActiveTab('landing')}
            title="Niriksha Studio Overview"
          >
            {/* Ramp-style black icon mark */}
            <div className="w-8 h-8 rounded-[6px] bg-[#0c0a08] flex items-center justify-center text-white shrink-0">
              <span className="font-mono text-xs font-normal tracking-tight text-[#e4f222]">NS</span>
            </div>
            
            <div className="flex flex-col justify-center shrink-0">
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <span className="text-[16px] tracking-tight text-[#0c0a08] font-normal">
                  Niriksha Studio
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-[6px] bg-[#f4f2f0] border border-[#e5e7eb] text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b]">
                  Desk
                </span>
              </div>
              <p className="hidden xl:block text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b] -mt-0.5 whitespace-nowrap">
                Systematic Review Extraction
              </p>
            </div>
          </div>

          {/* View Navigation Tabs — visible on desktop & tablet */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#f4f2f0] p-1 rounded-[6px] shrink-0">
            <button
              onClick={() => setActiveTab('landing')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[6px] text-xs whitespace-nowrap transition duration-150 ${
                activeTab === 'landing'
                  ? 'bg-[#ffffff] text-[#0c0a08] border border-[#e5e7eb]'
                  : 'text-[#6d6c6b] hover:text-[#0c0a08] hover:bg-[#ffffff]/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('workbench')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[6px] text-xs whitespace-nowrap transition duration-150 ${
                activeTab === 'workbench'
                  ? 'bg-[#ffffff] text-[#0c0a08] border border-[#e5e7eb]'
                  : 'text-[#6d6c6b] hover:text-[#0c0a08] hover:bg-[#ffffff]/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
              <span>Workbench</span>
            </button>

            <button
              onClick={() => setActiveTab('spreadsheet')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[6px] text-xs whitespace-nowrap transition duration-150 ${
                activeTab === 'spreadsheet'
                  ? 'bg-[#ffffff] text-[#0c0a08] border border-[#e5e7eb]'
                  : 'text-[#6d6c6b] hover:text-[#0c0a08] hover:bg-[#ffffff]/50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
              <span>Coding Form</span>
            </button>
          </nav>
        </div>

        {/* Desktop Controls (Large Viewports >= 1024px) */}
        <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
          {/* Model Selector Dropdown */}

          {/* Model Selector Dropdown */}
          {isConnected && health && health.models.length > 1 && (
            <div className="relative shrink-0">
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                className="max-w-[150px] xl:max-w-[190px] truncate px-2.5 py-1.5 bg-[#ffffff] border border-[#e5e7eb] rounded-[6px] text-xs text-[#0c0a08] focus:outline-none focus:border-[#0c0a08] font-mono cursor-pointer shrink-0"
                title={selectedModel}
              >
                {health.models.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* LM Studio Connection Pill — Ramp Obsidian with neon pulse */}
          <div 
            onClick={onOpenSettings}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-[6px] text-xs cursor-pointer transition duration-150 border shrink-0 whitespace-nowrap ${
              isConnected
                ? 'bg-[#1a1919] text-[#ffffff] border-[#1a1919] hover:bg-[#0c0a08]'
                : 'bg-[#ffffff] text-[#0c0a08] border-[#e5e7eb] hover:bg-[#f4f2f0]'
            }`}
            title="Click to configure LM Studio connection"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#e4f222]' : 'bg-[#6d6c6b]'}`} />
              {isConnected && (
                <span className="w-2 h-2 rounded-full bg-[#e4f222] animate-ping absolute inset-0 opacity-75" />
              )}
            </div>
            
            <div className="flex items-center space-x-1.5 max-w-[120px] truncate">
              <Cpu className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
              <span className="tracking-tight truncate font-mono text-[11px]">
                {isConnected 
                  ? (selectedModel ? selectedModel.split('/').pop() || selectedModel : 'LM Studio')
                  : 'LM Studio Offline'}
              </span>
            </div>

            {health?.latency_ms && (
              <span className="text-[10px] font-mono text-[#e4f222] ml-0.5">
                {health.latency_ms}ms
              </span>
            )}
          </div>

          {/* Download Spreadsheet Button — Ramp Outlined Button */}
          <button
            onClick={onDownloadExcel}
            disabled={!hasSpreadsheet}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[6px] border border-[#0c0a08] bg-transparent hover:bg-[#f4f2f0] disabled:border-[#e5e7eb] disabled:text-[#6d6c6b] disabled:hover:bg-transparent disabled:cursor-not-allowed text-[#0c0a08] text-xs whitespace-nowrap transition duration-150 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Mobile / Tablet Header Controls (< 1024px) */}
        <div className="flex lg:hidden items-center space-x-2 shrink-0">
          {/* Quick status dot */}
          <div 
            onClick={onOpenSettings}
            className="flex items-center space-x-1 px-2 py-1 rounded-[6px] border border-[#e5e7eb] bg-[#ffffff] text-xs cursor-pointer"
            title="LM Studio status"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#e4f222]' : 'bg-[#6d6c6b]'}`} />
            <span className="font-mono text-[11px] text-[#0c0a08]">
              {isConnected ? (selectedModel ? selectedModel.split('/').pop() : 'LM') : 'Offline'}
            </span>
          </div>

          {/* Export button compact */}
          {hasSpreadsheet && (
            <button
              onClick={onDownloadExcel}
              className="p-1.5 rounded-[6px] border border-[#0c0a08] text-[#0c0a08] hover:bg-[#f4f2f0]"
              title="Export Excel"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Hamburger / Menu toggle button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-[6px] bg-[#f4f2f0] border border-[#e5e7eb] text-[#0c0a08] hover:bg-[#ffffff] transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Visible when hamburger is toggled) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#e5e7eb] bg-[#ffffff] p-4 space-y-3">
          {/* Navigation links */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setActiveTab('landing');
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-[6px] text-xs text-center border ${
                activeTab === 'landing' ? 'bg-[#0c0a08] text-[#ffffff] border-[#0c0a08]' : 'bg-[#f4f2f0] text-[#0c0a08] border-[#e5e7eb]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab('workbench');
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-[6px] text-xs text-center border ${
                activeTab === 'workbench' ? 'bg-[#0c0a08] text-[#ffffff] border-[#0c0a08]' : 'bg-[#f4f2f0] text-[#0c0a08] border-[#e5e7eb]'
              }`}
            >
              Workbench
            </button>
            <button
              onClick={() => {
                setActiveTab('spreadsheet');
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-[6px] text-xs text-center border ${
                activeTab === 'spreadsheet' ? 'bg-[#0c0a08] text-[#ffffff] border-[#0c0a08]' : 'bg-[#f4f2f0] text-[#0c0a08] border-[#e5e7eb]'
              }`}
            >
              Coding Form
            </button>
          </div>

          {/* Quick Actions Row */}
          <div className="pt-2 border-t border-[#e5e7eb] space-y-2">
            {isConnected && health && health.models.length > 1 && (
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#6d6c6b]">Select Model:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => onSelectModel(e.target.value)}
                  className="px-2 py-1 bg-[#ffffff] border border-[#e5e7eb] rounded-[6px] text-xs text-[#0c0a08] font-mono"
                >
                  {health.models.map((m, i) => (
                    <option key={i} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-[6px] bg-[#0c0a08] text-[#ffffff] text-xs"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Configure LM Studio Endpoint</span>
            </button>

            <button
              onClick={() => {
                onDownloadExcel();
                setMobileMenuOpen(false);
              }}
              disabled={!hasSpreadsheet}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-[6px] border border-[#0c0a08] text-[#0c0a08] text-xs disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel Coding Form</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
