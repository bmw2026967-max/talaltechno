/* ==========================================================================
   طلال تكنو — PWA registration & offline helpers
   ========================================================================== */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(window.location.protocol)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
      if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
      reg.addEventListener('updatefound', function () {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', function () {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('talaltechno:update-ready'));
          }
        });
      });
    }).catch(function (err) {
      console.warn('Service worker registration failed', err);
    });
  });

  window.addEventListener('offline', function () {
    if (window.UI && UI.toast) UI.toast('أنت غير متصل — يستمر العمل محلياً وستُزامن البيانات لاحقاً', 'warning', 'وضع عدم الاتصال');
  });
  window.addEventListener('online', function () {
    if (window.UI && UI.toast) UI.toast('عاد الاتصال — يمكنك مزامنة البيانات الآن', 'success', 'متصل');
  });
})();
