export function cleanTrackingUrl() {
  const url = new URL(window.location.href);
  const query = url.search.slice(1);
  if (!query) return;

  const fields = query.split('&');
  const kept = fields.filter(field => {
    // Decode the name for matching while keeping the original field for serialization.
    const name = new URLSearchParams('&' + field).keys().next().value?.toLowerCase();
    return !name?.startsWith('utm_') && name !== 'fbclid' && name !== 'gclid' && name !== 'msclkid';
  });

  if (kept.length === fields.length) return;
  url.search = kept.some(Boolean) ? kept.join('&') : '';
  window.history.replaceState(window.history.state, '', url.href);
}
