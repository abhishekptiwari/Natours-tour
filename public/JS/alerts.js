/* eslint-disable */
export const hideAlerts = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

// type: 'success' or 'error'
export const showAlert = (type, msg) => {
  hideAlerts();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(hideAlerts, 5000);
};
