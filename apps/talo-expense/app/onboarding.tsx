import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function Onboarding() {

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      router.replace('/(tabs)');
    } catch (error) {
      console.log('Error saving onboarding flag', error);
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.logo}>💸</Text>

      <Text style={styles.title}>Expense Tracker</Text>

      <Text style={styles.subtitle}>
        Control your spending and understand where your money goes.
      </Text>

      <Pressable style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  logo: {
    fontSize: 72,
    marginBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
  },

  button: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

});