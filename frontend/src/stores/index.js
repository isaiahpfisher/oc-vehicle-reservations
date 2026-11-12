import { createPinia, setActivePinia } from "pinia";

/**
 * The app's single Pinia instance; `main.js` installs it.
 * It is also made active right away because stores are used outside components too
 * (router guards, the axios client), where Pinia can't find it through the app.
 */
const pinia = createPinia();
setActivePinia(pinia);

export default pinia;
