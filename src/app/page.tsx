import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HeroChat from '@/components/ChatWindow';
import { SESSION_COOKIE_NAME, verifySignedToken } from '@/lib/auth-session';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const authSecret = process.env.AUTH_SECRET || '';

  if (!token || !authSecret) {
    redirect('/login');
  }

  const payload = verifySignedToken(token, authSecret);
  const exp = typeof payload?.exp === 'number' ? payload.exp : 0;
  if (!payload || (exp && exp < Math.floor(Date.now() / 1000))) {
    redirect('/login');
  }

  return (
    <main>
      <HeroChat />
    </main>
  );
}
