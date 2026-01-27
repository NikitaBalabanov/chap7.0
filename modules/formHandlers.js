import { getFromStorage, setToStorage } from './storage.js';
import { 
  getUserIdSafe, 
  getSubmitButtonText, 
  setSubmitButtonLoading,
  clearPasswordField,
  disableFormFieldsIfUserExists,
  hidePasswordFieldsIfUserExists
} from './utils.js';
import { hideFullscreenLoader } from './loader.js';
import { calculateTotalPrice } from './checkout.js';
import { ensureEmailVerifiedThenPay } from './stripe.js';
import { createUser, createTrialUser } from './userCreation.js';

export { clearPasswordField, disableFormFieldsIfUserExists, hidePasswordFieldsIfUserExists };

export function saveFormData(formData) {
  const existingData = getFromStorage("userData", {});
  const mergedData = { ...existingData, ...formData };
  if (mergedData.password) {
    delete mergedData.password;
  }
  setToStorage("userData", mergedData);
}

export function restoreFormData() {
  const savedData = getFromStorage("userData", {});
  const form = document.getElementById("signUpForm");
  if (!form || !savedData) {
    clearPasswordField();
    return;
  }

  clearPasswordField();

  const fields = {
    namePrefix: form.querySelector('select[name="namePrefix"]'),
    firstName: form.querySelector('input[name="firstName"]'),
    lastName: form.querySelector('input[name="lastName"]'),
    dateOfBirth: form.querySelector('input[name="dateOfBirth"]'),
    email: form.querySelector('input[name="email"]'),
    communicationViaEmail: form.querySelector('input[name="communication-via-email"]'),
    newsletterSignUp: form.querySelector('input[name="newsletter-sign-up"]'),
    privacyPolicy: form.querySelector('input[name="privacyPolicy"]'),
  };

  if (fields.namePrefix && savedData.namePrefix) {
    const optionExists = Array.from(fields.namePrefix.options).some(
      opt => opt.value === savedData.namePrefix
    );
    if (optionExists) {
      fields.namePrefix.value = savedData.namePrefix;
    }
  }
  if (fields.firstName && savedData.firstName) {
    fields.firstName.value = savedData.firstName;
  }
  if (fields.lastName && savedData.lastName) {
    fields.lastName.value = savedData.lastName;
  }
  if (fields.dateOfBirth && savedData.dateOfBirth) {
    fields.dateOfBirth.value = savedData.dateOfBirth;
  }
  if (fields.email && savedData.email) {
    fields.email.value = savedData.email;
  }
  if (fields.communicationViaEmail) {
    const shouldBeChecked = savedData.communicationViaEmail !== false;
    fields.communicationViaEmail.checked = shouldBeChecked;
    if (shouldBeChecked) {
      fields.communicationViaEmail.setAttribute("checked", "checked");
      fields.communicationViaEmail.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  if (fields.newsletterSignUp) {
    const shouldBeChecked = savedData.newsletterSignUp === true;
    fields.newsletterSignUp.checked = shouldBeChecked;
    if (shouldBeChecked) {
      fields.newsletterSignUp.setAttribute("checked", "checked");
      fields.newsletterSignUp.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  if (fields.privacyPolicy) {
    const shouldBeChecked = savedData.privacyPolicy === true;
    fields.privacyPolicy.checked = shouldBeChecked;
    if (shouldBeChecked) {
      fields.privacyPolicy.setAttribute("checked", "checked");
      fields.privacyPolicy.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}


export function setupPasswordFieldCleanup() {
  const form = document.getElementById("signUpForm");
  if (!form) return;

  const passwordField = form.querySelector('input[name="password"]');
  const passwordConfirmField = form.querySelector('input[name="passwordConfirm"]');

  if (passwordField && !passwordField._cleanupSetup) {
    passwordField._cleanupSetup = true;
    let userTyping = false;

    passwordField.addEventListener("input", () => {
      userTyping = true;
      const savedData = getFromStorage("userData", {});
      if (savedData.password) {
        delete savedData.password;
        setToStorage("userData", savedData);
      }
    });

    passwordField.addEventListener("keydown", () => {
      userTyping = true;
    });

    const clearIfAutoFilled = () => {
      if (!userTyping && passwordField.value) {
        passwordField.value = "";
        const savedData = getFromStorage("userData", {});
        if (savedData.password) {
          delete savedData.password;
          setToStorage("userData", savedData);
        }
      }
    };

    passwordField.addEventListener("focus", () => {
      userTyping = false;
      setTimeout(clearIfAutoFilled, 100);
    });

    setTimeout(() => {
      if (passwordField.value && document.activeElement !== passwordField) {
        clearIfAutoFilled();
      }
    }, 1500);
  }

  if (passwordConfirmField && !passwordConfirmField._cleanupSetup) {
    passwordConfirmField._cleanupSetup = true;
    
    passwordConfirmField.addEventListener("focus", () => {
      if (passwordConfirmField.value) {
        passwordConfirmField.value = "";
      }
    });
  }
}


export function resetSignupFormState() {
  const form = document.getElementById("signUpForm");
  if (!form) return;

  const fields = [
    form.querySelector('select[name="namePrefix"]'),
    form.querySelector('input[name="firstName"]'),
    form.querySelector('input[name="lastName"]'),
    form.querySelector('input[name="dateOfBirth"]'),
    form.querySelector('input[name="email"]'),
    form.querySelector('input[name="password"]'),
    form.querySelector('input[name="passwordConfirm"]'),
    form.querySelector('input[name="communication-via-email"]'),
    form.querySelector('input[name="newsletter-sign-up"]'),
    form.querySelector('input[name="privacyPolicy"]'),
  ];

  fields.forEach((field) => {
    if (!field) return;
    field.disabled = false;
    field.classList.remove("error");
    if (field.type === "checkbox") {
      field.checked = false;
    } else {
      field.value = "";
    }
  });

  const passwordField = form.querySelector('input[name="password"]');
  const passwordConfirmField = form.querySelector(
    'input[name="passwordConfirm"]'
  );
  const passwordLabel =
    passwordField?.closest(".w-form-group") || passwordField?.parentElement;
  const passwordConfirmLabel =
    passwordConfirmField?.closest(".w-form-group") ||
    passwordConfirmField?.parentElement;

  if (passwordLabel) passwordLabel.style.display = "";
  if (passwordConfirmLabel) passwordConfirmLabel.style.display = "";

  clearPasswordField();
}

export function setupFormAutoSave() {
  const form = document.getElementById("signUpForm");
  if (!form || form._autoSaveSetup) return;
  
  form._autoSaveSetup = true;

  const fields = {
    namePrefix: form.querySelector('select[name="namePrefix"]'),
    firstName: form.querySelector('input[name="firstName"]'),
    lastName: form.querySelector('input[name="lastName"]'),
    dateOfBirth: form.querySelector('input[name="dateOfBirth"]'),
    email: form.querySelector('input[name="email"]'),
    communicationViaEmail: form.querySelector('input[name="communication-via-email"]'),
    newsletterSignUp: form.querySelector('input[name="newsletter-sign-up"]'),
    privacyPolicy: form.querySelector('input[name="privacyPolicy"]'),
  };

  Object.entries(fields).forEach(([key, field]) => {
    if (!field) return;

    if (field.type === "checkbox") {
      field.addEventListener("change", () => {
        saveFormData({ [key]: field.checked });
      });
    } else {
      field.addEventListener("input", () => {
        saveFormData({ [key]: field.value });
      });
      field.addEventListener("change", () => {
        saveFormData({ [key]: field.value });
      });
    }
  });
}

export async function triggerFormSubmissionFlow(showLoader = false) {
  const form = document.getElementById("signUpForm");
  if (!form) {
    console.warn("Form not found, waiting...");
    setTimeout(() => triggerFormSubmissionFlow(showLoader), 500);
    return;
  }

  const userData = getFromStorage("userData", {});
  if (!userData.email || !userData.firstName || !userData.lastName) {
    console.warn("Form data not complete, cannot auto-submit");
    if (showLoader) hideFullscreenLoader();
    return;
  }

  if (showLoader) {
    const { showFullscreenLoader } = await import('./loader.js');
    showFullscreenLoader();
  }

  const buttonText = getSubmitButtonText();
  if (buttonText && !buttonText.getAttribute("data-original-text")) {
    buttonText.setAttribute("data-original-text", buttonText.textContent);
  }

  setSubmitButtonLoading(true);

  try {
    const userId = getUserIdSafe();
    const formData = { ...userData };
    
    if (userId && formData.password) {
      delete formData.password;
    }
    
    saveFormData(formData);

    if (getFromStorage("trial", false)) {
      await createTrialUser(showLoader);
      return;
    }

    await createUser();
    await ensureEmailVerifiedThenPay(calculateTotalPrice(), showLoader);
  } catch (error) {
    console.error("Auto-submit error:", error);
    setSubmitButtonLoading(false);
    if (showLoader) hideFullscreenLoader();
  }
}
