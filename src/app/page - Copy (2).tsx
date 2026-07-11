'use client';

import { useState } from 'react';
// THIS IS THE MISSING LINE WE NEED TO ADD:
import { supabase } from '@/lib/supabase'; 

export default function Home() {
  // 1. Form State
  const [formData, setFormData] = useState({
    phone: '',
    society: '',
    size: '',
    floor: '',
    facing: 'East'
  });

  // 2. Result State
  const [result, setResult] = useState<{min: number, max: number, rate: number} | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // 3. Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 4. The Prediction Algorithm & Database Submission
  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setResult(null); 

    try {
      // --- SAVE LEAD TO DATABASE ---
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert([{ phone_number: formData.phone, user_type: 'seller' }])
        .select()
        .single();

      if (leadError) throw leadError;

      // --- HARDCODED MVP BASE RATE ---
      const baseRate = 8500; 
      const sizeNum = parseFloat(formData.size) || 1000;
      const floorNum = parseInt(formData.floor) || 1;
      const facing = formData.facing;

      // --- ADJUSTMENT LOGIC ---
      let adjustedRate = baseRate;

      if (floorNum === 1) adjustedRate += 50;
      else if (floorNum >= 3 && floorNum <= 7) adjustedRate += 30;
      else if (floorNum >= 12) adjustedRate -= 40;

      if (facing === 'East') adjustedRate += 50;
      else if (facing === 'North') adjustedRate += 40;
      else if (facing === 'West') adjustedRate -= 20;
      else if (facing === 'South') adjustedRate -= 30;

      // --- FINAL CALCULATION ---
      const totalEstimate = adjustedRate * sizeNum;
      const minPrice = Math.round(totalEstimate * 0.97);
      const maxPrice = Math.round(totalEstimate * 1.03);

      // --- SAVE VALUATION TO DATABASE ---
      if (lead) {
        await supabase.from('valuations').insert([{
          lead_id: lead.id,
          property_type: 'flat',
          society_name: formData.society,
          size_sqft: sizeNum,
          floor: floorNum,
          facing: facing,
          estimated_min_price: minPrice,
          estimated_max_price: maxPrice
        }]);
      }

      // --- SHOW RESULT TO USER ---
      setResult({
        min: minPrice,
        max: maxPrice,
        rate: Math.round(adjustedRate)
      });

    } catch (error) {
      console.error("Error saving data:", error);
      alert("There was an error generating your estimate. Please check the console.");
    } finally {
      setIsCalculating(false);
    }
  };

  // Helper to format numbers in Indian Rupee style
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Indirapuram Property Valuator</h1>
          <p className="mt-2 text-gray-600">Get an instant, algorithmic estimate based on current market trends.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleEstimate} className="space-y-6">
            
            {/* Lead Capture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="Enter 10-digit number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">Used solely to share your detailed valuation report.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Society / Locality</label>
                <input 
                  type="text" 
                  name="society"
                  value={formData.society}
                  onChange={handleChange}
                  placeholder="e.g., ATS Village"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size (Sq. Ft.) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 1500"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <input 
                  type="number" 
                  name="floor"
                  value={formData.floor}
                  onChange={handleChange}
                  placeholder="e.g., 5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facing</label>
                <select 
                  name="facing"
                  value={formData.facing}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                >
                  <option value="East">East Facing</option>
                  <option value="North">North Facing</option>
                  <option value="West">West Facing</option>
                  <option value="South">South Facing</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isCalculating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-lg transition duration-200 disabled:bg-indigo-400 flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Market Data...
                </>
              ) : (
                'Generate True Price Estimate'
              )}
            </button>
          </form>
        </div>

        {/* Results Card */}
        {result && (
          <div className="mt-6 bg-white p-8 rounded-xl shadow-sm border border-green-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Estimated Market Range</h2>
            
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Effective Rate</p>
                <p className="text-2xl font-bold text-indigo-600">₹{result.rate} / sq.ft.</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Expected Property Value</p>
                <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(result.min)} - {formatCurrency(result.max)}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                *Disclaimer: This is an algorithmic estimate based on macro market trends for Indirapuram. Actual prices may vary based on interior condition, urgency of buyer/seller, and specific tower/location within the society. 
              </p>
            </div>
            
            <button className="mt-4 w-full border-2 border-indigo-600 text-indigo-600 font-semibold py-3 rounded-lg hover:bg-indigo-50 transition">
              Connect with 3 Verified Local Brokers
            </button>
          </div>
        )}

      </div>
    </main>
  );
}