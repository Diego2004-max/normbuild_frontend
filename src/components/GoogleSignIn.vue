<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { getGoogleConfig, loginWithGoogle } from '../services/accountApi';
import { accountProfile } from '../services/accountSession';
import { renderGoogleSignInButton } from '../services/googleIdentity';

defineProps<{ compact?: boolean }>();
const emit = defineEmits<{ authenticated: [] }>();
const buttonHost = ref<HTMLElement | null>(null);
const loading = ref(true);
const unavailable = ref(false);
const error = ref('');
let releaseGoogleHandler: (() => void) | null = null;

onMounted(async () => {
  try {
    const { clientId } = await getGoogleConfig();
    if (!clientId) {
      unavailable.value = true;
      return;
    }
    if (!buttonHost.value) throw new Error('No se pudo preparar el acceso con Google.');
    releaseGoogleHandler = await renderGoogleSignInButton(buttonHost.value, clientId, async (credential) => {
      error.value = '';
      try {
        accountProfile.value = await loginWithGoogle(credential);
        emit('authenticated');
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : 'No se pudo acceder con Google.';
      }
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el acceso con Google.';
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => releaseGoogleHandler?.());
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
