import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  colors,
  formatDisplayDate,
  getSettings,
  getTodayDate,
  radius,
  spacing,
  typography,
} from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORY_OPTIONS } from '../../src/metadata/subscriptionMeta';
import {
  getSubscriptions,
  updateSubscription,
} from '../../src/storage/subscriptionsStorage';
import type {
  BillingCycle,
  Subscription,
  SubscriptionCategory,
} from '../../src/types/subscription';

function normalizeAmount(input: string): number | null {
  const normalizedInput = input.trim().replace(/,/g, '.');

  if (!/^\d+(?:\.\d+)?$/.test(normalizedInput)) {
    return null;
  }

  const parsedAmount = Number(normalizedInput);

  return Number.isFinite(parsedAmount) ? parsedAmount : null;
}

function normalizeOptionalPositiveInteger(input: string): number | null | undefined {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return undefined;
  }

  if (!/^\d+$/.test(trimmedInput)) {
    return null;
  }

  const parsedValue = Number(trimmedInput);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function normalizeOptionalDate(input: string): string | null | undefined {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedInput)) {
    return null;
  }

  const [year, month, day] = trimmedInput.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  return isValidDate ? trimmedInput : null;
}

function formatDateToInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseInputDate(input: string) {
  const normalizedInput = normalizeOptionalDate(input);

  if (!normalizedInput) {
    return new Date();
  }

  const [year, month, day] = normalizedInput.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const amountInputRef = useRef<TextInput>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState<SubscriptionCategory>('other');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [seatsIncluded, setSeatsIncluded] = useState('');
  const [seatsUsed, setSeatsUsed] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    date?: string;
    seats?: string;
  }>({});

  const normalizedAmount = useMemo(() => normalizeAmount(amount), [amount]);
  const normalizedSeatsIncluded = useMemo(
    () => normalizeOptionalPositiveInteger(seatsIncluded),
    [seatsIncluded]
  );
  const normalizedSeatsUsed = useMemo(
    () => normalizeOptionalPositiveInteger(seatsUsed),
    [seatsUsed]
  );
  const normalizedNextPaymentDate = useMemo(
    () => normalizeOptionalDate(nextPaymentDate),
    [nextPaymentDate]
  );
  const pickerDate = useMemo(
    () => parseInputDate(nextPaymentDate || getTodayDate()),
    [nextPaymentDate]
  );

  function handleOpenDatePicker() {
    amountInputRef.current?.blur();
    Keyboard.dismiss();

    if (Platform.OS === 'ios') {
      setTimeout(() => {
        setShowDatePicker(true);
      }, 150);
      return;
    }

    setShowDatePicker(true);
  }

  function handleDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    if (event.type === 'dismissed' || !selectedDate) {
      setShowDatePicker(false);
      return;
    }

    setNextPaymentDate(formatDateToInput(selectedDate));

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  }

  function handleClearDate() {
    setNextPaymentDate('');
    setShowDatePicker(false);
  }

  useEffect(() => {
    async function loadSubscription() {
      const [storedSubscriptions, settings] = await Promise.all([
        getSubscriptions(),
        getSettings(),
      ]);
      const selectedSubscription =
        storedSubscriptions.find((item) => item.id === id) ?? null;

      setCurrency(settings.currency);

      if (selectedSubscription) {
        setSubscription(selectedSubscription);
        setName(selectedSubscription.name);
        setAmount(String(selectedSubscription.amount));
        setBillingCycle(selectedSubscription.billingCycle);
        setCategory(selectedSubscription.category ?? 'other');
        setNextPaymentDate(
          selectedSubscription.nextPaymentDate === 'Not set'
            ? ''
            : selectedSubscription.nextPaymentDate
        );
        setSeatsIncluded(
          selectedSubscription.seatsIncluded === undefined
            ? ''
            : String(selectedSubscription.seatsIncluded)
        );
        setSeatsUsed(
          selectedSubscription.seatsUsed === undefined
            ? ''
            : String(selectedSubscription.seatsUsed)
        );
      }

      setIsLoading(false);
    }

    void loadSubscription();
  }, [id]);

  function validateForm() {
    const nextErrors: {
      name?: string;
      amount?: string;
      date?: string;
      seats?: string;
    } = {};

    if (!name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    if (normalizedAmount === null || normalizedAmount <= 0) {
      nextErrors.amount = 'Amount must be greater than 0.';
    }

    if (normalizedNextPaymentDate === null) {
      nextErrors.date = 'Use YYYY-MM-DD or leave it empty.';
    }

    if (normalizedSeatsIncluded === null || normalizedSeatsUsed === null) {
      nextErrors.seats = 'Seats must be positive whole numbers.';
    }

    if (
      normalizedSeatsIncluded === undefined &&
      normalizedSeatsUsed !== null &&
      normalizedSeatsUsed !== undefined
    ) {
      nextErrors.seats = 'Seats included is required when seats used is set.';
    }

    if (
      normalizedSeatsIncluded !== null &&
      normalizedSeatsIncluded !== undefined &&
      normalizedSeatsUsed !== null &&
      normalizedSeatsUsed !== undefined &&
      normalizedSeatsUsed > normalizedSeatsIncluded
    ) {
      nextErrors.seats = 'Seats used cannot be greater than seats included.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (isSaving || subscription === null) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (
      normalizedAmount === null ||
      normalizedNextPaymentDate === null ||
      normalizedSeatsIncluded === null ||
      normalizedSeatsUsed === null
    ) {
      return;
    }

    setIsSaving(true);

    await updateSubscription({
      ...subscription,
      name: name.trim(),
      amount: normalizedAmount,
      billingCycle,
      category,
      nextPaymentDate: normalizedNextPaymentDate ?? 'Not set',
      seatsIncluded: normalizedSeatsIncluded,
      seatsUsed: normalizedSeatsUsed,
    });

    setIsSaving(false);
    router.replace('/subscriptions');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Edit subscription</Text>
            <Text style={styles.subtitle}>
              Update the recurring payment details saved on this device.
            </Text>
          </View>

          {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Loading subscription...</Text>
          </View>
        ) : subscription === null ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Subscription not found</Text>
            <Text style={styles.stateText}>
              It may have been deleted from this device.
            </Text>
            <Pressable onPress={() => router.replace('/subscriptions')} style={styles.button}>
              <Text style={styles.buttonText}>Back to subscriptions</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={setName}
                onSubmitEditing={() => amountInputRef.current?.focus()}
                placeholder="Netflix"
                placeholderTextColor={colors.placeholder}
                returnKeyType="next"
                style={[styles.input, errors.name ? styles.inputError : undefined]}
                value={name}
              />
              {errors.name ? (
                <View style={styles.errorMessage}>
                  <Text style={styles.errorText}>{errors.name}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Amount ({currency})</Text>
              <TextInput
                inputMode="decimal"
                keyboardType="decimal-pad"
                onChangeText={setAmount}
                onSubmitEditing={Keyboard.dismiss}
                placeholder="9.99"
                placeholderTextColor={colors.placeholder}
                ref={amountInputRef}
                returnKeyType="next"
                style={[styles.input, errors.amount ? styles.inputError : undefined]}
                value={amount}
              />
              {errors.amount ? (
                <View style={styles.errorMessage}>
                  <Text style={styles.errorText}>{errors.amount}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Billing cycle</Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  onPress={() => setBillingCycle('monthly')}
                  style={[
                    styles.segmentButton,
                    billingCycle === 'monthly'
                      ? styles.segmentButtonActive
                      : undefined,
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
                    billingCycle === 'yearly'
                      ? styles.segmentButtonActive
                      : undefined,
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
              <Text style={styles.label}>Category</Text>
              <View style={styles.categorySelector}>
                {CATEGORY_OPTIONS.map((option) => {
                  const isSelected = option.value === category;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setCategory(option.value)}
                      style={[
                        styles.categoryChip,
                        isSelected ? styles.categoryChipActive : undefined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryMarker,
                          { color: option.meta.color },
                          isSelected ? styles.categoryChipTextActive : undefined,
                        ]}
                      >
                        {option.meta.marker}
                      </Text>
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected ? styles.categoryChipTextActive : undefined,
                        ]}
                      >
                        {option.meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Next payment date</Text>
              <Pressable
                onPress={handleOpenDatePicker}
                style={[styles.input, errors.date ? styles.inputError : undefined]}
              >
                <Text
                  style={[
                    styles.dateText,
                    nextPaymentDate ? undefined : styles.datePlaceholder,
                  ]}
                >
                  {nextPaymentDate ? formatDisplayDate(nextPaymentDate) : 'Not set'}
                </Text>
              </Pressable>
              <Pressable onPress={handleClearDate} style={styles.clearDateButton}>
                <Text style={styles.clearDateText}>Clear date</Text>
              </Pressable>
              {showDatePicker && Platform.OS === 'ios' ? (
                <View style={styles.iosDatePickerCard}>
                  <DateTimePicker
                    display="spinner"
                    mode="date"
                    onChange={handleDateChange}
                    value={pickerDate}
                  />
                  <Pressable
                    onPress={() => setShowDatePicker(false)}
                    style={styles.iosDatePickerDone}
                  >
                    <Text style={styles.iosDatePickerDoneText}>Done</Text>
                  </Pressable>
                </View>
              ) : null}
              {showDatePicker && Platform.OS === 'android' ? (
                <DateTimePicker
                  display="default"
                  mode="date"
                  onChange={handleDateChange}
                  value={pickerDate}
                />
              ) : null}
              {errors.date ? (
                <View style={styles.errorMessage}>
                  <Text style={styles.errorText}>{errors.date}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Shared plan seats</Text>
              <View style={styles.inlineFields}>
                <TextInput
                  inputMode="numeric"
                  keyboardType="number-pad"
                  onChangeText={setSeatsIncluded}
                  placeholder="Seats included"
                  placeholderTextColor={colors.placeholder}
                  style={[
                    styles.input,
                    styles.inlineInput,
                    errors.seats ? styles.inputError : undefined,
                  ]}
                  value={seatsIncluded}
                />
                <TextInput
                  inputMode="numeric"
                  keyboardType="number-pad"
                  onChangeText={setSeatsUsed}
                  placeholder="Seats used"
                  placeholderTextColor={colors.placeholder}
                  style={[
                    styles.input,
                    styles.inlineInput,
                    errors.seats ? styles.inputError : undefined,
                  ]}
                  value={seatsUsed}
                />
              </View>
              {errors.seats ? (
                <View style={styles.errorMessage}>
                  <Text style={styles.errorText}>{errors.seats}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                disabled={isSaving}
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                    return;
                  }

                  router.replace('/subscriptions');
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isSaving}
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  pressed ? styles.buttonPressed : undefined,
                  isSaving ? styles.buttonDisabled : undefined,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Save changes</Text>
                )}
              </Pressable>
            </View>
          </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  screen: {
    flexGrow: 1,
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
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
  form: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  field: {
    gap: spacing.sm,
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
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: colors.primary,
  },
  categoryMarker: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
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
  dateText: {
    color: colors.textMain,
    fontSize: typography.body,
  },
  datePlaceholder: {
    color: colors.placeholder,
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  clearDateText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  iosDatePickerCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
  },
  iosDatePickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iosDatePickerDoneText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  inlineFields: {
    gap: spacing.sm,
  },
  inlineInput: {
    width: '100%',
  },
  inputError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  errorMessage: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  primaryButton: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  secondaryButtonText: {
    color: colors.textMain,
    fontSize: typography.body,
    fontWeight: '600',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.textMain,
    fontSize: typography.section,
    fontWeight: '700',
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
    textAlign: 'center',
  },
});
