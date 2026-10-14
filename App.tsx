import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface CounterState {
  count: number;
  lastUpdated: string | null;
}

export default function App() {
  const [state, setState] = useState<CounterState>({
    count: 0,
    lastUpdated: null,
  });

  const increment = (): void => {
    setState((prev) => ({
      count: prev.count + 1,
      lastUpdated: new Date().toLocaleTimeString(),
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.card}>
        <Text style={styles.title}>FHTW CPD — Expo Starter</Text>
        <Text style={styles.counterText}>Count: {state.count}</Text>
        {state.lastUpdated && (
          <Text style={styles.subtext}>Last update: {state.lastUpdated}</Text>
        )}

        <TouchableOpacity style={styles.button} onPress={increment}>
          <Text style={styles.buttonText}>Increment Counter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1e293b',
  },
  counterText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#2563eb',
    marginVertical: 8,
  },
  subtext: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
