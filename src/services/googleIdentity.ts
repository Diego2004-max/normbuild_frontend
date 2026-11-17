interface GoogleIdentityClient {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, options: { theme: string; size: string; text: string; locale: string; width: number }): void;
}

declare global {
  interface Window { google?: { accounts: { id: GoogleIdentityClient } } }
}

let scriptPromise: Promise<void> | null = null;
let initializedClientId = '';
let activeHandler: ((credential: string) => Promise<void>) | null = null;

const loadScript = async () => {
  if (window.google) return;
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.normbuildGoogleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el acceso con Google.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

export const renderGoogleSignInButton = async (
  host: HTMLElement,
  clientId: string,
  handler: (credential: string) => Promise<void>,
) => {
  await loadScript();
  if (!window.google) throw new Error('Google no respondió. Intenta nuevamente.');
  activeHandler = handler;
  if (initializedClientId !== clientId) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => { void activeHandler?.(credential); },
    });
    initializedClientId = clientId;
  }
  window.google.accounts.id.renderButton(host, {
    theme: 'outline', size: 'large', text: 'continue_with', locale: 'es',
    width: Math.min(host.clientWidth, 360),
  });
  return () => {
    if (activeHandler === handler) activeHandler = null;
  };
};
