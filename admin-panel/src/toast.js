export function showToast(message, type = 'error') {
  window.dispatchEvent(new CustomEvent('admin-toast', { detail: { message, type } }));
}

export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || error?.response?.data?.errors?.message || error?.message || fallback;
}
