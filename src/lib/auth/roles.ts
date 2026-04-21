export const USER_ROLES = [
  "admin",
  "gestor_trafego",
  "gestor_infra",
  "copy",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROUTES = [
  "/settings/users",
  "/settings/goals",
  "/settings/audit",
] as const;

export const ADMIN_OR_INFRA_ROUTES = [
  "/settings/integrations",
  "/settings/funnel-templates",
] as const;

export function matchesRoute(
  pathname: string,
  routes: readonly string[]
): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

export function isAdminRoute(pathname: string): boolean {
  return matchesRoute(pathname, ADMIN_ROUTES);
}

export function isAdminOrInfraRoute(pathname: string): boolean {
  return matchesRoute(pathname, ADMIN_OR_INFRA_ROUTES);
}
