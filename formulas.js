/**
 * Formula Engine for BYD ATTO 2 EV Charging Calculator
 * Replicates 1:1 all logic from Calcolo Ricariche.ods + Dynamic Custom Household Loads
 * + Dynamic Seasonal Solar Peak Window (multi-city European database)
 */

function parseTimeToHours(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseFloat(parts[0]) || 0;
  const m = parseFloat(parts[1]) || 0;
  return h + m / 60;
}

function getNum(val, defaultVal) {
  const n = parseFloat(val);
  return isNaN(n) ? defaultVal : n;
}

/**
 * European Cities Solar Database
 * lat: latitude (degrees N) — determines seasonal variation amplitude
 * peakBase: average peak window duration (hours) — varies by latitude (~4.5h equinox at 40°N)
 * peakAmplitude: how much the peak grows/shrinks from summer to winter (hours)
 * The peak is always centered at solar noon (12:00 local)
 */
const CITIES_DB = [
  { id: 'lliria',    name: 'Llíria (Valencia)',   country: 'ES', lat: 39.63, peakBase: 4.0, peakAmplitude: 1.0 },
  { id: 'madrid',    name: 'Madrid',               country: 'ES', lat: 40.42, peakBase: 4.0, peakAmplitude: 1.0 },
  { id: 'lisbona',   name: 'Lisbona',              country: 'PT', lat: 38.72, peakBase: 4.1, peakAmplitude: 1.0 },
  { id: 'roma',      name: 'Roma',                 country: 'IT', lat: 41.90, peakBase: 3.9, peakAmplitude: 1.0 },
  { id: 'milano',    name: 'Milano',               country: 'IT', lat: 45.47, peakBase: 3.7, peakAmplitude: 1.2 },
  { id: 'parigi',    name: 'Parigi',               country: 'FR', lat: 48.85, peakBase: 3.5, peakAmplitude: 1.4 },
  { id: 'berlino',   name: 'Berlino',              country: 'DE', lat: 52.52, peakBase: 3.2, peakAmplitude: 1.6 },
  { id: 'amsterdam', name: 'Amsterdam',            country: 'NL', lat: 52.37, peakBase: 3.2, peakAmplitude: 1.6 },
  { id: 'bruxelles', name: 'Bruxelles',            country: 'BE', lat: 50.85, peakBase: 3.3, peakAmplitude: 1.5 },
  { id: 'zurigo',    name: 'Zurigo',               country: 'CH', lat: 47.38, peakBase: 3.6, peakAmplitude: 1.3 },
  { id: 'vienna',    name: 'Vienna',               country: 'AT', lat: 48.21, peakBase: 3.5, peakAmplitude: 1.4 },
  { id: 'praga',     name: 'Praga',                country: 'CZ', lat: 50.08, peakBase: 3.3, peakAmplitude: 1.5 },
  { id: 'varsavia',  name: 'Varsavia',             country: 'PL', lat: 52.23, peakBase: 3.2, peakAmplitude: 1.6 },
  { id: 'budapest',  name: 'Budapest',             country: 'HU', lat: 47.50, peakBase: 3.6, peakAmplitude: 1.3 },
  { id: 'bucarest',  name: 'Bucarest',             country: 'RO', lat: 44.43, peakBase: 3.8, peakAmplitude: 1.1 },
  { id: 'atene',     name: 'Atene',                country: 'GR', lat: 37.98, peakBase: 4.2, peakAmplitude: 0.9 },
  { id: 'sofia',     name: 'Sofia',                country: 'BG', lat: 42.70, peakBase: 3.9, peakAmplitude: 1.0 },
  { id: 'belgrado',  name: 'Belgrado',             country: 'RS', lat: 44.82, peakBase: 3.8, peakAmplitude: 1.1 },
  { id: 'zagabria',  name: 'Zagabria',             country: 'HR', lat: 45.81, peakBase: 3.7, peakAmplitude: 1.2 },
  { id: 'lubiana',   name: 'Lubiana',              country: 'SI', lat: 46.05, peakBase: 3.7, peakAmplitude: 1.2 },
  { id: 'helsinki',  name: 'Helsinki',             country: 'FI', lat: 60.17, peakBase: 2.8, peakAmplitude: 2.2 },
  { id: 'stoccolma', name: 'Stoccolma',            country: 'SE', lat: 59.33, peakBase: 2.9, peakAmplitude: 2.0 },
  { id: 'oslo',      name: 'Oslo',                 country: 'NO', lat: 59.91, peakBase: 2.9, peakAmplitude: 2.0 },
  { id: 'copenaghen',name: 'Copenaghen',           country: 'DK', lat: 55.68, peakBase: 3.1, peakAmplitude: 1.8 },
  { id: 'dublino',   name: 'Dublino',              country: 'IE', lat: 53.33, peakBase: 3.2, peakAmplitude: 1.6 },
  { id: 'londra',    name: 'Londra',               country: 'GB', lat: 51.51, peakBase: 3.3, peakAmplitude: 1.5 },
  { id: 'edimburgo', name: 'Edimburgo',            country: 'GB', lat: 55.95, peakBase: 3.0, peakAmplitude: 1.8 },
  { id: 'tallinn',   name: 'Tallinn',              country: 'EE', lat: 59.44, peakBase: 2.9, peakAmplitude: 2.0 },
  { id: 'riga',      name: 'Riga',                 country: 'LV', lat: 56.95, peakBase: 3.1, peakAmplitude: 1.9 },
  { id: 'vilnius',   name: 'Vilnius',              country: 'LT', lat: 54.69, peakBase: 3.1, peakAmplitude: 1.8 },
  { id: 'nicosia',   name: 'Nicosia',              country: 'CY', lat: 35.17, peakBase: 4.4, peakAmplitude: 0.8 },
  { id: 'valletta',  name: 'La Valletta (Malta)',  country: 'MT', lat: 35.90, peakBase: 4.3, peakAmplitude: 0.8 },
  { id: 'barcellona',name: 'Barcellona',           country: 'ES', lat: 41.39, peakBase: 3.9, peakAmplitude: 1.0 },
  { id: 'siviglia',  name: 'Siviglia',             country: 'ES', lat: 37.39, peakBase: 4.2, peakAmplitude: 0.9 },
  { id: 'napoli',    name: 'Napoli',               country: 'IT', lat: 40.85, peakBase: 4.0, peakAmplitude: 1.0 },
  { id: 'palermo',   name: 'Palermo',              country: 'IT', lat: 38.12, peakBase: 4.2, peakAmplitude: 0.9 },
  { id: 'marsiglia', name: 'Marsiglia',            country: 'FR', lat: 43.30, peakBase: 3.9, peakAmplitude: 1.0 },
  { id: 'lione',     name: 'Lione',               country: 'FR', lat: 45.75, peakBase: 3.7, peakAmplitude: 1.2 },
  { id: 'monaco',    name: 'Monaco di Baviera',   country: 'DE', lat: 48.14, peakBase: 3.5, peakAmplitude: 1.4 },
];

/**
 * Given a city ID and a date string, compute the dynamic seasonal solar peak window.
 * Returns: { cityName, dayOfYear, peakDuration, startH, endH, startStr, endStr }
 */
function getSolarPeakForCity(cityId, dateStr) {
  const city = CITIES_DB.find(c => c.id === cityId) || CITIES_DB[0]; // Default to Llíria

  let dt = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(dt.getTime())) dt = new Date();

  const startYear = new Date(dt.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((dt - startYear) / (1000 * 60 * 60 * 24));

  // Seasonal factor: +1 at summer solstice (day ~172), -1 at winter solstice (day ~355)
  const seasonalFactor = Math.sin((dayOfYear - 80) * 2 * Math.PI / 365.25);
  const peakDuration = city.peakBase + (city.peakAmplitude * seasonalFactor);
  const halfWidth = Math.max(0.5, peakDuration) / 2.0;

  const startH = 12.0 - halfWidth;
  const endH = 12.0 + halfWidth;

  const formatH = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h % 1) * 60);
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  };

  return {
    cityId: city.id,
    cityName: city.name,
    dayOfYear,
    peakDuration: Math.max(0.5, peakDuration),
    startH,
    endH,
    startStr: formatH(startH),
    endStr: formatH(endH)
  };
}

// Keep backward-compatible alias
function getLliriaSolarPeakWindow(dateStr) {
  return getSolarPeakForCity('lliria', dateStr);
}

function calculateChargingPlan(inputs) {
  // 1. Defaults & Inputs Parsing
  const homeBatteryCapacity = getNum(inputs.homeBatteryCapacity, 18); // B2 (kWh)
  const homeBatteryMinReserve = getNum(inputs.homeBatteryMinReserve, 15); // B3 (%)
  const homeBatteryCurrentSoc = getNum(inputs.homeBatteryCurrentSoc, 68); // B4 (%)
  const houseBaseLoad = getNum(inputs.houseBaseLoad, 0.2); // B5 (kW)
  const acLoad = getNum(inputs.acLoad, 0.75); // B6 (kW)
  const acHours = getNum(inputs.acHours, 0); // B7 (hours)
  const currentTimeStr = inputs.currentTime ?? "21:00"; // B8

  const solarNominal = getNum(inputs.solarNominal, 3.0); // B10 (kW)
  const cloudiness = getNum(inputs.cloudiness, 32); // B11 (%)

  const evAmperage = getNum(inputs.evAmperage, 8); // B13 (A)
  const evBatteryCapacity = getNum(inputs.evBatteryCapacity, 60); // B14 (kWh)
  const evEfficiency = getNum(inputs.evEfficiency, 0.64); // B15 (64%)
  const inverterMaxPower = getNum(inputs.inverterMaxPower, 2.5); // B16 (kW)

  const startTimeStr = inputs.startTime ?? "07:00"; // B18
  const endTimeStr = inputs.endTime ?? "15:00"; // C18
  const evCurrentSoc = getNum(inputs.evCurrentSoc, 62); // B31 (%)

  const calcDateStr = inputs.calcDate;
  const cityId = inputs.cityId || 'lliria';

  // Custom Appliances Array: [{ name: string, powerKw: number, hours: number }]
  const customAppliances = Array.isArray(inputs.customAppliances) ? inputs.customAppliances : [];

  // 2. Calculations
  // B9: Ore Copertura Notturna (Hours until 09:00 AM)
  const currentHours = parseTimeToHours(currentTimeStr);
  let overnightHours = (9.0 - currentHours) % 24;
  if (overnightHours < 0) overnightHours += 24;

  // B12: Resa Solare Effettiva (kW)
  const effectiveSolarKw = solarNominal * (1 - (cloudiness / 100));

  // B19: Ore Ricarica Auto
  const startHours = parseTimeToHours(startTimeStr);
  const endHours = parseTimeToHours(endTimeStr);
  const startFrac = startHours / 24.0;
  const endFrac = endHours / 24.0;
  let chargeHours = ((endFrac - startFrac) % 1.0 + 1.0) % 1.0 * 24.0;
  if (chargeHours === 0 && startHours !== endHours) {
    chargeHours = 24.0;
  }

  // Dynamic Seasonal Solar Peak Window for selected city
  const solarPeak = getSolarPeakForCity(cityId, calcDateStr);
  const solarPeakStartH = solarPeak.startH;
  const solarPeakEndH = solarPeak.endH;

  // B20: Energia Iniziale Casa (kWh)
  const initialHomeBatteryKwh = homeBatteryCapacity * (homeBatteryCurrentSoc / 100);

  // B21: Riserva Minima kWh
  const minReserveKwh = homeBatteryCapacity * (homeBatteryMinReserve / 100);

  // Custom Appliances Energy & Peak Load Calculation
  let totalCustomConsumptionKwh = 0;
  let activeCustomPowerKw = 0;

  customAppliances.forEach(app => {
    const pKw = getNum(app.powerKw, 0);
    const h = getNum(app.hours, 0);
    totalCustomConsumptionKwh += pKw * h;
    if (h > 0) {
      activeCustomPowerKw += pKw;
    }
  });

  // B22: Consumo Casa Totale (kWh) (Base + AC + Custom Loads)
  const totalHouseConsumptionKwh = (houseBaseLoad * overnightHours) + (acLoad * acHours) + totalCustomConsumptionKwh;

  // Gross EV Power (kW)
  const grossEvPowerKw = (evAmperage * 230) / 1000;
  const grossEvEnergyKwh = grossEvPowerKw * chargeHours;

  // Solar Coverage Calculation during Charging Window with Dynamic Peak Hours for Llíria
  // Charging interval in hours [startHours, endHours]
  let evStartH = startHours;
  let evEndH = endHours;
  if (evEndH <= evStartH) evEndH += 24;

  const peakOverlapStart = Math.max(evStartH, solarPeakStartH);
  const peakOverlapEnd = Math.min(evEndH, solarPeakEndH);
  const peakSolarHours = Math.max(0, peakOverlapEnd - peakOverlapStart);
  const offpeakSolarHours = Math.max(0, chargeHours - peakSolarHours);

  // Total solar energy covering EV charging (100% peak, 40% off-peak)
  const solarContribKwh = (effectiveSolarKw * peakSolarHours) + (effectiveSolarKw * 0.4 * offpeakSolarHours);

  // B23: Energia Lorda Prelevata Auto da Batteria Casa (kWh)
  const grossEnergyDrawnFromHomeKwh = Math.max(0, grossEvEnergyKwh - solarContribKwh);

  // B24: Verifica Carico Inverter
  const activeAcPower = acHours > 0 ? acLoad : 0;
  const totalInverterLoadKw = houseBaseLoad + activeAcPower + activeCustomPowerKw + grossEvPowerKw;
  const isInverterOk = totalInverterLoadKw <= inverterMaxPower;
  const inverterStatus = isInverterOk ? "POTENZA INVERTER OK" : "ALLARME: SOVRACCARICO INVERTER!";

  // B25: SOC Finale Casa Stimato (%)
  const finalHomeBatteryKwh = initialHomeBatteryKwh - totalHouseConsumptionKwh - grossEnergyDrawnFromHomeKwh;
  const finalHomeBatterySocPct = (finalHomeBatteryKwh / homeBatteryCapacity) * 100;

  // B26: Esito Pianificazione
  const isHomeBatteryOk = finalHomeBatterySocPct >= homeBatteryMinReserve;
  const planningStatus = isHomeBatteryOk ? "OK - RICARICA COMPATIBILE" : "ATTENZIONE - SOTTO IL 15%";

  // B28: Velocità di ricarica (W)
  const chargingPowerWatts = evAmperage * 230;

  // B29: CARICA EFFETTIVA TOTALE (kWh net added to EV)
  const netEvEnergyAddedKwh = grossEvPowerKw * chargeHours * evEfficiency;

  // B30: BATTERIA RICARICATA %
  const addedEvSocPct = (netEvEnergyAddedKwh / evBatteryCapacity) * 100;

  // B32: SOC Finale Auto Stimato %
  const finalEvSocPct = Math.min(100, evCurrentSoc + addedEvSocPct);

  return {
    overnightHours,
    effectiveSolarKw,
    chargeHours,
    initialHomeBatteryKwh,
    minReserveKwh,
    totalCustomConsumptionKwh,
    activeCustomPowerKw,
    totalHouseConsumptionKwh,
    grossEvPowerKw,
    grossEvEnergyKwh,
    solarPeak,
    lliriaSolarPeak: solarPeak, // backward-compat alias
    peakSolarHours,
    offpeakSolarHours,
    solarContribKwh,
    grossEnergyDrawnFromHomeKwh,
    totalInverterLoadKw,
    isInverterOk,
    inverterStatus,
    finalHomeBatteryKwh,
    finalHomeBatterySocPct,
    isHomeBatteryOk,
    planningStatus,
    chargingPowerWatts,
    netEvEnergyAddedKwh,
    addedEvSocPct,
    finalEvSocPct
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseTimeToHours, CITIES_DB, getSolarPeakForCity, getLliriaSolarPeakWindow, calculateChargingPlan };
}
