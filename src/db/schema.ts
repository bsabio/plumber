import { pgTable, text, boolean } from 'drizzle-orm/pg-core';

// ── Users Table ──
// NOTE: `id` is kept as `text` rather than `uuid` so application code can keep
// generating IDs via the `uuid` npm package (and seed scripts can mint
// well-known string IDs like 'user_anon') without touching every call site.
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['anon', 'authenticated', 'admin', 'technician'] })
    .notNull()
    .default('anon'),
  phone: text('phone'),
  specialty: text('specialty'),
  passwordHash: text('password_hash'),
  // Timestamps stay as ISO-8601 strings to match every call site that already
  // formats dates via `new Date().toISOString()`.
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Tickets Table ──
export const tickets = pgTable('tickets', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  technicianId: text('technician_id').references(() => users.id), // nullable
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: text('status', {
    enum: ['open', 'in_progress', 'resolved', 'closed'],
  })
    .notNull()
    .default('open'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
    .notNull()
    .default('medium'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Appointments Table ──
export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  technicianId: text('technician_id').references(() => users.id), // nullable
  date: text('date').notNull(),
  time: text('time').notNull(),
  serviceType: text('service_type', {
    enum: [
      'repair',
      'installation',
      'inspection',
      'emergency',
      'maintenance',
    ],
  }).notNull(),
  status: text('status', {
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
  })
    .notNull()
    .default('scheduled'),
  notes: text('notes'),
  address: text('address'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Newsletter Content Table ──
export const newsletterContent = pgTable('newsletter_content', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  category: text('category', {
    enum: ['tip', 'promotion', 'update', 'faq', 'seasonal'],
  }).notNull(),
  publishedAt: text('published_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  isActive: boolean('is_active').notNull().default(true),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type NewsletterContent = typeof newsletterContent.$inferSelect;
export type NewNewsletterContent = typeof newsletterContent.$inferInsert;
