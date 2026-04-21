import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  USER_ROLES,
  isAdminOrInfraRoute,
  isAdminRoute,
  type UserRole,
} from "@/lib/auth/roles";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

const ROLE_COOKIE = "bethel_role";
const ROLE_COOKIE_MAX_AGE = 15 * 60; // 15 min

function parseRoleCookie(raw: string | undefined): {
  role: UserRole;
  active: boolean;
} | null {
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length !== 2) return null;
  const [role, active] = parts;
  if (!role || !(USER_ROLES as readonly string[]).includes(role)) return null;
  return { role: role as UserRole, active: active === "1" };
}

function writeRoleCookie(
  response: NextResponse,
  role: UserRole,
  active: boolean
) {
  response.cookies.set(ROLE_COOKIE, `${role}:${active ? "1" : "0"}`, {
    maxAge: ROLE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user) {
    if (isPublic) return supabaseResponse;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.cookies.delete(ROLE_COOKIE);
    return redirect;
  }

  if (pathname.startsWith("/login")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/motors";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  const needsAdmin = isAdminRoute(pathname);
  const needsAdminOrInfra = isAdminOrInfraRoute(pathname);

  if (!needsAdmin && !needsAdminOrInfra) {
    return supabaseResponse;
  }

  const cached = parseRoleCookie(request.cookies.get(ROLE_COOKIE)?.value);

  let profile: { role: UserRole; is_active: boolean } | null = null;
  if (cached) {
    profile = { role: cached.role, is_active: cached.active };
  } else {
    const { data } = await supabase
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle<{ role: UserRole; is_active: boolean }>();
    profile = data ?? null;
    if (profile) {
      writeRoleCookie(supabaseResponse, profile.role, profile.is_active);
    }
  }

  const motorsUrl = request.nextUrl.clone();
  motorsUrl.pathname = "/motors";
  motorsUrl.search = "";

  if (!profile || !profile.is_active) {
    return NextResponse.redirect(motorsUrl);
  }

  if (needsAdmin && profile.role !== "admin") {
    return NextResponse.redirect(motorsUrl);
  }

  if (
    needsAdminOrInfra &&
    profile.role !== "admin" &&
    profile.role !== "gestor_infra"
  ) {
    return NextResponse.redirect(motorsUrl);
  }

  return supabaseResponse;
}
