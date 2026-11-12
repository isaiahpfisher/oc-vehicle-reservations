import { createApp } from "vue";
import App from "./App.vue";
import router from "./router.js";
import pinia from "./stores/index.js";
import vuetify from "./plugins/vuetify.js";

createApp(App).use(pinia).use(vuetify).use(router).mount("#app");
