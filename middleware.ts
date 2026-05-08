export const config = {
  matcher: '/((?!_vercel|[^/]*\\.[^/]*).*)',
};

export default function middleware(request: Request): Response | void {
  const { pathname } = new URL(request.url);

  // Allow Vercel internal paths through unconditionally
  if (pathname.startsWith('/_vercel') || pathname.startsWith('/_next')) return;

  const authorization = request.headers.get('Authorization');

  if (authorization?.startsWith('Basic ')) {
    try {
      const decoded = atob(authorization.slice(6));
      const colonIdx = decoded.indexOf(':');
      const password = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded;
      const expected = process.env.ACCESS_PASSWORD;
      if (expected && password === expected) return; // pass through
    } catch {
      // invalid base64 — fall through to 401
    }
  }

  return new Response('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="VocabMaster"',
    },
  });
}
