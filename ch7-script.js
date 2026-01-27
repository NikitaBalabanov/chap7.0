import { dictionary } from './modules/config.js';
import { 
  getFromStorage, 
  setToStorage, 
  clearLocalStorageAfterPayment,
  clearSurveyResults,
  saveCurrentStep, 
  getSavedCurrentStep 
} from './modules/storage.js';
import { 
  getUserIdSafe, 
  getUrlParameter, 
  removeUrlParameter,
  getSubmitButtonText,
  setSubmitButtonLoading
} from './modules/utils.js';
import { fetchHealthProviders } from './modules/healthProviders.js';
import { 
  fetchPricing, 
  fetchContraindications, 
  fetchCourses, 
  fetchOnboardingSurvey 
} from './modules/pricing.js';
import { 
  populateOnboardingSurveyStep1, 
  populateOnboardingSurveyStep2,
  getStep1Answers,
  getStep2Answers,
  recommendCourses,
  populateSummary,
  populateContraindications
} from './modules/onboarding.js';
import { populateCheckout, calculateTotalPrice, resetCheckoutView } from './modules/checkout.js';
import { ensureEmailVerifiedThenPay } from './modules/stripe.js';
import { createUser, createTrialUser, populateNamePrefix } from './modules/userCreation.js';
import { 
  saveFormData,
  restoreFormData, 
  clearPasswordField, 
  setupPasswordFieldCleanup,
  hidePasswordFieldsIfUserExists,
  disableFormFieldsIfUserExists,
  resetSignupFormState,
  setupFormAutoSave,
  triggerFormSubmissionFlow
} from './modules/formHandlers.js';

function onboardingHook({ current, index }) {
  if (index === 0) {
    const healthProviders = getFromStorage("healthProviders", {});
    if (!healthProviders || Object.keys(healthProviders).length === 0) {
      fetchHealthProviders();
    }
    fetchPricing();
    fetchContraindications();
    fetchCourses();
    fetchOnboardingSurvey();
  } else if (index === 1) {
    populateOnboardingSurveyStep1();
  } else if (index === 2) {
    getStep1Answers();
    populateOnboardingSurveyStep2();
  } else if (index === 3) {
    getStep2Answers();
    recommendCourses();
    populateSummary();
  } else if (index === 4) {
    populateContraindications();
    populateNamePrefix().then(() => {
      setTimeout(() => {
        clearPasswordField();
        restoreFormData();
        setupFormAutoSave();
        setupPasswordFieldCleanup();
        hidePasswordFieldsIfUserExists();
        disableFormFieldsIfUserExists();
      }, 100);
    });
  } else if (index === 5) {
    populateCheckout();
    populateNamePrefix().then(() => {
      setTimeout(() => {
        clearPasswordField();
        restoreFormData();
        
        setTimeout(() => {
          const form = document.getElementById("signUpForm");
          if (form) {
            const savedData = getFromStorage("userData", {});
            const communicationCheckbox = form.querySelector('input[name="communication-via-email"]');
            const privacyCheckbox = form.querySelector('input[name="privacyPolicy"]');
            
            if (communicationCheckbox && savedData.communicationViaEmail !== false) {
              communicationCheckbox.checked = true;
              communicationCheckbox.setAttribute("checked", "checked");
            }
            if (privacyCheckbox && savedData.privacyPolicy === true) {
              privacyCheckbox.checked = true;
              privacyCheckbox.setAttribute("checked", "checked");
            }
          }
        }, 50);
        
        setupFormAutoSave();
        setupPasswordFieldCleanup();
        hidePasswordFieldsIfUserExists();
        disableFormFieldsIfUserExists();
      }, 100);
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const steps = document.querySelectorAll(
    ".form_step_wrap .form_step, .form_step_popup"
  );
  const prevBtns = document.querySelectorAll("[data-btn-prev]");
  const nextBtns = [
    ...document.querySelectorAll("[data-btn-next]"),
    document.querySelector("#button_trial"),
  ];
  const submitBtn = document.querySelector("[data-btn-submit]");
  const errorMessageStep1 = document.getElementById("error_message_step1");
  const errorMessageStep2 = document.getElementById("error_message");
  const errorMessageStep3 = document.getElementById("error_message_step3");
  const errorMessageStep4 = document.getElementById("error_message_step4");
  const errorMessageStep5 = document.getElementById("error_message_step5");

  let currentStep = getSavedCurrentStep();
  const stepMaps = {
    0: "#step1",
    1: "#step2",
    2: "#step2",
    3: "#step3",
    4: "#step3",
    5: "#step3",
  };

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.remove("active");
      if (i > index)
        document.querySelector(stepMaps[i])?.classList.remove("active");
      step.style.display = "none";
    });

    if (steps[index]) {
      steps[index].classList.add("active");
      document.querySelector(stepMaps[index])?.classList.add("active");
      steps[index].style.display = steps[index].classList.contains(
        "form_step_popup"
      )
        ? "flex"
        : "block";
    } else {
      console.error("Step index out of range:", index);
    }
    saveCurrentStep(index);
    onboardingHook({ steps: steps, current: steps[index], index: index });
  }

  async function isCurrentStepValid() {
    let valid = true;
    let errorMessages = [];

    try {
      switch (currentStep) {
        case 0: {
          const dropdown = document.getElementById("healthProviders");
          if (
            !dropdown ||
            dropdown.value.trim() === "" ||
            dropdown.value === null
          ) {
            valid = false;
            errorMessages.push(dictionary["error.healthProvider"]);
          } else if (valid) {
            setToStorage("selectedHealthProvider", dropdown.value.trim());
          }
          break;
        }
        case 1: {
          const checkboxesStep2 = document.querySelectorAll(
            ".card_select_checkbox:checked"
          );
          if (checkboxesStep2.length < 1) {
            valid = false;
            errorMessages.push(dictionary["error.selectOptions"]);
          } else if (checkboxesStep2.length > 2) {
            valid = false;
            errorMessages.push(dictionary["error.tooManyOptions"]);
          }
          break;
        }
        case 2: {
          const checkboxesStep3 = document.querySelectorAll(
            ".custom-checkbox-input:checked"
          );
          if (checkboxesStep3.length < 1) {
            valid = false;
            errorMessages.push(dictionary["error.selectOptions"]);
          }
          break;
        }
        case 3: {
          const cardResultCheckboxes = document.querySelectorAll(
            ".card_result_checkbox:checked"
          );
          if (cardResultCheckboxes.length < 1) {
            valid = false;
            errorMessages.push(dictionary["error.selectPrograms"]);
          }
          break;
        }
        case 4: {
          const popupConsent1 = document.getElementById("popupConsent1");
          const popupConsent2 = document.getElementById("popupConsent2");
          if (!popupConsent1.checked || !popupConsent2.checked) {
            valid = false;
            errorMessages.push(dictionary["error.agreeToTerms"]);
          }
          break;
        }
        case 5: {
          const form = document.getElementById("signUpForm");
          const userId = getUserIdSafe();
          const fields = {
            namePrefix: form.querySelector('select[name="namePrefix"]'),
            firstName: form.querySelector('input[name="firstName"]'),
            lastName: form.querySelector('input[name="lastName"]'),
            dateOfBirth: form.querySelector('input[name="dateOfBirth"]'),
            email: form.querySelector('input[name="email"]'),
            password: userId ? null : form.querySelector('input[name="password"]'),
            communicationViaEmail: form.querySelector('input[name="communication-via-email"]'),
            newsletterSignUp: form.querySelector('input[name="newsletter-sign-up"]'),
            privacyPolicy: form.querySelector('input[name="privacyPolicy"]'),
          };

          Object.values(fields).forEach(
            (field) => field && field.classList.remove("error")
          );

          const formData = {};
          const checkboxFields = ["communicationViaEmail", "newsletterSignUp", "privacyPolicy"];
          Object.entries(fields).forEach(([key, field]) => {
            if (!field) {
              if (key === "password" && userId) {
                return;
              }
              console.error(`Field ${key} not found`);
              valid = false;
              errorMessages.push(dictionary["error.requiredFields"]);
              return;
            }

            if (checkboxFields.includes(key)) {
              formData[key] = field.checked;
            } else {
              const value = field.value.trim();
              formData[key] = value;
              
              if (!value && !["communicationViaEmail", "newsletterSignUp", "privacyPolicy"].includes(key)) {
                field.classList.add("error");
                valid = false;
                switch (key) {
                  case "namePrefix":
                    errorMessages.push(dictionary["error.namePrefix"]);
                    break;
                  case "firstName":
                    errorMessages.push(dictionary["error.firstName"]);
                    break;
                  case "lastName":
                    errorMessages.push(dictionary["error.lastName"]);
                    break;
                  case "dateOfBirth":
                    errorMessages.push(dictionary["error.dateOfBirth"]);
                    break;
                  case "email":
                    errorMessages.push(dictionary["error.email"]);
                    break;
                  case "password":
                    if (!userId) {
                      errorMessages.push(dictionary["error.password"]);
                    }
                    break;
                }
              }

              if (key === "email" && value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                  field.classList.add("error");
                  valid = false;
                  errorMessages.push(dictionary["error.emailInvalid"]);
                }
              }

              if (key === "password" && value && value.length < 6 && !userId) {
                field.classList.add("error");
                valid = false;
                errorMessages.push(dictionary["error.passwordLength"]);
              }

              if (key === "dateOfBirth" && value) {
                const date = new Date(value);
                const today = new Date();
                const minAge = 18;
                const minDate = new Date();
                minDate.setFullYear(today.getFullYear() - minAge);
                if (isNaN(date.getTime()) || date > today || date > minDate) {
                  field.classList.add("error");
                  valid = false;
                  errorMessages.push(dictionary["error.ageRestriction"]);
                }
              }
            }

            if (key === "communicationViaEmail" && !field.checked) {
              field.classList.add("error");
              valid = false;
              errorMessages.push(dictionary["error.termsAndConditions"]);
            }
            if (key === "privacyPolicy" && !field.checked) {
              field.classList.add("error");
              valid = false;
              errorMessages.push(dictionary["error.privacyPolicy"]);
            }
          });

          if (valid) {
            const buttonText = getSubmitButtonText();
            if (buttonText && !buttonText.getAttribute("data-original-text")) {
              buttonText.setAttribute("data-original-text", buttonText.textContent);
            }
            
            setSubmitButtonLoading(true);
            
            try {
              const newsletterCheckbox = form.querySelector('input[name="newsletter-sign-up"]');
              if (newsletterCheckbox) {
                formData.newsletterSignUp = newsletterCheckbox.checked;
              }
              if (userId && formData.password) {
                delete formData.password;
              }
              saveFormData(formData);
              
              if (getFromStorage("trial", false)) {
                await createTrialUser();
                return;
              }
              
              await createUser();
              await ensureEmailVerifiedThenPay(calculateTotalPrice());
            } catch (error) {
              setSubmitButtonLoading(false);
              throw error;
            }
          }
          break;
        }
      }

      if (!valid) {
        switch (currentStep) {
          case 0:
            errorMessageStep1.innerHTML = errorMessages.join("<br>");
            errorMessageStep1.style.display = "block";
            break;
          case 1:
            errorMessageStep2.innerHTML = errorMessages.join("<br>");
            errorMessageStep2.style.display = "block";
            break;
          case 2:
            errorMessageStep3.innerHTML = errorMessages.join("<br>");
            errorMessageStep3.style.display = "block";
            break;
          case 3:
            errorMessageStep3.innerHTML = errorMessages.join("<br>");
            errorMessageStep3.style.display = "block";
            break;
          case 4:
            errorMessageStep4.innerHTML = errorMessages.join("<br>");
            errorMessageStep4.style.display = "block";
            break;
          case 5:
            errorMessageStep5.innerHTML = errorMessages.join("<br>");
            errorMessageStep5.style.display = "block";
            break;
        }
      } else {
        errorMessageStep2.style.display = "none";
        errorMessageStep3.style.display = "none";
        errorMessageStep4.style.display = "none";
        errorMessageStep5.style.display = "none";
      }

      return valid;
    } catch (error) {
      console.error("Validation error:", error);
      return false;
    }
  }

  async function handleNextClick(event) {
    event.preventDefault();

    try {
      const isValid = await isCurrentStepValid();
      if (!isValid) {
        return;
      }
      if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
      }
    } catch (error) {
      console.error("Error in handleNextClick:", error);
    }
  }

  function handlePrevClick() {
    if (currentStep > 0) {
      currentStep--;
      showStep(currentStep);
    }
  }

  function attachEventListeners() {
    [...nextBtns, submitBtn].forEach((btn) => {
      if (!btn) return;
      btn.removeEventListener("click", handleNextClick);
      btn.addEventListener("click", handleNextClick);
    });
    [...prevBtns].forEach((btn) => {
      btn.removeEventListener("click", handlePrevClick);
      btn.addEventListener("click", handlePrevClick);
    });
    const popupCloseBtn = document.querySelector("#popupClose");
    if (popupCloseBtn) popupCloseBtn.addEventListener("click", handlePrevClick);
    
    const surveyAgainBtn = document.querySelector("#do-survey-again");
    if (surveyAgainBtn) {
      surveyAgainBtn.addEventListener("click", function(e) {
        e.preventDefault();
        clearSurveyResults();
        currentStep = 1;
        saveCurrentStep(1);
        showStep(1);
      });
    }
  }

  function preventUncheckingCommunicationEmail() {
    const communicationCheckbox = document.querySelector('input[name="communication-via-email"]');
    if (communicationCheckbox) {
      communicationCheckbox.addEventListener('change', function(e) {
        if (!this.checked) {
          this.checked = true;
          console.log('Communication via email cannot be unchecked');
        }
      });
    }
  }

  const userData = getFromStorage("userData", {});
  if (userData.password) {
    delete userData.password;
    setToStorage("userData", userData);
  }

  fetchHealthProviders();
  fetchOnboardingSurvey();
  attachEventListeners();
  preventUncheckingCommunicationEmail();
  showStep(currentStep);

  const backToOnboarding = document.getElementById("back-to-onboarding");
  if (backToOnboarding) {
    backToOnboarding.addEventListener("click", (event) => {
      event.preventDefault();
      removeUrlParameter("email-verified");
      clearLocalStorageAfterPayment();
      resetSignupFormState();
      resetCheckoutView();
      currentStep = 0;
      saveCurrentStep(0);
      fetchHealthProviders();
      showStep(currentStep);
    });
  }

  setTimeout(() => {
    clearPasswordField();
    setupPasswordFieldCleanup();
  }, 500);

  const observer = new MutationObserver(() => {
    const passwordField = document.querySelector('input[name="password"]');
    if (passwordField && !passwordField._cleanupSetup) {
      setupPasswordFieldCleanup();
      clearPasswordField();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  const emailVerified = getUrlParameter("email-verified");
  if (emailVerified === "true" && window.location.pathname.includes("/onboarding")) {
    setTimeout(async () => {
      const currentStep = getSavedCurrentStep();
      if (currentStep >= 5) {
        await triggerFormSubmissionFlow(true);
      } else {
        const steps = document.querySelectorAll(
          ".form_step_wrap .form_step, .form_step_popup"
        );
        if (steps.length > 5) {
          const savedStep = getSavedCurrentStep();
          showStep(Math.max(5, savedStep));
          setTimeout(async () => {
            await triggerFormSubmissionFlow(true);
          }, 1000);
        }
      }
    }, 1500);
  }
});
