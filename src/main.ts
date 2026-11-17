import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHistory } from 'vue-router';
import NormBuildAssistant from './components/NormBuildAssistant.vue';
import AccountPage from './components/AccountPage.vue';
import './styles.css';

document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: NormBuildAssistant },
    { path: '/cuenta', component: AccountPage },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

createApp(App).use(router).mount('#app');
