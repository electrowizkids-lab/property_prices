'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 

const CIRCLE_RATES: Record<string, number> = {
  'ats village': 65000, 'nyay khand 1': 55000, 'ahinsa khand 1': 60000,
  'gaur gc-1': 55000, 'shipra sun city': 50000, 'garden gateway': 48000,
};

interface Adjustment {
  label: string;
  value: string;
  isPositive: boolean;
}

export default function Home() {
  const [mode, setMode] = useState<'seller' | 'buyer'>('seller');
  
  const [formData, setFormData] = useState({
    phone: '', propertyType: 'flat', society: '', size: '', 
    areaType: 'super', floor: '', facing: 'East', roadWidth: '30', isCorner: false,
    yearBuilt: '2020', hasVastu: false, parkingType: 'one', condition: 'good'
  });
  
  const [result, setResult] = useState<{
    min: number, max: number, rate: number, source: string, unit: string, 
    circleRateValue: number | null, premium: number | null, carpetSize: number | null,
    adjustments: Adjustment[],
    renoValueIncrease: number | null, renoCost: number | null, renoROI: number | null
  } | null>(null);
  
  const [isCalculating, setIsCalculating] = useState(false);

  const [societies, setSocieties] = useState<string[]>([]);
  const [selectedSociety, setSelectedSociety] = useState<string>('');
  const [trendResult, setTrendResult] = useState<{baseRate: number, twoBHK: number, threeBHK: number, fourBHK: number} | null>(null);
  const [showBuyerPopup, setShowBuyerPopup] = useState(false);
  const [buyerPhone, setBuyerPhone] = useState('');

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

  const handleSellerEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setResult(null); 

    try {
      const { data: lead } = await supabase.from('leads').insert([{ phone_number: formData.phone, user_type: 'seller' }]).select().single();
      const isPlot = formData.propertyType === 'plot';
      
      let inputSize = parseFloat(formData.size) || 0;
      let superSize = inputSize;
      let carpetSize: number | null = null;

      if (!isPlot) {
        if (formData.areaType === 'carpet') { superSize = inputSize / 0.70; carpetSize = inputSize; } 
        else { carpetSize = Math.round(inputSize * 0.70); }
      }

      let baseRate = isPlot ? 70000 : 8500; 
      let rateSource = isPlot ? "Indirapuram Plot Average" : "Indirapuram Flat Average";
      if (formData.society.trim() !== "") {
        const { data: rateData } = await supabase.from('base_rates').select('base_rate_per_sqft').ilike('locality_name', formData.society.trim()).eq('property_type', isPlot ? 'plot' : 'flat').maybeSingle();
        if (rateData) { baseRate = rateData.base_rate_per_sqft; rateSource = `Specific rate for ${formData.society}`; }
      }

      let adjustedRate = baseRate;
      let percentageAdjustment = 0; 
      const adjustmentsLog: Adjustment[] = []; 

      // Declare Renovation variables cleanly at the top
      let renoValueIncrease = null;
      let renoCost = null;
      let renoROI = null;

      if (isPlot) {
        const roadW = parseInt(formData.roadWidth) || 30;
        if (roadW >= 60) { percentageAdjustment += 15; adjustmentsLog.push({ label: "Wide Road Premium (60ft+)", value: "+15%", isPositive: true }); } 
        else if (roadW >= 40) { percentageAdjustment += 10; adjustmentsLog.push({ label: "Road Width Premium (40ft)", value: "+10%", isPositive: true }); }
        if (formData.isCorner) { percentageAdjustment += 12; adjustmentsLog.push({ label: "Corner Plot Premium", value: "+12%", isPositive: true }); }
        if (formData.facing === 'East') { percentageAdjustment += 5; adjustmentsLog.push({ label: "East Facing Premium", value: "+5%", isPositive: true }); } 
        else if (formData.facing === 'North') { percentageAdjustment += 3; adjustmentsLog.push({ label: "North Facing Premium", value: "+3%", isPositive: true }); } 
        else if (formData.facing === 'West') { percentageAdjustment -= 3; adjustmentsLog.push({ label: "West Facing Discount", value: "-3%", isPositive: false }); }
      } else {
        const floorNum = parseInt(formData.floor) || 1;
        if (floorNum === 1) { percentageAdjustment += 1.5; adjustmentsLog.push({ label: "Ground Floor Premium", value: "+1.5%", isPositive: true }); } 
        else if (floorNum >= 3 && floorNum <= 7) { percentageAdjustment += 1; adjustmentsLog.push({ label: "Mid-Floor Premium (3-7)", value: "+1%", isPositive: true }); } 
        else if (floorNum >= 12) { percentageAdjustment -= 1; adjustmentsLog.push({ label: "Top Floor Discount (12+)", value: "-1%", isPositive: false }); }
        
        if (formData.facing === 'East') { percentageAdjustment += 1; adjustmentsLog.push({ label: "East Facing", value: "+1%", isPositive: true }); } 
        else if (formData.facing === 'North') { percentageAdjustment += 0.8; adjustmentsLog.push({ label: "North Facing", value: "+0.8%", isPositive: true }); } 
        else if (formData.facing === 'West') { percentageAdjustment -= 0.5; adjustmentsLog.push({ label: "West Facing", value: "-0.5%", isPositive: false }); } 
        else if (formData.facing === 'South') { percentageAdjustment -= 0.8; adjustmentsLog.push({ label: "South Facing", value: "-0.8%", isPositive: false }); }
        
        const currentYear = new Date().getFullYear();
        const age = currentYear - (parseInt(formData.yearBuilt) || 2020);
        if (age > 0) {
          const ageDepreciation = Math.min(age * 0.5, 20);
          percentageAdjustment -= ageDepreciation;
          adjustmentsLog.push({ label: `Age Depreciation (${age} yrs old)`, value: `-${ageDepreciation}%`, isPositive: false });
        }

        if (formData.hasVastu) { percentageAdjustment += 2.5; adjustmentsLog.push({ label: "Vastu Compliant", value: "+2.5%", isPositive: true }); }
        if (formData.parkingType === 'two') { percentageAdjustment += 2; adjustmentsLog.push({ label: "Double Covered Parking", value: "+2%", isPositive: true }); } 
        else if (formData.parkingType === 'none') { percentageAdjustment -= 2; adjustmentsLog.push({ label: "No Parking", value: "-2%", isPositive: false }); }
        
        if (formData.condition === 'excellent') { 
          percentageAdjustment += 3; 
          adjustmentsLog.push({ label: "Excellent Condition", value: "+3%", isPositive: true }); 
        } else if (formData.condition === 'needs_renovation') { 
          percentageAdjustment -= 5; 
          adjustmentsLog.push({ label: "Needs Renovation", value: "-5%", isPositive: false }); 
          
          const hypotheticalExcellentRate = baseRate * (1 + ((percentageAdjustment + 8) / 100));
          const currentEstimate = baseRate * (1 + (percentageAdjustment / 100)) * superSize;
          const excellentEstimate = hypotheticalExcellentRate * superSize;
          
          renoCost = 350000; // Set cost here cleanly
          renoValueIncrease = Math.round(excellentEstimate - currentEstimate);
          renoROI = Math.round(((renoValueIncrease - renoCost) / renoCost) * 100);
        }
      }

      adjustedRate = adjustedRate * (1 + (percentageAdjustment / 100));
      const totalEstimate = adjustedRate * (isPlot ? inputSize : superSize);
      const minPrice = Math.round(totalEstimate * 0.97);
      const maxPrice = Math.round(totalEstimate * 1.03);

      let circleRateValue = null;
      let premium = null;
      const societyKey = formData.society.trim().toLowerCase();
      if (CIRCLE_RATES[societyKey]) {
        const circlePerSqYard = CIRCLE_RATES[societyKey];
        circleRateValue = isPlot ? Math.round(circlePerSqYard * inputSize) : Math.round((circlePerSqYard / 9) * superSize);
        premium = Math.round(((totalEstimate - circleRateValue) / totalEstimate) * 100);
      }

      if (lead) {
        await supabase.from('valuations').insert([{ lead_id: lead.id, property_type: formData.propertyType, society_name: formData.society, size_sqft: isPlot ? inputSize : superSize, floor: isPlot ? null : parseInt(formData.floor), facing: formData.facing, estimated_min_price: minPrice, estimated_max_price: maxPrice }]);
      }

      // Pass the clean variables directly into setResult
      setResult({ 
        min: minPrice, max: maxPrice, rate: Math.round(adjustedRate), source: rateSource, 
        unit: isPlot ? 'Sq. Yard' : 'Sq. Ft. (Super)', circleRateValue, premium, carpetSize: isPlot ? null : carpetSize,
        adjustments: adjustmentsLog,
        renoValueIncrease, renoCost, renoROI
      });

    } catch (error) { console.error("Error:", error); } finally { setIsCalculating(false); }
  };

  const handleTrendCheck = async () => {
    if (!selectedSociety) return;
    const { data: rateData } = await supabase.from('base_rates').select('base_rate_per_sqft').eq('locality_name', selectedSociety).eq('property_type', 'flat').single();
    if (rateData) { const rate = rateData.base_rate_per_sqft; setTrendResult({ baseRate: rate, twoBHK: Math.round(rate * 1100), threeBHK: Math.round(rate * 1600), fourBHK: Math.round(rate * 2200) }); }
  };

  const handleBuyerLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerPhone || buyerPhone.length !== 10) return alert("Enter valid 10-digit number");
    await supabase.from('leads').insert([{ phone_number: buyerPhone, user_type: 'buyer', society_name: selectedSociety }]);
    alert("Success! Top local brokers will contact you shortly.");
    setShowBuyerPopup(false); setBuyerPhone('');
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 flex flex-col">
      <div className="max-w-3xl mx-auto w-full flex-grow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Indirapuram Property Valuator</h1>
          <p className="mt-2 text-gray-600">Advanced Algorithmic Pricing: Area, Age, Vastu & Circle Rates.</p>
        </div>

        <div className="flex bg-gray-200 p-1 rounded-lg mb-6 font-medium">
          <button onClick={() => setMode('seller')} className={`w-1/2 py-2.5 rounded-md text-sm transition ${mode === 'seller' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'}`}>I want to SELL</button>
          <button onClick={() => setMode('buyer')} className={`w-1/2 py-2.5 rounded-md text-sm transition ${mode === 'buyer' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'}`}>CHECK MARKET RATES</button>
        </div>

        {mode === 'seller' && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <form onSubmit={handleSellerEstimate} className="space-y-6">
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button type="button" onClick={() => setFormData({...formData, propertyType: 'flat'})} className={`w-1/2 py-2.5 text-sm font-medium ${formData.propertyType === 'flat' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>Flat / Apartment</button>
                <button type="button" onClick={() => setFormData({...formData, propertyType: 'plot'})} className={`w-1/2 py-2.5 text-sm font-medium border-l border-gray-300 ${formData.propertyType === 'plot' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>Plot / Land</button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Enter 10-digit number" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Society / Locality</label>
                  <input type="text" name="society" value={formData.society} onChange={handleChange} placeholder="e.g., ATS Village" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size ({formData.propertyType === 'plot' ? 'Sq. Yards' : 'Sq. Ft.'}) <span className="text-red-500">*</span></label>
                  <div className="flex">
                    <input type="number" name="size" value={formData.size} onChange={handleChange} required placeholder={formData.propertyType === 'plot' ? "100" : "1500"} className="w-full px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/>
                    {formData.propertyType === 'flat' && (
                      <select name="areaType" value={formData.areaType} onChange={handleChange} className="px-2 py-3 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="super">Super</option><option value="carpet">Carpet</option>
                      </select>
                    )}
                  </div>
                </div>
                {formData.propertyType === 'flat' ? (
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Floor</label><input type="number" name="floor" value={formData.floor} onChange={handleChange} placeholder="e.g., 5" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/></div>
                ) : (
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Road Width</label><select name="roadWidth" value={formData.roadWidth} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"><option value="20">Narrow (20 ft)</option><option value="30">Standard (30 ft)</option><option value="40">Wide (40 ft)</option><option value="60">Extra Wide (60ft+)</option></select></div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facing</label>
                  <select name="facing" value={formData.facing} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"><option value="East">East</option><option value="North">North</option><option value="West">West</option><option value="South">South</option></select>
                </div>
                {formData.propertyType === 'flat' && (
                  <>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label><input type="number" name="yearBuilt" value={formData.yearBuilt} onChange={handleChange} placeholder="e.g., 2010" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Condition</label><select name="condition" value={formData.condition} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"><option value="excellent">Excellent/Ready to move</option><option value="good">Good (Normal wear)</option><option value="needs_renovation">Needs Renovation</option></select></div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                {formData.propertyType === 'plot' && (<label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="isCorner" checked={formData.isCorner} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded"/> Corner Plot</label>)}
                {formData.propertyType === 'flat' && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="hasVastu" checked={formData.hasVastu} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded"/> Vastu Compliant</label>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="font-medium">Parking:</span>
                      <label className="flex items-center gap-1"><input type="radio" name="parkingType" value="two" checked={formData.parkingType === 'two'} onChange={handleChange} className="w-3 h-3 text-indigo-600"/> 2 Covered</label>
                      <label className="flex items-center gap-1"><input type="radio" name="parkingType" value="one" checked={formData.parkingType === 'one'} onChange={handleChange} className="w-3 h-3 text-indigo-600"/> 1 Covered</label>
                      <label className="flex items-center gap-1"><input type="radio" name="parkingType" value="none" checked={formData.parkingType === 'none'} onChange={handleChange} className="w-3 h-3 text-indigo-600"/> None</label>
                    </div>
                  </>
                )}
              </div>

              <button type="submit" disabled={isCalculating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-lg transition disabled:bg-indigo-400">
                {isCalculating ? 'Running Advanced Algorithm...' : 'Generate True Price Estimate'}
              </button>
            </form>

            {result && (
              <div className="mt-6 space-y-4">
                <div className="p-6 bg-indigo-50 rounded-lg border border-indigo-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Advanced Property Estimate</h3>
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
                  {result.carpetSize && (<div className="mt-3 pt-3 border-t border-indigo-100 text-xs text-indigo-600 flex justify-between"><span>Estimated Carpet Area:</span><span className="font-bold">{result.carpetSize} Sq. Ft.</span></div>)}
                  <button type="button" onClick={() => alert("Your details have been shared with top local brokers!")} className="mt-4 w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-800 transition text-sm">Connect with 3 Verified Brokers</button>
                </div>

                {result.adjustments.length > 0 && (
                  <div className="p-6 bg-white rounded-lg border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Algorithm Price Breakdown
                    </h4>
                    <div className="space-y-2">
                      {result.adjustments.map((adj, index) => (
                        <div key={index} className={`flex justify-between items-center py-2 px-3 rounded-md text-sm ${adj.isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                          <span className="text-gray-700">{adj.label}</span>
                          <span className={`font-bold ${adj.isPositive ? 'text-green-700' : 'text-red-700'}`}>{adj.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3 italic">*Adjustments are applied cumulatively to the society base rate.</p>
                  </div>
                )}

                {result.renoValueIncrease !== null && result.renoCost !== null && (
                  <div className="p-6 bg-emerald-50 rounded-lg border border-emerald-200">
                    <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      Renovation Upside Potential
                    </h4>
                    <p className="text-sm text-emerald-700 mb-4">By investing in standard upgrades, you can shift this property to "Excellent" condition.</p>
                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                      <div className="bg-white p-3 rounded border border-emerald-100">
                        <p className="text-xs text-gray-500">Est. Reno Cost</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(result.renoCost)}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-emerald-100">
                        <p className="text-xs text-gray-500">Value Increase</p>
                        <p className="text-lg font-bold text-green-600">+{formatCurrency(result.renoValueIncrease)}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-emerald-100">
                        <p className="text-xs text-gray-500">Net ROI</p>
                        <p className="text-lg font-bold text-emerald-700">{result.renoROI}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-600 text-center font-medium">*Highly recommended to maximize your sale price before listing.</p>
                  </div>
                )}

                {result.circleRateValue !== null && (
                  <div className="p-6 bg-amber-50 rounded-lg border border-amber-200">
                    <h4 className="font-bold text-amber-800 mb-3">Circle Rate vs. Market Rate Analytics</h4>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div><p className="text-xs text-amber-700">Est. Registry Value</p><p className="text-lg font-bold text-red-600">{formatCurrency(result.circleRateValue)}</p></div>
                      <div><p className="text-xs text-amber-700">Est. Market Value</p><p className="text-lg font-bold text-green-600">{formatCurrency(result.min)}</p></div>
                    </div>
                    <div className="mt-4 p-3 bg-white rounded border border-amber-100 text-center">
                      <p className="text-xs text-gray-500">Market Premium</p>
                      <p className="text-2xl font-extrabold text-amber-700">~ {result.premium}%</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'buyer' && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Explore Locality Rates</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <select value={selectedSociety} onChange={(e) => setSelectedSociety(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg outline-none bg-white text-gray-900"><option value="">-- Select a Society --</option>{societies.map((soc) => (<option key={soc} value={soc}>{soc}</option>))}</select>
              <button onClick={handleTrendCheck} disabled={!selectedSociety} className="px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 transition">Check Rates</button>
            </div>
            {trendResult && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border text-center"><p className="text-sm text-gray-500">Current Base Rate in {selectedSociety}</p><p className="text-3xl font-extrabold text-indigo-700 mt-1">₹{trendResult.baseRate} / sq.ft.</p></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border text-center"><p className="text-xs font-medium text-blue-800">2 BHK</p><p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.twoBHK)}</p></div>
                  <div className="p-4 bg-green-50 rounded-lg border text-center"><p className="text-xs font-medium text-green-800">3 BHK</p><p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.threeBHK)}</p></div>
                  <div className="p-4 bg-purple-50 rounded-lg border text-center"><p className="text-xs font-medium text-purple-800">4 BHK</p><p className="text-lg font-bold text-gray-900">{formatCurrency(trendResult.fourBHK)}</p></div>
                </div>
                <button onClick={() => setShowBuyerPopup(true)} className="w-full border-2 border-indigo-600 text-indigo-600 font-semibold py-3 rounded-lg hover:bg-indigo-50 transition">Connect me with a Broker</button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* BUYER LEAD POPUP - PROPERLY FORMATTED */}
      {showBuyerPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Get Exclusive Inventory</h3>
            <p className="text-sm text-gray-500 mb-4">Get direct access to unlisted properties in {selectedSociety}.</p>
            <form onSubmit={handleBuyerLeadSubmit} className="space-y-4">
              <input 
                type="tel" 
                value={buyerPhone} 
                onChange={(e) => setBuyerPhone(e.target.value)} 
                placeholder="Enter 10-digit Mobile Number" 
                maxLength={10} 
                required 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowBuyerPopup(false)} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">Connect Me</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTORED: LEGAL FOOTER */}
      <div className="mt-12 text-center text-xs text-gray-400 pb-6">
        <p>© {new Date().getFullYear()} Indirapuram Property Valuator. All rights reserved.</p>
        <p className="mt-1">Disclaimer: This tool provides algorithmic estimates based on available market data and government circle rates. It does not constitute a legal valuation or financial advice. Actual transaction prices may vary.</p>
      </div>
    </main>
  );
}