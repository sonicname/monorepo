import type { ProjectStatus } from '@monorepo/contracts';
import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const projectStatusEnum = pgEnum('project_status', [
  'planned',
  'in-progress',
  'complete',
]);

export const projectsTable = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  status: projectStatusEnum('status').$type<ProjectStatus>().notNull(),
  stack: text('stack').array().notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'string',
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp('created_at', {
    mode: 'string',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type ProjectRow = typeof projectsTable.$inferSelect;
export type NewProjectRow = typeof projectsTable.$inferInsert;
