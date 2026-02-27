import { dictionary } from './config.js';
import { getFromStorage, setToStorage } from './storage.js';
import { getDocumentFromFireBase, getHealthProviderKeysUrl } from './api.js';
import { escapeHtml, updateInfoBox } from './utils.js';

let HP_FULL = null;
let HP_FULL_PROMISE = null;
const OTHER_DISCLAIMER_TEXT =
  "Leider hat deine Krankenversicherung keine Partnerschaft mit uns. Setz dich mit deiner Krankenkasse in Verbindung, um ihre Erstattungsrichtlinien zu verstehen.";

export function getHpFull() {
  return HP_FULL;
}

export async function fetchHealthProviders() {
  const dropdown = document.querySelector("#healthProviders");
  const disclaimer = document.querySelector(".input_disclaimer");
  if (!dropdown) return;

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

function updateDisclaimer(disclaimer, selectedProvider) {
  if (!disclaimer) return;

  if (!disclaimer.dataset.defaultText) {
    disclaimer.dataset.defaultText = (disclaimer.textContent || "").trim();
  }

  if (!selectedProvider) {
    disclaimer.style.visibility = "hidden";
    disclaimer.textContent = disclaimer.dataset.defaultText || "";
    return;
  }

  disclaimer.style.visibility = "visible";
  if (selectedProvider === "Other") {
    disclaimer.textContent = OTHER_DISCLAIMER_TEXT;
  } else {
    disclaimer.textContent = disclaimer.dataset.defaultText || "";
  }
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
    updateDisclaimer(disclaimer, selectedProvider);

    if (!HP_FULL && HP_FULL_PROMISE) {
      try { await HP_FULL_PROMISE; } catch(_) {}
    }
    const hpAll = HP_FULL || getFromStorage("healthProviders", {}) || {};
    const hp = hpAll[selectedProvider];

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
      if (!HP_FULL && HP_FULL_PROMISE) { try { await HP_FULL_PROMISE; } catch(_) {} }
      const hp = (HP_FULL || getFromStorage("healthProviders", {}))[saved] || {};
      const takeoverEl = document.querySelector("#takeover");
      if (takeoverEl) takeoverEl.innerHTML = hp?.takeover || "";
      updateDisclaimer(disclaimer, saved);
      updateInfoBox(saved);
    })();
  } else {
    updateDisclaimer(disclaimer, "");
  }
}
