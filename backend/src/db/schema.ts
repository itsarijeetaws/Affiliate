import { mysqlTable, int, varchar, text, float, json, timestamp, boolean } from "drizzle-orm/mysql-core";
import { decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ─── Tables ───────────────────────────────────────────────────────────────────

export const categories = mysqlTable("category", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  commissionRate: decimal("commission_rate", { precision: 4, scale: 2 }).notNull().default("3.5"),
});

export const users = mysqlTable("user", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  bio: varchar("bio", { length: 300 }),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  passwordHash: text("passwordHash").notNull(),
  isAdmin: boolean("isAdmin").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export const products = mysqlTable("product", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  amazonAsin: varchar("amazon_asin", { length: 20 }).notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  rating: float("rating").notNull().default(4.0),
  imageUrl: text("image_url").notNull(),
  categoryId: int("category_id").notNull(),
  description: text("description").notNull(),
  pros: json("pros").notNull(),
  cons: json("cons").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export const productFeatures = mysqlTable("productfeature", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("productId").notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
});

export const blogPosts = mysqlTable("blogpost", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  seoTitle: varchar("seo_title", { length: 500 }),
  seoDescription: text("seo_description"),
  categoryId: int("category_id"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  wordpressPostId: int("wordpress_post_id"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export const comparisons = mysqlTable("comparison", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  productIds: json("productIds").notNull(),
  items: json("items").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const automationLogs = mysqlTable("automationlog", {
  id: int("id").primaryKey().autoincrement(),
  event: varchar("event", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  payload: json("payload").notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const clickEvents = mysqlTable("clickevent", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 500 }).notNull(),
  ip: varchar("ip", { length: 100 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const emailSubscribers = mysqlTable("emailsubscriber", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  blogPosts: many(blogPosts),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  features: many(productFeatures),
}));

export const productFeaturesRelations = relations(productFeatures, ({ one }) => ({
  product: one(products, {
    fields: [productFeatures.productId],
    references: [products.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  category: one(categories, {
    fields: [blogPosts.categoryId],
    references: [categories.id],
  }),
}));
