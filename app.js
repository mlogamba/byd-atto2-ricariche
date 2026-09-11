/**
 * Main Application Logic & UI Controller for BYD ATTO 2 EV Charging Planner
 * Supports dynamic custom household electrical appliances, Live/Simulated time mode,
 * AC input controls, and Seasonal Dynamic Solar Peak for Llíria (Valencia, Spain)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Custom Appliances State Array
  let customAppliances = [];

  // Time Mode State: 'live' or 'simulated'
  let timeMode = 'live';

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
    acLoad: document.getElementById('input-ac-load'),
    homeBatteryCapacity: document.getElementById('input-home-cap'),
    homeBatteryMinReserve: document.getElementById('input-home-min-res'),
    houseBaseLoad: document.getElementById('input-base-load'),

    calcDate: document.getElementById('input-calc-date'),
    cloudiness: document.getElementById('input-cloud'),
    solarNominal: document.getElementById('input-solar-nom'),
    inverterMaxPower: document.getElementById('input-inverter-max'),
    cityId: document.getElementById('input-city-id')
  };

  // DOM Display & Control Labels
  const disp = {
    amp: document.getElementById('disp-amp'),
    powerW: document.getElementById('disp-power-w'),
    evSoc: document.getElementById('disp-ev-soc'),
    homeSoc: document.getElementById('disp-home-soc'),
    overnightHrs: document.getElementById('disp-overnight-hrs'),
    cloud: document.getElementById('disp-cloud'),
    iconWeather: document.getElementById('icon-weather'),

    // Time Mode Buttons
    btnModeLive: document.getElementById('btn-mode-live'),
    btnModeSim: document.getElementById('btn-mode-sim'),

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
    briefPeakRange: document.getElementById('brief-peak-range'),
    briefPeakHrs: document.getElementById('brief-peak-hrs'),
    briefCustomKwh: document.getElementById('brief-custom-kwh'),

    timelineHoursBar: document.getElementById('timeline-hours-bar'),
    auditTableBody: document.getElementById('audit-table-body'),

    // Appliance Containers & Buttons
    btnAddAppliance: document.getElementById('btn-add-appliance'),
    customAppliancesList: document.getElementById('custom-appliances-list'),
    customHoursList: document.getElementById('custom-hours-list')
  };

  // Amp Buttons
  const ampBtns = document.querySelectorAll('.amp-btn');
  // Scenario Preset Buttons
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Initialize Calc Date with Today's Date if empty
  if (inputs.calcDate && !inputs.calcDate.value) {
    const todayStr = new Date().toISOString().split('T')[0];
    inputs.calcDate.value = todayStr;
  }

  // Load Saved State or Defaults
  loadSavedState();

  // Live Clock Interval Timer
  setInterval(tickLiveClock, 1000);

  // Time Mode Buttons Event Handlers
  if (disp.btnModeLive) {
    disp.btnModeLive.addEventListener('click', () => {
      setTimeMode('live');
    });
  }

  if (disp.btnModeSim) {
    disp.btnModeSim.addEventListener('click', () => {
      setTimeMode('simulated');
    });
  }

  if (inputs.currentTime) {
    inputs.currentTime.addEventListener('input', () => {
      // If user manually edits time input, switch to simulated mode
      if (timeMode !== 'simulated') {
        setTimeMode('simulated');
      } else {
        updateCalculator();
      }
    });
  }

  function setTimeMode(mode) {
    timeMode = mode;
    if (timeMode === 'live') {
      disp.btnModeLive.classList.add('active');
      disp.btnModeSim.classList.remove('active');
      inputs.currentTime.disabled = true;
      tickLiveClock();
    } else {
      disp.btnModeSim.classList.add('active');
      disp.btnModeLive.classList.remove('active');
      inputs.currentTime.disabled = false;
      updateCalculator();
    }
  }

  function getSystemTimeStr() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function tickLiveClock() {
    if (timeMode === 'live') {
      const nowStr = getSystemTimeStr();
      if (inputs.currentTime.value !== nowStr) {
        inputs.currentTime.value = nowStr;
        updateCalculator();
      }
    }
  }

  // Attach Event Listeners to all standard inputs
  Object.values(inputs).forEach(input => {
    if (input && input !== inputs.currentTime) {
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

  // Add Appliance Handler
  if (disp.btnAddAppliance) {
    disp.btnAddAppliance.addEventListener('click', () => {
      const newApp = {
        id: 'app_' + Date.now(),
        name: 'Elettrodomestico ' + (customAppliances.length + 1),
        powerKw: 1.0,
        hours: 0
      };
      customAppliances.push(newApp);
      renderCustomAppliancesUI();
      updateCalculator();
    });
  }

  function updateAmpButtonsActive(ampVal) {
    ampBtns.forEach(btn => {
      if (btn.getAttribute('data-amp') === String(ampVal)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function renderCustomAppliancesUI() {
    // 1. Render Appliance Name & Power list in Card 3
    if (disp.customAppliancesList) {
      disp.customAppliancesList.innerHTML = '';
      customAppliances.forEach((app, idx) => {
        const row = document.createElement('div');
        row.className = 'appliance-item-row';
        row.innerHTML = `
          <input type="text" value="${app.name}" placeholder="Nome (es. Forno)" data-id="${app.id}" class="app-name-input">
          <input type="number" value="${app.powerKw}" placeholder="kW" min="0.1" max="10" step="0.1" data-id="${app.id}" class="app-power-input">
          <button type="button" class="btn-delete-appliance" data-id="${app.id}" title="Elimina">🗑️</button>
        `;
        disp.customAppliancesList.appendChild(row);
      });

      // Listeners for Name change
      disp.customAppliancesList.querySelectorAll('.app-name-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const id = e.target.getAttribute('data-id');
          const app = customAppliances.find(a => a.id === id);
          if (app) {
            app.name = e.target.value;
            renderCustomHoursListOnly();
            updateCalculator();
          }
        });
      });

      // Listeners for Power (kW) change
      disp.customAppliancesList.querySelectorAll('.app-power-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const id = e.target.getAttribute('data-id');
          const app = customAppliances.find(a => a.id === id);
          if (app) {
            const parsed = parseFloat(e.target.value);
            app.powerKw = isNaN(parsed) ? 0 : parsed;
            renderCustomHoursListOnly();
            updateCalculator();
          }
        });
      });

      // Listeners for Delete button
      disp.customAppliancesList.querySelectorAll('.btn-delete-appliance').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          customAppliances = customAppliances.filter(a => a.id !== id);
          renderCustomAppliancesUI();
          updateCalculator();
        });
      });
    }

    // 2. Render Appliance Hours list in Card 2
    renderCustomHoursListOnly();
  }

  function renderCustomHoursListOnly() {
    if (!disp.customHoursList) return;
    disp.customHoursList.innerHTML = '';

    if (customAppliances.length === 0) {
      disp.customHoursList.innerHTML = `<span style="font-size: 0.76rem; color: var(--text-subtle); font-style: italic;">Nessun altro elettrodomestico aggiunto.</span>`;
      return;
    }

    customAppliances.forEach(app => {
      const row = document.createElement('div');
      row.className = 'appliance-hour-row';
      row.innerHTML = `
        <span class="appliance-name">${app.name}</span>
        <span class="appliance-kw-tag">${app.powerKw.toFixed(1)} kW</span>
        <input type="number" value="${app.hours}" min="0" max="24" step="0.5" data-id="${app.id}" class="app-hours-input" title="Ore di utilizzo">
      `;
      disp.customHoursList.appendChild(row);
    });

    disp.customHoursList.querySelectorAll('.app-hours-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const id = e.target.getAttribute('data-id');
        const app = customAppliances.find(a => a.id === id);
        if (app) {
          const parsed = parseFloat(e.target.value);
          app.hours = isNaN(parsed) ? 0 : parsed;
          updateCalculator();
        }
      });
    });
  }

  function numVal(inputEl, defaultVal) {
    if (!inputEl) return defaultVal;
    const n = parseFloat(inputEl.value);
    return isNaN(n) ? defaultVal : n;
  }

  function getFormValues() {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      homeBatteryCapacity: numVal(inputs.homeBatteryCapacity, 18),
      homeBatteryMinReserve: numVal(inputs.homeBatteryMinReserve, 15),
      homeBatteryCurrentSoc: numVal(inputs.homeBatteryCurrentSoc, 68),
      houseBaseLoad: numVal(inputs.houseBaseLoad, 0.2),
      acLoad: numVal(inputs.acLoad, 0.75),
      acHours: numVal(inputs.acHours, 0),
      currentTime: inputs.currentTime ? inputs.currentTime.value : "21:00",

      calcDate: inputs.calcDate ? inputs.calcDate.value : todayStr,
      solarNominal: numVal(inputs.solarNominal, 3.0),
      cloudiness: numVal(inputs.cloudiness, 32),
      cityId: inputs.cityId ? inputs.cityId.value : 'lliria',

      evAmperage: numVal(inputs.evAmperage, 8),
      evBatteryCapacity: numVal(inputs.evBatteryCapacity, 60),
      evEfficiency: numVal(inputs.evEfficiency, 64) / 100,
      inverterMaxPower: numVal(inputs.inverterMaxPower, 2.5),

      startTime: inputs.startTime ? inputs.startTime.value : "07:00",
      endTime: inputs.endTime ? inputs.endTime.value : "15:00",
      evCurrentSoc: numVal(inputs.evCurrentSoc, 62),

      customAppliances: customAppliances
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
    const houseAndOtherKw = vals.houseBaseLoad + activeAcKw + res.activeCustomPowerKw;
    disp.valHouseKw.textContent = houseAndOtherKw.toFixed(2) + ' kW';
    disp.metricInverterMax.textContent = 'Max: ' + vals.inverterMaxPower.toFixed(2) + ' kW';

    const inverterPct = Math.min(100, (res.totalInverterLoadKw / vals.inverterMaxPower) * 100);
    disp.barInverterLoad.style.width = inverterPct + '%';
    if (res.isInverterOk) {
      disp.barInverterLoad.className = 'progress-fill fill-inverter';
    } else {
      disp.barInverterLoad.className = 'progress-fill fill-inverter overload';
    }

    // Metric 4: Solar Contribution & Llíria Dynamic Solar Peak Brief
    disp.valSolarEffKw.textContent = 'Resa: ' + res.effectiveSolarKw.toFixed(2) + ' kW';
    disp.valSolarContribKwh.textContent = res.solarContribKwh.toFixed(2);
    disp.valDrawnHomeKwh.textContent = res.grossEnergyDrawnFromHomeKwh.toFixed(2) + ' kWh';
    disp.valChargeHours.textContent = res.chargeHours.toFixed(1) + ' h';

    disp.briefSolarEff.textContent = res.effectiveSolarKw.toFixed(2) + ' kW';
    disp.briefPeakRange.textContent = `${res.solarPeak.startStr} - ${res.solarPeak.endStr}`;
    disp.briefPeakHrs.textContent = res.solarPeak.peakDuration.toFixed(1) + ' ore (100%)';
    disp.briefCustomKwh.textContent = res.totalCustomConsumptionKwh.toFixed(2) + ' kWh';

    // Update location badge dynamically
    const locationBadge = document.getElementById('location-badge');
    if (locationBadge) locationBadge.textContent = '📍 ' + (res.solarPeak.cityName || 'Llíria (Valencia)');

    // Render Timeline & Audit Table
    renderTimeline(vals, res);
    renderAuditTable(vals, res);
  }

  function renderTimeline(vals, res) {
    disp.timelineHoursBar.innerHTML = '';
    const startH = parseTimeToHours(vals.startTime);
    const endH = parseTimeToHours(vals.endTime);
    const curH = parseTimeToHours(vals.currentTime);

    const peakStartH = res.lliriaSolarPeak.startH;
    const peakEndH = res.lliriaSolarPeak.endH;

    for (let h = 0; h < 24; h++) {
      const slot = document.createElement('div');
      slot.className = 'hour-slot';
      slot.textContent = (h < 10 ? '0' : '') + h;

      // Seasonal Dynamic Peak Solar Window for Llíria
      const isPeakSolar = h >= Math.floor(peakStartH) && h < Math.ceil(peakEndH);
      const isOffpeakSolar = (h >= 7 && h < Math.floor(peakStartH)) || (h >= Math.ceil(peakEndH) && h < 19);

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
      { name: "Consumo Altri Elettrodomestici", val: res.totalCustomConsumptionKwh.toFixed(2), unit: "kWh", note: `Somma ${customAppliances.length} elettrodomestici` },
      { name: "Ora Riferimento Calcolo", val: `${vals.currentTime} (${timeMode === 'live' ? 'Live' : 'Simulata'})`, unit: "ora", note: "Ora usata per calcolo notturno" },
      { name: "Ore Copertura Notturna", val: res.overnightHours.toFixed(1), unit: "ore", note: "Ore fino a produzione solare (09:00)" },
      { name: "Data di Calcolo (Meteo Solare)", val: vals.calcDate, unit: "data", note: "Data usata per declinazione solare" },
      { name: "Posizione / Città", val: res.solarPeak.cityName || 'Llíria (Valencia)', unit: "luogo", note: `Lat. modello solare` },
      { name: "Fascia Picco Solare", val: `${res.solarPeak.startStr} - ${res.solarPeak.endStr}`, unit: "ore", note: `Durata picco 100%: ${res.solarPeak.peakDuration.toFixed(1)}h` },
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
      { name: "Consumo Casa Totale", val: res.totalHouseConsumptionKwh.toFixed(2), unit: "kWh", note: "Base + AC + Altri Elettrodomestici" },
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
      setTimeMode('simulated');
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
      // ── DEFAULT ODS — valori reali dell'impianto (letti dai dati inseriti) ──
      inputs.evAmperage.value = 8;
      inputs.startTime.value = "09:00";
      inputs.endTime.value = "23:00";
      inputs.evCurrentSoc.value = 63;
      inputs.evBatteryCapacity.value = 60;
      inputs.evEfficiency.value = 64;

      inputs.homeBatteryCurrentSoc.value = 100;
      inputs.acHours.value = 0;
      inputs.homeBatteryCapacity.value = 18;
      inputs.homeBatteryMinReserve.value = 15;
      inputs.houseBaseLoad.value = 0.2;
      inputs.acLoad.value = 0.75;

      inputs.cloudiness.value = 0;
      inputs.solarNominal.value = 2.4;
      inputs.inverterMaxPower.value = 2.4;

      if (inputs.cityId) inputs.cityId.value = 'lliria';

      const todayStr = new Date().toISOString().split('T')[0];
      if (inputs.calcDate) inputs.calcDate.value = todayStr;

      setTimeMode('live');

      customAppliances = [];
      renderCustomAppliancesUI();
    }
    updateCalculator();
  }

  function saveState(vals) {
    try {
      vals.timeMode = timeMode;
      vals.cityId = inputs.cityId ? inputs.cityId.value : 'lliria';
      localStorage.setItem('byd_atto2_calc_state', JSON.stringify(vals));
    } catch (e) {}
  }

  function loadSavedState() {
    try {
      const saved = localStorage.getItem('byd_atto2_calc_state');
      if (saved) {
        const vals = JSON.parse(saved);
        if (vals.evAmperage !== undefined) inputs.evAmperage.value = vals.evAmperage;
        if (vals.startTime) inputs.startTime.value = vals.startTime;
        if (vals.endTime) inputs.endTime.value = vals.endTime;
        if (vals.evCurrentSoc !== undefined) inputs.evCurrentSoc.value = vals.evCurrentSoc;
        if (vals.evBatteryCapacity !== undefined) inputs.evBatteryCapacity.value = vals.evBatteryCapacity;
        if (vals.evEfficiency !== undefined) inputs.evEfficiency.value = vals.evEfficiency * 100;

        if (vals.homeBatteryCurrentSoc !== undefined) inputs.homeBatteryCurrentSoc.value = vals.homeBatteryCurrentSoc;
        if (vals.currentTime) inputs.currentTime.value = vals.currentTime;
        if (vals.acHours !== undefined) inputs.acHours.value = vals.acHours;
        if (vals.acLoad !== undefined) inputs.acLoad.value = vals.acLoad;
        if (vals.homeBatteryCapacity !== undefined) inputs.homeBatteryCapacity.value = vals.homeBatteryCapacity;
        if (vals.homeBatteryMinReserve !== undefined) inputs.homeBatteryMinReserve.value = vals.homeBatteryMinReserve;
        if (vals.houseBaseLoad !== undefined) inputs.houseBaseLoad.value = vals.houseBaseLoad;

        if (vals.calcDate && inputs.calcDate) inputs.calcDate.value = vals.calcDate;
        if (vals.cloudiness !== undefined) inputs.cloudiness.value = vals.cloudiness;
        if (vals.solarNominal !== undefined) inputs.solarNominal.value = vals.solarNominal;
        if (vals.inverterMaxPower !== undefined) inputs.inverterMaxPower.value = vals.inverterMaxPower;
        if (vals.cityId && inputs.cityId) inputs.cityId.value = vals.cityId;

        if (Array.isArray(vals.customAppliances)) {
          customAppliances = vals.customAppliances;
        }

        if (vals.timeMode) {
          timeMode = vals.timeMode;
        }
      }
    } catch (e) {}

    setTimeMode(timeMode);
    renderCustomAppliancesUI();
    updateCalculator();
  }
});
