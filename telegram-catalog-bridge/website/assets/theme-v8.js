(() => {
  'use strict';
  let preference = 'auto';
  try { const value = localStorage.getItem('catalog-theme'); if (['auto','light','dark'].includes(value)) preference = value; } catch (_) {}
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function apply() {
    const light = preference === 'light' || (preference === 'auto' && media && media.matches);
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    const color = document.querySelector('meta[name="theme-color"]'); if (color) color.content = light ? '#fff9f1' : '#18140f';
  }
  apply();
  if (media && media.addEventListener) media.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('theme-choice'); if (!select) return;
    select.value = preference; select.addEventListener('change', () => { preference = select.value; try { localStorage.setItem('catalog-theme', preference); } catch (_) {} apply(); });
  });
})();
