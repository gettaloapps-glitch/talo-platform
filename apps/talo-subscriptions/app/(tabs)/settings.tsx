import { useFocusEffect } from '@react-navigation/native';
import {
  colors,
  getSettings,
  radius,
  spacing,
  typography,
  updateCurrency,
} from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: 'EUR' },
  { code: 'GBP', label: 'British Pound', symbol: 'GBP' },
  { code: 'ARS', label: 'Argentine Peso', symbol: '$' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', label: 'Mexican Peso', symbol: '$' },
  { code: 'CLP', label: 'Chilean Peso', symbol: '$' },
  { code: 'COP', label: 'Colombian Peso', symbol: '$' },
  { code: 'PEN', label: 'Peruvian Sol', symbol: 'S/' },
];

export default function SettingsScreen() {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();

    setCurrency(settings.currency);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings])
  );

  const selectedCurrency =
    CURRENCY_OPTIONS.find((option) => option.code === currency) ??
    CURRENCY_OPTIONS[0];

  const handleCurrencySelect = useCallback(async (code: CurrencyCode) => {
    const updated = await updateCurrency(code);

    setCurrency(updated.currency);
  }, []);

  function handleSelectCurrency() {
    Alert.alert('Select currency', 'Choose the currency for subscriptions.', [
      ...CURRENCY_OPTIONS.map((option) => ({
        text: `${option.symbol} ${option.code} - ${option.label}`,
        onPress: async () => {
          await handleCurrencySelect(option.code);
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function handleSelectLanguage() {
    Alert.alert(
      'Language',
      'Language settings will be added when subscriptions has i18n support.'
    );
  }

  async function handleExportBackup() {
    setIsExporting(true);
    Alert.alert(
      'Export coming soon',
      'Subscription export needs file sharing support before it can be enabled.'
    );
    setIsExporting(false);
  }

  function handleRestoreBackup() {
    Alert.alert(
      'Restore backup?',
      'Restore will replace local subscription data when backup support is enabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            setIsRestoring(true);
            Alert.alert(
              'Restore coming soon',
              'Subscription restore needs file picker support before it can be enabled.'
            );
            setIsRestoring(false);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <Text style={styles.sectionText}>
            Manage subscription backups stored on this device.
          </Text>

          <Pressable
            disabled={isExporting || isRestoring}
            onPress={handleExportBackup}
            style={[styles.primaryButton, isExporting ? styles.disabled : undefined]}
          >
            <Text style={styles.primaryButtonText}>
              {isExporting ? 'Exporting...' : 'Export backup'}
            </Text>
          </Pressable>

          <Pressable
            disabled={isExporting || isRestoring}
            onPress={handleRestoreBackup}
            style={[
              styles.secondaryButton,
              isRestoring ? styles.disabled : undefined,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {isRestoring ? 'Restoring...' : 'Restore backup'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <Pressable style={styles.preferenceRow} onPress={handleSelectCurrency}>
            <Text style={styles.preferenceLabel}>Currency</Text>
            <Text style={styles.preferenceValue}>
              {selectedCurrency.symbol} {selectedCurrency.code}
            </Text>
          </Pressable>

          <Pressable
            accessibilityState={{ disabled: true }}
            disabled
            style={[styles.preferenceRow, styles.disabledPreferenceRow]}
            onPress={handleSelectLanguage}
          >
            <Text style={styles.preferenceLabel}>Language</Text>
            <Text style={styles.preferenceValue}>Coming soon</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            Subscriptions are saved locally on this device.
          </Text>
          <Text style={styles.aboutVersion}>Talo Subscriptions MVP</Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Restoring a backup will replace subscriptions stored on this device
            once backup support is enabled.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  title: {
    color: colors.textMain,
    fontSize: typography.title,
    fontWeight: '700',
    marginBottom: spacing.xxl,
  },
  section: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  sectionTitle: {
    color: colors.textMain,
    fontSize: typography.section,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.lg,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.lg,
  },
  secondaryButtonText: {
    color: colors.textMain,
    fontSize: typography.body,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  disabledPreferenceRow: {
    opacity: 0.6,
  },
  preferenceLabel: {
    color: colors.textMain,
    fontSize: typography.body,
    fontWeight: '600',
  },
  preferenceValue: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  aboutText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  aboutVersion: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xs,
    padding: spacing.lg,
  },
  warningText: {
    color: colors.textMain,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});
