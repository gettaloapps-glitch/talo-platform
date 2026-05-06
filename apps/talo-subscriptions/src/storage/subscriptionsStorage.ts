import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Subscription } from '../types/subscription';

const STORAGE_KEY = 'talo-subscriptions';

export async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    const subscriptions = JSON.parse(data) as Subscription[];

    return subscriptions.sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1
    );
  } catch (error) {
    console.log('Error reading subscriptions', error);
    return [];
  }
}

export async function saveSubscriptions(
  subscriptions: Subscription[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
  } catch (error) {
    console.log('Error saving subscriptions', error);
  }
}

export async function addSubscription(
  subscription: Subscription
): Promise<void> {
  try {
    const currentSubscriptions = await getSubscriptions();
    const nextSubscriptions = [subscription, ...currentSubscriptions];

    await saveSubscriptions(nextSubscriptions);
  } catch (error) {
    console.log('Error adding subscription', error);
  }
}

export async function updateSubscription(
  subscription: Subscription
): Promise<void> {
  try {
    const currentSubscriptions = await getSubscriptions();
    const nextSubscriptions = currentSubscriptions.map((item) =>
      item.id === subscription.id ? subscription : item
    );

    await saveSubscriptions(nextSubscriptions);
  } catch (error) {
    console.log('Error updating subscription', error);
  }
}
