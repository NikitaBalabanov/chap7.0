export function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

export function setToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

export function clearLocalStorageAfterPayment() {
  const keysToRemove = [
    "currentStep",
    "userData",
    "selectedHealthProvider",
    "pricing",
    "contraindications",
    "courses",
    "onboardingSurvey",
    "onboardingSurveyAnswers_1",
    "onboardingSurveyAnswers_2",
    "SurveyAnswersCourseTypes",
    "recommendedCourses",
    "selectedCourses",
    "trial",
    "invoiceUrl",
    "paymentIntentPayload",
    "paymentIntentResponse",
    "paymentSuccess",
    "createUserPayload",
    "createUserResponse",
    "userId",
  ];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove ${key} from localStorage:`, e);
    }
  });
}

export function clearSurveyResults() {
  const keysToRemove = [
    "onboardingSurveyAnswers_1",
    "onboardingSurveyAnswers_2",
    "SurveyAnswersCourseTypes",
    "recommendedCourses",
    "selectedCourses",
  ];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove ${key} from localStorage:`, e);
    }
  });
}

export function saveCurrentStep(stepIndex) {
  setToStorage("currentStep", stepIndex);
}

export function getSavedCurrentStep() {
  const saved = getFromStorage("currentStep", 0);
  return typeof saved === "number" && saved >= 0 ? saved : 0;
}
