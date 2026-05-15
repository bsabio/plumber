/**
 * Idempotent seed script for the Neon Postgres database.
 *
 * Steps:
 *   1. Load `DATABASE_URL` from env (hard fail if missing).
 *   2. Run any pending migrations from `./drizzle/`.
 *   3. Wipe + repopulate the four tables with deterministic-ish seed data.
 *
 * Invoke via `npm run db:seed`.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import { users, tickets, appointments, newsletterContent } from './schema';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[db:seed] DATABASE_URL is not set. Add it to `.env` first.');
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema: { users, tickets, appointments, newsletterContent } });

  console.log('[db:seed] applying migrations from ./drizzle …');
  await migrate(db, { migrationsFolder: './drizzle' });

  console.log('[db:seed] 🌱 seeding database…');

  const now = new Date().toISOString();

  // Users
  const adminId = uuidv4();
  const authUserId = uuidv4();
  const anonUserId = uuidv4();
  const techJoeId = uuidv4();
  const techDanId = uuidv4();
  const techMariaId = uuidv4();

  const seedUsers = [
    {
      id: adminId,
      name: 'Mike Johnson',
      email: 'mike@pipedreamsplumbing.com',
      role: 'admin' as const,
      phone: '555-0100',
      specialty: null,
      createdAt: now,
    },
    {
      id: authUserId,
      name: 'Sarah Williams',
      email: 'sarah.w@email.com',
      role: 'authenticated' as const,
      phone: '555-0201',
      specialty: null,
      createdAt: now,
    },
    {
      id: anonUserId,
      name: 'Guest Visitor',
      email: 'guest@example.com',
      role: 'anon' as const,
      phone: null,
      specialty: null,
      createdAt: now,
    },
    // ── Technicians ──
    {
      id: techJoeId,
      name: 'Joe Ramirez',
      email: 'joe@pipedreamsplumbing.com',
      role: 'technician' as const,
      phone: '555-0301',
      specialty: 'repair',
      createdAt: now,
    },
    {
      id: techDanId,
      name: 'Dan Kowalski',
      email: 'dan@pipedreamsplumbing.com',
      role: 'technician' as const,
      phone: '555-0302',
      specialty: 'drain',
      createdAt: now,
    },
    {
      id: techMariaId,
      name: 'Maria Santos',
      email: 'maria@pipedreamsplumbing.com',
      role: 'technician' as const,
      phone: '555-0303',
      specialty: 'installation',
      createdAt: now,
    },
  ];

  const seedTickets = [
    {
      id: uuidv4(),
      userId: authUserId,
      technicianId: techJoeId,
      subject: 'Leaking kitchen faucet',
      description:
        'The kitchen faucet has been dripping steadily for 2 days. It seems to be coming from the base of the handle.',
      status: 'open' as const,
      priority: 'medium' as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      userId: authUserId,
      technicianId: techDanId,
      subject: 'Water heater not heating',
      description:
        'Our 40-gallon water heater stopped producing hot water yesterday evening. The pilot light appears to be out.',
      status: 'in_progress' as const,
      priority: 'high' as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      userId: adminId,
      technicianId: null,
      subject: 'Bathroom drain clogged',
      description:
        'The master bathroom shower drain is completely blocked. Water pools up within 2 minutes of running the shower.',
      status: 'resolved' as const,
      priority: 'medium' as const,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const seedAppointments = [
    {
      id: uuidv4(),
      userId: authUserId,
      technicianId: techJoeId,
      date: '2026-03-18',
      time: '09:00',
      serviceType: 'repair' as const,
      status: 'confirmed' as const,
      notes: 'Kitchen faucet repair — bring replacement cartridge',
      address: '142 Oak Street, Apt 3B',
      createdAt: now,
    },
    {
      id: uuidv4(),
      userId: authUserId,
      technicianId: techDanId,
      date: '2026-03-20',
      time: '14:00',
      serviceType: 'inspection' as const,
      status: 'scheduled' as const,
      notes: 'Annual plumbing inspection for home warranty',
      address: '142 Oak Street, Apt 3B',
      createdAt: now,
    },
    {
      id: uuidv4(),
      userId: adminId,
      technicianId: techMariaId,
      date: '2026-03-25',
      time: '10:30',
      serviceType: 'installation' as const,
      status: 'scheduled' as const,
      notes: 'New tankless water heater installation',
      address: '789 Pine Avenue',
      createdAt: now,
    },
  ];

  const seedNewsletter = [
    {
      id: uuidv4(),
      title: '5 Winter Plumbing Tips to Prevent Frozen Pipes',
      body: `As temperatures drop, your plumbing becomes vulnerable to freezing. Here are five essential tips:

1. **Insulate exposed pipes** in unheated areas like basements, attics, and garages.
2. **Let faucets drip** during extreme cold to keep water flowing.
3. **Keep thermostat consistent** — don't drop below 55°F even when away.
4. **Disconnect garden hoses** and shut off exterior faucet supply lines.
5. **Open cabinet doors** under sinks on exterior walls to let warm air circulate.

Call us at 555-PIPE for a free winter plumbing assessment!`,
      category: 'tip' as const,
      publishedAt: now,
      isActive: true,
    },
    {
      id: uuidv4(),
      title: 'Spring Special: 20% Off Drain Cleaning Services',
      body: `Spring is the perfect time to clear out winter buildup in your drains! For the entire month of April, enjoy 20% off all drain cleaning services.

**What's included:**
- Camera inspection of main sewer line
- Hydro-jetting of all accessible drains
- Written report with photos of pipe condition

Book online or call 555-PIPE to schedule your appointment today!`,
      category: 'promotion' as const,
      publishedAt: now,
      isActive: true,
    },
    {
      id: uuidv4(),
      title: 'FAQ: When Should I Call a Professional Plumber?',
      body: `Not sure if your plumbing issue needs a pro? Here's our guide:

**Call immediately if:**
- You see water pooling around your water heater
- There's sewage backup in any drain
- You smell gas near water heating equipment
- A pipe has burst or is actively flooding

**Schedule a visit if:**
- Faucets drip persistently after tightening
- Water pressure has gradually decreased
- Drains are slow across multiple fixtures
- Your water bill has increased unexpectedly

**DIY-friendly:**
- Replacing a shower head
- Unclogging a single slow drain with a plunger
- Replacing a toilet flapper

When in doubt, call us at 555-PIPE for a free phone consultation!`,
      category: 'faq' as const,
      publishedAt: now,
      isActive: true,
    },
    {
      id: uuidv4(),
      title: 'New Service: Emergency 24/7 Plumbing Response',
      body: `We're excited to announce our new 24/7 emergency plumbing service! Pipe Dream Plumbing now offers round-the-clock emergency response for urgent plumbing issues.

**Emergency services include:**
- Burst pipe repair and water shutoff
- Sewer line backup resolution
- Gas leak detection and repair
- Water heater failures

**Response time:** 60 minutes or less guaranteed.

Save our emergency line: **555-PIPE-911**`,
      category: 'update' as const,
      publishedAt: now,
      isActive: true,
    },
  ];

  // ── Clear existing data (FK-safe order) ──
  await db.delete(appointments);
  await db.delete(tickets);
  await db.delete(newsletterContent);
  await db.delete(users);

  // ── Insert ──
  await db.insert(users).values(seedUsers);
  console.log(`  ✅ Inserted ${seedUsers.length} users`);

  await db.insert(tickets).values(seedTickets);
  console.log(`  ✅ Inserted ${seedTickets.length} tickets`);

  await db.insert(appointments).values(seedAppointments);
  console.log(`  ✅ Inserted ${seedAppointments.length} appointments`);

  await db.insert(newsletterContent).values(seedNewsletter);
  console.log(`  ✅ Inserted ${seedNewsletter.length} newsletter articles`);

  console.log('[db:seed] 🎉 done.');
}

main().catch((err) => {
  console.error('[db:seed] ❌ failed:', err);
  process.exit(1);
});
