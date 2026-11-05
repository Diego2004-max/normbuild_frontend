<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchJurisdictionCoverage, importOfficialSource, requestComplianceChecklist, searchOfficialSources } from '../services/regulationApi';
import type { JurisdictionCoverage, OfficialSourceCandidate } from '../services/regulationApi';
import type {
  ComplianceChecklistResponse,
  WorkerValidationIssue,
  WorkerValidationResult,
} from '../types/regulation';

const jurisdiction = ref('Bogotá D.C.');
const projectDescription = ref('');
const isDarkMode = ref(false);
const isValidating = ref(false);
const isSubmitting = ref(false);
const answer = ref<ComplianceChecklistResponse | null>(null);
const validationIssues = ref<WorkerValidationIssue[]>([]);
const formattedDescription = ref('');
const wordCount = ref(0);
const requestError = ref('');
const coverage = ref<JurisdictionCoverage[]>([]);
const coverageLoadError = ref(false);
const elapsedSeconds = ref(0);
const expandedSources = ref<Record<string, boolean>>({});
const sourceSearchOpen = ref(false);
const sourceSearchMunicipality = ref('');
const sourceSearchResults = ref<OfficialSourceCandidate[]>([]);
const sourceSearchCompletedFor = ref('');
const sourceSearchPending = ref(false);
const sourceSearchError = ref('');
const sourceImportCandidate = ref<OfficialSourceCandidate | null>(null);
const sourceImportKey = ref('');
const sourceImportCode = ref('');
const sourceImportConfirmed = ref(false);
const sourceImportPending = ref(false);
const sourceImportError = ref('');
const sourceImportSuccess = ref('');
const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const indexFormatter = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const areaLabel = (value: number | null) => value === null ? 'No indicada' : `${numberFormatter.format(value)} m²`;
const projectMetrics = computed(() => {
  const analysis = answer.value?.projectAnalysis;
  if (!analysis) return [];
  return [
    { label: 'Área del lote', value: areaLabel(analysis.lotAreaSquareMeters) },
    { label: 'Ocupación en primer piso', value: areaLabel(analysis.occupiedAreaSquareMeters) },
    { label: 'Área construida total', value: areaLabel(analysis.totalBuiltAreaSquareMeters) },
    { label: 'Área sin ocupar en planta', value: areaLabel(analysis.unoccupiedAreaSquareMeters) },
    {
      label: 'Índice de ocupación propuesto',
      value: analysis.occupancyIndex === null ? 'Datos insuficientes' : `${indexFormatter.format(analysis.occupancyIndex)} (${numberFormatter.format(analysis.occupancyIndex * 100)} %)`,
      formula: analysis.occupancyIndex === null ? '' : `${numberFormatter.format(analysis.occupiedAreaSquareMeters!)} / ${numberFormatter.format(analysis.lotAreaSquareMeters!)}`,
    },
    {
      label: 'Índice de construcción propuesto',
      value: analysis.constructionIndex === null ? 'Datos insuficientes' : indexFormatter.format(analysis.constructionIndex),
      formula: analysis.constructionIndex === null ? '' : `${numberFormatter.format(analysis.totalBuiltAreaSquareMeters!)} / ${numberFormatter.format(analysis.lotAreaSquareMeters!)}`,
    },
  ];
});
const selectedCoverage = computed(() => coverage.value.find(
  (item) => item.jurisdiction.toLocaleLowerCase('es-CO') === jurisdiction.value.trim().toLocaleLowerCase('es-CO'),
));
const municipalCoverage = computed(() => coverage.value.filter((item) => item.jurisdiction !== 'Colombia'));
const nationalCoverage = computed(() => coverage.value.find((item) => item.jurisdiction === 'Colombia'));
const sourcePreview = (content: string) => {
  if (content.length <= 360) return content;
  const firstSentence = content.match(/^.*?[.!?](?:\s|$)/s)?.[0];
  if (firstSentence && firstSentence.length <= 360) return firstSentence.trim();
  const prefix = content.slice(0, 360);
  return `${prefix.slice(0, prefix.lastIndexOf(' ')).trim()}...`;
};

const validationWorker = new Worker(new URL('../workers/regulationWorker.ts', import.meta.url), {
  type: 'module',
});

const hasValidationErrors = computed(() => validationIssues.value.length > 0);
const canSubmit = computed(
  () =>
    !isValidating.value &&
    !isSubmitting.value &&
    !hasValidationErrors.value &&
    formattedDescription.value.length > 0,
);
const statusLabel = computed(() => {
  if (isSubmitting.value) {
    return 'Consultando normativa oficial';
  }
  if (isValidating.value) {
    return 'Validando descripción';
  }
  return 'Listo para consultar';
});
const riskBadgeClass = computed(() => {
  if (!answer.value || answer.value.riskLevel === 'Por verificar') {
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
  if (answer.value.riskLevel === 'Bajo') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100';
  }
  if (answer.value.riskLevel === 'Medio') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100';
  }
  return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100';
});

const findMunicipalSources = async () => {
  sourceSearchError.value = '';
  sourceSearchResults.value = [];
  sourceSearchCompletedFor.value = '';
  const municipality = sourceSearchMunicipality.value.trim();
  if (municipality.length < 3) {
    sourceSearchError.value = 'Escribe el nombre de un municipio colombiano.';
    return;
  }
  sourceSearchPending.value = true;
  try {
    const response = await searchOfficialSources(municipality);
    sourceSearchResults.value = response.candidates;
    sourceSearchCompletedFor.value = response.municipality;
  } catch (error) {
    sourceSearchError.value = error instanceof Error
      ? error.message
      : 'No fue posible buscar fuentes oficiales. Intenta nuevamente.';
  } finally {
    sourceSearchPending.value = false;
  }
};

const selectDiscoveredMunicipality = () => {
  if (!sourceSearchCompletedFor.value) return;
  jurisdiction.value = sourceSearchCompletedFor.value;
  sourceSearchOpen.value = false;
};

const prepareSourceImport = (candidate: OfficialSourceCandidate) => {
  sourceImportCandidate.value = candidate;
  sourceImportCode.value = '';
  sourceImportConfirmed.value = false;
  sourceImportError.value = '';
  sourceImportSuccess.value = '';
};

const importReviewedSource = async () => {
  const candidate = sourceImportCandidate.value;
  if (!candidate || !sourceSearchCompletedFor.value || !sourceImportKey.value || !sourceImportConfirmed.value) return;
  sourceImportPending.value = true;
  sourceImportError.value = '';
  sourceImportSuccess.value = '';
  try {
    const result = await importOfficialSource(
      sourceSearchCompletedFor.value, candidate, sourceImportCode.value.trim(), sourceImportKey.value,
    );
    sourceImportSuccess.value = `Documento incorporado: ${result.indexedChunks} secciones indexadas. Ya puedes consultar esta jurisdicción.`;
    sourceImportKey.value = '';
    jurisdiction.value = sourceSearchCompletedFor.value;
    try {
      coverage.value = await fetchJurisdictionCoverage();
    } catch {
      coverageLoadError.value = true;
    }
  } catch (error) {
    sourceImportError.value = error instanceof Error
      ? error.message
      : 'No fue posible incorporar la fuente. Verifica la clave, el documento o página oficial y la conexión.';
  } finally {
    sourceImportPending.value = false;
    sourceImportKey.value = '';
  }
};

let validationTimer: number | undefined;
let submissionTimer: number | undefined;

const runValidation = () => {
  window.clearTimeout(validationTimer);
  isValidating.value = true;
  validationTimer = window.setTimeout(() => {
    validationWorker.postMessage({
      jurisdiction: jurisdiction.value,
      projectDescription: projectDescription.value,
    });
  }, 120);
};

validationWorker.onmessage = (event: MessageEvent<WorkerValidationResult>) => {
  formattedDescription.value = event.data.formattedDescription;
  wordCount.value = event.data.wordCount;
  validationIssues.value = event.data.issues;
  isValidating.value = false;
};

watch([jurisdiction, projectDescription], runValidation, { immediate: true });

onMounted(async () => {
  try {
    coverage.value = await fetchJurisdictionCoverage();
  } catch {
    coverageLoadError.value = true;
  }
});

watch(isDarkMode, (enabled) => {
  document.documentElement.classList.toggle('dark', enabled);
  document.documentElement.classList.toggle('light', !enabled);
});

const submitQuery = async () => {
  requestError.value = '';
  answer.value = null;
  expandedSources.value = {};
  if (!canSubmit.value) {
    return;
  }
  isSubmitting.value = true;
  elapsedSeconds.value = 0;
  const startedAt = Date.now();
  submissionTimer = window.setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
  }, 1000);
  try {
    answer.value = await requestComplianceChecklist({
      jurisdiction: jurisdiction.value.trim(),
      projectDescription: formattedDescription.value,
    }, (progress) => {
      answer.value = progress;
    });
  } catch (error) {
    requestError.value =
      error instanceof Error
        ? error.message
        : 'No fue posible consultar la normativa en este momento.';
  } finally {
    window.clearInterval(submissionTimer);
    isSubmitting.value = false;
  }
};

onBeforeUnmount(() => {
  window.clearTimeout(validationTimer);
  window.clearInterval(submissionTimer);
  validationWorker.terminate();
});
</script>

<template>
  <main class="min-h-screen bg-civic-mist text-civic-ink transition-colors dark:bg-slate-950 dark:text-slate-100">
    <section class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header class="flex flex-col gap-4 border-b border-white/70 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-civic-green dark:text-emerald-300">NormBuild</p>
          <h1 class="mt-1 text-3xl font-bold text-civic-ink dark:text-white">Asistente de normativa urbanística</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Consulta requisitos oficiales con contexto normativo trazable y procesamiento asíncrono.
          </p>
        </div>
        <label class="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <span>Modo oscuro</span>
          <input v-model="isDarkMode" class="h-5 w-5 accent-civic-blue" type="checkbox" />
        </label>
      </header>

      <div class="grid flex-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section class="rounded-md bg-white p-5 shadow-panel dark:bg-slate-900">
          <div class="mb-5 flex items-center justify-between gap-3">
            <h2 class="text-xl font-semibold">Consulta del proyecto</h2>
            <span class="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {{ statusLabel }}
            </span>
          </div>

          <form class="space-y-5" @submit.prevent="submitQuery">
            <div>
              <label class="mb-2 block text-sm font-semibold" for="jurisdiction">Jurisdicción</label>
              <input
                id="jurisdiction"
                v-model="jurisdiction"
                class="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-civic-blue focus:ring-2 focus:ring-civic-blue/20 dark:border-slate-700 dark:bg-slate-950"
                placeholder="Ej. Bogotá D.C."
                list="jurisdiction-options"
                type="text"
              />
              <datalist id="jurisdiction-options">
                <option v-for="item in municipalCoverage" :key="item.jurisdiction" :value="item.jurisdiction" />
              </datalist>
              <p v-if="selectedCoverage?.status === 'AVAILABLE'" class="mt-2 text-xs text-emerald-700 dark:text-emerald-300" role="status">
                {{ selectedCoverage.officialSources }} fuentes locales indexadas · {{ selectedCoverage.indexedSections }} secciones. {{ nationalCoverage?.officialSources ?? 0 }} fuentes nacionales disponibles.
              </p>
              <p v-else-if="selectedCoverage?.status === 'NO_OFFICIAL_SOURCE'" class="mt-2 text-xs text-amber-800 dark:text-amber-200" role="status">
                Aún no hay fuentes locales indexadas. Al consultar, la IA buscará extractos oficiales recientes para esta ciudad; su vigencia y aplicación al predio deben verificarse. La descripción del proyecto no se envía al buscador externo.
              </p>
              <p v-else-if="nationalCoverage?.officialSources" class="mt-2 text-xs text-slate-600 dark:text-slate-300" role="status">
                No hay cobertura local confirmada para este municipio. Al consultar, la IA buscará extractos oficiales recientes; la búsqueda externa solo recibe el nombre de la ciudad y términos generales.
              </p>
              <p v-else-if="coverageLoadError" class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                No se pudo cargar el estado documental. Puedes consultar cuando el backend esté disponible.
              </p>
              <div class="mt-4 overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 shadow-sm dark:border-indigo-900/70 dark:from-indigo-950/50 dark:via-slate-900 dark:to-cyan-950/40">
                <div class="flex items-start gap-3 p-4">
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" aria-hidden="true">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2M8 10.8h5.6M10.8 8v5.6"/></svg>
                  </span>
                  <div class="min-w-0 flex-1">
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">¿Tu municipio no aparece?</h3>
                    <p class="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Busca documentos de ordenamiento publicados en sitios oficiales colombianos.</p>
                    <button class="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" type="button" :aria-expanded="sourceSearchOpen" @click="sourceSearchOpen = !sourceSearchOpen">
                      {{ sourceSearchOpen ? 'Cerrar búsqueda' : 'Buscar fuentes oficiales' }}
                    </button>
                  </div>
                </div>
                <div v-if="sourceSearchOpen" class="border-t border-indigo-100 bg-white/80 p-4 dark:border-indigo-900/70 dark:bg-slate-950/40">
                  <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="findMunicipalSources">
                    <label class="sr-only" for="sourceMunicipality">Municipio colombiano</label>
                    <input id="sourceMunicipality" v-model="sourceSearchMunicipality" class="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900" maxlength="100" placeholder="Ej. Manizales, Neiva o Popayán" type="text" />
                    <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400" type="submit" :disabled="sourceSearchPending || sourceSearchMunicipality.trim().length < 3">
                      <svg v-if="sourceSearchPending" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z"/></svg>
                      {{ sourceSearchPending ? 'Buscando...' : 'Buscar' }}
                    </button>
                  </form>
                  <p v-if="sourceSearchError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200" role="alert">{{ sourceSearchError }}</p>
                  <p v-if="sourceSearchCompletedFor && sourceSearchResults.length === 0" class="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-900 dark:text-slate-300" role="status">No encontramos resultados que cumplan los criterios de búsqueda oficial. Prueba con el nombre completo del municipio.</p>
                  <div v-if="sourceSearchResults.length" class="mt-4 space-y-3" aria-live="polite">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resultados para {{ sourceSearchCompletedFor }}</p>
                      <button class="min-h-9 rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-950" type="button" @click="selectDiscoveredMunicipality">Usar este municipio</button>
                    </div>
                    <article v-for="candidate in sourceSearchResults" :key="candidate.url" class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <h4 class="text-sm font-semibold leading-5 text-slate-900 dark:text-white">{{ candidate.title }}</h4>
                          <p class="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">{{ candidate.issuingHost }} · sitio oficial HTTPS</p>
                        </div>
                        <span class="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">Por revisar</span>
                      </div>
                      <p class="mt-2 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{{ candidate.summary }}</p>
                      <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <a class="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-indigo-700 underline underline-offset-2 dark:text-indigo-300" :href="candidate.url" target="_blank" rel="noreferrer">Abrir fuente oficial</a>
                        <button class="min-h-9 text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300" type="button" @click="prepareSourceImport(candidate)">Revisar e incorporar fuente</button>
                      </div>
                    </article>
                    <p class="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">Son candidatos encontrados en sitios oficiales, no normas verificadas. Deben revisarse e indexarse antes de respaldar respuestas.</p>
                  </div>
                  <form v-if="sourceImportCandidate" class="mt-4 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/40" @submit.prevent="importReviewedSource">
                    <div>
                      <h4 class="text-sm font-bold text-slate-900 dark:text-white">Incorporar una fuente oficial</h4>
                      <p class="mt-1 break-all text-xs text-slate-600 dark:text-slate-300">{{ sourceImportCandidate.url }}</p>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Norma o acto administrativo
                        <input v-model="sourceImportCode" required maxlength="80" class="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900" placeholder="Acuerdo 001 de 2024" />
                      </label>
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Clave administrativa de incorporación
                        <input v-model="sourceImportKey" required type="password" autocomplete="new-password" class="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-900" placeholder="Se borra al terminar" />
                      </label>
                    </div>
                    <label class="flex items-start gap-2 text-xs leading-5 text-slate-700 dark:text-slate-200">
                      <input v-model="sourceImportConfirmed" required type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" />
                      Confirmo que revisé en la fuente oficial la vigencia, modificaciones, anexos y jurisdicción de esta norma. Se incorporará el texto de un PDF oficial seleccionable o de una página HTML oficial.
                    </label>
                    <p v-if="sourceImportError" class="rounded-lg bg-rose-100 p-3 text-xs text-rose-900 dark:bg-rose-950 dark:text-rose-100" role="alert">{{ sourceImportError }}</p>
                    <p v-if="sourceImportSuccess" class="rounded-lg bg-emerald-100 p-3 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" role="status">{{ sourceImportSuccess }}</p>
                    <div class="flex flex-wrap gap-2">
                      <button class="min-h-10 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60" type="submit" :disabled="sourceImportPending || !sourceImportConfirmed || !sourceImportKey || sourceImportCode.trim().length < 3">
                        {{ sourceImportPending ? 'Validando e indexando fuente...' : 'Confirmar y agregar al índice' }}
                      </button>
                      <button class="min-h-10 rounded-lg border border-slate-300 px-4 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200" type="button" :disabled="sourceImportPending" @click="sourceImportCandidate = null; sourceImportKey = ''">Cancelar</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <label class="block text-sm font-semibold" for="projectDescription">Descripción del proyecto</label>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ wordCount }} palabras</span>
              </div>
              <textarea
                id="projectDescription"
                v-model="projectDescription"
                class="min-h-64 w-full resize-y rounded-md border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-civic-blue focus:ring-2 focus:ring-civic-blue/20 dark:border-slate-700 dark:bg-slate-950"
                placeholder="Describe el predio, uso propuesto, área, altura, intervención y dudas normativas."
              />
            </div>

            <div v-if="validationIssues.length" class="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <p v-for="issue in validationIssues" :key="issue.field + issue.message">{{ issue.message }}</p>
            </div>

            <p v-if="requestError" class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              {{ requestError }}
            </p>

            <button
              class="w-full rounded-md bg-civic-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              :disabled="!canSubmit"
              type="submit"
            >
              Generar checklist de cumplimiento
            </button>
          </form>
        </section>

        <section class="rounded-md bg-white p-5 shadow-panel dark:bg-slate-900">
          <div class="mb-5 flex items-center justify-between gap-3">
            <h2 class="text-xl font-semibold">Resultado normativo</h2>
            <span class="rounded-md px-3 py-1 text-xs font-bold" :class="riskBadgeClass">
              Riesgo {{ answer?.riskLevel ?? 'pendiente' }}
            </span>
          </div>

          <div v-if="isSubmitting && !answer" class="flex min-h-96 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300" role="status" aria-live="polite">
            <span>Analizando fuentes y generando respuesta...</span>
            <span class="tabular-nums" aria-live="off">{{ elapsedSeconds }} s transcurridos</span>
          </div>

          <div v-else-if="answer" class="space-y-5">
            <section v-if="answer.projectAnalysis" class="border-b border-slate-200 pb-5 dark:border-slate-700">
              <h3 class="mb-3 text-base font-semibold">Cálculos de tu propuesta</h3>
              <dl class="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                <div v-for="metric in projectMetrics" :key="metric.label" class="min-w-0">
                  <dt class="text-xs text-slate-500 dark:text-slate-400">{{ metric.label }}</dt>
                  <dd class="mt-1 text-base font-semibold tabular-nums">{{ metric.value }}</dd>
                  <dd v-if="metric.formula" class="text-xs text-slate-500 dark:text-slate-400">{{ metric.formula }}</dd>
                </div>
              </dl>
              <p v-for="observation in answer.projectAnalysis.observations" :key="observation" class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ observation }}</p>
            </section>
            <p v-if="isSubmitting" class="border-l-4 border-civic-blue pl-3 text-sm text-slate-600 dark:text-slate-300" role="status">
              {{ answer.citations.length ? 'Fuentes recuperadas. La IA está completando la revisión normativa.' : 'Datos procesados. Buscando fuentes de la jurisdicción.' }}
              <span class="block tabular-nums">{{ elapsedSeconds }} s transcurridos</span>
            </p>
            <p v-else-if="answer.generationMode === 'PENDING'" class="text-sm text-red-700 dark:text-red-300" role="alert">
              La revisión normativa no se completó. Los cálculos de la propuesta siguen disponibles; puedes intentar nuevamente.
            </p>
            <p v-if="answer.generationMode === 'UNAVAILABLE'" class="border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100" role="alert">
              {{ answer.answer }}
            </p>
            <p v-if="answer.generationMode === 'WEB_RESEARCH'" class="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100" role="status">
              La IA consultó extractos recientes de páginas oficiales para esta ciudad. Son orientación preliminar: revisa la vigencia de cada norma y la ficha y cartografía del predio. La búsqueda externa recibe el municipio y términos generales; la descripción de tu proyecto se procesa en el modelo local.
            </p>
            <article v-if="answer.answer && answer.generationMode !== 'UNAVAILABLE'" class="prose prose-slate max-w-none whitespace-pre-line rounded-md bg-slate-50 p-4 text-sm leading-6 dark:prose-invert dark:bg-slate-950">
              {{ answer.answer }}
            </article>

            <div v-if="answer.citations.length">
              <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fuentes recuperadas</h3>
              <div class="space-y-3">
                <article
                  v-for="(citation, index) in answer.citations"
                  :key="citation.id"
                  class="rounded-md border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 class="font-semibold">[{{ index + 1 }}] {{ citation.title }}</h4>
                      <p class="text-sm text-slate-500 dark:text-slate-400">
                        {{ citation.regulationCode }} · {{ citation.articleReference }}
                      </p>
                      <a v-if="citation.sourceUrl" :href="citation.sourceUrl" class="mt-1 inline-block break-all text-sm font-medium text-civic-blue underline dark:text-sky-300" target="_blank" rel="noreferrer">
                        Consultar fuente oficial
                      </a>
                    </div>
                    <span v-if="citation.sourceType === 'LIVE_WEB'" class="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      Fuente web por verificar
                    </span>
                    <span v-else class="shrink-0 text-sm font-semibold text-civic-green dark:text-emerald-300" title="Similitud de búsqueda, no porcentaje de cumplimiento">
                      {{ Math.round(citation.similarity * 100) }}%
                    </span>
                  </div>
                  <p class="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{{ expandedSources[citation.id] ? citation.excerpt : sourcePreview(citation.excerpt) }}</p>
                  <button v-if="citation.excerpt.length > 360" class="mt-2 text-sm font-semibold text-civic-blue underline dark:text-sky-300" type="button" :aria-expanded="!!expandedSources[citation.id]" @click="expandedSources[citation.id] = !expandedSources[citation.id]">
                    {{ expandedSources[citation.id] ? 'Mostrar menos' : 'Ver texto completo' }}
                  </button>
                </article>
              </div>
            </div>
          </div>

          <div v-else class="flex min-h-96 items-center justify-center rounded-md border border-dashed border-slate-300 px-6 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-300">
            Completa la consulta para recibir un checklist con artículos citados, nivel de riesgo y evidencia requerida.
          </div>
        </section>
      </div>
    </section>
  </main>
</template>
