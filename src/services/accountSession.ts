import { ref } from 'vue';
import { getAccount } from './accountApi';
import type { AccountProfile } from './accountApi';

export const accountProfile = ref<AccountProfile | null>(null);
export const sessionReady = ref(false);
export const restoredDraft = ref<{ jurisdiction: string; description: string } | null>(null);
let initialization: Promise<void> | null = null;

export const initializeAccountSession = () => {
  if (initialization) return initialization;
  initialization = (async () => {
    try {
      accountProfile.value = await getAccount();
    } catch {
      accountProfile.value = null;
    } finally {
      sessionReady.value = true;
    }
  })();
  return initialization;
};
