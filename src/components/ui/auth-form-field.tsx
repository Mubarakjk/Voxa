import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from './voxa-text';

type AuthFormFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthFormField({ label, error, style, ...props }: AuthFormFieldProps) {
  return (
    <View style={styles.wrap}>
      <VoxaText variant="caption" color="textSecondary">
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
  wrap: { gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: colors.danger },
});
