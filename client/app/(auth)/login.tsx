import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      await login(email, data.token); // Store token and email, update auth state
      // Navigation to main app is handled by RootLayout effect
      // router.replace('/(app)/(tabs)'); // Or let RootLayout handle it
    } catch (e: any) {
      setError(e.message || 'An error occurred');
      Alert.alert('Login Error', e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
      <Link href="/(auth)/register" style={styles.link}>
        Don't have an account? Register
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  link: {
    marginTop: 15,
    textAlign: 'center',
    color: 'blue',
  },
});
