(() => {
  "use strict";

  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  document.documentElement.dataset.appReady = "true";
})();
