import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type DropdownOption = {
  label: string;
  value: string;
};

type FilterDropdownProps = {
  label: string;
  options: DropdownOption[];
  selectedValue: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

export default function FilterDropdown({
  label,
  options,
  selectedValue,
  isOpen,
  onToggle,
  onSelect,
}: FilterDropdownProps) {
  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <View style={[styles.container, isOpen && styles.containerOpen]}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.selector, isOpen && styles.selectorOpen]}
        onPress={onToggle}
      >
        <Text style={styles.selectorText} numberOfLines={1}>
          {selectedOption ? selectedOption.label : selectedValue}
        </Text>

        <Text style={styles.arrow}>{isOpen ? '▴' : '▾'}</Text>
      </Pressable>

      {isOpen && (
        <View style={styles.dropdown}>
          {options.map((option, index) => {
            const isSelected = selectedValue === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  styles.option,
                  index > 0 && styles.optionWithBorder,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() => onSelect(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    zIndex: 1,
  },

  containerOpen: {
    zIndex: 1000,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },

  selector: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.card,
  },

  selectorOpen: {
    borderColor: colors.primary,
  },

  selectorText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMain,
    fontWeight: '500',
  },

  arrow: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  option: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },

  optionWithBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  optionSelected: {
    backgroundColor: colors.primarySoft,
  },

  optionText: {
    fontSize: 14,
    color: colors.textMain,
  },

  optionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});