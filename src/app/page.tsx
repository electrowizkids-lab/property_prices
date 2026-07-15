'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import ValuatorUI from '@/components/ValuatorUI';

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
  
  // Changed to string to support all 4 areas
  const [selectedLocality, setSelectedLocality] = useState<string>('Indirapuram');
  
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

  // Tab switching logic: Keeps Locality, clears property data
  const handleModeChange = (newMode: 'seller' | 'buyer') => {
    setMode(newMode);
    setSelectedSociety('');
    setTrendResult(null);
    setFormData(prev => ({ 
      ...prev, 
      society: '', 
      propertyType: 'flat',
      size: '',
      floor: '',
    })); 
  };

  useEffect(() => {
    const fetchSocieties = async () => {
      // Strict DB check: Plots look at sqyd column, Flats look at sqft column
      const checkColumn = formData.propertyType === 'plot' ? 'base_rate_per_sqyd' : 'base_rate_per_sqft';
      
      const { data } = await supabase
        .from('base_rates')
        .select('locality_name')
        .eq('property_type', formData.propertyType) 
        .eq('locality', selectedLocality)           
        .not(checkColumn, 'is', null)                
        .not('locality_name', 'ilike', '%Average%'); 

      if (data) {
        const uniqueSocieties = [
          `${selectedLocality} Area Average`,
          ...[...new Set(data.map(item => item.locality_name))].sort()
        ];
        setSocieties(uniqueSocieties);
      }
    };
    
    fetchSocieties();
  }, [selectedLocality, formData.propertyType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value });
  };

  const handleSellerEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedSize = parseFloat(formData.size);
    if (isNaN(parsedSize) || parsedSize < 50 || parsedSize > 50000) {
      return alert("Invalid size. Please enter a value between 50 and 50,000.");
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      return alert("Please enter a valid 10-digit mobile number.");
    }

    if (formData.propertyType === 'flat') {
      const year = parseInt(formData.yearBuilt);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1970 || year > currentYear) {
        return alert(`Invalid year. Properties built before 1970 or in the future are rejected.`);
      }
    }
    
    setIsCalculating(true);
    setResult(null); 

    try {
      const { data: lead } = await supabase.from('leads').insert([{ phone_number: formData.phone, user_type: 'seller' }]).select().single();
      const isPlot = formData.propertyType === 'plot';
      
      let superSize = parsedSize;
      let carpetSize: number | null = null;

      if (!isPlot) {
        if (formData.areaType === 'carpet') { superSize = parsedSize / 0.70; carpetSize = parsedSize; } 
        else { carpetSize = Math.round(parsedSize * 0.70); }
      }

      // --- DYNAMIC DATABASE STRATEGY ---
      let baseRate: number;
      let rateSource: string;
      const areaAverageName = `${selectedLocality} Area Average`;

      let useAverage = false;
      let specificNotFound = false;

      if (formData.society.trim() === `${selectedLocality} Area Average` || formData.society.trim() === "") {
         useAverage = true;
      } else {
         const { data: rateData } = await supabase
           .from('base_rates')
           .select('base_rate_per_sqft, base_rate_per_sqyd') 
           .eq('locality_name', formData.society.trim())
           .eq('property_type', isPlot ? 'plot' : 'flat')
           .maybeSingle();

         if (rateData) {
           baseRate = isPlot ? rateData.base_rate_per_sqyd! : rateData.base_rate_per_sqft!;
           rateSource = `Specific rate for ${formData.society}`;
         } else {
           useAverage = true;
           specificNotFound = true;
         }
      }

      if (useAverage) {
         const { data: avgData } = await supabase
           .from('base_rates')
           .select('base_rate_per_sqft, base_rate_per_sqyd')
           .eq('locality_name', areaAverageName)
           .eq('property_type', isPlot ? 'plot' : 'flat')
           .maybeSingle();

         if (avgData) {
           baseRate = isPlot ? avgData.base_rate_per_sqyd! : avgData.base_rate_per_sqft!;
           rateSource = specificNotFound 
             ? `${selectedLocality} Area Average (Specific data not found)` 
             : `${selectedLocality} Area Average`;
         } else {
           setIsCalculating(false);
           return alert(`Configuration error: Missing baseline data for ${selectedLocality} ${isPlot ? 'plots' : 'flats'}.`);
         }
      }
      // --- END DYNAMIC STRATEGY ---

      let adjustedRate = baseRate;
      let percentageAdjustment = 0; 
      const adjustmentsLog: Adjustment[] = []; 

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
        
        const EXCELLENT_ADJ = 3;
        const RENO_ADJ = -5;
        const RENO_COST_PER_SQFT = 500; 

        if (formData.condition === 'excellent') { 
          percentageAdjustment += EXCELLENT_ADJ; 
          adjustmentsLog.push({ label: "Excellent Condition", value: `+${EXCELLENT_ADJ}%`, isPositive: true }); 
        } else if (formData.condition === 'needs_renovation') { 
          percentageAdjustment += RENO_ADJ; 
          adjustmentsLog.push({ label: "Needs Renovation", value: `${RENO_ADJ}%`, isPositive: false }); 
          
          const conditionDelta = EXCELLENT_ADJ - RENO_ADJ; 
          const hypotheticalExcellentRate = baseRate * (1 + ((percentageAdjustment + conditionDelta) / 100));
          const currentEstimate = baseRate * (1 + (percentageAdjustment / 100)) * superSize;
          const excellentEstimate = hypotheticalExcellentRate * superSize;
          
          const effectiveCarpetSize = carpetSize || Math.round(superSize * 0.70);
          renoCost = Math.round(effectiveCarpetSize * RENO_COST_PER_SQFT);
          
          renoValueIncrease = Math.round(excellentEstimate - currentEstimate);
          renoROI = Math.round(((renoValueIncrease - renoCost) / renoCost) * 100);
        }
      }

      adjustedRate = adjustedRate * (1 + (percentageAdjustment / 100));
      const totalEstimate = adjustedRate * (isPlot ? parsedSize : superSize);
      const minPrice = Math.round(totalEstimate * 0.97);
      const maxPrice = Math.round(totalEstimate * 1.03);

      let circleRateValue = null;
      let premium = null;
      const societyKey = formData.society.trim().toLowerCase();
      
      const SQM_TO_SQFT = 10.764; 
      const SUPER_TO_BUILT_UP_FACTOR = 0.85; 
      
      const { data: circleData } = await supabase
        .from('circle_rates')
        .select('circle_rate_per_sq_yd, circle_rate_flat_per_sqm')
        .ilike('locality_name', societyKey)
        .maybeSingle();

      if (circleData) {
        if (isPlot && circleData.circle_rate_per_sq_yd) {
          circleRateValue = Math.round(circleData.circle_rate_per_sq_yd * parsedSize);
        } else if (!isPlot && circleData.circle_rate_flat_per_sqm) {
          const ratePerSqFt = circleData.circle_rate_flat_per_sqm / SQM_TO_SQFT;
          const builtUpArea = superSize * SUPER_TO_BUILT_UP_FACTOR;
          circleRateValue = Math.round(ratePerSqFt * builtUpArea);
        }
        
        if (circleRateValue) {
          premium = Math.round(((totalEstimate - circleRateValue) / totalEstimate) * 100);
        }
      }

      if (lead) {
        await supabase.from('valuations').insert([{ 
          lead_id: lead.id, 
          property_type: formData.propertyType, 
          society_name: formData.society, 
          size_sqft: isPlot ? parsedSize : superSize, 
          floor: isPlot ? null : parseInt(formData.floor), 
          facing: formData.facing, 
          estimated_min_price: minPrice, 
          estimated_max_price: maxPrice 
        }]);
      }

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
    if (rateData) { 
      const rate = rateData.base_rate_per_sqft; 
      setTrendResult({ baseRate: rate, twoBHK: Math.round(rate * 1100), threeBHK: Math.round(rate * 1600), fourBHK: Math.round(rate * 2200) }); 
    }
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
      setMode={handleModeChange}
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
      selectedLocality={selectedLocality}
      setSelectedLocality={setSelectedLocality}
    />
  );
}