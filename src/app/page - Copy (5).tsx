'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 

// HARDCODED CIRCLE RATES (Per Sq. Yard in ₹) - Update these from Ghaziabad Authority official site
const CIRCLE_RATES: Record<string, number> = {
  'ats village': 65000,
  'nyay khand 1': 55000,
  'ahinsa khand 1': 60000,
  'gaur gc-1': 55000,
  'shipra sun city': 50000,
  'garden gateway': 48000,
};

export default function Home() {
  const [mode, setMode] = useState<'seller' | 'buyer'>('seller');
  
  // --- SELLER STATE ---
  const [formData, setFormData] = useState({
    phone: '', 
    propertyType: 'flat', // NEW: flat or plot
    society: '', 
    size: '', 
    floor: '', 
    facing: 'East',
    roadWidth: '30', // NEW: for plots
    isCorner: false  // NEW: for plots
  });
  
  const [result, setResult] = useState<{
    min: number, max: number, rate: number, source: string, 
    unit: string, // NEW: Sq.ft or Sq.yd
    circleRateValue: number | null, // NEW
    premium: number | null // NEW
  } | null>(null);
  
  const [isCalculating, setIsCalculating] = useState(false);

  // --- BUYER STATE ---
  const [societies, setSocieties] = useState<string[]>([]);
  const [selectedSociety, setSelectedSociety] = useState<string>('');
  const [trendResult, setTrendResult] = useState<{baseRate: number, twoBHK: number, threeBHK: number, fourBHK: number} | null>(null);

  useEffect(() => {
    const fetchSocieties = async () => {
      const { data } = await supabase.from('base_rates').select('locality_name').eq('property_type', 'flat');
      if (data) setSocieties(data.map(item => item.locality_name).sort());
    };
    fetchSocieties();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value });
  };

  // --- SELLER LOGIC ---
  const handleSellerEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setResult(null); 

    try {
      const { data: lead } = await supabase.from('leads').insert([{ phone_number: formData.phone, user_type: 'seller' }]).select().single();

      const isPlot = formData.propertyType === 'plot';
      const sizeNum = parseFloat(formData.size) || 0;
      
      // 1. Fetch Base Rate
      let baseRate = isPlot ? 70000 : 8500; // Fallbacks
      let rateSource = isPlot ? "Indirapuram Plot Average" : "Indirapuram Flat Average";

      if (formData.society.trim() !== "") {
        const { data: rateData } = await supabase
          .from('base_rates')
          .select('base_rate_per_sqft')
          .ilike('locality_name', formData.society.trim())
          .eq('property_type', isPlot ? 'plot' : 'flat')
          .maybeSingle();

        if (rateData) {
          baseRate = rateData.base_rate_per_sqft;
          rateSource = `Specific rate for ${formData.society}`;
        }
      }

      // 2. Apply Adjustments
      let adjustedRate = baseRate;

      if (isPlot) {
        // Plot Adjustments
        const roadW = parseInt(formData.roadWidth) || 30;
        if (roadW >= 60) adjustedRate += 15000; // Wide road premium
        else if (roadW >= 40) adjustedRate += 8000;
        
        if (formData.isCorner) adjustedRate += 10000; // Corner plot premium
        
        // Facing for plots
        if (formData.facing === 'East') adjustedRate += 5000;
        else if (formData.facing === 'North') adjustedRate += 3000;
        else if (formData.facing === 'West') adjustedRate -= 2000;

      } else {
        // Flat Adjustments
        const floorNum = parseInt(formData.floor) || 1;
        if (floorNum === 1) adjustedRate += 50;
        else if (floorNum >= 3 && floorNum <= 7) adjustedRate += 30;
        else if (floorNum >= 12) adjustedRate -= 40;

        if (formData.facing === 'East') adjustedRate += 50;
        else if (formData.facing === 'North') adjustedRate += 40;
        else if (formData.facing === 'West') adjustedRate -= 20;
        else if (formData.facing === 'South') adjustedRate -= 30;
      }

      // 3. Final Math
      const totalEstimate = adjustedRate * sizeNum;
      const minPrice = Math.round(totalEstimate * 0.97);
      const maxPrice = Math.round(totalEstimate * 1.03);

      // 4. Circle Rate Calculation
      let circleRateValue = null;
      let premium = null;
      const societyKey = formData.society.trim().toLowerCase();
      
      if (CIRCLE_RATES[societyKey]) {
        const circlePerUnit = CIRCLE_RATES[societyKey];
        circleRateValue = Math.round(circlePerUnit * sizeNum);
        premium = Math.round(((totalEstimate - circleRateValue) / totalEstimate) * 100);
      }

      if (lead) {
        await supabase.from('valuations').insert([{
          lead_id: lead.id, property_type: formData.propertyType, society_name: formData.society,
          size_sqft: sizeNum, floor: isPlot ? null : parseInt(formData.floor), facing: formData.facing,
          estimated_min_price: minPrice, estimated_max_price: maxPrice
        }]);
      }

      setResult({ 
        min: minPrice, max: maxPrice, rate: Math.round(adjustedRate), source: rateSource,
        unit: isPlot ? 'Sq. Yard' : 'Sq. Ft.',
        circleRateValue, premium
      });

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  // --- BUYER LOGIC ---
  const handleTrendCheck = async () => {
    if (!selectedSociety) return;
    const { data: rateData } = await supabase.from('base_rates').select('base_rate_per_sqft').eq('locality_name', selectedSociety).eq('property_type', 'flat').single();
    if (rateData) {
      const rate = rateData.base_rate_per_sqft;
      setTrendResult({ baseRate: rate, twoBHK: Math.round(rate * 1100), threeBHK: Math.round(rate * 1600), fourBHK: Math.round(rate * 2200) });
    }
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Indirapuram Property Valuator</h1>
          <p className="mt-2 text-gray-600">Flats, Plots & Circle Rate Analytics.</p>
        </div>

        {/* MODE TOGGLE */}
        <div className="flex bg-gray-200 p-1 rounded-lg mb-6 font-medium">
          <button onClick={() => setMode('seller')} className={`w-1/2 py-2.5 rounded-md text-sm transition ${mode === 'seller' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'}`}>I want to SELL</button>
          <button onClick={() => setMode('buyer')} className={`w-1/2 py-2.5 rounded-md text-sm transition ${mode === 'buyer' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'}`}>CHECK MARKET RATES</button>
        </div>

        {/* SELLER MODE */}
        {mode === 'seller' && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <form onSubmit={handleSellerEstimate} className="space-y-6">
              
              {/* Property Type Selector */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button type="button" onClick={() => setFormData({...formData, propertyType: 'flat'})} className={`w-1/2 py-2.5 text-sm font-medium ${formData.propertyType === 'flat' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>Flat / Apartment</button>
                <button type="button" onClick={() => setFormData({...formData, propertyType: 'plot'})} className={`w-1/2 py-2.5 text-sm font-medium border-l border-gray-300 ${formData.propertyType === 'plot' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>Plot / Land</button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Enter 10-digit number" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Society / Locality</label>
                  <input type="text" name="society" value={formData.society} onChange={handleChange} placeholder="e.g., ATS Village" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size ({formData.propertyType === 'plot' ? 'Sq. Yards' : 'Sq. Ft.'}) <span className="text-red-500">*</span></label>
                  <input type="number" name="size" value={formData.size} onChange={handleChange} required placeholder={formData.propertyType === 'plot' ? "e.g., 100" : "e.g., 1500"} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/>
                </div>

                {/* CONDITIONAL FIELDS FOR FLATS */}
                {formData.propertyType === 'flat' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                    <input type="number" name="floor" value={formData.floor} onChange={handleChange} placeholder="e.g., 5" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/>
                  </div>
                )}

                {/* CONDITIONAL FIELDS FOR PLOTS */}
                {formData.propertyType === 'plot' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Road Width (Feet)</label>
                    <select name="roadWidth" value={formData.roadWidth} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                      <option value="20">Narrow (20 ft)</option>
                      <option value="30">Standard (30 ft)</option>
                      <option value="40">Wide (40 ft)</option>
                      <option value="60">Extra Wide (60 ft+)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facing</label>
                  <select name="facing" value={formData.facing} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="East">East Facing</option>
                    <option value="North">North Facing</option>
                    <option value="West">West Facing</option>
                    <option value="South">South Facing</option>
                  </select>
                </div>
              </div>

              {/* CORNER PLOT CHECKBOX */}
              {formData.propertyType === 'plot' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isCorner" name="isCorner" checked={formData.isCorner} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                  <label htmlFor="isCorner" className="text-sm text-gray-700">This is a Corner Plot</label>
                </div>
              )}

              <button type="submit" disabled={isCalculating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-lg transition disabled:bg-indigo-400">
                {isCalculating ? 'Analyzing Data...' : 'Generate True Price Estimate'}
              </button>
            </form>

            {/* SELLER RESULTS */}
            {result && (
              <div className="mt-6 space-y-4">
                <div className="p-6 bg-indigo-50 rounded-lg border border-indigo-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Your Property Estimate</h3>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-gray-500">Effective Rate</p>
                      <p className="text-xl font-bold text-indigo-700">₹{result.rate} / {result.unit}</p>
                      <p className="text-xs text-gray-500 italic">{result.source}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Expected Value</p>
                      <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(result.min)} - {formatCurrency(result.max)}</p>
                    </div>
                  </div>
                  <button className="mt-4 w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-800 transition text-sm">
                    Connect with 3 Verified Brokers
                  </button>
                </div>

                {/* CIRCLE RATE VS MARKET RATE MAGIC */}
                {result.circleRateValue !== null && (
                  <div className="p-6 bg-amber-50 rounded-lg border border-amber-200">
                    <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Circle Rate vs. Market Rate Analytics
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-xs text-amber-700">Est. Registry Value (Circle Rate)</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(result.circleRateValue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-700">Est. Market Value</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(result.min)}</p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-white rounded border border-amber-100 text-center">
                      <p className="text-xs text-gray-500">Market Premium over Circle Rate</p>
                      <p className="text-2xl font-extrabold text-amber-700">~ {result.premium}%</p>
                      <p className="text-xs text-gray-400 mt-1">*(This is the component often adjusted during final deal negotiation)*</p>
                    </div>
                  </div>
                )}
                {!result.circleRateValue && (
                   <div className="p-4 bg-gray-50 rounded-lg border text-sm text-gray-500 text-center">
                     Circle rate data is not available for this specific locality yet.
                   </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BUYER MODE (Unchanged from before) */}
        {mode === 'buyer' && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Explore Locality Rates</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <select value={selectedSociety} onChange={(e) => setSelectedSociety(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg outline-none bg-white text-gray-900">
                <option value="">-- Select a Society --</option>
                {societies.map((soc) => (<option key={soc} value={soc}>{soc}</option>))}
              </select>
              <button onClick={handleTrendCheck} disabled={!selectedSociety} className="px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 transition">Check Rates</button>
            </div>
            {trendResult && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border text-center">
                  <p className="text-sm text-gray-500">Current Base Rate in {selectedSociety}</p>
                  <p className="text-3xl font-extrabold text-indigo-700 mt-1">₹{trendResult.baseRate} / sq.ft.</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border text-center"><p className="text-xs font-medium text-blue-800">2 BHK</p><p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.twoBHK)}</p></div>
                  <div className="p-4 bg-green-50 rounded-lg border text-center"><p className="text-xs font-medium text-green-800">3 BHK</p><p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.threeBHK)}</p></div>
                  <div className="p-4 bg-purple-50 rounded-lg border text-center"><p className="text-xs font-medium text-purple-800">4 BHK</p><p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.fourBHK)}</p></div>
                </div>
                <button className="w-full border-2 border-indigo-600 text-indigo-600 font-semibold py-3 rounded-lg hover:bg-indigo-50 transition">Connect me with a Broker</button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}