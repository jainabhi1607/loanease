/**
 * Login History Screen (admin only)
 * Shows recent login activity from /api/referrer/login-history
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../lib/api';
import { Colors } from '../../constants/colors';

interface LoginEntry {
  id: string;
  email: string;
  status: 'success' | 'failed' | 'blocked';
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  created_at: string;
}

interface LoginHistoryResponse {
  loginHistory: LoginEntry[];
  total: number;
}

const STATUS_META: Record<LoginEntry['status'], { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { label: 'Success', bg: '#D1FAE5', text: '#059669', icon: 'checkmark-circle' },
  failed: { label: 'Failed', bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle' },
  blocked: { label: 'Blocked', bg: '#FEF3C7', text: '#D97706', icon: 'shield-outline' },
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return iso;
  }
}

export default function LoginHistoryScreen() {
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const data = await get<LoginHistoryResponse>('/referrer/login-history?limit=50');
      setEntries(data.loginHistory || []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Failed to load login history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={40} color={Colors.gray[400]} />
        <Text style={styles.emptyText}>No login activity yet</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {entries.map((entry) => {
        const meta = STATUS_META[entry.status] || STATUS_META.success;
        return (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={14} color={meta.text} />
                <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
              </View>
              <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
            </View>

            {entry.ip_address && (
              <View style={styles.row}>
                <Ionicons name="globe-outline" size={14} color={Colors.gray[500]} />
                <Text style={styles.rowText}>{entry.ip_address}</Text>
              </View>
            )}

            {entry.failure_reason && (
              <View style={styles.row}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.gray[500]} />
                <Text style={styles.rowText}>{entry.failure_reason}</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.backgroundSecondary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.gray[500],
    fontSize: 14,
    marginTop: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowText: {
    fontSize: 13,
    color: Colors.gray[700],
  },
});
