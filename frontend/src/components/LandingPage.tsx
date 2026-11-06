import React from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  FileSpreadsheet, 
  Database, 
  Highlighter,
  Lock
} from 'lucide-react';
import type { LMStudioHealth } from '../types';

interface LandingPageProps {
  onLaunchWorkbench: () => void;
  health: LMStudioHealth | null;
  selectedModel: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchWorkbench,
  health,
  selectedModel
}) => {
  const isConnected = health?.connected && (health?.models?.length ?? 0) > 0;

  return (
    <div className="min-h-full bg-[#f4f2f0] text-[#0c0a08] flex flex-col font-normal select-none overflow-y-auto">
      {/* 1. Top Announcement Bar (Ramp 40px Header Strip) */}
      <div className="bg-[#ffffff] border-b border-[#e5e7eb] py-2 px-4 text-center text-xs text-[#6d6c6b] flex items-center justify-center space-x-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#e4f222]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18px] text-[#0c0a08]">
          Niriksha Studio 2.0
        </span>
        <span className="text-[#e5e7eb]">|</span>
        <span>Modern AI-Assisted Systematic Review & Meta-Analysis Data Extraction</span>
        <span className="hidden md:inline text-[#6d6c6b]">• Pure Local Intelligence via LM Studio</span>
      </div>

      {/* 2. Hero Section */}
      <section className="px-6 pt-16 pb-12 max-w-[1240px] mx-auto w-full text-center flex flex-col items-center">
        {/* Editorial Sub-badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[6px] bg-[#ffffff] border border-[#e5e7eb] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e4f222]" />
          <span className="text-[11px] uppercase tracking-[0.18px] text-[#0c0a08] font-mono">
            AIR-GAPPED RESEARCH DESK
          </span>
          <span className="text-[#6d6c6b] text-[11px]">•</span>
          <span className="text-[11px] text-[#6d6c6b]">Systematic Review Intelligence</span>
        </div>

        {/* Display Headline — Lausanne 400 with tight leading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl text-[#0c0a08] tracking-tight max-w-4xl font-normal leading-[1.05] mb-6">
          Extract research data from 100s of papers. <br className="hidden sm:inline" />
          <span className="bg-[#e4f222] px-2 py-0.5 rounded-[4px] text-[#0c0a08]">
            Zero cloud leaks.
          </span>{' '}
          Pure local LLM speed.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#6d6c6b] max-w-2xl leading-relaxed mb-8">
          The high-performance, private research desk for systematic literature review. Pair your local LM Studio models with in-browser vector PDF rendering, automated coding forms, and persistent SQLite storage.
        </p>

        {/* Hero CTAs: Ramp Highlighter Yellow Primary + Outlined Secondary */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mb-12">
          <button
            onClick={onLaunchWorkbench}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-[6px] bg-[#e4f222] hover:bg-[#d8e61b] text-[#0c0a08] text-sm font-normal transition duration-150 shadow-none cursor-pointer"
          >
            <span>Launch Extraction Desk</span>
            <ArrowRight className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Live System Connectivity Ticker (Obsidian #1a1919 dark band) */}
        <div className="w-full max-w-4xl rounded-[12px] bg-[#1a1919] text-[#ffffff] p-4 border border-[#0c0a08] shadow-sm mb-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left divide-y sm:divide-y-0 sm:divide-x divide-[#6d6c6b]/30">
            <div className="px-3 pt-2 sm:pt-0">
              <div className="text-[10px] uppercase font-mono tracking-[0.18px] text-[#6d6c6b]">LLM Backend</div>
              <div className="text-sm font-mono text-[#ffffff] flex items-center space-x-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#e4f222]' : 'bg-[#6d6c6b]'}`} />
                <span className="truncate">{isConnected ? 'LM Studio Connected' : 'LM Studio Offline'}</span>
              </div>
            </div>

            <div className="px-3 pt-2 sm:pt-0">
              <div className="text-[10px] uppercase font-mono tracking-[0.18px] text-[#6d6c6b]">Active Model</div>
              <div className="text-sm font-mono text-[#ffffff] truncate mt-1">
                {selectedModel ? selectedModel.split('/').pop() : 'None Loaded'}
              </div>
            </div>

            <div className="px-3 pt-2 sm:pt-0">
              <div className="text-[10px] uppercase font-mono tracking-[0.18px] text-[#6d6c6b]">Data Privacy</div>
              <div className="text-sm text-[#e4f222] font-mono mt-1 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>100% Air-Gapped</span>
              </div>
            </div>

            <div className="px-3 pt-2 sm:pt-0">
              <div className="text-[10px] uppercase font-mono tracking-[0.18px] text-[#6d6c6b]">Persistence Engine</div>
              <div className="text-sm font-mono text-[#ffffff] mt-1 flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-[#e4f222] shrink-0" />
                <span>SQLite + OpenPyXL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Visual Mockup — Ramp Browser Frame */}
        <div className="w-full max-w-5xl rounded-[16px] bg-[#ffffff] border border-[#e5e7eb] p-2 sm:p-4 text-left">
          {/* Window Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] px-2">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#e5e7eb]" />
              <span className="w-3 h-3 rounded-full bg-[#e5e7eb]" />
              <span className="w-3 h-3 rounded-full bg-[#e5e7eb]" />
              <span className="text-[11px] font-mono text-[#6d6c6b] ml-2">niriksha-studio://workbench/ruby2016.pdf</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-[4px] bg-[#e4f222] text-[#0c0a08] text-[10px] font-mono">
                12 VARS EXTRACTED
              </span>
            </div>
          </div>

          {/* Interactive Workbench Mini Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3">
            {/* Left simulated PDF */}
            <div className="md:col-span-7 bg-[#f4f2f0] rounded-[8px] p-4 border border-[#e5e7eb] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#6d6c6b] pb-2 border-b border-[#e5e7eb]">
                <span className="font-mono text-[10px]">RUBY ET AL. (2016) • PAGE 1 OF 11</span>
                <span className="bg-[#e4f222] text-[#0c0a08] px-2 py-0.5 rounded text-[10px]">CITING ACTIVE</span>
              </div>
              <div className="bg-[#ffffff] p-4 rounded-[6px] border border-[#e5e7eb] text-xs space-y-2">
                <h4 className="font-normal text-sm text-[#0c0a08]">
                  Evaluating the Efficacy of Active Learning Interventions in Undergraduate STEM
                </h4>
                <p className="text-[11px] text-[#6d6c6b] leading-relaxed">
                  A multi-site randomized controlled trial investigating student persistence and conceptual mastery in introductory physics courses.
                </p>
                <div className="bg-[#e4f222]/30 border-l-2 border-[#0c0a08] p-2 text-[11px] text-[#0c0a08]">
                  "Across N=428 participants, lecture-free cooperative cohorts demonstrated an effect size of d=0.64 (p &lt; 0.001) over conventional didactic lecturing."
                </div>
              </div>
            </div>

            {/* Right simulated Card */}
            <div className="md:col-span-5 bg-[#ffffff] rounded-[8px] p-4 border border-[#e5e7eb] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-[#6d6c6b]">VARIABLE #04</span>
                <span className="bg-[#e4f222] text-[#0c0a08] px-2 py-0.5 rounded-[4px] text-[10px] uppercase font-mono">
                  CONFIDENCE: HIGH
                </span>
              </div>
              <div className="text-xs text-[#0c0a08] font-normal">
                Reported Sample Size and Effect Size
              </div>
              <div className="p-2.5 rounded-[8px] bg-[#f4f2f0] border border-[#e5e7eb] font-mono text-xs text-[#0c0a08]">
                N = 428; Cohen's d = 0.64 (p &lt; 0.001)
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b]">Source: Page 1</span>
                <button 
                  onClick={onLaunchWorkbench}
                  className="px-3 py-1 bg-[#0c0a08] text-[#ffffff] rounded-[6px] text-xs"
                >
                  Verify & Record
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Value Pillars — Ramp 4-Grid Content Cards */}
      <section className="px-6 py-16 bg-[#ffffff] border-y border-[#e5e7eb]">
        <div className="max-w-[1240px] mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[10px] uppercase font-mono tracking-[0.18px] text-[#6d6c6b]">
              ENGINEERED FOR RIGOROUS RESEARCH
            </span>
            <h2 className="text-3xl text-[#0c0a08] font-normal tracking-tight mt-1">
              Built for Systematic Reviews & Meta-Analyses
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1 */}
            <div className="p-6 rounded-[16px] bg-[#f4f2f0] border border-[#e5e7eb] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[10px] bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center text-[#0c0a08] mb-4">
                  <ShieldCheck className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h3 className="text-base text-[#0c0a08] font-normal mb-2">100% Local & Private</h3>
                <p className="text-xs text-[#6d6c6b] leading-relaxed">
                  Zero external API calls. Your proprietary review forms, grant data, and embargoed clinical trials stay safely on your local machine.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e5e7eb] text-[10px] font-mono text-[#0c0a08] uppercase">
                LM Studio • GGUF Models
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-[16px] bg-[#f4f2f0] border border-[#e5e7eb] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[10px] bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center text-[#0c0a08] mb-4">
                  <Highlighter className="w-5 h-5 text-[#0c0a08] stroke-[1.5]" />
                </div>
                <h3 className="text-base text-[#0c0a08] font-normal mb-2">Grounded Quotations</h3>
                <p className="text-xs text-[#6d6c6b] leading-relaxed">
                  Eliminates hallucination risk. Every variable extracted cites the verbatim sentence, exact page number, and PDF bounding coordinates.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e5e7eb] text-[10px] font-mono text-[#0c0a08] uppercase">
                PyMuPDF • Vector Coordinates
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-[16px] bg-[#f4f2f0] border border-[#e5e7eb] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[10px] bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center text-[#0c0a08] mb-4">
                  <FileSpreadsheet className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h3 className="text-base text-[#0c0a08] font-normal mb-2">Universal Formats</h3>
                <p className="text-xs text-[#6d6c6b] leading-relaxed">
                  Drop in your existing Excel (.xlsx) or CSV coding sheets. Niriksha Studio parses every column into prompt instructions automatically.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e5e7eb] text-[10px] font-mono text-[#0c0a08] uppercase">
                OpenPyXL • Pandas Integration
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-[16px] bg-[#f4f2f0] border border-[#e5e7eb] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[10px] bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center text-[#0c0a08] mb-4">
                  <Database className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h3 className="text-base text-[#0c0a08] font-normal mb-2">Persistent SQLite Engine</h3>
                <p className="text-xs text-[#6d6c6b] leading-relaxed">
                  Never lose work across sessions. All documents, extracted variables, and verified rows are stored in a relational database with audit logs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e5e7eb] text-[10px] font-mono text-[#0c0a08] uppercase">
                SQLAlchemy 2.0 • Session Safe
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Workflow Progression — 3 Steps */}
      <section className="px-6 py-16 max-w-[1240px] mx-auto w-full">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-[10px] uppercase font-mono tracking-[0.18px] text-[#6d6c6b]">
            RAPID WORKFLOW
          </span>
          <h2 className="text-3xl text-[#0c0a08] font-normal tracking-tight mt-1">
            From Raw PDFs to Meta-Analysis in Minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-[16px] bg-[#ffffff] border border-[#e5e7eb] space-y-4">
            <span className="text-xs font-mono px-2.5 py-1 rounded-[6px] bg-[#f4f2f0] text-[#0c0a08] border border-[#e5e7eb]">
              STEP 01
            </span>
            <h3 className="text-lg text-[#0c0a08] font-normal">Connect LM Studio</h3>
            <p className="text-xs text-[#6d6c6b] leading-relaxed">
              Launch LM Studio locally with your preferred model (e.g. Qwen 2.5, Llama 3.3, or Mistral). Start the local server at <code>http://localhost:1234/v1</code>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-[16px] bg-[#ffffff] border border-[#e5e7eb] space-y-4">
            <span className="text-xs font-mono px-2.5 py-1 rounded-[6px] bg-[#f4f2f0] text-[#0c0a08] border border-[#e5e7eb]">
              STEP 02
            </span>
            <h3 className="text-lg text-[#0c0a08] font-normal">Load Coding Form & Papers</h3>
            <p className="text-xs text-[#6d6c6b] leading-relaxed">
              Upload your systematic review variables form (.xlsx or .csv) and drag in PDF papers. Multiple papers are queued and saved in the persistent SQLite database.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-[16px] bg-[#ffffff] border border-[#e5e7eb] space-y-4">
            <span className="text-xs font-mono px-2.5 py-1 rounded-[6px] bg-[#e4f222] text-[#0c0a08]">
              STEP 03
            </span>
            <h3 className="text-lg text-[#0c0a08] font-normal">Extract, Verify & Record</h3>
            <p className="text-xs text-[#6d6c6b] leading-relaxed">
              Trigger extraction. Inspect cited quotes on the live PDF canvas. Make adjustments in real-time, then record the full row directly to your spreadsheet.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Inverted Obsidian Call-To-Action Section */}
      <section className="bg-[#1a1919] text-[#ffffff] px-6 py-16 border-t border-[#0c0a08]">
        <div className="max-w-[1240px] mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[6px] bg-[#0c0a08] border border-[#6d6c6b]/40 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e4f222]" />
            <span className="text-[10px] uppercase font-mono tracking-[0.18px] text-[#e4f222]">
              READY TO ACCELERATE YOUR LITERATURE REVIEW
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl text-[#ffffff] font-normal tracking-tight max-w-2xl leading-tight mb-4">
            Start extracting data with complete local privacy.
          </h2>

          <p className="text-sm text-[#6d6c6b] max-w-md mb-8">
            No cloud accounts, no API credits, and zero data leakage. Open your workbench now.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onLaunchWorkbench}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-[6px] bg-[#e4f222] hover:bg-[#d8e61b] text-[#0c0a08] text-sm font-normal transition duration-150 cursor-pointer"
            >
              <span>Open Extraction Desk</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-[#ffffff] border-t border-[#e5e7eb] px-6 py-8 text-xs text-[#6d6c6b]">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-[4px] bg-[#0c0a08] flex items-center justify-center text-white">
              <span className="font-mono text-[10px] text-[#e4f222]">NS</span>
            </div>
            <span className="text-[#0c0a08] font-normal">Niriksha Studio 2.0</span>
            <span>•</span>
            <span>Local Systematic Review Workbench</span>
          </div>

          <div className="flex items-center space-x-6 text-[11px]">
            <span>Local LM Studio Architecture</span>
            <span className="text-[#0c0a08] font-mono">v2.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
