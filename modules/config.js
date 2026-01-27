export const dictionary = {
  "error.namePrefix": "Bitte wähle deine Anrede aus",
  "error.firstName": "Bitte gib deinen Vornamen ein",
  "error.lastName": "Bitte gib deinen Nachnamen ein",
  "error.dateOfBirth": "Bitte gib dein Geburtsdatum ein",
  "error.email": "Bitte gib deine E-Mail-Adresse ein",
  "error.emailInvalid": "Bitte gib eine gültige E-Mail-Adresse ein",
  "error.password": "Bitte gib ein Passwort ein",
  "error.passwordLength": "Dein Passwort muss mindestens 6 Zeichen lang sein",
  "error.ageRestriction": "Du musst mindestens 18 Jahre alt sein",
  "error.termsAndConditions": "Bitte stimme den Nutzungsbedingungen zu",
  "error.privacyPolicy": "Bitte stimme den AGB zu",
  "error.requiredFields": "Bitte fülle alle erforderlichen Felder aus",
  "error.healthProvider": "Bitte wähle deine Krankenkasse aus",
  "error.selectOptions": "Bitte wähle mehr als eine Option aus",
  "error.tooManyOptions": "Du kannst maximal 2 Programme auswählen",
  "error.selectPrograms": "Bitte wähle mindestens ein Programm aus",
  "error.agreeToTerms": "Bitte stimme beiden Bedingungen zu",
  "select.healthProvider": "Bitte wähle deine Krankenkasse",
  "payment.processing": "Wird bearbeitet ...",
  "payment.payNow": "Jetzt bezahlen",
  "payment.discount": "Rabatt",
  "button.next": "Weiter",
  "button.back": "Zurück",
  "button.submit": "Absenden",
  "error.payment": "Es ist ein Zahlungsfehler aufgetreten",
  "error.paymentIncomplete":
    "Die Zahlung konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
  "error.invoice": "Die Rechnung konnte nicht erstellt werden",
  "error.userCreation": "Fehler beim Erstellen deines Benutzerkontos",
  "error.validation": "Bitte überprüfe deine Eingaben",
  "success.registration": "Registrierung erfolgreich",
  "success.payment": "Zahlung erfolgreich",
  "success.invoice": "Rechnung wurde erstellt und per E-Mail versandt",
  "success.sepaProcessing":
    "Ihre SEPA-Zahlung wird verarbeitet. Sie erhalten eine Bestätigung per E-Mail.",
  "button.closePayment": "Zahlungsfenster schließen",
  "error.userExistsNoLocal":
    "Dieser Benutzer existiert bereits. Bitte beende die Einrichtung in der mobilen App",
};

export const PUBLISHABLE_KEY =
  "pk_live_51QPhSmIjMlCwpKLp1WUFFigtGme2DlhNm5Q92hVgaOXZ9LykdGitlL5TV4PyaMjO2rJcG2T22G5bdCYCis5KwnQs00AcDCV5VD";

export const API = "https://europe-west3-preneo-production.cloudfunctions.net/webflowAPI";
export const API_URL = API;
export const CURRENCY = "€";
export const DEFAULT_CHECKMARK_COLOR = "#E5E7EB";
export const PAYMENT_MODAL_HEIGHT = 720;

export function isEmailAlreadyInUse(resp) {
  const msg = `${resp?.message || ""} ${resp?.error || ""}`.toLowerCase();
  return (
    msg.includes("already in use") || msg.includes("auth/email-already-in-use")
  );
}
