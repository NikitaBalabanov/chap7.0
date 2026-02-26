import { dictionary, PAYMENT_MODAL_HEIGHT } from './config.js';
import { getFromStorage, setToStorage } from './storage.js';

export function getSiblingButtonBySelector(selector, childSelector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const parent = el.parentElement.parentElement;
  if (!parent) return null;
  return parent.querySelector(childSelector);
}

export function getSubmitButton() {
  const button = document.querySelector("[data-btn-submit]") ||
                 document.querySelector("#registerFormSubmitButton")?.closest("button") ||
                 document.querySelector("button:has(.btn_main_text)");
  return button;
}

export function getSubmitButtonText() {
  return getSiblingButtonBySelector("#registerFormSubmitButton", ".btn_main_text");
}

export function setSubmitButtonLoading(loading) {
  const button = getSubmitButton();
  const buttonText = getSubmitButtonText();
  
  if (button) {
    if (loading) {
      button.disabled = true;
      button.classList.add("disabled");
      button.setAttribute("aria-disabled", "true");
    } else {
      button.disabled = false;
      button.classList.remove("disabled");
      button.removeAttribute("aria-disabled");
    }
  }
  
  if (buttonText) {
    if (loading) {
      buttonText.textContent = dictionary["payment.processing"];
    } else {
      const originalText = buttonText.getAttribute("data-original-text") || dictionary["payment.payNow"];
      buttonText.textContent = originalText;
    }
  }
}

export function setPaymentModalSizing(wrapper, container) {
  const viewportHeight = window.innerHeight || PAYMENT_MODAL_HEIGHT;
  const computedHeight = Math.max(
    400,
    Math.min(PAYMENT_MODAL_HEIGHT, viewportHeight - 32)
  );
  const target = `${computedHeight}px`;
  if (wrapper) {
    wrapper.style.position = "fixed";
    wrapper.style.inset = "0";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.padding = "12px 8px";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.overflow = "hidden";
    wrapper.style.zIndex = "10000";
    wrapper.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  }
  if (container) {
    container.style.height = target;
    container.style.maxHeight = target;
    container.style.minHeight = target;
    container.style.width = "min(480px, calc(100vw - 16px))";
    container.style.margin = "0 auto";
    container.style.overflowY = "auto";
    container.style.overflowX = "hidden";
    container.style.background = container.style.background || "#fff";
    container.style.borderRadius = container.style.borderRadius || "16px";
    container.style.position = "relative";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.padding = "16px";
    container.style.boxSizing = "border-box";
  }
  const paymentElement = document.getElementById("payment_element");
  if (paymentElement) {
    paymentElement.style.maxHeight = "100%";
    paymentElement.style.overflowY = "auto";
    paymentElement.style.overflowX = "hidden";
    paymentElement.style.flex = "1";
    paymentElement.style.minHeight = "0";
    
    const stripeForm = paymentElement.querySelector("form");
    if (stripeForm) {
      stripeForm.style.maxHeight = "100%";
      stripeForm.style.overflowY = "auto";
      stripeForm.style.overflowX = "visible";
      stripeForm.style.padding = "0";
      stripeForm.style.margin = "0";
    }
    
    const paypalContainers = paymentElement.querySelectorAll('[class*="paypal"], [id*="paypal"], [class*="PayPal"], [id*="PayPal"]');
    paypalContainers.forEach(el => {
      el.style.width = "100%";
      el.style.minHeight = "200px";
      el.style.display = "block";
      el.style.overflow = "visible";
    });
    
    const iframes = paymentElement.querySelectorAll("iframe");
    iframes.forEach(iframe => {
      iframe.style.width = "100%";
      iframe.style.minHeight = "200px";
      iframe.style.border = "none";
      iframe.style.display = "block";
    });
    
    const paymentMethodsContainer = paymentElement.querySelector('[class*="PaymentMethod"], [data-payment-methods]');
    if (paymentMethodsContainer) {
      paymentMethodsContainer.style.width = "100%";
      paymentMethodsContainer.style.overflow = "visible";
    }
  }
}

export function extractAmount(hp) {
  if (hp && hp.maxCoursePrice != null && hp.maxCoursePrice !== "") {
    const v = String(hp.maxCoursePrice).trim();
    return /€/.test(v) ? v : `${v}€`;
  }
  const m = (hp?.takeover || "").match(/(\d+[.,]?\d*)\s*€/);
  return m ? `${m[1]}€` : "—";
}

export function updateInfoBox(selectedProvider) {
  const hp = getFromStorage("healthProviders", {})[selectedProvider] || {};
  const nameEl = document.querySelector("#hp_name");
  const amountEl = document.querySelector("#hp_amount");
  if (nameEl) nameEl.textContent = selectedProvider || "—";
  if (amountEl) amountEl.textContent = extractAmount(hp);
}

export function getUserIdSafe() {
  const fromCreate = getFromStorage("createUserResponse", null);
  if (
    fromCreate &&
    typeof fromCreate.userId === "string" &&
    fromCreate.userId.length > 0
  ) {
    return fromCreate.userId;
  }
  const fromKey = getFromStorage("userId", null);
  if (typeof fromKey === "string" && fromKey.length > 0) return fromKey;

  return null;
}

export function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

export function removeUrlParameter(name) {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState({}, "", url.toString());
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function syncWebflowCheckbox(input) {
  if (!input) return;
  const wrapper = input.closest('.w-checkbox');
  if (!wrapper) return;
  const visual = wrapper.querySelector('.w-checkbox-input');
  if (!visual) return;
  if (input.checked) {
    visual.classList.add('w--redirected-checked');
  } else {
    visual.classList.remove('w--redirected-checked');
  }
}

export function clearPasswordField() {
  const form = document.getElementById("signUpForm");
  if (!form) return;

  const passwordField = form.querySelector('input[name="password"]');
  const passwordConfirmField = form.querySelector('input[name="passwordConfirm"]');
  const allPasswordInputs = form.querySelectorAll('input[type="password"]');

  allPasswordInputs.forEach((input) => {
    input.value = "";
    input.autocomplete = "new-password";
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-form-type", "other");
    input.setAttribute("autocomplete", "new-password");
  });

  if (passwordField) {
    const savedData = getFromStorage("userData", {});
    if (savedData.password) {
      delete savedData.password;
      setToStorage("userData", savedData);
    }
  }
}

export function hidePasswordFieldsIfUserExists() {
  const userId = getUserIdSafe();
  if (!userId) return;

  const userData = getFromStorage("userData", {});
  if (userData.password) {
    delete userData.password;
    setToStorage("userData", userData);
  }

  clearPasswordField();

  const form = document.getElementById("signUpForm");
  if (!form) return;

  const passwordField = form.querySelector('input[name="password"]');
  const passwordConfirmField = form.querySelector('input[name="passwordConfirm"]');
  const passwordLabel = passwordField?.closest('.w-form-group') || passwordField?.parentElement;
  const passwordConfirmLabel = passwordConfirmField?.closest('.w-form-group') || passwordConfirmField?.parentElement;

  if (passwordField && passwordLabel) {
    passwordLabel.style.display = "none";
  }
  if (passwordConfirmField && passwordConfirmLabel) {
    passwordConfirmLabel.style.display = "none";
  }
}

export function disableFormFieldsIfUserExists() {
  const userId = getUserIdSafe();
  if (!userId) return;

  const form = document.getElementById("signUpForm");
  if (!form) return;

  const fields = [
    form.querySelector('select[name="namePrefix"]'),
    form.querySelector('input[name="firstName"]'),
    form.querySelector('input[name="lastName"]'),
    form.querySelector('input[name="dateOfBirth"]'),
    form.querySelector('input[name="email"]'),
    form.querySelector('input[name="password"]'),
    form.querySelector('input[name="communication-via-email"]'),
    form.querySelector('input[name="newsletter-sign-up"]'),
    form.querySelector('input[name="privacyPolicy"]'),
  ];

  fields.forEach((field) => {
    if (field) {
      field.disabled = true;
    }
  });
}
