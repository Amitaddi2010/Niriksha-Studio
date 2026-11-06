import React from 'react';
import { 
  X, 
  RefreshCw, 
  Zap
} from 'lucide-react';
import type { LMStudioHealth } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: LMStudioHealth | null;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  temperature: number;
  setTemperature: (t: number) => void;
  onRefreshHealth: () => void;
  isChecking: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  health,
  baseUrl,
  setBaseUrl,
  selectedModel,
  setSelectedModel,
  temperature,
  setTemperature,
  onRefreshHealth,
  isChecking
}) => {
  if (!isOpen) return null;

  const isConnected = health?.connected && (health?.models?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c0a08]/40 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <div>
            <h3 className="text-base text-[#0c0a08] font-normal tracking-tight">
              Local LLM Configuration
            </h3>
            <p className="text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b]">
              LM Studio & Local Server Settings
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-[#6d6c6b] hover:text-[#0c0a08] hover:bg-[#f4f2f0] transition"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Ramp Inverted Panel for Status */}
          <div className={`p-4 rounded-[12px] ${
            isConnected
              ? 'bg-[#1a1919] text-[#ffffff]'
              : 'bg-[#f4f2f0] text-[#0c0a08] border border-[#e5e7eb]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#e4f222]' : 'bg-[#6d6c6b]'}`} />
                <h4 className="text-xs font-normal tracking-tight">
                  {isConnected ? 'LM Studio Server Online & Active' : 'LM Studio Not Reachable'}
                </h4>
              </div>
              {health?.latency_ms && (
                <span className="font-mono text-[10px] text-[#e4f222]">
                  {health.latency_ms}ms latency
                </span>
              )}
            </div>
            <p className={`text-xs mt-1.5 ${isConnected ? 'text-[#d3d3d3]' : 'text-[#6d6c6b]'}`}>
              {isConnected 
                ? `Found ${health?.models?.length || 0} active local model(s) ready for structured extraction.`
                : 'Could not connect to LM Studio on port 1234. Make sure the local server is started.'}
            </p>
          </div>

          {/* LM Studio Server URL */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b]">
              LM Studio API URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:1234/v1"
                className="flex-1 px-3.5 py-2 bg-[#ffffff] border border-[#e5e7eb] rounded-[10px] text-xs font-mono text-[#0c0a08] focus:outline-none focus:border-[#0c0a08]"
              />
              <button
                type="button"
                onClick={onRefreshHealth}
                disabled={isChecking}
                className="flex items-center space-x-1.5 px-3.5 py-2 border border-[#0c0a08] bg-[#ffffff] hover:bg-[#f4f2f0] text-[#0c0a08] rounded-[6px] text-xs transition duration-150 shrink-0"
              >
                <RefreshCw className={`w-3 h-3 stroke-[1.5] ${isChecking ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>
            </div>
            <p className="text-[11px] text-[#6d6c6b]">
              Default is standard LM Studio local address: <code className="text-[#0c0a08]">http://localhost:1234/v1</code>
            </p>
          </div>

          {/* Model Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b]">
              Active Local Model
            </label>
            {health?.models && health.models.length > 0 ? (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#ffffff] border border-[#e5e7eb] rounded-[10px] text-xs text-[#0c0a08] focus:outline-none focus:border-[#0c0a08] cursor-pointer"
              >
                {health.models.map((m, i) => (
                  <option key={i} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-[#f4f2f0] border border-[#e5e7eb] rounded-[10px] text-xs text-[#6d6c6b] flex items-center justify-between">
                <span>No models found on server. Start a model in LM Studio.</span>
                <button
                  type="button"
                  onClick={onRefreshHealth}
                  className="text-[#0c0a08] underline text-xs"
                >
                  Rescan
                </button>
              </div>
            )}
          </div>

          {/* Temperature Setting */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b]">
                Sampling Temperature
              </label>
              <span className="font-mono text-xs text-[#0c0a08]">
                {temperature}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[#0c0a08] h-1.5 bg-[#e5e7eb] rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-[#6d6c6b]">
              Lower temperatures (0.0 – 0.2) yield factual, deterministic answers suitable for systematic literature extraction.
            </p>
          </div>

          {/* Guide Card (Wash Card) */}
          <div className="p-4 bg-[#f4f2f0] border border-[#e5e7eb] rounded-[12px] text-xs space-y-2">
            <div className="flex items-center space-x-1.5 text-[#0c0a08]">
              <Zap className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="text-[10px] uppercase tracking-[0.18px]">LM Studio Instructions</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[#6d6c6b] text-xs leading-relaxed">
              <li>Launch <strong>LM Studio</strong> on your machine.</li>
              <li>Load any instruction model (e.g. <em>Qwen 2.5</em>, <em>Llama 3.3</em>, or <em>Mistral</em>).</li>
              <li>Open the <strong>Developer / Local Server</strong> tab (<code className="text-[#0c0a08]">&lt;&gt;</code> icon on the left).</li>
              <li>Click <strong>Start Server</strong> (default port <code className="text-[#0c0a08]">1234</code>).</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#e5e7eb] bg-[#ffffff] space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#e5e7eb] hover:bg-[#f4f2f0] text-[#0c0a08] rounded-[6px] text-xs transition"
          >
            Close
          </button>
          {/* Ramp Highlighter Primary CTA */}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#e4f222] hover:bg-[#d6e41b] text-[#0c0a08] rounded-[6px] text-xs font-normal transition duration-150"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
