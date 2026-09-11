/**
 * Formula Engine for BYD ATTO 2 EV Charging Calculator
 * Replicates 1:1 all logic from Calcolo Ricariche.ods
 */

function parseTimeToHours(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseFloat(parts[0]) || 0;
  const m = parseFloat(parts[1]) || 0;
  return h + m / 60;
}

function calculateChargingPlan(inputs) {
  // 1. Defaults & Inputs Parsing
  const homeBatteryCapacity = inputs.homeBatteryCapacity ?? 18; // B2 (kWh)
  const homeBatteryMinReserve = inputs.homeBatteryMinReserve ?? 15; // B3 (%)
  const homeBatteryCurrentSoc = inputs.homeBatteryCurrentSoc ?? 68; // B4 (%)
  const houseBaseLoad = inputs.houseBaseLoad ?? 0.2; // B5 (kW)
  const acLoad = inputs.acLoad ?? 0.75; // B6 (kW)
  const acHours = inputs.acHours ?? 0; // B7 (hours)
  const currentTimeStr = inputs.currentTime ?? "21:00"; // B8

  const solarNominal = inputs.solarNominal ?? 3.0; // B10 (kW)
  const cloudiness = inputs.cloudiness ?? 32; // B11 (%)

  const evAmperage = inputs.evAmperage ?? 8; // B13 (A)
  const evBatteryCapacity = inputs.evBatteryCapacity ?? 60; // B14 (kWh)
  const evEfficiency = inputs.evEfficiency ?? 0.64; // B15 (64%)
  const inverterMaxPower = inputs.inverterMaxPower ?? 2.5; // B16 (kW)

  const startTimeStr = inputs.startTime ?? "07:00"; // B18
  const endTimeStr = inputs.endTime ?? "15:00"; // C18
  const evCurrentSoc = inputs.evCurrentSoc ?? 62; // B31 (%)

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

  // B20: Energia Iniziale Casa (kWh)
  const initialHomeBatteryKwh = homeBatteryCapacity * (homeBatteryCurrentSoc / 100);

  // B21: Riserva Minima kWh
  const minReserveKwh = homeBatteryCapacity * (homeBatteryMinReserve / 100);

  // B22: Consumo Casa Totale (kWh)
  const totalHouseConsumptionKwh = (houseBaseLoad * overnightHours) + (acLoad * acHours);

  // Gross EV Power (kW)
  const grossEvPowerKw = (evAmperage * 230) / 1000;
  const grossEvEnergyKwh = grossEvPowerKw * chargeHours;

  // Solar Coverage Calculation during Charging Window
  // Peak solar range: 10:00 to 14:00 (10/24 to 14/24)
  const peakSolarHours = Math.max(0, Math.min(endFrac, 14.0 / 24.0) - Math.max(startFrac, 10.0 / 24.0)) * 24.0;
  const offpeakSolarHours = Math.max(0, chargeHours - peakSolarHours);

  // Total solar energy covering EV charging (100% peak, 40% off-peak)
  const solarContribKwh = (effectiveSolarKw * peakSolarHours) + (effectiveSolarKw * 0.4 * offpeakSolarHours);

  // B23: Energia Lorda Prelevata Auto da Batteria Casa (kWh)
  const grossEnergyDrawnFromHomeKwh = Math.max(0, grossEvEnergyKwh - solarContribKwh);

  // B24: Verifica Carico Inverter
  const activeAcPower = acHours > 0 ? acLoad : 0;
  const totalInverterLoadKw = houseBaseLoad + activeAcPower + grossEvPowerKw;
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
    totalHouseConsumptionKwh,
    grossEvPowerKw,
    grossEvEnergyKwh,
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
  module.exports = { parseTimeToHours, calculateChargingPlan };
}
