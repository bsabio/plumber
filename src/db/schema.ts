import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ── Users Table ──
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['anon', 'authenticated', 'admin'] })
    .notNull()
    .default('anon'),
  phone: text('phone'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Tickets Table ──
export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
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
export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
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
export const newsletterContent = sqliteTable('newsletter_content', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  category: text('category', {
    enum: ['tip', 'promotion', 'update', 'faq', 'seasonal'],
  }).notNull(),
  publishedAt: text('published_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
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
