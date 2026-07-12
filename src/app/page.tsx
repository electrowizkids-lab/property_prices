'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import ValuatorUI from '@/components/ValuatorUI';

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
    <ValuatorUI 
      mode={mode}
      setMode={setMode}
      formData={formData}
      setFormData={setFormData}
      handleChange={handleChange}
      handleSellerEstimate={handleSellerEstimate}
      isCalculating={isCalculating}
      result={result}
      societies={societies}
      selectedSociety={selectedSociety}
      setSelectedSociety={setSelectedSociety}
      handleTrendCheck={handleTrendCheck}
      trendResult={trendResult}
      showBuyerPopup={showBuyerPopup}
      setShowBuyerPopup={setShowBuyerPopup}
      buyerPhone={buyerPhone}
      setBuyerPhone={setBuyerPhone}
      handleBuyerLeadSubmit={handleBuyerLeadSubmit}
      formatCurrency={formatCurrency}
    />
  );
}
