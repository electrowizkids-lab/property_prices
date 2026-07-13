'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Box, Grid } from '@react-three/drei';

interface Adjustment { label: string; value: string; isPositive: boolean; }

interface ValuatorUIProps {
  mode: 'seller' | 'buyer'; setMode: (mode: 'seller' | 'buyer') => void;
  formData: any; setFormData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleSellerEstimate: (e: React.FormEvent) => void;
  isCalculating: boolean;
  result: { min: number; max: number; rate: number; source: string; unit: string; circleRateValue: number | null; premium: number | null; carpetSize: number | null; adjustments: Adjustment[]; renoValueIncrease: number | null; renoCost: number | null; renoROI: number | null } | null;
  societies: string[]; selectedSociety: string; setSelectedSociety: (val: string) => void;
  handleTrendCheck: () => void;
  trendResult: { baseRate: number; twoBHK: number; threeBHK: number; fourBHK: number } | null;
  showBuyerPopup: boolean; setShowBuyerPopup: (val: boolean) => void;
  buyerPhone: string; setBuyerPhone: (val: string) => void;
  handleBuyerLeadSubmit: (e: React.FormEvent) => void;
  formatCurrency: (num: number) => string;
}

// --- 3D BACKGROUND COMPONENT ---
function BackgroundScene({ propertyType }: { propertyType: 'flat' | 'plot' }) {
  const floors = useMemo(() => Array.from({ length: 12 }), []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#0d9488" />
      <Environment preset="city" />
      <OrbitControls autoRotate autoRotateSpeed={0.5} enableZoom={false} enablePan={false} />
      <group position={[0, -2, 0]}>
        <Grid infiniteGrid fadeDistance={20} sectionColor="#0d9488" cellColor="#1e293b" position={[0, -0.01, 0]} />
        {propertyType === 'flat' ? (
          <group position={[0, 0, 0]}>
            {floors.map((_, i) => (
              <Box key={i} args={[2, 0.4, 2]} position={[0, i * 0.45 + 0.2, 0]}>
                <meshPhysicalMaterial color="#14b8a6" transparent opacity={0.7} roughness={0.1} metalness={0.8} wireframe={i % 3 === 0} />
              </Box>
            ))}
            <Box args={[0.8, 6, 0.8]} position={[0, 3, 0]}><meshStandardMaterial color="#0f172a" /></Box>
          </group>
        ) : (
          <group>
            <Box args={[4, 0.1, 4]} position={[0, 0, 0]}><meshStandardMaterial color="#0284c7" wireframe /></Box>
            <Box args={[3.8, 0.12, 3.8]} position={[0, 0, 0]}><meshStandardMaterial color="#0f172a" transparent opacity={0.8} /></Box>
          </group>
        )}
      </group>
    </>
  );
}

// --- MAIN UI COMPONENT ---
export default function ValuatorUI({ mode, setMode, formData, setFormData, handleChange, handleSellerEstimate, isCalculating, result, societies, selectedSociety, setSelectedSociety, handleTrendCheck, trendResult, showBuyerPopup, setShowBuyerPopup, buyerPhone, setBuyerPhone, handleBuyerLeadSubmit, formatCurrency }: ValuatorUIProps) {
  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-teal-500 selection:text-white relative">
      
      {/* 3D CANVAS BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <Canvas camera={{ position: [5, 3, 5], fov: 45 }}>
          <BackgroundScene propertyType={formData.propertyType || 'flat'} />
        </Canvas>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19]/80 via-[#0B0F19]/50 to-[#0B0F19] pointer-events-none"></div>
      </div>

      {/* FOREGROUND UI */}
      <div className="relative z-10 flex flex-col min-h-screen pointer-events-none">
        
        {/* NAVBAR */}
        <nav className="w-full top-0 bg-[#0B0F19]/60 backdrop-blur-md border-b border-white/10 transition-all pointer-events-auto shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-[0_0_15px_rgba(20,184,166,0.5)]">P</div>
                <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">PropValuator</span>
              </div>
              <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
                <a href="#" className="hover:text-teal-400 transition">For Sellers</a>
                <a href="#" className="hover:text-teal-400 transition">For Buyers</a>
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-lg transition-all shadow-lg backdrop-blur-md">List Property</button>
              </div>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="pt-20 pb-12 px-4 pointer-events-none">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 leading-tight drop-shadow-xl">
              Stop Guessing. <br className="hidden md:block"/> 
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">Start Knowing.</span>
            </h1>
            <p className="text-lg font-light text-slate-400 max-w-2xl mx-auto">Indirapuram's Most Advanced Property Valuation Engine.</p>
          </div>
        </section>

        {/* MAIN FLOATING CARD */}
        <div className="max-w-5xl mx-auto px-4 w-full flex-grow mb-24 pointer-events-auto">
          <div className="bg-[#0B0F19]/70 backdrop-blur-2xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative">
            
            {/* TABS */}
            <div className="flex p-2 bg-black/40 m-4 rounded-2xl border border-white/5 relative z-10">
              <button onClick={() => setMode('seller')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${mode === 'seller' ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Evaluate Asset</button>
              <button onClick={() => setMode('buyer')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${mode === 'buyer' ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Market Rates</button>
            </div>

            <div className="p-8 md:p-12 relative z-10">
              {/* SELLER MODE */}
              {mode === 'seller' && (
                <div className="animate-fade-in-up">
                  <div className="flex bg-black/50 rounded-xl p-1 mb-8 max-w-sm mx-auto border border-white/10">
                    <button type="button" onClick={() => setFormData({...formData, propertyType: 'flat'})} className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-all ${formData.propertyType === 'flat' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Apartment</button>
                    <button type="button" onClick={() => setFormData({...formData, propertyType: 'plot'})} className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-all ${formData.propertyType === 'plot' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Plot / Land</button>
                  </div>

                  <form onSubmit={handleSellerEstimate} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number <span className="text-teal-500">*</span></label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Enter 10-digit number" className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition text-white"/>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <select name="society" value={formData.society} onChange={handleChange} className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white appearance-none">
                        <option value="" className="bg-gray-900">-- Select Locality --</option>
                        {Array.from(new Set(societies)).map((soc, index) => <option key={`${soc}-${index}`} value={soc} className="bg-gray-900">{soc}</option>)}
                      </select>
                      
                      <div>
                        <div className="flex">
                          <input type="number" name="size" value={formData.size} onChange={handleChange} required placeholder={formData.propertyType === 'plot' ? "100" : "1500"} className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-l-xl focus:ring-2 focus:ring-teal-500 outline-none transition text-white"/>
                          {formData.propertyType === 'flat' && (<select name="areaType" value={formData.areaType} onChange={handleChange} className="px-4 py-4 bg-white/5 border border-l-0 border-white/10 rounded-r-xl text-sm font-bold text-teal-400 outline-none appearance-none"><option value="super" className="bg-gray-900">Super</option><option value="carpet" className="bg-gray-900">Carpet</option></select>)}
                        </div>
                      </div>

                      {formData.propertyType === 'flat' ? (
                        <input type="number" name="floor" value={formData.floor} onChange={handleChange} placeholder="Floor e.g., 5" className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition text-white"/>
                      ) : (
                        <select name="roadWidth" value={formData.roadWidth} onChange={handleChange} className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white appearance-none"><option value="20" className="bg-gray-900">Narrow (20 ft)</option><option value="30" className="bg-gray-900">Standard (30 ft)</option><option value="40" className="bg-gray-900">Wide (40 ft)</option><option value="60" className="bg-gray-900">Extra Wide (60ft+)</option></select>
                      )}

                      <select name="facing" value={formData.facing} onChange={handleChange} className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white appearance-none"><option value="East" className="bg-gray-900">East</option><option value="North" className="bg-gray-900">North</option><option value="West" className="bg-gray-900">West</option><option value="South" className="bg-gray-900">South</option></select>

                      {formData.propertyType === 'flat' && (
                        <>
                          <input type="number" name="yearBuilt" value={formData.yearBuilt} onChange={handleChange} placeholder="Year Built e.g., 2010" className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition text-white"/>
                          <select name="condition" value={formData.condition} onChange={handleChange} className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white appearance-none"><option value="excellent" className="bg-gray-900">Ready to move</option><option value="good" className="bg-gray-900">Good (Normal wear)</option><option value="needs_renovation" className="bg-gray-900">Needs Renovation</option></select>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4 bg-white/5 p-4 rounded-xl border border-white/10">
                      {formData.propertyType === 'plot' && (<label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer"><input type="checkbox" name="isCorner" checked={formData.isCorner} onChange={handleChange} className="w-4 h-4 accent-teal-500 rounded"/> Corner Plot</label>)}
                      {formData.propertyType === 'flat' && (<><label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer"><input type="checkbox" name="hasVastu" checked={formData.hasVastu} onChange={handleChange} className="w-4 h-4 accent-teal-500 rounded"/> Vastu Compliant</label><div className="flex items-center gap-3 text-sm text-slate-300 font-medium"><span className="text-slate-500">Parking:</span><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="parkingType" value="two" checked={formData.parkingType === 'two'} onChange={handleChange} className="accent-teal-500"/> 2</label><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="parkingType" value="one" checked={formData.parkingType === 'one'} onChange={handleChange} className="accent-teal-500"/> 1</label><label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="parkingType" value="none" checked={formData.parkingType === 'none'} onChange={handleChange} className="accent-teal-500"/> 0</label></div></>)}
                    </div>

                    <button type="submit" disabled={isCalculating} className="w-full mt-6 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 text-lg shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] border border-teal-400/30">
                      {isCalculating ? 'Computing Multilayer Market Data...' : 'Generate AI Valuation'}
                    </button>
                  </form>

                  {/* FULL ORIGINAL RESULTS BLOCK, RESTORED AND STYLED */}
                  {result && (
                    <div className="mt-12 space-y-6 animate-fade-in-up border-t border-white/10 pt-8">
                      <div className="bg-gradient-to-br from-teal-900/40 to-blue-900/40 border border-teal-500/30 p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl"></div>
                        <h3 className="text-sm font-bold mb-6 text-teal-400 uppercase tracking-widest flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span> Valuation Complete</h3>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                          <div><p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Effective Rate</p><p className="text-2xl font-light">₹<span className="font-bold">{result.rate}</span> <span className="text-sm text-slate-400">/ {result.unit}</span></p><p className="text-xs text-slate-500 mt-2">{result.source}</p></div>
                          <div className="md:text-right"><p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Expected Value</p><p className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-white">{formatCurrency(result.min)} <span className="text-2xl text-slate-500 font-light">-</span> {formatCurrency(result.max)}</p></div>
                        </div>
                        {result.carpetSize && (<div className="mt-8 pt-6 border-t border-white/10 text-sm text-slate-300 flex justify-between"><span>Verified Carpet Area:</span><span className="font-bold text-white">{result.carpetSize} Sq. Ft.</span></div>)}
                        <button type="button" onClick={() => alert("Your details have been shared with top local brokers!")} className="mt-6 w-full bg-white text-[#0B0F19] font-black py-4 rounded-xl hover:bg-slate-200 transition-all text-sm uppercase tracking-wide">Connect with 3 Verified Brokers</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {result.adjustments.length > 0 && (
                          <div className="p-6 bg-black/40 rounded-2xl border border-white/10">
                            <h4 className="font-bold text-slate-200 mb-4 text-sm uppercase tracking-wider">Algorithm Adjustments</h4>
                            <div className="space-y-3">{result.adjustments.map((adj, index) => (<div key={index} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-sm"><span className="text-slate-400">{adj.label}</span><span className={`font-mono font-bold ${adj.isPositive ? 'text-teal-400' : 'text-rose-400'}`}>{adj.value}</span></div>))}</div>
                          </div>
                        )}
                        
                        {/* RESTORED REGISTRY VS MARKET BLOCK */}
                        {result.circleRateValue !== null && (
                          <div className="p-6 bg-black/40 rounded-2xl border border-white/10 flex flex-col justify-between">
                            <h4 className="font-bold text-slate-200 mb-4 text-sm uppercase tracking-wider">Circle Rate vs. Market Rate Analytics</h4>
                            
                            <div className="grid grid-cols-2 gap-4 text-center mb-6">
                              <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Est. Registry Value</p>
                                <p className="text-lg md:text-xl font-mono font-bold text-rose-400">{formatCurrency(result.circleRateValue)}</p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Est. Market Value</p>
                                <p className="text-lg md:text-xl font-mono font-bold text-emerald-400">{formatCurrency(result.min)}</p>
                              </div>
                            </div>
                            
                            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center shadow-sm">
                              <p className="text-xs text-amber-500/80 uppercase tracking-wider mb-1">Market Premium</p>
                              <p className="text-3xl font-black text-amber-400 mt-1">~ {result.premium}%</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {result.renoValueIncrease !== null && result.renoCost !== null && (
                        <div className="p-8 bg-gradient-to-r from-emerald-900/20 to-transparent rounded-2xl border border-emerald-500/20">
                          <h4 className="font-bold text-emerald-400 mb-2 text-sm uppercase tracking-wider">Value-Add Potential</h4>
                          <p className="text-sm text-slate-400 mb-6">Estimated upside if property is renovated to "Excellent" condition.</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5"><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Est. Cost</p><p className="text-xl font-mono text-slate-200">{formatCurrency(result.renoCost)}</p></div>
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5"><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Value Add</p><p className="text-xl font-mono text-emerald-400">+{formatCurrency(result.renoValueIncrease)}</p></div>
                            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30"><p className="text-xs text-emerald-500/80 uppercase tracking-wider mb-1">Net ROI</p><p className="text-2xl font-black text-emerald-400">{result.renoROI}%</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* BUYER MODE */}
              {mode === 'buyer' && (
                <div className="animate-fade-in-up text-center">
                  <h2 className="text-3xl font-black text-white mb-8">Locality Market Intel</h2>
                  <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                    <select value={selectedSociety} onChange={(e) => setSelectedSociety(e.target.value)} className="flex-1 px-5 py-4 bg-black/40 border border-white/10 rounded-xl outline-none text-white appearance-none focus:ring-2 focus:ring-teal-500">
                      <option value="" className="bg-gray-900">-- Target Society / Block --</option>
                      {societies.map((soc, index) => (<option key={`${soc}-${index}`} value={soc} className="bg-gray-900">{soc}</option>))}
                    </select>
                    <button onClick={handleTrendCheck} disabled={!selectedSociety} className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-[#0B0F19] rounded-xl font-black uppercase tracking-wider disabled:opacity-50 disabled:bg-slate-600 transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)]">Scan Rates</button>
                  </div>

                  {trendResult && (
                    <div className="mt-12 max-w-3xl mx-auto space-y-6">
                      <div className="p-8 bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/10 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-teal-500/5 blur-2xl"></div>
                        <p className="text-xs uppercase tracking-widest text-teal-400 mb-3 relative z-10">Current Baseline ({selectedSociety})</p>
                        <p className="text-5xl md:text-6xl font-black text-white relative z-10">₹{trendResult.baseRate} <span className="text-xl font-light text-slate-400 tracking-normal">/ sq.ft.</span></p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[{label: '2 BHK', val: trendResult.twoBHK}, {label: '3 BHK', val: trendResult.threeBHK}, {label: '4 BHK', val: trendResult.fourBHK}].map((bhk, i) => (
                          <div key={i} className="p-6 bg-black/40 rounded-2xl border border-white/5 hover:border-teal-500/30 transition-all"><p className="text-sm font-bold text-slate-400 mb-2">{bhk.label} Average</p><p className="text-2xl font-mono text-slate-200">{formatCurrency(bhk.val)}</p></div>
                        ))}
                      </div>
                      <button onClick={() => setShowBuyerPopup(true)} className="w-full mt-4 border border-teal-500/50 text-teal-400 font-bold py-4 rounded-xl hover:bg-teal-500/10 transition-all text-sm uppercase tracking-widest">Access Off-Market Inventory</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* FOOTER */}
        <footer className="bg-black/80 border-t border-white/10 text-slate-400 relative z-20 mt-auto backdrop-blur-md pointer-events-auto">
          <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6"><div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-black text-[#0B0F19] text-sm">P</div><span className="font-extrabold text-xl text-white">PropValuator</span></div>
              <p className="text-sm leading-relaxed max-w-sm">Indirapuram's institutional-grade property valuation engine. Data-driven insights to eliminate market friction.</p>
            </div>
            <div><h4 className="font-bold text-xs uppercase tracking-widest mb-6 text-white">Platform</h4><ul className="space-y-3 text-sm"><li><a href="#" className="hover:text-teal-400 transition">Evaluate Asset</a></li><li><a href="#" className="hover:text-teal-400 transition">Locality Analytics</a></li></ul></div>
            <div><h4 className="font-bold text-xs uppercase tracking-widest mb-6 text-white">Legal</h4><ul className="space-y-3 text-sm"><li><a href="#" className="hover:text-teal-400 transition">Privacy Operations</a></li><li><a href="#" className="hover:text-teal-400 transition">Terms of Service</a></li></ul></div>
          </div>
        </footer>
      </div>

      {/* BUYER POPUP */}
      {showBuyerPopup && (
        <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 pointer-events-auto">
          <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
            <h3 className="text-2xl font-black text-white mb-2 relative z-10">Exclusive Access</h3>
            <p className="text-sm text-slate-400 mb-8 relative z-10">Unlock direct connections to unlisted inventory in {selectedSociety}.</p>
            <form onSubmit={handleBuyerLeadSubmit} className="space-y-6 relative z-10">
              <input type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="10-digit Mobile Number" maxLength={10} required className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-center font-mono tracking-widest"/>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowBuyerPopup(false)} className="flex-1 py-4 border border-white/10 rounded-xl text-slate-400 font-bold hover:bg-white/5 transition text-sm uppercase tracking-wider">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-teal-500 hover:bg-teal-400 text-[#0B0F19] rounded-xl font-bold transition text-sm uppercase tracking-wider">Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}