import { useNetInfo } from '@react-native-community/netinfo';

export function useOffline() {
  const network = useNetInfo();
  return network.isConnected === false || network.isInternetReachable === false;
}
