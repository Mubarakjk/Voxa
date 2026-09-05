import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors, layout, radius, spacing } from '../../constants/theme';
import { VoxaText } from './voxa-text';

type AuthFormFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthFormField({ label, error, style, ...props }: AuthFormFieldProps) {
  return (
    <View style={styles.wrap}>
      <VoxaText variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </VoxaText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? (
        <VoxaText variant="caption" color="danger">
          {error}
        </VoxaText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
    minWidth: 0,
    gap: spacing.sm,
  },
  label: {
    alignSelf: 'stretch',
  },
  input: {
    width: '100%',
    alignSelf: 'stretch',
    minWidth: 0,
    backgroundColor: colors.surfaceQuiet,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md12,
    minHeight: layout.minTapTarget + 4,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  inputError: { borderColor: colors.danger },
});
