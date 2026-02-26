import { dictionary, isEmailAlreadyInUse } from './config.js';
import { getFromStorage, setToStorage } from './storage.js';
import { getUserIdSafe, disableFormFieldsIfUserExists, hidePasswordFieldsIfUserExists } from './utils.js';
import { getCreateUserBaseUrl, getNamePrefixes } from './api.js';
import { hideFullscreenLoader } from './loader.js';
import { getFilteredContraindications } from './pricing.js';
import { getHpFull } from './healthProviders.js';
import { ensureEmailVerifiedThenCompleteTrial } from './stripe.js';

export async function createUser(passwordOverride = null) {
  try {
    const errorDiv = document.querySelector("#error_message_step5");
    errorDiv.style.display = "none";
    const userData = getFromStorage("userData", {});
    const userId = getUserIdSafe();
    const selectedCourses = getFromStorage("selectedCourses", []);
    const recommendedCourses = getFromStorage("recommendedCourses", []);
    const selectedHealthProvider = getFromStorage("selectedHealthProvider", "");
    const healthProvidersFromStorage = getFromStorage("healthProviders", {});
    const onboardingSurveyAnswers_1 = getFromStorage(
      "onboardingSurveyAnswers_1",
      []
    );
    const onboardingSurveyAnswers_2 = getFromStorage(
      "onboardingSurveyAnswers_2",
      []
    );

    const paidCourses = selectedCourses.map((course) => {
      const validTill = new Date();
      validTill.setFullYear(validTill.getFullYear() + 1);
      return {
        course: course.toUpperCase(),
        status: "valid",
        validTill: validTill.toISOString().split("T")[0],
      };
    });

    const allHealthProviders =
      (healthProvidersFromStorage &&
        Object.keys(healthProvidersFromStorage).length > 0 &&
        healthProvidersFromStorage) ||
      getHpFull() ||
      {};
    const healthProviderData = allHealthProviders[selectedHealthProvider] || {};
    const hasContraindications = getFilteredContraindications().length > 0;

    const payload = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      dateOfBirth: userData.dateOfBirth,
      namePrefix: userData.namePrefix,
      newsletterSignUp: userData.newsletterSignUp || false,
      hasPreconditions: hasContraindications,
      healthProvider: {
        maxCoursePrice: healthProviderData?.maxCoursePrice || "",
        name: selectedHealthProvider,
        numberOfCourses: recommendedCourses.length.toString(),
        takeover: healthProviderData?.takeover || "",
      },
      selectedCourses: selectedCourses.map((course) => course.toUpperCase()),
      onboarding: {
        answers: {
          step1: onboardingSurveyAnswers_1.map((item) => item.type),
          step2: onboardingSurveyAnswers_2.map((item) => item.type),
        },
      },
    };

    const password =
      typeof passwordOverride === "string" && passwordOverride.length > 0
        ? passwordOverride
        : userData.password;

    if (!userId && password) {
      payload.password = password;
    }

    setToStorage("createUserPayload", payload);

    const response = await fetch(getCreateUserBaseUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success === false) {
      if (isEmailAlreadyInUse(data)) {
        const savedUserId = getFromStorage("userId", null);
        if (savedUserId) {
          setToStorage("createUserResponse", {
            userId: savedUserId,
            success: true,
          });
          setTimeout(() => {
            disableFormFieldsIfUserExists();
            hidePasswordFieldsIfUserExists();
          }, 100);
          return { userId: savedUserId, success: true, skippedCreation: true };
        }
        errorDiv.style.display = "block";
        errorDiv.textContent = dictionary["error.userExistsNoLocal"];
        throw new Error(dictionary["error.userExistsNoLocal"]);
      }

      errorDiv.style.display = "block";
      errorDiv.textContent = `${data.message || ""} ${data.error || ""}`.trim();
      throw new Error(data.message || data.error || "Failed to create user");
    }

    if (!response.ok || !data.success)
      throw new Error(data.message || "Failed to create user");

    setToStorage("createUserResponse", data);
    setToStorage("userId", data.userId);

    setTimeout(() => {
      disableFormFieldsIfUserExists();
      hidePasswordFieldsIfUserExists();
    }, 100);

    if (!response.ok) throw new Error(data.message || "Failed to create user");
    return data;
  } catch (error) {
    setToStorage("createUserResponse", error);
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function createTrialUser(showLoader = false, passwordOverride = null) {
  try {
    const errorDiv = document.querySelector("#error_message_step5");
    errorDiv.style.display = "none";
    const userData = getFromStorage("userData", {});
    const userId = getUserIdSafe();
    const selectedCourses = getFromStorage("selectedCourses", []);
    const recommendedCourses = getFromStorage("recommendedCourses", []);
    const selectedHealthProvider = getFromStorage("selectedHealthProvider", "");
    const healthProviders = getFromStorage("healthProviders", {});
    const onboardingSurveyAnswers_1 = getFromStorage(
      "onboardingSurveyAnswers_1",
      []
    );
    const onboardingSurveyAnswers_2 = getFromStorage(
      "onboardingSurveyAnswers_2",
      []
    );

    const healthProviderData = healthProviders[selectedHealthProvider];
    const hasContraindications = getFilteredContraindications().length > 0;

    const payload = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      dateOfBirth: userData.dateOfBirth,
      namePrefix: userData.namePrefix,
      newsletterSignUp: userData.newsletterSignUp || false,
      hasPreconditions: hasContraindications,
      isTrial: true,
      healthProvider: {
        maxCoursePrice: healthProviderData?.maxCoursePrice || "",
        name: selectedHealthProvider,
        numberOfCourses: recommendedCourses.length.toString(),
        takeover: healthProviderData?.takeover || "",
      },
      selectedCourses: selectedCourses.map((course) => course.toUpperCase()),
      onboarding: {
        answers: {
          step1: onboardingSurveyAnswers_1.map((item) => item.type),
          step2: onboardingSurveyAnswers_2.map((item) => item.type),
        },
      },
    };

    const password =
      typeof passwordOverride === "string" && passwordOverride.length > 0
        ? passwordOverride
        : userData.password;

    if (!userId && password) {
      payload.password = password;
    }

    setToStorage("createUserPayload", payload);

    const response = await fetch(getCreateUserBaseUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success === false) {
      if (isEmailAlreadyInUse(data)) {
        const savedUserId = getFromStorage("userId", null);
        if (savedUserId) {
          setToStorage("createUserResponse", {
            userId: savedUserId,
            success: true,
          });
          setTimeout(() => {
            disableFormFieldsIfUserExists();
            hidePasswordFieldsIfUserExists();
          }, 100);
          await ensureEmailVerifiedThenCompleteTrial(showLoader);
          return { userId: savedUserId, success: true, skippedCreation: true };
        }
        const errorDiv = document.querySelector("#error_message_step5");
        if (errorDiv) {
          errorDiv.style.display = "block";
          errorDiv.textContent = dictionary["error.userExistsNoLocal"];
        }
        if (showLoader) hideFullscreenLoader();
        throw new Error(dictionary["error.userExistsNoLocal"]);
      }

      const errorDiv = document.querySelector("#error_message_step5");
      if (errorDiv) {
        errorDiv.style.display = "block";
        errorDiv.textContent = `${data.message || ""} ${
          data.error || ""
        }`.trim();
      }
      if (showLoader) hideFullscreenLoader();
      throw new Error(
        data.message || data.error || "Failed to create trial user"
      );
    }

    if (!response.ok || !data.success) {
      if (showLoader) hideFullscreenLoader();
      throw new Error(data.message || "Failed to create trial user");
    }

    setToStorage("createUserResponse", data);
    setToStorage("userId", data.userId);

    setTimeout(() => {
      disableFormFieldsIfUserExists();
      hidePasswordFieldsIfUserExists();
    }, 100);

    await ensureEmailVerifiedThenCompleteTrial(showLoader);
    return data;
  } catch (error) {
    setToStorage("createUserResponse", error);
    console.error("Error creating trial user:", error);
    if (showLoader) hideFullscreenLoader();
    throw error;
  }
}

export async function populateNamePrefix() {
  const namePrefixSelect = document.querySelector('select[name="namePrefix"]');
  if (!namePrefixSelect) return Promise.resolve();
  
  const savedValue = getFromStorage("userData", {})?.namePrefix || "";
  
  const response = await fetch(getNamePrefixes());
  const data = await response.json();
  const prefixes = data.data;

  while (namePrefixSelect.options.length > 1) {
    namePrefixSelect.remove(1);
  }

  Object.entries(prefixes).forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    namePrefixSelect.appendChild(option);
  });
  
  if (savedValue && prefixes[savedValue]) {
    namePrefixSelect.value = savedValue;
  }
  
  return Promise.resolve();
}
