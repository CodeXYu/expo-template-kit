import { StyleSheet } from 'react-native';
import { BasePage, ThemedText } from 'expo-template-kit';

import { useHomePageLogic } from './index.logic';

export default function HomePage() {
  const { description, offlineHint, showOfflineHint, title } = useHomePageLogic();

  return (
    <BasePage title={title} showBack={false} scrollEnabled={false} contentStyle={styles.content}>
      <ThemedText type="title">{title}</ThemedText>
      <ThemedText>{description}</ThemedText>
      {showOfflineHint ? <ThemedText>{offlineHint}</ThemedText> : null}
    </BasePage>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
});
