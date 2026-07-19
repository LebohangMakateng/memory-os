import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const visions = pgTable("visions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 160 }).notNull(),
  statement: text("statement").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  visionId: uuid("vision_id").notNull().references(() => visions.id),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  horizon: varchar("horizon", { length: 30 }).notNull(),
  successMetric: text("success_metric"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  ...timestamps,
});

export const initiatives = pgTable("initiatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id").notNull().references(() => goals.id),
  title: varchar("title", { length: 160 }).notNull(),
  why: text("why").notNull(),
  successMetric: text("success_metric"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  ...timestamps,
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  initiativeId: uuid("initiative_id").notNull().references(() => initiatives.id),
  title: varchar("title", { length: 160 }).notNull(),
  purpose: text("purpose").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  shareStatus: varchar("share_status", { length: 30 }).notNull().default("planned"),
  ...timestamps,
});

export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  title: varchar("title", { length: 160 }).notNull(),
  outcome: text("outcome").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("planned"),
  targetDate: timestamp("target_date", { withTimezone: true }),
  ...timestamps,
});

export const weeks = pgTable("weeks", {
  id: uuid("id").primaryKey().defaultRandom(),
  startsOn: timestamp("starts_on", { withTimezone: true }).notNull(),
  reflection: text("reflection"),
  ...timestamps,
});

export const weeklyPriorities = pgTable("weekly_priorities", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekId: uuid("week_id").notNull().references(() => weeks.id),
  projectId: uuid("project_id").references(() => projects.id),
  title: varchar("title", { length: 160 }).notNull(),
  rank: integer("rank").notNull(),
  ...timestamps,
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").notNull().references(() => milestones.id),
  weeklyPriorityId: uuid("weekly_priority_id").references(() => weeklyPriorities.id),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  nextAction: text("next_action").notNull(),
  reason: text("reason").notNull(),
  expectedOutcome: text("expected_outcome").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  estimateMinutes: integer("estimate_minutes").notNull(),
  difficulty: integer("difficulty").notNull(),
  energy: varchar("energy", { length: 10 }).notNull(),
  focusType: varchar("focus_type", { length: 20 }).notNull(),
  impact: jsonb("impact").notNull(),
  shareStatus: varchar("share_status", { length: 30 }).notNull().default("planned"),
  shareChannel: varchar("share_channel", { length: 80 }),
  shareUrl: text("share_url"),
  ...timestamps,
});

export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 160 }).notNull(),
  note: text("note"),
  status: varchar("status", { length: 20 }).notNull().default("inbox"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
});

export const aiPlanningDrafts = pgTable("ai_planning_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  targetId: uuid("target_id").notNull(),
  prompt: text("prompt"),
  proposal: jsonb("proposal").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending_review"),
  ...timestamps,
});

export const visionRelations = relations(visions, ({ many }) => ({ goals: many(goals) }));
export const goalRelations = relations(goals, ({ one, many }) => ({
  vision: one(visions, { fields: [goals.visionId], references: [visions.id] }),
  initiatives: many(initiatives),
}));
