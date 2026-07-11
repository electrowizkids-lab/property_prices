'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 

export default function Home() {
  const [mode, setMode] = useState<'seller' | 'buyer'>('seller');
  
  // --- SELLER STATE ---
  const [formData, setFormData] = useState({
    phone: '', society: '', size: '', floor: '', facing: 'East'
  });
  const [result, setResult] = useState<{min: number, max: number, rate: number, source: string} | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // --- BUYER / MARKET TRENDS STATE ---
  const [societies, setSocieties] = useState<string[]>([]);
  const [selectedSociety, setSelectedSociety] = useState<string>('');
  const [trendResult, setTrendResult] = useState<{baseRate: number, twoBHK: number, threeBHK: number, fourBHK: number} | null>(null);

  // Fetch all societies from DB on page load to populate Buyer Dropdown
  useEffect(() => {
    const fetchSocieties = async () => {
      const { data } = await supabase
        .from('base_rates')
        .select('locality_name')
        .eq('property_type', 'flat');
      
      if (data) {
        const names = data.map(item => item.locality_name).sort();
        setSocieties(names);
      }
    };
    fetchSocieties();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- SELLER LOGIC ---
  const handleSellerEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setResult(null); 

    try {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert([{ phone_number: formData.phone, user_type: 'seller' }])
        .select()
        .single();
      if (leadError) throw leadError;

      let baseRate = 8500;
      let rateSource = "Indirapuram Average (Society not in database)";

      if (formData.society.trim() !== "") {
        const { data: rateData } = await supabase
          .from('base_rates')
          .select('base_rate_per_sqft')
          .ilike('locality_name', formData.society.trim())
          .eq('property_type', 'flat')
          .maybeSingle();

        if (rateData) {
          baseRate = rateData.base_rate_per_sqft;
          rateSource = `Specific rate for ${formData.society}`;
        }
      }

      const sizeNum = parseFloat(formData.size) || 1000;
      const floorNum = parseInt(formData.floor) || 1;
      const facing = formData.facing;

      let adjustedRate = baseRate;
      if (floorNum === 1) adjustedRate += 50;
      else if (floorNum >= 3 && floorNum <= 7) adjustedRate += 30;
      else if (floorNum >= 12) adjustedRate -= 40;

      if (facing === 'East') adjustedRate += 50;
      else if (facing === 'North') adjustedRate += 40;
      else if (facing === 'West') adjustedRate -= 20;
      else if (facing === 'South') adjustedRate -= 30;

      const totalEstimate = adjustedRate * sizeNum;
      const minPrice = Math.round(totalEstimate * 0.97);
      const maxPrice = Math.round(totalEstimate * 1.03);

      if (lead) {
        await supabase.from('valuations').insert([{
          lead_id: lead.id, property_type: 'flat', society_name: formData.society,
          size_sqft: sizeNum, floor: floorNum, facing: facing,
          estimated_min_price: minPrice, estimated_max_price: maxPrice
        }]);
      }

      setResult({ min: minPrice, max: maxPrice, rate: Math.round(adjustedRate), source: rateSource });

    } catch (error) {
      console.error("Error:", error);
      alert("Error generating estimate.");
    } finally {
      setIsCalculating(false);
    }
  };

  // --- BUYER / MARKET TREND LOGIC ---
  const handleTrendCheck = async () => {
    if (!selectedSociety) return;
    
    const { data: rateData } = await supabase
      .from('base_rates')
      .select('base_rate_per_sqft')
      .eq('locality_name', selectedSociety)
      .eq('property_type', 'flat')
      .single();

    if (rateData) {
      const rate = rateData.base_rate_per_sqft;
      // Standard Indirapuram Sizes
      setTrendResult({
        baseRate: rate,
        twoBHK: Math.round(rate * 1100),   // ~1100 sqft
        threeBHK: Math.round(rate * 1600), // ~1600 sqft
        fourBHK: Math.round(rate * 2200)   // ~2200 sqft
      });
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Indirapuram Property Valuator</h1>
          <p className="mt-2 text-gray-600">Accurate algorithmic estimates based on real market trends.</p>
        </div>

        {/* --- MODE TOGGLE --- */}
        <div className="flex bg-gray-200 p-1 rounded-lg mb-6 font-medium">
          <button
            onClick={() => setMode('seller')}
            className={`w-1/2 py-2.5 rounded-md text-sm transition ${mode === 'seller' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            I want to SELL
          </button>
          <button
            onClick={() => setMode('buyer')}
            className={`w-1/2 py-2.5 rounded-md text-sm transition ${mode === 'buyer' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            CHECK MARKET RATES (Buyer)
          </button>
        </div>

        {/* ========================================= */}
        {/* --- SELLER MODE UI --- */}
        {/* ========================================= */}
        {mode === 'seller' && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <form onSubmit={handleSellerEstimate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Enter 10-digit number" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Society / Locality</label>
                  <input type="text" name="society" value={formData.society} onChange={handleChange} placeholder="e.g., ATS Village" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"/>
                  <p className="text-xs text-blue-500 mt-1">Try: ATS Village, Gaur GC-1, Shipra Sun City</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size (Sq. Ft.) <span className="text-red-500">*</span></label>
                  <input type="number" name="size" value={formData.size} onChange={handleChange} required placeholder="e.g., 1500" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                  <input type="number" name="floor" value={formData.floor} onChange={handleChange} placeholder="e.g., 5" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facing</label>
                  <select name="facing" value={formData.facing} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white">
                    <option value="East">East Facing</option>
                    <option value="North">North Facing</option>
                    <option value="West">West Facing</option>
                    <option value="South">South Facing</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isCalculating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-lg transition duration-200 disabled:bg-indigo-400">
                {isCalculating ? 'Analyzing Society Data...' : 'Generate True Price Estimate'}
              </button>
            </form>

            {result && (
              <div className="mt-6 p-6 bg-indigo-50 rounded-lg border border-indigo-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Your Property Estimate</h3>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-500">Effective Rate</p>
                    <p className="text-xl font-bold text-indigo-700">₹{result.rate} / sq.ft.</p>
                    <p className="text-xs text-gray-500 italic">{result.source}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Expected Value</p>
                    <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(result.min)} - {formatCurrency(result.max)}</p>
                  </div>
                </div>
                <button className="mt-4 w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-800 transition text-sm">
                  Connect with 3 Verified Brokers to Sell
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* --- BUYER / MARKET TREND MODE UI --- */}
        {/* ========================================= */}
        {mode === 'buyer' && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Explore Locality Rates</h2>
            <p className="text-sm text-gray-500 mb-6">Select a society to see the current going rates for standard configurations. No phone number required.</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <select 
                value={selectedSociety} 
                onChange={(e) => setSelectedSociety(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
              >
                <option value="">-- Select a Society --</option>
                {societies.map((soc) => (
                  <option key={soc} value={soc}>{soc}</option>
                ))}
              </select>
              <button 
                onClick={handleTrendCheck}
                disabled={!selectedSociety}
                className="px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 transition"
              >
                Check Rates
              </button>
            </div>

            {trendResult && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                  <p className="text-sm text-gray-500">Current Base Rate in {selectedSociety}</p>
                  <p className="text-3xl font-extrabold text-indigo-700 mt-1">₹{trendResult.baseRate} / sq.ft.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                    <p className="text-xs font-medium text-blue-800">Standard 2 BHK</p>
                    <p className="text-sm text-blue-600 mb-1">(~1100 sq.ft.)</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.twoBHK)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                    <p className="text-xs font-medium text-green-800">Standard 3 BHK</p>
                    <p className="text-sm text-green-600 mb-1">(~1600 sq.ft.)</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.threeBHK)}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-center">
                    <p className="text-xs font-medium text-purple-800">Standard 4 BHK</p>
                    <p className="text-sm text-purple-600 mb-1">(~2200 sq.ft.)</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.fourBHK)}</p>
                  </div>
                </div>

                <button className="w-full border-2 border-indigo-600 text-indigo-600 font-semibold py-3 rounded-lg hover:bg-indigo-50 transition">
                  I want to buy here. Connect me with a Broker.
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}