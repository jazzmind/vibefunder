import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-06-20" });
export const STRIPE_CURRENCY = process.env.STRIPE_CURRENCY || "usd";
export const STRIPE_PRICE_DOLLARS = Number(process.env.STRIPE_PRICE_DOLLARS || "2000000");
export const STRIPE_APP_FEE_BPS = Number(process.env.STRIPE_APPLICATION_FEE_BPS || "500");
export const DEST_ACCOUNT = process.env.STRIPE_DESTINATION_ACCOUNT_ID || "";
