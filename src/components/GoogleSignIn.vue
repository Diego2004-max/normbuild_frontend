<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getGoogleConfig, loginWithGoogle } from '../services/accountApi';
import { accountProfile } from '../services/accountSession';

defineProps<{ compact?: boolean }>();
const emit = defineEmits<{ authenticated: [] }>();

interface GoogleIdentityClient {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, options: { theme: string; size: string; text: string; locale: string; width: number }): void;
}

declare global {
  interface Window { google?: { accounts: { id: GoogleIdentityClient } } }
}

const buttonHost = ref<HTMLElement | null>(null);
const loading = ref(true);
const unavailable = ref(false);
const error = ref('');

const loadGoogleScript = async () => {
  if (window.google) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el acceso con Google.'));
    document.head.appendChild(script);
  });
};

onMounted(async () => {
  try {
    const { clientId } = await getGoogleConfig();
    if (!clientId) {
      unavailable.value = true;
      return;
    }
    await loadGoogleScript();
    if (!window.google || !buttonHost.value) throw new Error('Google no respondió. Intenta nuevamente.');
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        error.value = '';
        try {
          accountProfile.value = await loginWithGoogle(credential);
          emit('authenticated');
        } catch (cause) {
          error.value = cause instanceof Error ? cause.message : 'No se pudo acceder con Google.';
        }
      },
    });
    window.google.accounts.id.renderButton(buttonHost.value, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      locale: 'es',
      width: Math.min(buttonHost.value.clientWidth, 360),
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el acceso con Google.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section :class="compact ? '' : 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900'" aria-label="Acceso con Google">
    <h2 v-if="!compact" class="text-base font-bold">Continuar con Google</h2>
    <p v-if="!compact" class="mt-1 text-sm text-slate-600 dark:text-slate-300">Usa tu cuenta de Google para crear una cuenta NormBuild o entrar.</p>
    <p v-if="loading" class="mt-4 text-sm" role="status">Cargando acceso con Google...</p>
    <p v-if="unavailable" class="mt-4 text-sm text-amber-800 dark:text-amber-200" role="status">El acceso con Google estará disponible cuando se configure el servicio.</p>
    <div ref="buttonHost" :class="['flex min-h-10 justify-center', compact ? '' : 'mt-4']" />
    <p v-if="error" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100" role="alert">{{ error }}</p>
  </section>
</template>
