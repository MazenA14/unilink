import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { RefreshControl, RefreshControlProps } from 'react-native';

type AppRefreshControlProps = Omit<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'> & {
  refreshing: boolean;
  onRefresh: () => void;
};

export function AppRefreshControl({ refreshing, onRefresh, ...rest }: AppRefreshControlProps) {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={palette.tabColor}
      colors={[palette.tabColor]}
      progressBackgroundColor={palette.background}
      {...rest}
    />
  );
}


