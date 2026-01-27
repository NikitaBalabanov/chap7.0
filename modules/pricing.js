import { getFromStorage, setToStorage } from './storage.js';
import { getDocumentFromFireBase, getWebflowStory } from './api.js';

export async function fetchPricing() {
  try {
    const res = await fetch(getDocumentFromFireBase("pricing"));
    const data = await res.json();
    if (data.success && data.data) setToStorage("pricing", data.data);
  } catch (error) {
    console.error(error);
  }
}

export async function fetchContraindications() {
  try {
    const res = await fetch(getWebflowStory("health-contraindications"));
    const data = await res.json();
    const healthContraindications = data.story?.content?.contraindications;
    if (healthContraindications)
      setToStorage("contraindications", healthContraindications);
  } catch (error) {
    console.error(error);
  }
}

export function getFilteredContraindications() {
  const recommendedCourses = getFromStorage("recommendedCourses", []);
  const contraindications = getFromStorage("contraindications", []);
  return contraindications.filter((c) =>
    recommendedCourses.includes(c.course_slug)
  );
}

export async function fetchCourses() {
  const res = await fetch(getDocumentFromFireBase("courses"));
  const data = await res.json();
  if (data.success && data.data["courses-info"].length) {
    setToStorage("courses", data.data["courses-info"]);
  }
  return data.data["courses-info"];
}

export async function fetchOnboardingSurvey() {
  const res = await fetch(getWebflowStory("onboarding-survey"));
  const data = await res.json();
  const onboardingSurvey = data?.story?.content?.onboarding_survey_steps;
  if (onboardingSurvey?.length)
    setToStorage("onboardingSurvey", onboardingSurvey);
  return onboardingSurvey;
}
