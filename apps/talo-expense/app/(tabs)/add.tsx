import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_ICONS,
  ExpenseCategory,
} from '../../src/constants/categories';
import {
  createExpense,
  editExpense,
  getAllExpenses,
  getExpense,
} from '../../src/services/expensesService';
import { colors, getSettings, Toast, useTranslation } from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import { Expense } from '../../src/types/expense';
import { getTodayDate } from '../../src/utils/date';

function formatDateToInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseInputDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getCurrencyPrefix(currency: CurrencyCode): string {
  switch (currency) {
    case 'BRL':
      return 'R$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'PEN':
      return 'S/';
    default:
      return '$';
  }
}

export default function AddScreen() {
  const params = useLocalSearchParams<{ expenseId?: string }>();
  const expenseId =
    typeof params.expenseId === 'string' && params.expenseId.length > 0
      ? params.expenseId
      : null;

  const amountInputRef = useRef<TextInput | null>(null);
  const scheduleAmountFocus = useCallback((delay = 250) => {
    const timeout = setTimeout(() => {
      amountInputRef.current?.focus();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  const { t } = useTranslation();
  const [amount, setAmount] = useState(0);
  const [amountFormatted, setAmountFormatted] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [description, setDescription] = useState('');
  const [isExceptional, setIsExceptional] = useState(false);
  const [date, setDate] = useState(getTodayDate());
  const [isLoadingExpense, setIsLoadingExpense] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [recentCategories, setRecentCategories] = useState<ExpenseCategory[]>([]);
  const isEditMode = Boolean(expenseId);


  const formatAmount = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (!numeric) return '';
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getRecentCategoriesFromExpenses = useCallback((expenses: Expense[]) => {
    return [...expenses]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((expense) => expense.category)
      .filter(
        (item, index, array): item is ExpenseCategory =>
          Boolean(item) && array.indexOf(item) === index
      )
      .slice(0, 3);
  }, []);

  const resetForm = useCallback(() => {
    setAmount(0);
    setAmountFormatted('');
    setCategory('');
    setDescription('');
    setIsExceptional(false);
    setDate(getTodayDate());
    setShowDatePicker(false);
  }, []);

  useEffect(() => {
    const loadExpenseToEdit = async () => {
      if (!expenseId) {
        resetForm();
        return;
      }

      setIsLoadingExpense(true);

      try {
        const expense = await getExpense(expenseId);

        if (!expense) {
          Alert.alert(t('expense.errorTitle'), t('expense.expenseNotFound'));
          router.setParams({ expenseId: '' });
          resetForm();
          router.replace('/expenses');
          return;
        }

        setAmount(expense.amount);
        setAmountFormatted(formatAmount(String(expense.amount)));
        setCategory(expense.category);
        setDescription(expense.description ?? '');
        setIsExceptional(expense.exceptional);
        setDate(expense.date);
      } finally {
        setIsLoadingExpense(false);
      }
    };

    loadExpenseToEdit();
  }, [expenseId, resetForm]);

  useFocusEffect(
    useCallback(() => {
      if (!expenseId) {
        resetForm();
      }
    }, [expenseId, resetForm])
  );

  useFocusEffect(
    useCallback(() => {
      const loadCurrency = async () => {
        const settings = await getSettings();
        setCurrency(settings.currency);
      };

      loadCurrency();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (isLoadingExpense) {
        return;
      }

      return scheduleAmountFocus();
    }, [isLoadingExpense, scheduleAmountFocus])
  );

  useFocusEffect(
    useCallback(() => {
      const loadRecentCategories = async () => {
        const expenses = await getAllExpenses();
        setRecentCategories(getRecentCategoriesFromExpenses(expenses));
      };

      loadRecentCategories();
    }, [getRecentCategoriesFromExpenses])
  );

  const handleOpenDatePicker = () => {
    amountInputRef.current?.blur();
    Keyboard.dismiss();

    if (Platform.OS === 'ios') {
      setTimeout(() => {
        setShowDatePicker(true);
      }, 150);
      return;
    }

    setShowDatePicker(true);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (event.type === 'dismissed' || !selectedDate) {
      setShowDatePicker(false);
      return;
    }

    setDate(formatDateToInput(selectedDate));

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 1400);
  };

  const handleSaveExpense = async () => {
    if (isSaving) {
      return;
    }

    if (amount <= 0) {
      Alert.alert(t('expense.invalidAmountTitle'), t('expense.invalidAmountMessage'));
      return;
    }

    if (!category) {
      Alert.alert(t('expense.missingCategoryTitle'), t('expense.missingCategoryMessage'));
      return;
    }

    if (!date.trim()) {
      Alert.alert(t('expense.missingDateTitle'), t('expense.missingDateMessage'));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = parseInputDate(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      Alert.alert(t('expense.invalidDateTitle'), t('expense.invalidDateMessage'));
      return;
    }

    try {
      setIsSaving(true);

      if (expenseId) {
        const updatedExpense: Expense = {
          id: expenseId,
          amount,
          category,
          date,
          description: description.trim(),
          exceptional: isExceptional,
        };

        await editExpense(updatedExpense);

        showToast(t('expense.updated'));

        setTimeout(() => {
          router.setParams({ expenseId: '' });
          resetForm();
          router.replace('/expenses');
        }, 700);

        return;
      }

      const newExpense: Expense = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        amount,
        category,
        date,
        description: description.trim(),
        exceptional: isExceptional,
      };

      await createExpense(newExpense);

      const updatedExpenses = await getAllExpenses();
      setRecentCategories(getRecentCategoriesFromExpenses(updatedExpenses));

      showToast(t('expense.saved'));

      resetForm();
      scheduleAmountFocus(150);
    } catch (error) {
      console.log('Error saving expense', error);
      Alert.alert(t('expense.errorTitle'), t('expense.saveErrorMessage'));
    } finally {
      setIsSaving(false);
    }
  };

  const saveButtonLabel = isEditMode
    ? isSaving
      ? t('expense.updating')
      : t('expense.update')
    : isSaving
      ? t('expense.saving')
      : t('expense.save');

  const isFormDisabled = isLoadingExpense || isSaving;
  const pickerDate = parseInputDate(date);
  const currencyPrefix = getCurrencyPrefix(currency);


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            {isEditMode ? t('expense.editTitle') : t('expense.addTitle')}
          </Text>

          <Text style={styles.subtitle}>
            {isEditMode ? t('expense.editSubtitle') : t('expense.addSubtitle')}
          </Text>

          <View style={styles.amountCard}>
            <View style={styles.amountHeader}>
              <Text style={styles.amountLabel}>{t('expense.amount')}</Text>

              <Toast
                visible={toastVisible}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
              />
            </View>

            {recentCategories.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.label}>{t('expense.recentCategories')}</Text>

                <View style={styles.recentCategoriesWrap}>
                  {recentCategories.map((item) => {
                    const isSelected = category === item;

                    return (
                      <Pressable
                        key={`recent-${item}`}
                        disabled={isFormDisabled}
                        style={[
                          styles.recentCategoryChip,
                          isSelected && styles.recentCategoryChipSelected,
                          isFormDisabled && styles.chipDisabled,
                        ]}
                        onPress={() => setCategory(item)}
                      >
                        <View style={styles.chipContent}>
                          <Text style={styles.chipIcon}>
                            {EXPENSE_CATEGORY_ICONS[item]}
                          </Text>
                          <Text
                            style={[
                              styles.recentCategoryChipText,
                              isSelected && styles.recentCategoryChipTextSelected,
                            ]}
                          >
                            {t(`expense.categories.${item}`)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}


            <TextInput
              ref={amountInputRef}
              style={[styles.amount, isFormDisabled && styles.inputDisabled]}
              placeholder={`${currencyPrefix} 0`}
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.primary}
              value={amountFormatted ? `${currencyPrefix} ${amountFormatted}` : ''}
              editable={!isFormDisabled}
              onChangeText={(text) => {
                const numeric = text.replace(/\D/g, '');
                setAmount(Number(numeric));
                setAmountFormatted(formatAmount(numeric));
              }}
              returnKeyType="done"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('expense.category')}</Text>

            <View style={styles.categoriesWrap}>
              {EXPENSE_CATEGORIES.map((item) => {
                const isSelected = category === item;

                return (
                  <Pressable
                    key={t(`expense.categories.${item}`)}
                    disabled={isFormDisabled}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                      isFormDisabled && styles.chipDisabled,
                    ]}
                    onPress={() => setCategory(item)}
                  >
                    <View style={styles.chipContent}>
                      <Text style={styles.chipIcon}>
                        {EXPENSE_CATEGORY_ICONS[item]}
                      </Text>
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {t(`expense.categories.${item}`)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('expense.date')}</Text>

            <Pressable
              style={[styles.input, styles.dateInput, isFormDisabled && styles.inputDisabled]}
              disabled={isFormDisabled}
              onPress={handleOpenDatePicker}
            >
              <Text style={styles.dateText}>{date}</Text>
            </Pressable>

            {showDatePicker && Platform.OS === 'ios' ? (
              <View style={styles.iosDatePickerCard}>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                />

                <Pressable
                  style={styles.iosDatePickerDone}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.iosDatePickerDoneText}>{t('common.done')}</Text>
                </Pressable>
              </View>
            ) : null}

            {showDatePicker && Platform.OS === 'android' ? (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            ) : null}
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>{t('expense.note')}</Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
                isFormDisabled && styles.inputDisabled,
              ]}
              placeholder={t('expense.optionalDescription')}
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.primary}
              value={description}
              editable={!isFormDisabled}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.exceptionalCard}>
            <View style={styles.exceptionalTextBlock}>
              <Text style={styles.exceptionalTitle}>
                {t('expense.exceptionalTitle')}
              </Text>
              <Text style={styles.exceptionalText}>
                {t('expense.exceptionalDescription')}
              </Text>
            </View>

            <Switch
              value={isExceptional}
              onValueChange={setIsExceptional}
              disabled={isFormDisabled}
              trackColor={{ false: colors.inputBorder, true: '#86EFAC' }}
              thumbColor={isExceptional ? colors.primary : '#F3F4F6'}
            />
          </View>
        </ScrollView>

        <View style={styles.stickyFooter}>
          <Pressable
            style={[
              styles.saveButton,
              isFormDisabled && styles.saveButtonDisabled,
            ]}
            disabled={isFormDisabled}
            onPress={handleSaveExpense}
          >
            <Text style={styles.saveButtonText}>{saveButtonLabel}</Text>
          </Pressable>
        </View>
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
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 120,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  amountCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textMain,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  section: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMain,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textMain,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  descriptionInput: {
    minHeight: 72,
  },
  dateText: {
    color: colors.textMain,
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
  },
  chipDisabled: {
    opacity: 0.6,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: colors.white,
  },
  exceptionalCard: {
    marginTop: 2,
    marginBottom: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  exceptionalTextBlock: {
    flex: 1,
  },
  exceptionalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },
  exceptionalText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  stickyFooter: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  recentCategoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  recentCategoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  recentCategoryChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  recentCategoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  recentCategoryChipTextSelected: {
    color: colors.primary,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  dateInput: {
    minHeight: 46,
    paddingVertical: 10,
  },

  iosDatePickerCard: {
    marginTop: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingTop: 6,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },

  iosDatePickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },

  iosDatePickerDoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
