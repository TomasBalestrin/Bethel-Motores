import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isAdminOrInfraRoute,
  isAdminRoute,
  type UserRole,
} from "@/lib/auth/roles";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

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
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/login")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/motors";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  const needsAdmin = isAdminRoute(pathname);
  const needsAdminOrInfra = isAdminOrInfraRoute(pathname);

  if (needsAdmin || needsAdminOrInfra) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle<{ role: UserRole; is_active: boolean }>();

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
  }

  return supabaseResponse;
}
