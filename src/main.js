import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router/index.js";
import { Quasar, Notify } from "quasar";
import { registerSW } from "virtual:pwa-register";
import notify from "./helpers/notify.js";
import "./css/app.scss";

// Import icon libraries
import "@quasar/extras/material-icons/material-icons.css";
import "@quasar/extras/material-icons-outlined/material-icons-outlined.css";

// Import Quasar css
import "quasar/src/css/index.sass";

// Assumes your root component is App.vue
// and placed in same folder as main.js
import App from "./App.vue";

const pinia = createPinia();
const myApp = createApp(App);

myApp.use(pinia);
myApp.use(router);

myApp.use(Quasar, {
  plugins: {
    Notify,
  },
  config: {
    notify: {
      position: "bottom",
      timeout: 5000,
    },
  },
});

registerSW({
  onNeedRefresh() {
    // Show a toast or banner here to notify the user and provide a refresh button
    // console.log("New content available, please refresh.");
    notify({
      type: "positive",
      message: "New content available, please refresh.",
    });
  },
  onOfflineReady() {
    // console.log("Application ready to work offline.");
    notify({
      type: "positive",
      message: "Application ready to work offline.",
    });
  },
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      if (import.meta.env.DEV)
        console.log("FCM Service Worker registered:", registration);

      // Optional: Pass the registration to getToken options if using newer SDK
    })
    .catch((error) => {
      if (import.meta.env.DEV)
        console.error("FCM Service Worker registration failed:", error);
    });
}

// Assumes you have a <div id="app"></div> in your index.html
myApp.mount("#app");
