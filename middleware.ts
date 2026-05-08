import { next } from '@vercel/edge';

export const config = {
  matcher: ['/((?!_vercel).*)'],
};

export default function middleware(request: Request) {
  const authorization = request.headers.get('Authorization');

  if (authorization?.startsWith('Basic ')) {
    try {
      const decoded = atob(authorization.slice(6));
      const colonIdx = decoded.indexOf(':');
      const password = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded;
      if (password === process.env.ACCESS_PASSWORD) {
        return next();
      }
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
