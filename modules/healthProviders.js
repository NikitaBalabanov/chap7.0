import { dictionary } from './config.js';
import { getFromStorage, setToStorage } from './storage.js';
import { getDocumentFromFireBase, getHealthProviderKeysUrl } from './api.js';
import { escapeHtml, updateInfoBox } from './utils.js';

let HP_FULL = null;
let HP_FULL_PROMISE = null;
let HP_PARTNERS = null;
let HP_PARTNERS_PROMISE = null;
const HEALTH_INSURANCE_NUMBER_STORAGE_KEY = "health insurance number";
const HEALTH_INSURANCE_NUMBER_WRAP_ID = "health-insurance-number-wrap";
const HEALTH_INSURANCE_NUMBER_INPUT_ID = "health-insurance-number-input";
const OTHER_DISCLAIMER_TEXT =
  "Leider hat deine Krankenversicherung keine Partnerschaft mit uns. Setz dich mit deiner Krankenkasse in Verbindung, um ihre Erstattungsrichtlinien zu verstehen.";
const PARTNER_DISCLAIMER_TEXT = (partnerName) => [
  `Dank unserer Partnerschaft mit deiner Krankenkasse${partnerName ? ` (${partnerName})` : ""} kannst du deinen kostenlosen Zugang zu den Preneo-Programmen mit deiner Versichertennummer freischalten.`,
  "Zu Abrechnungszwecken wird Preneo meine Versichertennummer einmalig zur Überprüfung an meine Krankenversicherung übermitteln. Zur Bestätigung des Leistungsanspruchs wird die Krankenversicherung den Status meiner Versicherung an Preneo zurückmelden.",
];

export function getHpFull() {
  return HP_FULL;
}

export async function fetchHealthProviders() {
  const dropdown = document.querySelector("#healthProviders");
  const disclaimer = document.querySelector(".input_disclaimer");
  if (!dropdown) return;

  HP_PARTNERS_PROMISE = fetchHealthInsurancePartners();
  dropdown.disabled = true;
  dropdown.innerHTML = `<option value="">${dictionary["select.healthProvider"]} …</option>`;

  try {
    const resKeys = await fetch(getHealthProviderKeysUrl());
    const dataKeys = await resKeys.json();
    const providers = Array.isArray(dataKeys?.data?.keys)
      ? dataKeys.data.keys
      : [];

    populateDropdown(providers, { dropdown, disclaimer });

    HP_FULL_PROMISE = (async () => {
      const resFull = await fetch(getDocumentFromFireBase("healthInsuranceProviders"));
      const dataFull = await resFull.json();
      if (dataFull?.success && dataFull?.data) {
        HP_FULL = dataFull.data;
        setToStorage("healthProviders", HP_FULL);
        populateDropdown(providers, { dropdown, disclaimer });
      }
      return HP_FULL;
    })();

  } catch (e) {
    console.warn("HP keys fetch error:", e);
    try {
      const resFull = await fetch(getDocumentFromFireBase("healthInsuranceProviders"));
      const dataFull = await resFull.json();
      const providers = dataFull?.success ? Object.keys(dataFull.data || {}) : [];
      HP_FULL = dataFull?.success ? dataFull.data : null;
      if (HP_FULL) setToStorage("healthProviders", HP_FULL);
      populateDropdown(providers, { dropdown, disclaimer });
    } catch (e2) {
      dropdown.disabled = false;
      dropdown.innerHTML = `<option value="">${dictionary["select.healthProvider"]}</option>`;
    }
  }
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function extractPartnerNames(rawData) {
  if (!rawData || typeof rawData !== "object") return [];

  const values = Array.isArray(rawData) ? rawData : Object.values(rawData);
  const names = values
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && typeof entry.name === "string") {
        return entry.name;
      }
      return "";
    })
    .map((name) => name.trim())
    .filter(Boolean);

  return [...new Set(names)];
}

async function fetchHealthInsurancePartners() {
  try {
    const response = await fetch(
      getDocumentFromFireBase("healthInsurancePartners")
    );
    const json = await response.json();
    const rawData = json?.success ? json?.data : json?.data ?? null;
    HP_PARTNERS = extractPartnerNames(rawData);
    setToStorage("healthInsurancePartners", HP_PARTNERS);
    return HP_PARTNERS;
  } catch (_) {
    HP_PARTNERS = [];
    setToStorage("healthInsurancePartners", HP_PARTNERS);
    return HP_PARTNERS;
  }
}

function getProviderDisplayName(providerKey, hpAll) {
  const name = hpAll?.[providerKey]?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }
  return providerKey;
}

function moveOtherToEnd(providers) {
  const list = Array.isArray(providers) ? [...providers] : [];
  const regular = list.filter((key) => key !== "Other");
  const others = list.filter((key) => key === "Other");
  return [...regular, ...others];
}

function getPartnerMatch(selectedProvider, hpAll) {
  if (!selectedProvider) {
    setToStorage("isSelectedProviderPartner", false);
    return { isPartner: false, partnerName: "" };
  }

  const providerDisplayName = getProviderDisplayName(selectedProvider, hpAll);
  const partners =
    HP_PARTNERS || getFromStorage("healthInsurancePartners", []) || [];
  const normalizedProviderName = normalizeName(providerDisplayName);
  const matchedPartnerName = partners.find(
    (partnerName) => normalizeName(partnerName) === normalizedProviderName
  );
  const isPartner = Boolean(matchedPartnerName);

  setToStorage("isSelectedProviderPartner", isPartner);
  return {
    isPartner,
    partnerName: matchedPartnerName || providerDisplayName || "",
  };
}

function updateDisclaimer(disclaimer, selectedProvider, hpAll) {
  const notifyProviderChange = () => {
    document.dispatchEvent(new CustomEvent("health-provider-updated"));
  };

  if (!selectedProvider) {
    setToStorage("isSelectedProviderPartner", false);
    syncHealthInsuranceNumberInput(disclaimer, false);
    notifyProviderChange();
    if (!disclaimer) return;
    if (!disclaimer.dataset.defaultText) {
      disclaimer.dataset.defaultText = (disclaimer.textContent || "").trim();
    }
    disclaimer.style.visibility = "hidden";
    disclaimer.textContent = disclaimer.dataset.defaultText || "";
    return;
  }

  const { isPartner, partnerName } = getPartnerMatch(selectedProvider, hpAll);
  syncHealthInsuranceNumberInput(disclaimer, isPartner);
  notifyProviderChange();
  if (!disclaimer) return;
  if (!disclaimer.dataset.defaultText) {
    disclaimer.dataset.defaultText = (disclaimer.textContent || "").trim();
  }
  disclaimer.style.visibility = "visible";
  disclaimer.style.marginBottom = "18px";
  if (isPartner) {
    const [firstParagraph, secondParagraph] = PARTNER_DISCLAIMER_TEXT(partnerName);
    disclaimer.style.display = "";
    disclaimer.style.flexDirection = "";
    disclaimer.style.rowGap = "";

    const firstSpan = document.createElement("span");
    firstSpan.textContent = firstParagraph;
    firstSpan.style.display = "block";

    const secondSpan = document.createElement("span");
    secondSpan.textContent = secondParagraph;
    secondSpan.style.display = "block";
    secondSpan.style.marginTop = "12px";

    disclaimer.replaceChildren(firstSpan, secondSpan);
  } else if (selectedProvider === "Other") {
    disclaimer.style.display = "";
    disclaimer.style.flexDirection = "";
    disclaimer.style.rowGap = "";
    disclaimer.style.whiteSpace = "";
    disclaimer.textContent = OTHER_DISCLAIMER_TEXT;
  } else {
    disclaimer.style.display = "";
    disclaimer.style.flexDirection = "";
    disclaimer.style.rowGap = "";
    disclaimer.style.whiteSpace = "";
    disclaimer.textContent = disclaimer.dataset.defaultText || "";
  }
}

function removeHealthInsuranceNumberInput(disclaimer) {
  const scope = disclaimer?.parentElement || document;
  scope
    .querySelectorAll(`#${HEALTH_INSURANCE_NUMBER_WRAP_ID}`)
    .forEach((el) => el.remove());
}

function createHealthInsuranceNumberInput(disclaimer) {
  if (!disclaimer) return;
  const scope = disclaimer.parentElement || document;
  const existing = scope.querySelector(`#${HEALTH_INSURANCE_NUMBER_WRAP_ID}`);
  if (existing) {
    const input = existing.querySelector(`#${HEALTH_INSURANCE_NUMBER_INPUT_ID}`);
    if (input) {
      const savedValue = getFromStorage(HEALTH_INSURANCE_NUMBER_STORAGE_KEY, "");
      input.value = typeof savedValue === "string" ? savedValue : "";
    }
    return;
  }

  const wrap = document.createElement("div");
  wrap.id = HEALTH_INSURANCE_NUMBER_WRAP_ID;
  wrap.className = "form_main_field_wrap";
  wrap.style.marginTop = "24px";

  const input = document.createElement("input");
  input.type = "text";
  input.id = HEALTH_INSURANCE_NUMBER_INPUT_ID;
  input.name = "healthInsuranceNumber";
  input.placeholder = "Versichertennummer (optional)";
  input.autocomplete = "off";
  input.className = "w-input";

  const savedValue = getFromStorage(HEALTH_INSURANCE_NUMBER_STORAGE_KEY, "");
  input.value = typeof savedValue === "string" ? savedValue : "";

  const persist = () => {
    setToStorage(HEALTH_INSURANCE_NUMBER_STORAGE_KEY, input.value.trim());
  };
  input.addEventListener("input", persist);
  input.addEventListener("change", persist);

  wrap.appendChild(input);
  disclaimer.insertAdjacentElement("afterend", wrap);
}

function syncHealthInsuranceNumberInput(disclaimer, shouldShow) {
  if (shouldShow) {
    createHealthInsuranceNumberInput(disclaimer);
    return;
  }
  removeHealthInsuranceNumberInput(disclaimer);
}

function populateDropdown(providers, { dropdown, disclaimer }) {
  const opts = [`<option value="">${dictionary["select.healthProvider"]}</option>`];
  const hpAll = HP_FULL || getFromStorage("healthProviders", {}) || {};
  const orderedProviders = moveOtherToEnd(providers);
  for (let i = 0; i < orderedProviders.length; i++) {
    const p = orderedProviders[i];
    const label = getProviderDisplayName(p, hpAll);
    opts.push(
      `<option value="${escapeHtml(p)}">${escapeHtml(label)}</option>`
    );
  }
  dropdown.innerHTML = opts.join("");
  dropdown.disabled = false;

  const prev = dropdown._hpChangeHandler;
  if (prev) dropdown.removeEventListener("change", prev);

  async function handleDropdownChange(e) {
    const selectedProvider = e.target.value || "";
    if (HP_PARTNERS_PROMISE) {
      try {
        await HP_PARTNERS_PROMISE;
      } catch (_) {}
    }

    if (!HP_FULL && HP_FULL_PROMISE) {
      try { await HP_FULL_PROMISE; } catch(_) {}
    }
    const hpAllCurrent = HP_FULL || getFromStorage("healthProviders", {}) || {};
    const hp = hpAllCurrent[selectedProvider];
    updateDisclaimer(disclaimer, selectedProvider, hpAllCurrent);

    const takeoverEl = document.querySelector("#takeover");
    if (takeoverEl) takeoverEl.innerHTML = hp?.takeover || "";

    updateInfoBox(selectedProvider);
  }

  dropdown._hpChangeHandler = handleDropdownChange;
  dropdown.addEventListener("change", handleDropdownChange);

  const saved = getFromStorage("selectedHealthProvider", "");
  if (saved && providers.includes(saved)) {
    dropdown.value = saved;
    (async () => {
      if (HP_PARTNERS_PROMISE) { try { await HP_PARTNERS_PROMISE; } catch(_) {} }
      if (!HP_FULL && HP_FULL_PROMISE) { try { await HP_FULL_PROMISE; } catch(_) {} }
      const hp = (HP_FULL || getFromStorage("healthProviders", {}))[saved] || {};
      const takeoverEl = document.querySelector("#takeover");
      if (takeoverEl) takeoverEl.innerHTML = hp?.takeover || "";
      updateDisclaimer(disclaimer, saved, HP_FULL || hpAll);
      updateInfoBox(saved);
    })();
  } else {
    updateDisclaimer(disclaimer, "", hpAll);
  }
}
