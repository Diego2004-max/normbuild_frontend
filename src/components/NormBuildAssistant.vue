<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { requestComplianceChecklist } from '../services/regulationApi';
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
const elapsedSeconds = ref(0);
const expandedSources = ref<Record<string, boolean>>({});
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
                type="text"
              />
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
            <p v-if="answer.generationMode === 'GUIDED'" class="border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100" role="status">
              El modelo local no pudo completar la respuesta. Se muestra una orientación preliminar con las fuentes recuperadas; el cumplimiento está por verificar.
            </p>
            <article v-if="answer.answer" class="prose prose-slate max-w-none whitespace-pre-line rounded-md bg-slate-50 p-4 text-sm leading-6 dark:prose-invert dark:bg-slate-950">
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
                    <span class="shrink-0 text-sm font-semibold text-civic-green dark:text-emerald-300" title="Similitud de búsqueda, no porcentaje de cumplimiento">
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
