import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  getSettings,
  setI18nLocale,
  updateCurrency,
  updateLanguage,
  useTranslation,
} from '@talo/core';
import type { AppLanguage, CurrencyCode } from '@talo/core';

import {
  exportBackupFile,
  restoreBackupFile,
} from '../../src/services/expensesService';
import { CURRENCY_OPTIONS } from '../../src/constants/currencies';

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const { t } = useTranslation();

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();
    setCurrency(settings.currency);
    setLanguage(settings.language);
    setI18nLocale(settings.language);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const selectedCurrency =
    CURRENCY_OPTIONS.find((item) => item.code === currency) ?? CURRENCY_OPTIONS[0];

  const LANGUAGE_OPTIONS: { code: AppLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Espa\u00f1ol' },
    { code: 'pt', label: 'Portugu\u00eas' },
  ];

  const selectedLanguage =
    LANGUAGE_OPTIONS.find((item) => item.code === language) ?? LANGUAGE_OPTIONS[0];

  const getCurrencyOptionText = useCallback(
    (option: (typeof CURRENCY_OPTIONS)[number]) =>
      Platform.OS === 'android'
        ? `${option.symbol} ${option.code} - ${option.label}`
        : `${option.flag} ${option.code} - ${option.label}`,
    []
  );

  const getSelectedCurrencyText = useCallback(
    (option: (typeof CURRENCY_OPTIONS)[number]) =>
      Platform.OS === 'android'
        ? `${option.symbol} ${option.code}`
        : `${option.flag} ${option.code}`,
    []
  );

  const handleCurrencySelect = useCallback(async (code: CurrencyCode) => {
    const updated = await updateCurrency(code);
    setCurrency(updated.currency);
    setIsCurrencyModalVisible(false);
  }, []);

  const handleSelectCurrency = () => {
    if (Platform.OS === 'android') {
      setIsCurrencyModalVisible(true);
      return;
    }

    Alert.alert(
      t('settings.selectCurrencyTitle'),
      t('settings.selectCurrencyMessage'),
      [
        ...CURRENCY_OPTIONS.map((option) => ({
          text: getCurrencyOptionText(option),
          onPress: async () => {
            await handleCurrencySelect(option.code);
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  };

  const handleSelectLanguage = () => {
    Alert.alert(
      t('settings.selectLanguageTitle'),
      t('settings.selectLanguageMessage'),
      [
        ...LANGUAGE_OPTIONS.map((option) => ({
          text: option.label,
          onPress: async () => {
            const updated = await updateLanguage(option.code);
            setLanguage(updated.language);
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      await exportBackupFile();
    } catch (error) {
      Alert.alert(
        t('settings.backupErrorTitle'),
        error instanceof Error
          ? error.message
          : t('settings.backupErrorMessage')
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = async () => {
    Alert.alert(
      t('settings.restoreConfirmTitle'),
      t('settings.restoreConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.restoreBackup'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsRestoring(true);
              const restoredCount = await restoreBackupFile();

              if (restoredCount === -1) return;

              Alert.alert(
                t('settings.backupRestoredTitle'),
                t('settings.expensesRestored', { count: restoredCount })
              );
            } catch (error) {
              Alert.alert(
                t('settings.restoreErrorTitle'),
                error instanceof Error
                  ? error.message
                  : t('settings.restoreErrorMessage')
              );
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
          <Text style={styles.sectionText}>
            {t('settings.dataDescription')}
          </Text>

          <Pressable
            style={[styles.primaryButton, isExporting && styles.disabled]}
            onPress={handleExportBackup}
            disabled={isExporting || isRestoring}
          >
            <Text style={styles.primaryButtonText}>
              {isExporting ? t('settings.exporting') : t('settings.exportBackup')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, isRestoring && styles.disabled]}
            onPress={handleRestoreBackup}
            disabled={isExporting || isRestoring}
          >
            <Text style={styles.secondaryButtonText}>
              {isRestoring ? t('settings.restoring') : t('settings.restoreBackup')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>

          <Pressable style={styles.preferenceRow} onPress={handleSelectCurrency}>
            <Text style={styles.preferenceLabel}>{t('settings.currency')}</Text>
            <Text style={styles.preferenceValue}>
              {getSelectedCurrencyText(selectedCurrency)}
            </Text>
          </Pressable>

          <Pressable style={styles.preferenceRow} onPress={handleSelectLanguage}>
            <Text style={styles.preferenceLabel}>{t('settings.language')}</Text>
            <Text style={styles.preferenceValue}>
              {selectedLanguage.label}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>

          <Text style={styles.aboutText}>
            {t('settings.deviceStorageNote')}
          </Text>
          <Text style={styles.aboutVersion}>
            {'Talo \u00b7 v1.1'}
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            {t('settings.warningRestore')}
          </Text>
        </View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={isCurrencyModalVisible}
        onRequestClose={() => setIsCurrencyModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.selectCurrencyTitle')}</Text>
            <Text style={styles.modalText}>{t('settings.selectCurrencyMessage')}</Text>

            <ScrollView
              style={styles.currencyList}
              contentContainerStyle={styles.currencyListContent}
              showsVerticalScrollIndicator={false}
            >
              {CURRENCY_OPTIONS.map((option) => {
                const isSelected = option.code === currency;

                return (
                  <Pressable
                    key={option.code}
                    style={[
                      styles.currencyOption,
                      isSelected && styles.currencyOptionSelected,
                    ]}
                    onPress={() => {
                      handleCurrencySelect(option.code);
                    }}
                  >
                    <Text
                      style={[
                        styles.currencyOptionText,
                        isSelected && styles.currencyOptionTextSelected,
                      ]}
                    >
                      {getCurrencyOptionText(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={styles.modalSecondaryButton}
              onPress={() => setIsCurrencyModalVisible(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 22,
  },

  section: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 6,
  },

  sectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },

  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },

  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: colors.textMain,
    fontWeight: '700',
    fontSize: 15,
  },

  disabled: {
    opacity: 0.6,
  },

  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  preferenceLabel: {
    fontSize: 15,
    color: colors.textMain,
    fontWeight: '600',
  },

  preferenceValue: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },

  aboutVersion: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  warningCard: {
    marginTop: 6,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 14,
    padding: 14,
  },

  warningText: {
    fontSize: 13,
    color: colors.textMain,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 8,
  },

  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 16,
  },

  currencyList: {
    marginBottom: 16,
  },

  currencyListContent: {
    gap: 8,
  },

  currencyOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },

  currencyOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  currencyOptionText: {
    fontSize: 15,
    color: colors.textMain,
  },

  currencyOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },

  modalSecondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  modalSecondaryButtonText: {
    color: colors.textMain,
    fontSize: 15,
    fontWeight: '700',
  },
});
