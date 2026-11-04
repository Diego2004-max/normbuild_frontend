import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');

createApp(App).mount('#app');
