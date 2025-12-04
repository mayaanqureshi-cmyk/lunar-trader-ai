import { z } from "zod";

// Stock symbol validation
export const stockSymbolSchema = z
  .string()
  .min(1, "Symbol is required")
  .max(5, "Symbol must be 5 characters or less")
  .regex(/^[A-Z]+$/, "Symbol must be uppercase letters only")
  .transform((val) => val.toUpperCase());

// Quantity validation
export const quantitySchema = z
  .number()
  .int("Quantity must be a whole number")
  .positive("Quantity must be positive")
  .max(100000, "Quantity too large");

// Price validation
export const priceSchema = z
  .number()
  .positive("Price must be positive")
  .max(1000000, "Price too large");

// Percentage validation (0-100)
export const percentageSchema = z
  .number()
  .min(0, "Percentage must be at least 0")
  .max(100, "Percentage must be at most 100");

// Days validation for backtesting
export const backtestDaysSchema = z
  .number()
  .int("Days must be a whole number")
  .min(1, "At least 1 day required")
  .max(365, "Maximum 365 days");

// Backtest form schema
export const backtestFormSchema = z.object({
  symbol: stockSymbolSchema,
  days: backtestDaysSchema,
  buyThreshold: z.number().min(0.1).max(50),
  sellThreshold: z.number().min(0.1).max(50),
});

export type BacktestFormData = z.infer<typeof backtestFormSchema>;
