import { StyleSheet, View } from 'react-native';
import { Button, ThemedText, ThemedView } from 'expo-template-kit';

export type AppErrorAction = {
  accessibilityHint: string;
  label: string;
  loading?: boolean;
  onPress: () => void;
};

type AppErrorViewProps = {
  action: AppErrorAction;
  description: string;
  title: string;
};

/** Shared full-screen recovery UI for startup, routing, and page failures. */
export function AppErrorView({ action, description, title }: AppErrorViewProps) {
  return (
    <ThemedView style={styles.container} type="background">
      <View style={styles.content}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText themeColor="textSecondary">{description}</ThemedText>
        <Button
          accessibilityHint={action.accessibilityHint}
          accessibilityRole="button"
          label={action.label}
          loading={action.loading}
          onPress={action.onPress}
          style={styles.actionButton}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    gap: 16,
  },
  actionButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    width: 160,
  },
});
