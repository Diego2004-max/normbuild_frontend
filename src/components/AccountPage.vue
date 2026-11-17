<script setup lang="ts">
import { useRouter } from 'vue-router';
import AccountPanel from './AccountPanel.vue';
import GoogleSignIn from './GoogleSignIn.vue';
import { accountProfile, restoredDraft, sessionReady } from '../services/accountSession';

const router = useRouter();

const restore = (jurisdiction: string, description: string) => {
  restoredDraft.value = { jurisdiction, description };
  router.push('/');
};
</script>

<template>
  <main class="min-h-screen bg-civic-mist px-4 py-8 text-civic-ink dark:bg-slate-950 dark:text-slate-100 sm:px-6">
    <div class="mx-auto max-w-3xl">
      <RouterLink to="/" class="text-sm font-semibold text-civic-blue underline dark:text-sky-300">← Volver al asistente</RouterLink>
      <header class="mt-8 mb-6">
        <p class="text-sm font-semibold uppercase tracking-wide text-civic-green">NormBuild</p>
        <h1 class="mt-2 text-3xl font-bold">{{ accountProfile ? 'Mi cuenta' : 'Accede a tu cuenta' }}</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Guarda tus revisiones normativas y consulta tu historial privado.</p>
      </header>
      <p v-if="!sessionReady" class="rounded-xl bg-white p-6 text-sm shadow-sm dark:bg-slate-900" role="status">Comprobando tu sesión...</p>
      <template v-else>
        <AccountPanel @restore="restore" />
        <GoogleSignIn v-if="!accountProfile" class="mt-5" />
      </template>
    </div>
  </main>
</template>
