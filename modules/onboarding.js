import { DEFAULT_CHECKMARK_COLOR, CURRENCY } from './config.js';
import { getFromStorage, setToStorage } from './storage.js';
import { getSiblingButtonBySelector } from './utils.js';
import { calculateTotalPrice } from './checkout.js';

export async function populateOnboardingSurveyStep1() {
  const onboardingSurvey = getFromStorage("onboardingSurvey", [])?.[0]?.answers;
  if (onboardingSurvey?.length) {
    const container = document.querySelector("#coursesContainer");
    container.innerHTML = "";
    onboardingSurvey.forEach((data) => {
      const item = renderCourseItem(
        data.id,
        data.type,
        data.text,
        data.image_cover.filename
      );
      container.appendChild(item);
    });
  }
}

function renderCourseItem(id, value, text, imgSrc) {
  const template = document.createElement("template");
  template.innerHTML = `<label class="w-checkbox form_card_select">
    <div class="card_form_img_contain">
      <img src="${imgSrc}" loading="lazy" sizes="100vw" alt="" class="card_select_img">
    </div>
    <input type="checkbox" data-id="${id}" name="step1[]" data-name="step1[]" data-value="${value}" class="w-checkbox-input card_select_checkbox">
    <span class="card_select_label w-form-label"><br></span>
    <div class="card_select_content u-hflex-left-top u-gap-3">
      <div class="form_checkbox_visible u-hflex-center-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 12 10" fill="none" class="checkbox_icon">
          <path d="M4.16667 9.03341L0.5 5.36675L1.78333 4.08342L4.16667 6.46675L10.2167 0.416748L11.5 1.70008L4.16667 9.03341Z" fill="currentColor"></path>
        </svg>
      </div>
      <div class="card_select_text">${text}</div>
    </div>
  </label>`;
  return template.content.firstElementChild;
}

export function getStep1Answers() {
  const selectedCheckboxes = document.querySelectorAll(
    "#coursesContainer .card_select_checkbox:checked"
  );
  const answeredIds = Array.from(selectedCheckboxes).map((checkbox) =>
    checkbox.getAttribute("data-id")
  );
  const onboardingSurvey = getFromStorage("onboardingSurvey", [])?.[0]?.answers;
  setToStorage(
    "onboardingSurveyAnswers_1",
    answeredIds.map((id) => ({
      id,
      type: onboardingSurvey.find((item) => item.id === id)?.type,
    }))
  );
}

function renderOnboardingSurveyItem(id, type, text) {
  const template = document.createElement("template");
  template.innerHTML = `
    <label class="custom-checkbox">
      <input type="checkbox" id="${id}" name="step2[]" data-value="${type}" class="custom-checkbox-input">
      <span class="custom-checkbox-label">${text}</span>
    </label>`;
  return template.content.firstElementChild;
}

export async function populateOnboardingSurveyStep2() {
  const onboardingSurvey = getFromStorage("onboardingSurvey", [])?.[1]?.answers;
  if (onboardingSurvey?.length) {
    const container = document.querySelector("#onboardingSurvey");
    container.innerHTML = "";
    onboardingSurvey.forEach((data) => {
      const item = renderOnboardingSurveyItem(data.id, data.type, data.text);
      container.appendChild(item);
    });
  }
}

export function getStep2Answers() {
  const selectedCheckboxes = document.querySelectorAll(
    ".custom-checkbox-input:checked"
  );
  const surveyAnswers = Array.from(selectedCheckboxes).map(
    (checkbox) => checkbox.id
  );
  const onboardingSurvey = getFromStorage("onboardingSurvey", [])?.[1]?.answers;
  setToStorage(
    "onboardingSurveyAnswers_2",
    surveyAnswers.map((id) => ({
      id,
      type: onboardingSurvey.find((item) => item.id === id)?.type,
    }))
  );
}

function renderCardResult(imageSrc, title, text, color, slug, checked = false) {
  const template = document.createElement("template");
  template.innerHTML = `
    <label lang="de" class="w-checkbox card_result">
      <div class="card_form_img_contain">
        <img sizes="100vw" src="${imageSrc}" loading="lazy" alt="" class="card_select_img">
      </div>
      <input type="checkbox" name="checkout" data-name="checkout" data-value="${slug}" class="w-checkbox-input card_result_checkbox" ${
    checked ? "checked" : ""
  }>
      <span class="card_select_label w-form-label"></span>
      <div class="card_result_content u-vflex-stretch-top u-gap-2">
        <div class="card_result_h_wrap u-hflex-between-top u-gap-4">
          <h4 style="max-width: 210px; hyphens: auto;">${title}</h4>
          <div class="icon_small is-checkmark" style="background-color:${
            checked ? color : DEFAULT_CHECKMARK_COLOR
          }">
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 22 22" fill="none">
              <path d="M9.16667 15.0334L5.5 11.3667L6.78333 10.0834L9.16667 12.4667L15.2167 6.41675L16.5 7.70008L9.16667 15.0334Z" fill="currentColor"></path>
            </svg>
          </div>
        </div>
        <div>${text}</div>
      </div>
    </label>`;
  const element = template.content.firstElementChild;
  const checkbox = element.querySelector(".card_result_checkbox");
  const checkmark = element.querySelector(".icon_small.is-checkmark");
  checkmark.style.backgroundColor = checked ? color : DEFAULT_CHECKMARK_COLOR;
  checkbox.addEventListener("change", function () {
    checkmark.style.backgroundColor = this.checked
      ? color
      : DEFAULT_CHECKMARK_COLOR;
  });
  return element;
}

export function recommendCourses() {
  const answers_1 = getFromStorage("onboardingSurveyAnswers_1", []);
  const answers_2 = getFromStorage("onboardingSurveyAnswers_2", []);
  const courses = getFromStorage("courses", []);
  const allAnswerTypes = [...answers_1, ...answers_2].map((a) => a.type);
  const typeCounts = allAnswerTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  setToStorage("SurveyAnswersCourseTypes", typeCounts);

  const uniqueTypes = Object.keys(typeCounts);
  if (uniqueTypes.length === 1) {
    const selectedType = uniqueTypes[0];
    const additional = {
      STRESS: "FITNESS",
      FITNESS: "NUTRITION",
      NUTRITION: "STRESS",
    }[selectedType];
    if (additional) typeCounts[additional] = 1;
  }

  const recommendedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type]) => type);

  const recommendedCourses = courses
    .filter((c) => recommendedTypes.includes(c.slug))
    .map((c) => c.slug);
  setToStorage("recommendedCourses", recommendedCourses);
  setToStorage("selectedCourses", recommendedCourses);
  return recommendedCourses;
}

export function fillSummaryData() {
  setToStorage("trial", false);
  const takeoverSummary = document.querySelector("#takeoverSummary");
  const selectedHealthProvider = getFromStorage("selectedHealthProvider", "");
  const healthProviders = getFromStorage("healthProviders", {});
  if (takeoverSummary && selectedHealthProvider && healthProviders[selectedHealthProvider])
    takeoverSummary.innerHTML =
      healthProviders[selectedHealthProvider].takeover || "";

  const price = document.querySelector("#price");
  if (price) price.innerHTML = calculateTotalPrice() + CURRENCY;

  const coursesCountElement = document.querySelector(".courses-info-duration");
  const overviewCoursesCountElement = document.querySelector(
    ".course-duration-overview"
  );
  const cc = getFromStorage("selectedCourses", []).length;
  if (coursesCountElement && overviewCoursesCountElement) {
    if (cc === 1) {
      coursesCountElement.innerHTML = "Für 1 Kurs – 12 Monate Zugang";
      overviewCoursesCountElement.innerHTML = "12 Monate Zugang";
    } else if (cc === 2) {
      coursesCountElement.innerHTML = "Für 2 Kurse – 18 Monate Zugang";
      overviewCoursesCountElement.innerHTML = "18 Monate Zugang";
    } else {
      coursesCountElement.innerHTML = "Bitte wählen Sie mindestens 1 Kurs";
      overviewCoursesCountElement.innerHTML = "12 Monate Zugang";
    }
  }

  const subscriptionLengthElement = document.querySelector(
    "#subscriptionLength"
  );
  if (subscriptionLengthElement) {
    subscriptionLengthElement.innerHTML =
      getFromStorage("selectedCourses", []).length === 1 ? "12" : "18";
  }

  const explainerMonthDisplayer = document.querySelector(
    "#explainer-month-displayer"
  );
  if (explainerMonthDisplayer) {
    const selectedCoursesCount = getFromStorage("selectedCourses", []).length;
    explainerMonthDisplayer.textContent = selectedCoursesCount === 2 ? "18" : "12";
  }

  const trialButton = document.querySelector("#button_trial");
  if (trialButton) {
    trialButton.addEventListener("click", () => setToStorage("trial", true));
  }
}

export function populateContraindications() {
  const container = document.querySelector(".dropdown_padding");
  const filteredCourses = getFromStorage("courses", []);
  const selectedCourses = getFromStorage("selectedCourses", []);
  const contraindications = getFromStorage("contraindications", []);
  filteredCourses.forEach((course) => {
    if (selectedCourses.includes(course.slug)) {
      const item = renderContraindicationItem(
        course.slug,
        course.name,
        contraindications.filter((c) => c.course_slug === course.slug)
      );
      container.appendChild(item);
    }
  });
}

function onCourseSelected() {
  const selectedCheckboxes = document.querySelectorAll(
    ".card_result_checkbox:checked"
  );
  const button = getSiblingButtonBySelector(
    "#button_purchase_onb_recommendation",
    "button"
  );
  const coursesSlugs = Array.from(selectedCheckboxes).map((checkbox) =>
    checkbox.getAttribute("data-value")
  );
  setToStorage("selectedCourses", coursesSlugs);
  if (button) {
    const btn = button.querySelector(".g_clickable_btn");
    if (coursesSlugs.length === 0) {
      button.classList.add("disabled");
      if (btn) btn.disabled = true;
    } else {
      button.classList.remove("disabled");
      if (btn) btn.disabled = false;
    }
  }
  fillSummaryData();
}

export function populateSummary() {
  const container = document.querySelector("#summary");
  const recommendedCourses = getFromStorage("recommendedCourses", []);
  const summaryWrap = container.querySelector(".summary_wrap");
  container.innerHTML = "";
  if (summaryWrap) container.appendChild(summaryWrap);

  recommendedCourses
    .slice()
    .reverse()
    .forEach((course) => {
      const courseData = getFromStorage("courses", [])?.find(
        (item) => item.slug === course
      );
      if (courseData) {
        container.prepend(
          renderCardResult(
            courseData.course_cover,
            courseData.name,
            courseData.recommendation_description,
            courseData.course_color,
            courseData.slug,
            true
          )
        );
      }
    });

  container.addEventListener("change", (event) => {
    if (event.target.classList.contains("card_result_checkbox"))
      onCourseSelected();
  });
  onCourseSelected();
}

function renderContraindicationItem(slug, name, contraindications) {
  const template = document.createElement("template");
  template.innerHTML = `
    <div class="dropdown_content">
      <div class="program_name">Programm: ${name}</div>
      <ul role="list" class="program_list">
        ${contraindications
          .map(
            (c) => `<li class="program_list_item">${c.contraindication}</li>`
          )
          .join("")}
      </ul>
    </div>`;
  return template.content.firstElementChild;
}
