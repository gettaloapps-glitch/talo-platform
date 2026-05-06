import { colors } from '@talo/core';

import type {
  Subscription,
  SubscriptionCategory,
} from '../types/subscription';

export type CategoryMeta = {
  label: string;
  marker: string;
  color: string;
};

export const CATEGORY_OPTIONS: {
  value: SubscriptionCategory;
  meta: CategoryMeta;
}[] = [
  {
    value: 'streaming',
    meta: { label: 'Streaming', marker: 'TV', color: colors.primary },
  },
  {
    value: 'music',
    meta: { label: 'Music', marker: '♪', color: colors.successText },
  },
  {
    value: 'software',
    meta: { label: 'Software', marker: '{}', color: colors.textSecondary },
  },
  {
    value: 'fitness',
    meta: { label: 'Fitness', marker: 'FT', color: colors.danger },
  },
  {
    value: 'cloud',
    meta: { label: 'Cloud', marker: 'CL', color: colors.successBorder },
  },
  {
    value: 'news',
    meta: { label: 'News', marker: 'NW', color: colors.warningBorder },
  },
  {
    value: 'gaming',
    meta: { label: 'Gaming', marker: 'GM', color: colors.primary },
  },
  {
    value: 'other',
    meta: { label: 'Other', marker: 'OT', color: colors.textSecondary },
  },
];

export function getCategoryMeta(category?: SubscriptionCategory): CategoryMeta {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === (category ?? 'other'))
      ?.meta ?? CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1].meta
  );
}

export function getSubscriptionBrandMeta(subscription: Pick<Subscription, 'name'>) {
  return {
    label: subscription.name.trim(),
    logo: null,
  };
}
