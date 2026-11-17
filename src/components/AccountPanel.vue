<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  deleteHistoryItem, fetchHistory, loginAccount, logoutAccount, registerAccount,
} from '../services/accountApi';
import type { QueryHistoryItem } from '../services/accountApi';
import { accountProfile } from '../services/accountSession';

const emit = defineEmits<{
  restore: [jurisdiction: string, description: string];
}>();

const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const pending = ref(false);
const error = ref('');
const history = ref<QueryHistoryItem[]>([]);
const expanded = ref<string | null>(null);

const loadHistory = async () => {
  if (!accountProfile.value) return;
  try {
    history.value = await fetchHistory();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el historial.';
  }
};

watch(accountProfile, loadHistory, { immediate: true });

const submit = async () => {
  error.value = '';
  pending.value = true;
  try {
    const profile = mode.value === 'register'
      ? await registerAccount(email.value, password.value)
      : await loginAccount(email.value, password.value);
    password.value = '';
    accountProfile.value = profile;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo acceder a la cuenta.';
  } finally {
    pending.value = false;
  }
};

const signOut = async () => {
  error.value = '';
  pending.value = true;
  try {
    await logoutAccount();
    accountProfile.value = null;
    history.value = [];
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.';
  } finally {
    pending.value = false;
  }
};

const removeItem = async (id: string) => {
  error.value = '';
  try {
    await deleteHistoryItem(id);
    history.value = history.value.filter((item) => item.id !== id);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo borrar la consulta.';
  }
};
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Cuenta e historial">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold">Tu espacio de consultas</h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Consulta sin cuenta o inicia sesión para guardar tu historial privado.</p>
      </div>
      <span v-if="accountProfile" class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
        {{ accountProfile.role === 'ADMIN' ? 'Administrador' : 'Ciudadano' }}
      </span>
    </div>

    <form v-if="!accountProfile" class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" @submit.prevent="submit">
      <label class="text-sm font-medium">Correo electrónico
        <input v-model="email" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" type="email" autocomplete="email" maxlength="320" required />
      </label>
      <label class="text-sm font-medium">Contraseña
        <input v-model="password" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" minlength="12" maxlength="72" required />
      </label>
      <button class="min-h-10 rounded-lg bg-civic-blue px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit" :disabled="pending">
        {{ pending ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta' }}
      </button>
      <button class="text-left text-sm font-semibold text-civic-blue underline sm:col-span-3 dark:text-sky-300" type="button" @click="mode = mode === 'login' ? 'register' : 'login'; error = ''">
        {{ mode === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta' }}
      </button>
    </form>

    <div v-else class="mt-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="break-all text-sm">{{ accountProfile.email }}</p>
        <button class="text-sm font-semibold text-civic-blue underline dark:text-sky-300" type="button" :disabled="pending" @click="signOut">Cerrar sesión</button>
      </div>
      <h3 class="mt-5 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Consultas guardadas</h3>
      <p v-if="history.length === 0" class="mt-2 text-sm text-slate-500">Aún no hay consultas guardadas.</p>
      <ol v-else class="mt-3 grid gap-2 sm:grid-cols-2">
        <li v-for="item in history" :key="item.id" class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p class="text-sm font-semibold">{{ item.jurisdiction }} · {{ new Date(item.createdAt).toLocaleDateString('es-CO') }}</p>
          <p class="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{{ item.projectDescription }}</p>
          <div class="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
            <button class="text-civic-blue underline dark:text-sky-300" type="button" @click="expanded = expanded === item.id ? null : item.id">{{ expanded === item.id ? 'Ocultar' : 'Ver respuesta' }}</button>
            <button class="text-civic-blue underline dark:text-sky-300" type="button" @click="emit('restore', item.jurisdiction, item.projectDescription)">Volver a consultar</button>
            <button class="text-red-700 underline dark:text-red-300" type="button" @click="removeItem(item.id)">Eliminar</button>
          </div>
          <p v-if="expanded === item.id" class="mt-3 whitespace-pre-line text-sm leading-6">{{ item.answer }}</p>
        </li>
      </ol>
    </div>
    <p v-if="error" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100" role="alert">{{ error }}</p>
  </section>
</template>
