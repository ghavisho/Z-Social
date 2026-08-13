import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/install-guide", "/how-to-install", "/maintenance", "/banned"];
// Always reachable even during a full lockdown — an admin has to be able
// to log in to turn maintenance mode back off, and the maintenance page
// itself obviously can't require you to already be past it.
const MAINTENANCE_EXEMPT_PATHS = ["/login", "/maintenance", "/api/auth/login"];

const DEVICE_COOKIE = "z_device";

function getClientIp(request: NextRequest): string {
  // Vercel (and most proxies) set this; the first entry is the original client.
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  // ---------- Device ID (best-effort) ----------
  // A random, persistent, httpOnly cookie identifying this browser install.
  // This is NOT true device fingerprinting — a user who clears cookies, uses
  // a different browser, or goes incognito gets a new one. It's a practical
  // "ban this browser too, not just the account" tool, not a guarantee.
  let deviceId = request.cookies.get(DEVICE_COOKIE)?.value;
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    response.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
      path: "/",
      sameSite: "lax",
    });
  }

  // ---------- Permanent bans (IP and/or device) ----------
  // banned_ips/banned_devices have zero client-facing RLS policies, so this
  // check goes through the service-role key — safe here since middleware
  // only runs server-side and this key never reaches the browser.
  const clientIp = getClientIp(request);
  const isBanCheckExempt = path.startsWith("/_next") || path === "/banned";
  if (!isBanCheckExempt && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    const [{ data: ipBan }, { data: deviceBan }] = await Promise.all([
      clientIp !== "unknown"
        ? serviceClient.from("banned_ips").select("ip").eq("ip", clientIp).maybeSingle()
        : Promise.resolve({ data: null }),
      serviceClient.from("banned_devices").select("device_id").eq("device_id", deviceId).maybeSingle(),
    ]);
    if (ipBan || deviceBan) {
      return NextResponse.redirect(new URL("/banned", request.url));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => path === p) || path.startsWith("/_next");
  const isAdminPath = path.startsWith("/admin");

  // ---------- Maintenance / lockdown mode ----------
  // Checked before anything else: while it's on, NOBODY except an
  // admin/super_admin can reach any page or API route — not even to just
  // browse public content — which is what "کاملاً آفلاین کند تا کسی نتواند
  // وارد شود یا فعالیت کند" (fully offline, nobody can log in or act) asked for.
  const { data: settings } = await supabase
    .from("app_settings")
    .select("maintenance_mode")
    .eq("id", true)
    .maybeSingle();

  const maintenanceOn = settings?.maintenance_mode === true;
  const isMaintenanceExempt = MAINTENANCE_EXEMPT_PATHS.some((p) => path === p) || path.startsWith("/_next");

  if (maintenanceOn && !isMaintenanceExempt) {
    let isAdminUser = false;
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      isAdminUser = profile?.role === "admin" || profile?.role === "super_admin";
    }
    if (!isAdminUser) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
    // else: admin/super_admin — fall through, maintenance mode doesn't
    // apply to them so they can actually manage the lockdown.
  }

  if (!user && !isPublic) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin routes get an extra check inside the layout itself (role lookup),
  // middleware here only guarantees an authenticated session exists.
  if (isAdminPath && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
};
