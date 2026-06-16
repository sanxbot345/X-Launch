import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email'), // Sometimes GitHub users don't have public emails, make it optional
  githubToken: text('github_token'), // Store GitHub OAuth token securely
  createdAt: timestamp('created_at').defaultNow(),
});

export const deployments = pgTable('deployments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  serviceName: text('service_name').notNull(),
  repoName: text('repo_name').notNull(),
  branch: text('branch').notNull(),
  status: text('status').notNull(),
  buildCommand: text('build_command'),
  startCommand: text('start_command'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const environmentVariables = pgTable('environment_variables', {
  id: serial('id').primaryKey(),
  deploymentId: integer('deployment_id')
    .references(() => deployments.id)
    .notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  deployments: many(deployments),
}));

export const deploymentsRelations = relations(deployments, ({ one, many }) => ({
  author: one(users, {
    fields: [deployments.userId],
    references: [users.id],
  }),
  environmentVariables: many(environmentVariables),
}));
