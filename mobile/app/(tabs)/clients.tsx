/**
 * Clients Screen
 * Manage client database
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { get } from '../../lib/api';
import { getAccessToken } from '../../lib/storage';
import { ListCard, Badge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { Client, EntityTypeLabels } from '../../types';
import { API_CONFIG } from '../../constants/config';

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    try {
      const data = await get<{ clients: Client[] }>('/referrer/clients');
      setClients(data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClients();
  }, [fetchClients]);

  // Download CSV
  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const token = await getAccessToken();
      const timestamp = new Date().getTime();
      const fileName = `Clients-${timestamp}.csv`;

      if (Platform.OS === 'web') {
        // Web: use fetch + blob download
        const response = await fetch(`${API_CONFIG.BASE_URL}/referrer/clients/export/csv`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to download CSV');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Native: download to file system then share
        const fileUri = FileSystem.documentDirectory + fileName;
        const result = await FileSystem.downloadAsync(
          `${API_CONFIG.BASE_URL}/referrer/clients/export/csv`,
          fileUri,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (result.status !== 200) {
          throw new Error('Failed to download CSV');
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Clients CSV',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Success', `CSV saved to ${result.uri}`);
        }
      }
    } catch (error) {
      console.error('CSV download failed:', error);
      Alert.alert('Error', 'Failed to download CSV. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Filter clients by search
  const filteredClients = clients.filter((client) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.entity_name?.toLowerCase().includes(query) ||
      client.contact_first_name?.toLowerCase().includes(query) ||
      client.contact_last_name?.toLowerCase().includes(query) ||
      client.contact_email?.toLowerCase().includes(query)
    );
  });

  // Get contact name
  const getContactName = (client: Client) => {
    const parts = [client.contact_first_name, client.contact_last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '-';
  };

  // Render client item
  const renderItem = ({ item }: { item: Client }) => (
    <ListCard
      title={item.entity_name || 'Unknown'}
      subtitle={getContactName(item)}
      leftIcon={
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.entity_name || 'U')[0].toUpperCase()}
          </Text>
        </View>
      }
      rightContent={
        item.opportunities_count ? (
          <Badge
            label={`${item.opportunities_count}`}
            variant="info"
            size="sm"
          />
        ) : undefined
      }
      onPress={() => router.push(`/client/${item._id}`)}
    />
  );

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={Colors.gray[300]} />
      <Text style={styles.emptyTitle}>No clients yet</Text>
      <Text style={styles.emptyText}>
        Clients will be added when you create opportunities
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { flex: 1 }]}>
            <Ionicons name="search-outline" size={20} color={Colors.gray[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients"
              placeholderTextColor={Colors.gray[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.csvButton, (isDownloading || clients.length === 0) && styles.csvButtonDisabled]}
            onPress={handleDownloadCSV}
            disabled={isDownloading || clients.length === 0}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#1a8cba" />
            ) : (
              <Ionicons name="download-outline" size={20} color={clients.length === 0 ? Colors.gray[300] : '#1a8cba'} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredClients}
        renderItem={renderItem}
        keyExtractor={(item, index) => item._id || `client-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: Colors.white,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray[900],
  },
  csvButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1a8cba',
    alignItems: 'center',
    justifyContent: 'center',
  },
  csvButtonDisabled: {
    borderColor: Colors.gray[200],
  },
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultsText: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[700],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
