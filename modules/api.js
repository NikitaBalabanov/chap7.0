import { API } from './config.js';

export function getDocumentFromFireBase(document) {
  return `${API}/getConfigData?document=${document}`;
}

export function getNamePrefixes() {
  return `${API}/getConfigData?document=namePrefixes`;
}

export function getCreateUserBaseUrl() {
  return `${API}/createUser`;
}

export function getWebflowStory(slug) {
  return `${API}/getWebflowStory?slug=${slug}&draft=true`;
}

export function getVerifyEmailUrl() {
  return `${API}/verify-email`;
}

export function getIsEmailVerifiedUrl(userId) {
  return `${API}/is-email-verified?userId=${encodeURIComponent(userId)}`;
}

export function getHealthProviderKeysUrl() {
  return `${API}/getConfigData?document=healthInsuranceProviders&view=keys`;
}
