import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HeroChat from '@/components/ChatWindow';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth-session';
import { env, getAuthSecret } from '@/lib/env';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect('/login');
  }

  if (!env.AUTH_SECRET && env.isProduction) {
    redirect('/login');
  }

  const payload = verifySessionToken(token, getAuthSecret());
  if (!payload) {
    redirect('/login');
  }

  return (
    <main>
      <HeroChat />
    </main>
  );
}
