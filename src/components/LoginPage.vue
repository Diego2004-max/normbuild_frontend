<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import GoogleSignIn from './GoogleSignIn.vue';
import { loginAccount, registerAccount } from '../services/accountApi';
import { accountProfile } from '../services/accountSession';

const router = useRouter();
const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const pending = ref(false);
const error = ref('');
const title = computed(() => mode.value === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta');

const submit = async () => {
  error.value = '';
  pending.value = true;
  try {
    accountProfile.value = mode.value === 'login'
      ? await loginAccount(email.value, password.value)
      : await registerAccount(email.value, password.value);
    password.value = '';
    await router.replace('/');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible acceder a NormBuild.';
  } finally {
    pending.value = false;
  }
};

const changeMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  password.value = '';
  error.value = '';
};

const finishGoogleLogin = () => router.replace('/');
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-slate-950 text-white">
    <img src="/images/normbuild-login-city.png" alt="Panorama urbano colombiano con edificaciones y cartografía" class="absolute inset-0 h-full w-full object-cover object-center" />
    <div class="absolute inset-0 bg-gradient-to-r from-slate-950/35 via-slate-950/55 to-slate-950/90" />
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(16,185,129,0.16),transparent_35%)]" />

    <section class="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_440px] lg:px-10">
      <div class="hidden max-w-xl lg:block">
        <div class="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200 backdrop-blur">
          <span class="h-2 w-2 rounded-full bg-emerald-300" /> Inteligencia normativa urbana
        </div>
        <h1 class="mt-7 text-5xl font-black leading-[1.08] tracking-tight">Construye con claridad.<br /><span class="text-emerald-300">Decide con evidencia.</span></h1>
        <p class="mt-5 max-w-lg text-base leading-7 text-slate-200">Consulta normas urbanísticas, calcula los índices de tu propuesta y conserva un historial privado de cada revisión.</p>
        <div class="mt-9 grid grid-cols-3 gap-3 text-sm">
          <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><strong class="block text-xl text-white">Fuentes</strong><span class="text-slate-300">oficiales y trazables</span></div>
          <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><strong class="block text-xl text-white">IA</strong><span class="text-slate-300">con contexto normativo</span></div>
          <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><strong class="block text-xl text-white">Privado</strong><span class="text-slate-300">historial por cuenta</span></div>
        </div>
      </div>

      <div class="w-full rounded-[28px] border border-white/20 bg-slate-950/75 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <div class="flex items-center gap-3">
          <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-xl font-black text-slate-950">N</span>
          <div><p class="font-black tracking-[0.2em]">NORMBUILD</p><p class="text-xs text-slate-400">Asistente de normativa urbanística</p></div>
        </div>
        <div class="mt-8">
          <p class="text-sm font-semibold text-emerald-300">{{ mode === 'login' ? 'Acceso seguro' : 'Registro ciudadano' }}</p>
          <h2 class="mt-1 text-3xl font-bold">{{ title }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">{{ mode === 'login' ? 'Ingresa para continuar con tus consultas.' : 'Crea tu espacio privado para guardar revisiones.' }}</p>
        </div>

        <form class="mt-7 space-y-4" @submit.prevent="submit">
          <label class="block text-sm font-semibold" for="loginEmail">Correo electrónico</label>
          <input id="loginEmail" v-model.trim="email" type="email" autocomplete="email" maxlength="320" required placeholder="nombre@correo.com" class="min-h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20" />
          <label class="block text-sm font-semibold" for="loginPassword">Contraseña</label>
          <div class="relative">
            <input id="loginPassword" v-model="password" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" minlength="12" maxlength="72" required placeholder="Mínimo 12 caracteres" class="min-h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 pr-20 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20" />
            <button type="button" class="absolute inset-y-0 right-3 text-xs font-semibold text-slate-300 hover:text-white" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
          </div>
          <p v-if="mode === 'register'" class="text-xs leading-5 text-slate-400">Usa al menos 12 caracteres. Tu contraseña se protege con un hash seguro.</p>
          <p v-if="error" class="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100" role="alert">{{ error }}</p>
          <button type="submit" :disabled="pending" class="min-h-12 w-full rounded-xl bg-emerald-400 px-5 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60">{{ pending ? 'Procesando...' : mode === 'login' ? 'Ingresar a NormBuild' : 'Crear cuenta' }}</button>
        </form>

        <div class="my-6 flex items-center gap-3 text-xs text-slate-500"><span class="h-px flex-1 bg-white/15" /><span>o continúa con</span><span class="h-px flex-1 bg-white/15" /></div>
        <GoogleSignIn compact @authenticated="finishGoogleLogin" />

        <p class="mt-7 text-center text-sm text-slate-300">{{ mode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?' }}
          <button type="button" class="ml-1 font-bold text-emerald-300 underline underline-offset-4" @click="changeMode">{{ mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión' }}</button>
        </p>
        <p class="mt-6 text-center text-[11px] leading-5 text-slate-500">NormBuild ofrece orientación preliminar. La aplicación de la norma debe confirmarse con la autoridad competente.</p>
      </div>
    </section>
  </main>
</template>
