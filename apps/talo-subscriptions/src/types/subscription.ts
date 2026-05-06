import type { CurrencyCode } from '@talo/core';

export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionCategory =
  | 'streaming'
  | 'music'
  | 'software'
  | 'fitness'
  | 'cloud'
  | 'news'
  | 'gaming'
  | 'other';

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  nextPaymentDate: string;
  category?: SubscriptionCategory;
  seatsIncluded?: number;
  seatsUsed?: number;
  createdAt: string;
};
