import { colors, radius, spacing, typography } from '@talo/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addSubscription } from '../../src/storage/subscriptionsStorage';
import type { BillingCycle } from '../../src/types/subscription';

function createSubscriptionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AddScreen() {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
  }>({});

  const normalizedAmount = useMemo(() => Number(amount.trim()), [amount]);

  function validateForm() {
    const nextErrors: {
      name?: string;
      amount?: string;
    } = {};

    if (!name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      nextErrors.amount = 'Amount must be greater than 0.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    await addSubscription({
      id: createSubscriptionId(),
      name: name.trim(),
      amount: normalizedAmount,
      currency: 'USD',
      billingCycle,
      nextPaymentDate: nextPaymentDate.trim() || 'Not set',
      createdAt: new Date().toISOString(),
    });

    setIsSaving(false);
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <Text style={styles.title}>Add subscription</Text>
        <Text style={styles.subtitle}>
          Save recurring services locally so they appear on your subscriptions
          list.
        </Text>

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setName}
              placeholder="Netflix"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, errors.name ? styles.inputError : undefined]}
              value={name}
            />
            {errors.name ? (
              <Text style={styles.errorText}>{errors.name}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setAmount}
              placeholder="9.99"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, errors.amount ? styles.inputError : undefined]}
              value={amount}
            />
            {errors.amount ? (
              <Text style={styles.errorText}>{errors.amount}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Billing cycle</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                onPress={() => setBillingCycle('monthly')}
                style={[
                  styles.segmentButton,
                  billingCycle === 'monthly' ? styles.segmentButtonActive : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    billingCycle === 'monthly'
                      ? styles.segmentButtonTextActive
                      : undefined,
                  ]}
                >
                  Monthly
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setBillingCycle('yearly')}
                style={[
                  styles.segmentButton,
                  billingCycle === 'yearly' ? styles.segmentButtonActive : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    billingCycle === 'yearly'
                      ? styles.segmentButtonTextActive
                      : undefined,
                  ]}
                >
                  Yearly
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Next payment date</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setNextPaymentDate}
              placeholder="2026-05-20"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              value={nextPaymentDate}
            />
          </View>

          <Pressable
            disabled={isSaving}
            onPress={handleSave}
            style={[styles.button, isSaving ? styles.buttonDisabled : undefined]}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving...' : 'Save subscription'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.textMain,
    fontSize: typography.title,
    fontWeight: '700',
    lineHeight: 32,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMain,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  segmentedControl: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xs,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  segmentButtonText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: '600',
  },
  segmentButtonTextActive: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.textMain,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '600',
  },
});
