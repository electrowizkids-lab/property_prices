'use client';

interface Adjustment { label: string; value: string; isPositive: boolean; }

interface ValuatorUIProps {
  mode: 'seller' | 'buyer'; setMode: (mode: 'seller' | 'buyer') => void;
  formData: any; setFormData: any; // Using any here keeps the UI file clean from complex types
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

export default function ValuatorUI({ mode, setMode, formData, setFormData, handleChange, handleSellerEstimate, isCalculating, result, societies, selectedSociety, setSelectedSociety, handleTrendCheck, trendResult, showBuyerPopup, setShowBuyerPopup, buyerPhone, setBuyerPhone, handleBuyerLeadSubmit, formatCurrency }: ValuatorUIProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">P</div>
              <span className="font-bold text-xl tracking-tight">PropValuator</span>
            </div>
            <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
              <a href="#" className="hover:text-white transition">For Sellers</a>
              <a href="#" className="hover:text-white transition">For Buyers</a>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition">List Property</button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white py-16 md:py-24 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 drop-shadow-lg">Stop Guessing. Start Knowing.</h1>
          <p className="text-xl md:text-2xl font-light text-indigo-100 max-w-2xl mx-auto">Indirapuram's Most Advanced Property Valuation Engine. Powered by algorithmic data, not human bias.</p>
        </div>
      </section>

      {/* FLOATING CARD */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-20 w-full flex-grow">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button onClick={() => setMode('seller')} className={`flex-1 py-5 text-sm font-bold uppercase tracking-wider transition ${mode === 'seller' ? 'bg-white border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>Sell / Evaluate Property</button>
            <button onClick={() => setMode('buyer')} className={`flex-1 py-5 text-sm font-bold uppercase tracking-wider transition ${mode === 'buyer' ? 'bg-white border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>Check Market Rates</button>
          </div>

          <div className="p-8 md:p-12">
            {mode === 'seller' && (
              <div>
                <div className="flex border border-gray-300 rounded-xl overflow-hidden mb-8 max-w-md mx-auto">
                  <button type="button" onClick={() => setFormData({...formData, propertyType: 'flat'})} className={`w-1/2 py-3.5 text-sm font-semibold transition ${formData.propertyType === 'flat' ? 'bg-indigo-600 text-white shadow-inner' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Flat / Apartment</button>
				  <button type="button" onClick={() => setFormData({...formData, propertyType: 'plot'})} className={`w-1/2 py-3.5 text-sm font-semibold transition border-l border-gray-300 ${formData.propertyType === 'plot' ? 'bg-indigo-600 text-white shadow-inner' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Plot / Land</button>
                </div>

                <form onSubmit={handleSellerEstimate} className="space-y-6">
                  <div><label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number <span className="text-red-500">*</span></label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Enter 10-digit number" className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-gray-900"/></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Society / Locality</label><input type="text" name="society" value={formData.society} onChange={handleChange} placeholder="e.g., ATS Village" className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-gray-900"/></div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Size ({formData.propertyType === 'plot' ? 'Sq. Yards' : 'Sq. Ft.'}) <span className="text-red-500">*</span></label>
                      <div className="flex">
                        <input type="number" name="size" value={formData.size} onChange={handleChange} required placeholder={formData.propertyType === 'plot' ? "100" : "1500"} className="w-full px-4 py-3.5 border border-gray-300 rounded-l-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-gray-900"/>
                        {formData.propertyType === 'flat' && (<select name="areaType" value={formData.areaType} onChange={handleChange} className="px-4 py-3.5 border border-l-0 border-gray-300 rounded-r-xl bg-slate-50 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"><option value="super">Super</option><option value="carpet">Carpet</option></select>)}
                      </div>
                    </div>
                    {formData.propertyType === 'flat' ? (<div><label className="block text-sm font-semibold text-gray-700 mb-2">Floor</label><input type="number" name="floor" value={formData.floor} onChange={handleChange} placeholder="e.g., 5" className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-gray-900"/></div>) : (<div><label className="block text-sm font-semibold text-gray-700 mb-2">Road Width</label><select name="roadWidth" value={formData.roadWidth} onChange={handleChange} className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"><option value="20">Narrow (20 ft)</option><option value="30">Standard (30 ft)</option><option value="40">Wide (40 ft)</option><option value="60">Extra Wide (60ft+)</option></select></div>)}
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Facing</label><select name="facing" value={formData.facing} onChange={handleChange} className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"><option value="East">East</option><option value="North">North</option><option value="West">West</option><option value="South">South</option></select></div>
                    {formData.propertyType === 'flat' && (<><div><label className="block text-sm font-semibold text-gray-700 mb-2">Year Built</label><input type="number" name="yearBuilt" value={formData.yearBuilt} onChange={handleChange} placeholder="e.g., 2010" className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-gray-900"/></div><div><label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label><select name="condition" value={formData.condition} onChange={handleChange} className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"><option value="excellent">Excellent/Ready to move</option><option value="good">Good (Normal wear)</option><option value="needs_renovation">Needs Renovation</option></select></div></>)}
                  </div>

                  <div className="flex flex-wrap gap-6 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {formData.propertyType === 'plot' && (<label className="flex items-center gap-2 text-sm text-gray-700 font-medium"><input type="checkbox" name="isCorner" checked={formData.isCorner} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded border-slate-300"/> Corner Plot</label>)}
                    {formData.propertyType === 'flat' && (<><label className="flex items-center gap-2 text-sm text-gray-700 font-medium"><input type="checkbox" name="hasVastu" checked={formData.hasVastu} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded border-slate-300"/> Vastu Compliant</label><div className="flex items-center gap-3 text-sm text-gray-700 font-medium"><span>Parking:</span><label className="flex items-center gap-1"><input type="radio" name="parkingType" value="two" checked={formData.parkingType === 'two'} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600"/> 2 Covered</label><label className="flex items-center gap-1"><input type="radio" name="parkingType" value="one" checked={formData.parkingType === 'one'} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600"/> 1 Covered</label><label className="flex items-center gap-1"><input type="radio" name="parkingType" value="none" checked={formData.parkingType === 'none'} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600"/> None</label></div></>)}
                  </div>

                  <button type="submit" disabled={isCalculating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition disabled:bg-indigo-400 text-lg shadow-lg hover:shadow-xl">{isCalculating ? 'Running Advanced Algorithm...' : 'Generate True Price Estimate'}</button>
                </form>

                {result && (
                  <div className="mt-10 space-y-6 border-t border-gray-100 pt-10">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-2xl text-white shadow-xl">
                      <h3 className="text-lg font-bold mb-4 opacity-90">Advanced Property Estimate</h3>
                      <div className="flex justify-between items-end"><div><p className="text-sm opacity-80">Effective Rate</p><p className="text-2xl font-extrabold">₹{result.rate} / {result.unit}</p><p className="text-xs opacity-70 italic mt-1">{result.source}</p></div><div className="text-right"><p className="text-sm opacity-80">Expected Value</p><p className="text-3xl font-extrabold">{formatCurrency(result.min)} - {formatCurrency(result.max)}</p></div></div>
                      {result.carpetSize && (<div className="mt-4 pt-4 border-t border-white/20 text-sm opacity-90 flex justify-between"><span>Estimated Carpet Area:</span><span className="font-bold">{result.carpetSize} Sq. Ft.</span></div>)}
                      <button type="button" onClick={() => alert("Your details have been shared with top local brokers!")} className="mt-6 w-full bg-white text-indigo-700 font-bold py-3.5 rounded-xl hover:bg-indigo-50 transition text-sm shadow">Connect with 3 Verified Brokers</button>
                    </div>

                    {result.adjustments.length > 0 && (<div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm"><h4 className="font-bold text-gray-800 mb-4 text-lg">Algorithm Transparency Breakdown</h4><div className="space-y-2">{result.adjustments.map((adj, index) => (<div key={index} className={`flex justify-between items-center py-3 px-4 rounded-lg text-sm font-medium ${adj.isPositive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}><span>{adj.label}</span><span className="font-bold">{adj.value}</span></div>))}</div></div>)}

                    {result.renoValueIncrease !== null && result.renoCost !== null && (<div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm"><h4 className="font-bold text-emerald-800 mb-4 text-lg">Renovation Upside Potential</h4><p className="text-sm text-emerald-700 mb-6">By investing in standard upgrades, you can shift this property to "Excellent" condition.</p><div className="grid grid-cols-3 gap-4 text-center mb-4"><div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm"><p className="text-xs text-gray-500 mb-1">Est. Reno Cost</p><p className="text-lg font-extrabold text-gray-900">{formatCurrency(result.renoCost)}</p></div><div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm"><p className="text-xs text-gray-500 mb-1">Value Increase</p><p className="text-lg font-extrabold text-green-600">+{formatCurrency(result.renoValueIncrease)}</p></div><div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm"><p className="text-xs text-gray-500 mb-1">Net ROI</p><p className="text-lg font-extrabold text-emerald-700">{result.renoROI}%</p></div></div></div>)}

                    {result.circleRateValue !== null && (<div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm"><h4 className="font-bold text-amber-800 mb-4 text-lg">Circle Rate vs. Market Rate Analytics</h4><div className="grid grid-cols-2 gap-4 text-center"><div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm"><p className="text-xs text-gray-500 mb-1">Est. Registry Value</p><p className="text-xl font-extrabold text-red-600">{formatCurrency(result.circleRateValue)}</p></div><div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm"><p className="text-xs text-gray-500 mb-1">Est. Market Value</p><p className="text-xl font-extrabold text-green-600">{formatCurrency(result.min)}</p></div></div><div className="mt-6 p-4 bg-white rounded-xl border border-amber-100 text-center shadow-sm"><p className="text-xs text-gray-500">Market Premium</p><p className="text-3xl font-extrabold text-amber-700 mt-1">~ {result.premium}%</p></div></div>)}
                  </div>
                )}
              </div>
            )}

            {mode === 'buyer' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Explore Locality Rates</h2>
                <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                  <select value={selectedSociety} onChange={(e) => setSelectedSociety(e.target.value)} className="flex-1 px-4 py-3.5 border border-gray-300 rounded-xl outline-none bg-white text-gray-900 font-medium"><option value="">-- Select a Society --</option>{societies.map((soc) => (<option key={soc} value={soc}>{soc}</option>))}</select>
                  <button onClick={handleTrendCheck} disabled={!selectedSociety} className="px-8 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:bg-gray-300 transition shadow-lg">Check Rates</button>
                </div>
                {trendResult && (<div className="mt-8 max-w-2xl mx-auto space-y-6"><div className="p-6 bg-slate-900 rounded-2xl text-center text-white shadow-xl"><p className="text-sm text-slate-400 mb-2">Current Base Rate in {selectedSociety}</p><p className="text-4xl font-extrabold">₹{trendResult.baseRate} <span className="text-lg font-medium text-slate-400">/ sq.ft.</span></p></div><div className="grid grid-cols-3 gap-4"><div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 text-center shadow-sm"><p className="text-xs font-bold text-blue-800 mb-2">2 BHK</p><p className="text-xl font-extrabold text-gray-900">{formatCurrency(trendResult.twoBHK)}</p></div><div className="p-5 bg-green-50 rounded-2xl border border-green-100 text-center shadow-sm"><p className="text-xs font-bold text-green-800 mb-2">3 BHK</p><p className="text-xl font-extrabold text-gray-900">{formatCurrency(trendResult.threeBHK)}</p></div><div className="p-5 bg-purple-50 rounded-2xl border border-purple-100 text-center shadow-sm"><p className="text-xs font-bold text-purple-800 mb-2">4 BHK</p><p className="text-xl font-extrabold text-gray-900">{formatCurrency(trendResult.fourBHK)}</p></div></div><button onClick={() => setShowBuyerPopup(true)} className="w-full border-2 border-indigo-600 text-indigo-600 font-bold py-4 rounded-xl hover:bg-indigo-50 transition text-lg">Connect me with a Broker</button></div>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">P</div><span className="font-bold text-xl">PropValuator</span></div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">Indirapuram's most advanced algorithmic property valuation engine. We use deep market data to give you the true value of your asset.</p>
          </div>
          <div><h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-slate-300">Quick Links</h4><ul className="space-y-2 text-sm text-slate-400"><li><a href="#" className="hover:text-white transition">Evaluate Property</a></li><li><a href="#" className="hover:text-white transition">Market Trends</a></li><li><a href="#" className="hover:text-white transition">For Brokers</a></li></ul></div>
          <div><h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-slate-300">Legal</h4><ul className="space-y-2 text-sm text-slate-400"><li><a href="#" className="hover:text-white transition">Privacy Policy</a></li><li><a href="#" className="hover:text-white transition">Terms of Service</a></li><li><a href="#" className="hover:text-white transition">Disclaimer</a></li></ul></div>
        </div>
        <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500"><p>© {new Date().getFullYear()} PropValuator. All rights reserved. This tool provides algorithmic estimates based on available market data and does not constitute legal or financial advice.</p></div>
      </footer>

      {showBuyerPopup && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"><h3 className="text-2xl font-bold text-gray-900 mb-2">Get Exclusive Inventory</h3><p className="text-sm text-gray-500 mb-6">Get direct access to unlisted properties in {selectedSociety}.</p><form onSubmit={handleBuyerLeadSubmit} className="space-y-4"><input type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Enter 10-digit Mobile Number" maxLength={10} required className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"/><div className="flex gap-3"><button type="button" onClick={() => setShowBuyerPopup(false)} className="flex-1 py-3.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition">Cancel</button><button type="submit" className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg">Connect Me</button></div></form></div></div>)}
    </div>
  );
}