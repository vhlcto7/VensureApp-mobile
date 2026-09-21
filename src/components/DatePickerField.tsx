import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, spacing, typography } from '../theme';
import {
  formatDisplayDate,
  getTodayDateString,
  toIsoDateString,
} from '../features/quote/helpers';

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  helper?: string;
  editable?: boolean;
  allowClear?: boolean;
  required?: boolean;
  minimumDate?: string;
  maximumDate?: string;
};

function parseLocalDate(value?: string) {
  const iso = toIsoDateString(value);
  if (!iso) return undefined;
  const [year, month, day] = iso.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function DatePickerField({
  label,
  value,
  onChange,
  error,
  placeholder = 'Select date',
  helper,
  editable = true,
  allowClear = false,
  required = false,
  minimumDate,
  maximumDate,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const pickerValue = selected ?? parseLocalDate(getTodayDateString()) ?? new Date();
  const displayValue = selected ? formatDisplayDate(toIsoDateString(value)) : '';

  function closePicker() {
    setOpen(false);
  }

  function handleChange(event: DateTimePickerEvent, nextDate?: Date) {
    if (Platform.OS === 'android') {
      closePicker();
    }
    if (event.type === 'dismissed') return;
    if (event.type === 'neutralButtonPressed') {
      onChange('');
      return;
    }
    if (nextDate) {
      onChange(getTodayDateString(nextDate));
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, required ? styles.labelRequired : null]}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !editable }}
        disabled={!editable}
        onPress={() => {
          if (editable) setOpen(true);
        }}
        style={[
          styles.field,
          open ? styles.fieldFocused : null,
          error ? styles.fieldError : null,
          !editable ? styles.fieldDisabled : null,
        ]}
      >
        <Text style={displayValue ? styles.value : styles.placeholder}>
          {displayValue || placeholder}
        </Text>
        {allowClear && displayValue && editable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            hitSlop={8}
            onPress={() => onChange('')}
          >
            <Ionicons name="close-circle" size={18} color={colors.slate400} />
          </Pressable>
        ) : (
          <Ionicons name="calendar-outline" size={18} color={colors.slate500} />
        )}
      </Pressable>
      {helper && !error ? <Text style={styles.helper}>{helper}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open && editable ? (
        Platform.OS === 'ios' ? (
          <View style={styles.iosPicker}>
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display="inline"
              onChange={handleChange}
              minimumDate={parseLocalDate(minimumDate)}
              maximumDate={parseLocalDate(maximumDate)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={closePicker}
              style={styles.done}
            >
              <Text style={styles.doneLabel}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="calendar"
            onChange={handleChange}
            minimumDate={parseLocalDate(minimumDate)}
            maximumDate={parseLocalDate(maximumDate)}
            neutralButton={allowClear ? { label: 'Clear' } : undefined}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.slate700,
  },
  labelRequired: {
    color: colors.sky700,
    fontWeight: '700',
  },
  requiredMark: {
    color: colors.rose600,
    fontWeight: '800',
  },
  field: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldFocused: {
    borderColor: colors.primaryCta,
  },
  fieldError: {
    borderColor: colors.rose600,
  },
  fieldDisabled: {
    backgroundColor: colors.slate50,
  },
  value: {
    flex: 1,
    ...typography.body,
    color: colors.foreground,
    paddingVertical: spacing.md,
  },
  placeholder: {
    flex: 1,
    ...typography.body,
    color: colors.slate400,
    paddingVertical: spacing.md,
  },
  helper: {
    ...typography.caption,
    color: colors.slate500,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
  iosPicker: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  done: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  doneLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.primaryCta,
  },
});
