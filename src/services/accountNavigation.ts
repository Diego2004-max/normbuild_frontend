export const resolveAccountNavigation = (
  path: string,
  requiresAccount: boolean,
  authenticated: boolean,
) => {
  if (requiresAccount && !authenticated) return '/acceder';
  if (path === '/acceder' && authenticated) return '/';
  return true;
};
