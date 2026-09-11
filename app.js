/**
 * Main Application Logic & UI Controller for BYD ATTO 2 EV Charging Planner
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Input Elements
  const inputs = {
    evAmperage: document.getElementById('input-amp'),
    startTime: document.getElementById('input-start-time'),
    endTime: document.getElementById('input-end-time'),
    evCurrentSoc: document.getElementById('input-ev-soc'),
    evBatteryCapacity: document.getElementById('input-ev-cap'),
    evEfficiency: document.getElementById('input-ev-eff'),

    homeBatteryCurrentSoc: document.getElementById('input-home-soc'),
    currentTime: document.getElementById('input-current-time'),
    acHours: document.getElementById('input-ac-hours'),
    homeBatteryCapacity: document.getElementById('input-home-cap'),
    homeBatteryMinReserve: document.getElementById('input-home-min-res'),
    houseBaseLoad: document.getElementById('input-base-load'),
    acLoad: document.getElementById('input-ac-load'),

    cloudiness: document.getElementById('input-cloud'),
    solarNominal: document.getElementById('input-solar-nom'),
    inverterMaxPower: document.getElementById('input-inverter-max')
  };

  // DOM Display Labels
  const disp = {
    amp: document.getElementById('disp-amp'),
    powerW: document.getElementById('disp-power-w'),
    evSoc: document.getElementById('disp-ev-soc'),
    homeSoc: document.getElementById('disp-home-soc'),
    overnightHrs: document.getElementById('disp-overnight-hrs'),
    cloud: document.getElementById('disp-cloud'),
    iconWeather: document.getElementById('icon-weather'),

    // Badges
    badgeCompat: document.getElementById('badge-compat'),
    badgeInverter: document.getElementById('badge-inverter'),
    textCompat: document.getElementById('text-compat'),
    textInverter: document.getElementById('text-inverter'),

    // Metrics Cards
    valEvFinalSoc: document.getElementById('val-ev-final-soc'),
    valEvInitSoc: document.getElementById('val-ev-init-soc'),
    valEvNetKwh: document.getElementById('val-ev-net-kwh'),
    barEvInitial: document.getElementById('bar-ev-initial'),
    barEvAdded: document.getElementById('bar-ev-added'),
    metricEvSocBadge: document.getElementById('metric-ev-soc-badge'),

    valHomeFinalSoc: document.getElementById('val-home-final-soc'),
    valHomeInitSoc: document.getElementById('val-home-init-soc'),
    valHomeMinKwh: document.getElementById('val-home-min-kwh'),
    barHomeFinal: document.getElementById('bar-home-final'),
    metricHomeStatus: document.getElementById('metric-home-status'),

    valInverterLoad: document.getElementById('val-inverter-load'),
    valEvKw: document.getElementById('val-ev-kw'),
    valHouseKw: document.getElementById('val-house-kw'),
    barInverterLoad: document.getElementById('bar-inverter-load'),
    metricInverterMax: document.getElementById('metric-inverter-max'),

    valSolarEffKw: document.getElementById('val-solar-eff-kw'),
    valSolarContribKwh: document.getElementById('val-solar-contrib-kwh'),
    valDrawnHomeKwh: document.getElementById('val-drawn-home-kwh'),
    valChargeHours: document.getElementById('val-charge-hours'),

    briefSolarEff: document.getElementById('brief-solar-eff'),
    briefPeakHrs: document.getElementById('brief-peak-hrs'),
    briefOffpeakHrs: document.getElementById('brief-offpeak-hrs'),

    timelineHoursBar: document.getElementById('timeline-hours-bar'),
    auditTableBody: document.getElementById('audit-table-body')
  };

  // Amp Buttons
  const ampBtns = document.querySelectorAll('.amp-btn');
  // Scenario Preset Buttons
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Load Saved State or Defaults
  loadSavedState();

  // Attach Event Listeners to all inputs
  Object.values(inputs).forEach(input => {
    if (input) {
      input.addEventListener('input', updateCalculator);
      input.addEventListener('change', updateCalculator);
    }
  });

  // Amp Button Click Handlers
  ampBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const ampVal = btn.getAttribute('data-amp');
      inputs.evAmperage.value = ampVal;
      updateAmpButtonsActive(ampVal);
      updateCalculator();
    });
  });

  // Scenario Preset Handlers
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      applyPreset(presetKey);
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  function updateAmpButtonsActive(ampVal) {
    ampBtns.forEach(btn => {
      if (btn.getAttribute('data-amp') === String(ampVal)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function getFormValues() {
    return {
      homeBatteryCapacity: parseFloat(inputs.homeBatteryCapacity.value) || 18,
      homeBatteryMinReserve: parseFloat(inputs.homeBatteryMinReserve.value) || 15,
      homeBatteryCurrentSoc: parseFloat(inputs.homeBatteryCurrentSoc.value) || 68,
      houseBaseLoad: parseFloat(inputs.houseBaseLoad.value) || 0.2,
      acLoad: parseFloat(inputs.acLoad.value) || 0.75,
      acHours: parseFloat(inputs.acHours.value) || 0,
      currentTime: inputs.currentTime.value || "21:00",

      solarNominal: parseFloat(inputs.solarNominal.value) || 3.0,
      cloudiness: parseFloat(inputs.cloudiness.value) || 32,

      evAmperage: parseFloat(inputs.evAmperage.value) || 8,
      evBatteryCapacity: parseFloat(inputs.evBatteryCapacity.value) || 60,
      evEfficiency: (parseFloat(inputs.evEfficiency.value) || 64) / 100,
      inverterMaxPower: parseFloat(inputs.inverterMaxPower.value) || 2.5,

      startTime: inputs.startTime.value || "07:00",
      endTime: inputs.endTime.value || "15:00",
      evCurrentSoc: parseFloat(inputs.evCurrentSoc.value) || 62
    };
  }

  function updateCalculator() {
    const vals = getFormValues();
    const res = calculateChargingPlan(vals);

    // Save state
    saveState(vals);

    // Update Form Display Labels
    disp.amp.textContent = vals.evAmperage;
    disp.powerW.textContent = res.chargingPowerWatts;
    disp.evSoc.textContent = vals.evCurrentSoc;
    disp.homeSoc.textContent = vals.homeBatteryCurrentSoc;
    disp.overnightHrs.textContent = res.overnightHours.toFixed(1);
    disp.cloud.textContent = vals.cloudiness;

    // Weather Icon
    if (vals.cloudiness <= 15) disp.iconWeather.textContent = '☀️';
    else if (vals.cloudiness <= 50) disp.iconWeather.textContent = '⛅';
    else disp.iconWeather.textContent = '☁️';

    updateAmpButtonsActive(vals.evAmperage);

    // Header Badges
    if (res.isHomeBatteryOk) {
      disp.badgeCompat.className = 'status-badge status-ok';
      disp.textCompat.textContent = 'OK - RICARICA COMPATIBILE';
    } else {
      disp.badgeCompat.className = 'status-badge status-danger';
      disp.textCompat.textContent = 'ATTENZIONE - SOTTO IL 15%';
    }

    if (res.isInverterOk) {
      disp.badgeInverter.className = 'status-badge status-ok';
      disp.textInverter.textContent = 'POTENZA INVERTER OK';
    } else {
      disp.badgeInverter.className = 'status-badge status-danger';
      disp.textInverter.textContent = 'ALLARME: SOVRACCARICO INVERTER!';
    }

    // Metric 1: EV Final SOC
    disp.valEvFinalSoc.textContent = res.finalEvSocPct.toFixed(2);
    disp.valEvInitSoc.textContent = vals.evCurrentSoc.toFixed(1) + '%';
    disp.valEvNetKwh.textContent = res.netEvEnergyAddedKwh.toFixed(2) + ' kWh';
    disp.metricEvSocBadge.textContent = '+' + res.addedEvSocPct.toFixed(2) + '%';

    disp.barEvInitial.style.width = Math.min(100, vals.evCurrentSoc) + '%';
    disp.barEvAdded.style.width = Math.min(100 - vals.evCurrentSoc, res.addedEvSocPct) + '%';

    // Metric 2: Home Battery Final SOC
    disp.valHomeFinalSoc.textContent = res.finalHomeBatterySocPct.toFixed(2);
    disp.valHomeInitSoc.textContent = vals.homeBatteryCurrentSoc.toFixed(1) + '%';
    disp.valHomeMinKwh.textContent = res.minReserveKwh.toFixed(2) + ' kWh (' + vals.homeBatteryMinReserve + '%)';
    disp.barHomeFinal.style.width = Math.max(0, Math.min(100, res.finalHomeBatterySocPct)) + '%';

    if (res.isHomeBatteryOk) {
      disp.barHomeFinal.className = 'progress-fill fill-home';
      disp.metricHomeStatus.textContent = 'Riserva OK (≥' + vals.homeBatteryMinReserve + '%)';
      disp.metricHomeStatus.className = 'metric-highlight success';
    } else {
      disp.barHomeFinal.className = 'progress-fill fill-home warning';
      disp.metricHomeStatus.textContent = 'Sotto il ' + vals.homeBatteryMinReserve + '%';
      disp.metricHomeStatus.className = 'metric-highlight warning';
    }

    // Metric 3: Inverter Load
    disp.valInverterLoad.textContent = res.totalInverterLoadKw.toFixed(2);
    disp.valEvKw.textContent = res.grossEvPowerKw.toFixed(2) + ' kW';
    const activeAcKw = vals.acHours > 0 ? vals.acLoad : 0;
    disp.valHouseKw.textContent = (vals.houseBaseLoad + activeAcKw).toFixed(2) + ' kW';
    disp.metricInverterMax.textContent = 'Max: ' + vals.inverterMaxPower.toFixed(2) + ' kW';

    const inverterPct = Math.min(100, (res.totalInverterLoadKw / vals.inverterMaxPower) * 100);
    disp.barInverterLoad.style.width = inverterPct + '%';
    if (res.isInverterOk) {
      disp.barInverterLoad.className = 'progress-fill fill-inverter';
    } else {
      disp.barInverterLoad.className = 'progress-fill fill-inverter overload';
    }

    // Metric 4: Solar Contribution
    disp.valSolarEffKw.textContent = 'Resa: ' + res.effectiveSolarKw.toFixed(2) + ' kW';
    disp.valSolarContribKwh.textContent = res.solarContribKwh.toFixed(2);
    disp.valDrawnHomeKwh.textContent = res.grossEnergyDrawnFromHomeKwh.toFixed(2) + ' kWh';
    disp.valChargeHours.textContent = res.chargeHours.toFixed(1) + ' h';

    disp.briefSolarEff.textContent = res.effectiveSolarKw.toFixed(2) + ' kW';
    disp.briefPeakHrs.textContent = res.peakSolarHours.toFixed(1) + ' ore (100%)';
    disp.briefOffpeakHrs.textContent = res.offpeakSolarHours.toFixed(1) + ' ore (40%)';

    // Render Timeline & Audit Table
    renderTimeline(vals, res);
    renderAuditTable(vals, res);
  }

  function renderTimeline(vals, res) {
    disp.timelineHoursBar.innerHTML = '';
    const startH = parseTimeToHours(vals.startTime);
    const endH = parseTimeToHours(vals.endTime);
    const curH = parseTimeToHours(vals.currentTime);

    for (let h = 0; h < 24; h++) {
      const slot = document.createElement('div');
      slot.className = 'hour-slot';
      slot.textContent = (h < 10 ? '0' : '') + h;

      // Peak Solar Window: 10 to 13 (10:00 to 14:00)
      const isPeakSolar = h >= 10 && h < 14;
      const isOffpeakSolar = (h >= 7 && h < 10) || (h >= 14 && h < 19);

      if (isPeakSolar) slot.classList.add('solar-peak');
      else if (isOffpeakSolar) slot.classList.add('solar-offpeak');

      // EV Charging Window check
      let isCharging = false;
      if (startH < endH) {
        isCharging = h >= startH && h < endH;
      } else if (startH > endH) {
        isCharging = h >= startH || h < endH;
      }
      if (isCharging) slot.classList.add('ev-charging');

      // Overnight Window check
      let isOvernight = false;
      if (curH >= 9) {
        isOvernight = h >= curH || h < 9;
      } else {
        isOvernight = h >= curH && h < 9;
      }
      if (isOvernight) slot.classList.add('overnight');

      disp.timelineHoursBar.appendChild(slot);
    }
  }

  function renderAuditTable(vals, res) {
    const tableData = [
      { name: "Capacità Batteria Casa", val: vals.homeBatteryCapacity, unit: "kWh", note: "Capacità nominale totale" },
      { name: "Riserva Minima Batteria Casa", val: vals.homeBatteryMinReserve, unit: "%", note: "Soglia di sicurezza desiderata" },
      { name: "SOC Attuale Batteria Casa", val: vals.homeBatteryCurrentSoc, unit: "%", note: "Percentuale attuale inserita" },
      { name: "Consumo Base Casa", val: vals.houseBaseLoad, unit: "kW", note: "Consumo di fondo costante" },
      { name: "Consumo Condizionatore", val: vals.acLoad, unit: "kW", note: "Assorbimento medio AC" },
      { name: "Ore Uso Aria Condizionata", val: vals.acHours, unit: "ore", note: "Ore di accensione AC" },
      { name: "Ora Attuale", val: vals.currentTime, unit: "ora", note: "Ora di riferimento" },
      { name: "Ore Copertura Notturna", val: res.overnightHours.toFixed(1), unit: "ore", note: "Ore fino a produzione solare (09:00)" },
      { name: "Potenza Solare Nominale", val: vals.solarNominal, unit: "kW", note: "Potenza picco impianto FV" },
      { name: "Nuvolosità Prevista", val: vals.cloudiness, unit: "%", note: "Riduzione resa solare" },
      { name: "Resa Solare Effettiva", val: res.effectiveSolarKw.toFixed(2), unit: "kW", note: "B10 * (1 - Cloud%)" },
      { name: "Amperaggio Auto", val: vals.evAmperage, unit: "A", note: "Corrente di ricarica imposta" },
      { name: "Capacità Batteria Auto", val: vals.evBatteryCapacity, unit: "kWh", note: "Batteria BYD ATTO 2" },
      { name: "Efficienza Ricarica Auto", val: (vals.evEfficiency * 100).toFixed(0) + "%", unit: "%", note: "Rendimento del caricatore" },
      { name: "Potenza Max Inverter", val: vals.inverterMaxPower, unit: "kW", note: "Limite massimo inverter" },
      { name: "Orario Ricarica Programmat", val: `${vals.startTime} - ${vals.endTime}`, unit: "-", note: "Fascia oraria ricarica" },
      { name: "Ore Ricarica Auto", val: res.chargeHours.toFixed(1), unit: "ore", note: "Durata totale ricarica" },
      { name: "Energia Iniziale Casa", val: res.initialHomeBatteryKwh.toFixed(2), unit: "kWh", note: "Energia presente all'avvio" },
      { name: "Riserva Minima kWh", val: res.minReserveKwh.toFixed(2), unit: "kWh", note: "Energia intoccabile casa" },
      { name: "Consumo Casa Totale", val: res.totalHouseConsumptionKwh.toFixed(2), unit: "kWh", note: "Consumo fisso + AC" },
      { name: "Energia Lorda Prelevata Auto", val: res.grossEnergyDrawnFromHomeKwh.toFixed(3), unit: "kWh", note: "Prelievo netto da batteria casa" },
      { name: "Verifica Carico Inverter", val: res.inverterStatus, unit: "-", note: `Load: ${res.totalInverterLoadKw.toFixed(2)} kW` },
      { name: "SOC Finale Casa Stimato", val: res.finalHomeBatterySocPct.toFixed(2) + "%", unit: "%", note: "Percentuale residua casa" },
      { name: "Esito Pianificazione", val: res.planningStatus, unit: "-", note: res.isHomeBatteryOk ? "Compatibile" : "Sotto 15%" },
      { name: "Velocità di Ricarica", val: res.chargingPowerWatts, unit: "W", note: "Amperaggio * 230 V" },
      { name: "CARICA EFFETTIVA TOTALE", val: res.netEvEnergyAddedKwh.toFixed(2), unit: "kWh", note: "Energia netta immessa in auto" },
      { name: "BATTERIA RICARICATA", val: res.addedEvSocPct.toFixed(2) + "%", unit: "%", note: "% ricaricata in auto" },
      { name: "SOC Attuale Auto", val: vals.evCurrentSoc + "%", unit: "%", note: "SOC iniziale auto" },
      { name: "SOC Finale Auto Stimato", val: res.finalEvSocPct.toFixed(2) + "%", unit: "%", note: "SOC finale stimato auto" }
    ];

    disp.auditTableBody.innerHTML = tableData.map(row => `
      <tr>
        <td><strong>${row.name}</strong></td>
        <td>${row.val}</td>
        <td>${row.unit}</td>
        <td style="color: var(--text-subtle); font-size: 0.8rem;">${row.note}</td>
      </tr>
    `).join('');
  }

  function applyPreset(key) {
    if (key === 'solar10') {
      inputs.evAmperage.value = 10;
      inputs.startTime.value = "10:00";
      inputs.endTime.value = "15:00";
      inputs.cloudiness.value = 20;
      inputs.acHours.value = 0;
      inputs.evCurrentSoc.value = 50;
    } else if (key === 'night8') {
      inputs.evAmperage.value = 8;
      inputs.startTime.value = "07:00";
      inputs.endTime.value = "15:00";
      inputs.cloudiness.value = 32;
      inputs.acHours.value = 0;
      inputs.currentTime.value = "21:00";
    } else if (key === 'fast13') {
      inputs.evAmperage.value = 13;
      inputs.startTime.value = "10:00";
      inputs.endTime.value = "14:00";
      inputs.cloudiness.value = 10;
      inputs.acHours.value = 0;
    } else if (key === 'summerAc') {
      inputs.evAmperage.value = 8;
      inputs.startTime.value = "07:00";
      inputs.endTime.value = "15:00";
      inputs.cloudiness.value = 25;
      inputs.acHours.value = 6;
      inputs.acLoad.value = 0.75;
    } else if (key === 'reset') {
      inputs.evAmperage.value = 8;
      inputs.startTime.value = "07:00";
      inputs.endTime.value = "15:00";
      inputs.evCurrentSoc.value = 62;
      inputs.evBatteryCapacity.value = 60;
      inputs.evEfficiency.value = 64;

      inputs.homeBatteryCurrentSoc.value = 68;
      inputs.currentTime.value = "21:00";
      inputs.acHours.value = 0;
      inputs.homeBatteryCapacity.value = 18;
      inputs.homeBatteryMinReserve.value = 15;
      inputs.houseBaseLoad.value = 0.2;
      inputs.acLoad.value = 0.75;

      inputs.cloudiness.value = 32;
      inputs.solarNominal.value = 3.0;
      inputs.inverterMaxPower.value = 2.5;
    }
    updateCalculator();
  }

  function saveState(vals) {
    try {
      localStorage.setItem('byd_atto2_calc_state', JSON.stringify(vals));
    } catch (e) {}
  }

  function loadSavedState() {
    try {
      const saved = localStorage.getItem('byd_atto2_calc_state');
      if (saved) {
        const vals = JSON.parse(saved);
        if (vals.evAmperage) inputs.evAmperage.value = vals.evAmperage;
        if (vals.startTime) inputs.startTime.value = vals.startTime;
        if (vals.endTime) inputs.endTime.value = vals.endTime;
        if (vals.evCurrentSoc !== undefined) inputs.evCurrentSoc.value = vals.evCurrentSoc;
        if (vals.evBatteryCapacity) inputs.evBatteryCapacity.value = vals.evBatteryCapacity;
        if (vals.evEfficiency) inputs.evEfficiency.value = vals.evEfficiency * 100;

        if (vals.homeBatteryCurrentSoc !== undefined) inputs.homeBatteryCurrentSoc.value = vals.homeBatteryCurrentSoc;
        if (vals.currentTime) inputs.currentTime.value = vals.currentTime;
        if (vals.acHours !== undefined) inputs.acHours.value = vals.acHours;
        if (vals.homeBatteryCapacity) inputs.homeBatteryCapacity.value = vals.homeBatteryCapacity;
        if (vals.homeBatteryMinReserve !== undefined) inputs.homeBatteryMinReserve.value = vals.homeBatteryMinReserve;
        if (vals.houseBaseLoad !== undefined) inputs.houseBaseLoad.value = vals.houseBaseLoad;
        if (vals.acLoad !== undefined) inputs.acLoad.value = vals.acLoad;

        if (vals.cloudiness !== undefined) inputs.cloudiness.value = vals.cloudiness;
        if (vals.solarNominal) inputs.solarNominal.value = vals.solarNominal;
        if (vals.inverterMaxPower) inputs.inverterMaxPower.value = vals.inverterMaxPower;
      }
    } catch (e) {}
    updateCalculator();
  }
});
