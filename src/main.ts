import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHistory } from 'vue-router';
import NormBuildAssistant from './components/NormBuildAssistant.vue';
import AccountPage from './components/AccountPage.vue';
import LoginPage from './components/LoginPage.vue';
import { accountProfile, initializeAccountSession } from './services/accountSession';
import { resolveAccountNavigation } from './services/accountNavigation';
import './styles.css';

document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: NormBuildAssistant, meta: { requiresAccount: true } },
    { path: '/acceder', component: LoginPage },
    { path: '/cuenta', component: AccountPage, meta: { requiresAccount: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (target) => {
  if (target.path === '/acceder') {
    void initializeAccountSession().catch(() => undefined);
    return true;
  }
  await initializeAccountSession();
  return resolveAccountNavigation(target.path, Boolean(target.meta.requiresAccount), Boolean(accountProfile.value));
});

createApp(App).use(router).mount('#app');
