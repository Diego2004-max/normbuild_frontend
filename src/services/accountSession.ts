import { ref } from 'vue';
import { getAccount } from './accountApi';
import type { AccountProfile } from './accountApi';

export const accountProfile = ref<AccountProfile | null>(null);
export const sessionReady = ref(false);
export const restoredDraft = ref<{ jurisdiction: string; description: string } | null>(null);

export const initializeAccountSession = async () => {
  try {
    accountProfile.value = await getAccount();
  } catch {
    accountProfile.value = null;
  } finally {
    sessionReady.value = true;
  }
};
