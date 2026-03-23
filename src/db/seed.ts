import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { users, tickets, appointments, newsletterContent } from './schema';

const DB_PATH = path.join(process.cwd(), 'data', 'plumber.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite);

// ── Create tables ──
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'anon',
    phone TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    service_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    address TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS newsletter_content (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL,
    published_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );
`);

// ── Seed Data ──
const now = new Date().toISOString();

// Users
const adminId = uuidv4();
const authUserId = uuidv4();
const anonUserId = uuidv4();

const seedUsers = [
  {
    id: adminId,
    name: 'Mike Johnson',
    email: 'mike@pipedreamsplumbing.com',
    role: 'admin' as const,
    phone: '555-0100',
    createdAt: now,
  },
  {
    id: authUserId,
    name: 'Sarah Williams',
    email: 'sarah.w@email.com',
    role: 'authenticated' as const,
    phone: '555-0201',
    createdAt: now,
  },
  {
    id: anonUserId,
    name: 'Guest Visitor',
    email: 'guest@example.com',
    role: 'anon' as const,
    phone: null,
    createdAt: now,
  },
];

// Tickets
const seedTickets = [
  {
    id: uuidv4(),
    userId: authUserId,
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
    subject: 'Bathroom drain clogged',
    description:
      'The master bathroom shower drain is completely blocked. Water pools up within 2 minutes of running the shower.',
    status: 'resolved' as const,
    priority: 'medium' as const,
    createdAt: now,
    updatedAt: now,
  },
];

// Appointments
const seedAppointments = [
  {
    id: uuidv4(),
    userId: authUserId,
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
    date: '2026-03-25',
    time: '10:30',
    serviceType: 'installation' as const,
    status: 'scheduled' as const,
    notes: 'New tankless water heater installation',
    address: '789 Pine Avenue',
    createdAt: now,
  },
];

// Newsletter Content
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

// ── Insert Data ──
async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  sqlite.exec('DELETE FROM appointments');
  sqlite.exec('DELETE FROM tickets');
  sqlite.exec('DELETE FROM newsletter_content');
  sqlite.exec('DELETE FROM users');

  // Insert users
  for (const user of seedUsers) {
    db.insert(users).values(user).run();
  }
  console.log(`  ✅ Inserted ${seedUsers.length} users`);

  // Insert tickets
  for (const ticket of seedTickets) {
    db.insert(tickets).values(ticket).run();
  }
  console.log(`  ✅ Inserted ${seedTickets.length} tickets`);

  // Insert appointments
  for (const appt of seedAppointments) {
    db.insert(appointments).values(appt).run();
  }
  console.log(`  ✅ Inserted ${seedAppointments.length} appointments`);

  // Insert newsletter content
  for (const article of seedNewsletter) {
    db.insert(newsletterContent).values(article).run();
  }
  console.log(`  ✅ Inserted ${seedNewsletter.length} newsletter articles`);

  console.log('🎉 Database seeded successfully!');
  console.log(`   Database location: ${DB_PATH}`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
