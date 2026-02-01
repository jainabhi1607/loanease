/**
 * Opportunities Screen
 * List of opportunities with tabs for different statuses
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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../lib/api';
import { ListCard, StatusBadge, Button } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { Opportunity } from '../../types';

type TabType = 'opportunities' | 'drafts' | 'unqualified';

export default function OpportunitiesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('opportunities');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch opportunities
  const fetchOpportunities = useCallback(async () => {
    try {
      let data: Opportunity[] = [];

      if (activeTab === 'opportunities') {
        data = await get<Opportunity[]>('/referrer/opportunities?status=opportunity');
      } else if (activeTab === 'drafts') {
        data = await get<Opportunity[]>('/referrer/opportunities?status=draft');
      } else if (activeTab === 'unqualified') {
        // Unqualified has a separate endpoint with different response format
        const response = await get<{ opportunities: Opportunity[] }>('/referrer/opportunities/unqualified');
        // Map client_entity_name to borrowing_entity for consistency
        data = (response.opportunities || []).map(opp => ({
          ...opp,
          borrowing_entity: (opp as any).client_entity_name || '',
          contact_name: (opp as any).client_contact_name || '',
        }));
      }

      setOpportunities(data || []);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setIsLoading(true);
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Filter opportunities by search
  const filteredOpportunities = opportunities.filter((opp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      opp.opportunity_id?.toLowerCase().includes(query) ||
      opp.borrowing_entity?.toLowerCase().includes(query) ||
      opp.contact_name?.toLowerCase().includes(query)
    );
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Render opportunity item
  const renderItem = ({ item }: { item: Opportunity }) => (
    <ListCard
      title={item.borrowing_entity || item.contact_name || 'Unknown Client'}
      subtitle={`${item.opportunity_id} • ${formatCurrency(item.loan_amount || 0)}`}
      rightContent={<StatusBadge status={item.status} size="sm" />}
      onPress={() => router.push(`/opportunity/${item.id || item._id}`)}
    />
  );

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="briefcase-outline" size={64} color={Colors.gray[300]} />
      <Text style={styles.emptyTitle}>No {activeTab} found</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'drafts'
          ? 'Your saved drafts will appear here'
          : activeTab === 'unqualified'
          ? 'Unqualified opportunities will appear here'
          : 'Start by creating your first referral'}
      </Text>
      {activeTab === 'opportunities' && (
        <Button
          title="Create Referral"
          onPress={() => router.push('/opportunity/add')}
          style={styles.emptyButton}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID or client name"
            placeholderTextColor={Colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'opportunities' && styles.tabActive]}
          onPress={() => setActiveTab('opportunities')}
        >
          <Text style={[styles.tabText, activeTab === 'opportunities' && styles.tabTextActive]}>
            Opportunities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'drafts' && styles.tabActive]}
          onPress={() => setActiveTab('drafts')}
        >
          <Text style={[styles.tabText, activeTab === 'drafts' && styles.tabTextActive]}>
            Drafts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unqualified' && styles.tabActive]}
          onPress={() => setActiveTab('unqualified')}
        >
          <Text style={[styles.tabText, activeTab === 'unqualified' && styles.tabTextActive]}>
            Unqualified
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={filteredOpportunities}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || item._id || `opp-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/opportunity/add')}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray[600],
  },
  tabTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
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
  emptyButton: {
    marginTop: 24,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
