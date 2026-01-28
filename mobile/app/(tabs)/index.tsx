/**
 * Dashboard Screen
 * Clean, modern design matching the reference
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useAuthStore } from '../../store/auth';
import { get } from '../../lib/api';
import { StatusBadge } from '../../components/ui';
import { DashboardResponse, Opportunity } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Wave background component for the earnings card
function WaveBackground() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 400 150"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <SvgGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1a8cba" />
          <Stop offset="100%" stopColor="#0d5f7a" />
        </SvgGradient>
      </Defs>
      <Path d="M0,0 L400,0 L400,150 L0,150 Z" fill="url(#waveGrad)" />
      <Path
        d="M0,100 Q100,80 200,100 T400,90 L400,150 L0,150 Z"
        fill="rgba(255,255,255,0.1)"
      />
      <Path
        d="M0,120 Q150,100 300,120 T400,110 L400,150 L0,150 Z"
        fill="rgba(255,255,255,0.08)"
      />
    </Svg>
  );
}

// Stat card component
function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// Lead/Activity item component
function LeadItem({
  name,
  subtitle,
  status,
  avatarLetter,
  onPress,
}: {
  name: string;
  subtitle: string;
  status: string;
  avatarLetter: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.leadItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.leadLeft}>
        <View style={styles.leadAvatar}>
          <Text style={styles.leadAvatarText}>{avatarLetter}</Text>
          <View style={styles.leadAvatarBadge}>
            <Ionicons name="checkmark" size={8} color="#fff" />
          </View>
        </View>
        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>{name}</Text>
          <Text style={styles.leadSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <StatusBadge status={status} size="sm" />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    openOpportunities: 0,
    opportunityValue: 0,
    openApplications: 0,
    settledValue: 0,
    conversionRatio: '0%',
  });
  const [recentOpportunities, setRecentOpportunities] = useState<Opportunity[]>([]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await get<DashboardResponse>('/referrer/dashboard');
      setStats(data.statistics);
      setRecentOpportunities(data.recentOpportunities || []);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Format full currency
  const formatFullCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get user name
  const getUserName = () => {
    if (user?.first_name) {
      return `${user.first_name}${user.surname ? ' ' + user.surname.charAt(0) + '.' : ''}`;
    }
    return 'Partner';
  };

  // Get initials
  const getInitials = () => {
    const first = user?.first_name?.charAt(0) || '';
    const last = user?.surname?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1a8cba"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/loanease_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerRight}>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeLabel}>Welcome,</Text>
              <Text style={styles.welcomeName}>{getUserName()}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => router.push('/(tabs)/account')}
            >
              <LinearGradient
                colors={['#1a8cba', '#0d5f7a']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Pipeline Card */}
        <View style={styles.earningsCard}>
          <WaveBackground />
          <View style={styles.earningsContent}>
            <Text style={styles.earningsLabel}>Loan Pipeline</Text>
            <Text style={styles.earningsAmount}>
              {formatFullCurrency(stats.opportunityValue)}
            </Text>
            <TouchableOpacity
              style={styles.earningsButton}
              onPress={() => router.push('/(tabs)/opportunities')}
            >
              <Text style={styles.earningsButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#E8F4FC' }]}>
              <Ionicons name="flash" size={28} color="#1a8cba" />
            </View>
            <Text style={styles.quickActionLabel}>Pre-Qualify</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push('/opportunity/add')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#E8F4FC' }]}>
              <Ionicons name="add-circle" size={28} color="#1a8cba" />
            </View>
            <Text style={styles.quickActionLabel}>New Referral</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push('/(tabs)/clients')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#FFF4E5' }]}>
              <Ionicons name="people" size={28} color="#E5A62B" />
            </View>
            <Text style={styles.quickActionLabel}>Clients</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#E8F4FC' }]}>
              <Ionicons name="headset" size={28} color="#1a8cba" />
            </View>
            <Text style={styles.quickActionLabel}>Support</Text>
          </TouchableOpacity>
        </View>

        {/* My Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>My Stats</Text>
          <View style={styles.statsRow}>
            <StatCard
              icon="briefcase-outline"
              label="Total Leads"
              value={stats.openOpportunities + stats.openApplications}
              color="#1a8cba"
              bgColor="#F0F8FC"
            />
            <StatCard
              icon="home-outline"
              label="Approved"
              value={stats.openApplications}
              color="#00A67E"
              bgColor="#E8FBF5"
            />
            <StatCard
              icon="time-outline"
              label="Pending"
              value={formatCurrency(stats.opportunityValue)}
              color="#E5A62B"
              bgColor="#FFF9E8"
            />
            <StatCard
              icon="sync-outline"
              label="Total"
              value={formatCurrency(stats.settledValue)}
              color="#1a8cba"
              bgColor="#F0F8FC"
            />
          </View>
        </View>

        {/* Recent Opportunities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Opportunities</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/opportunities')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#1a8cba" />
            </TouchableOpacity>
          </View>

          {recentOpportunities.length > 0 ? (
            <View style={styles.leadsList}>
              {recentOpportunities.slice(0, 5).map((opp) => (
                <LeadItem
                  key={opp._id}
                  name={opp.client?.entity_name || 'Unknown Client'}
                  subtitle={`${opp.opportunity_id} • ${formatCurrency(opp.loan_amount || 0)}`}
                  status={opp.status}
                  avatarLetter={(opp.client?.entity_name || 'U').charAt(0).toUpperCase()}
                  onPress={() => router.push(`/opportunity/${opp._id}`)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No opportunities yet</Text>
              <Text style={styles.emptyText}>
                Create your first referral to get started
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/opportunity/add')}
              >
                <Text style={styles.emptyButtonText}>+ New Referral</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  logo: {
    width: 140,
    height: 45,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  welcomeLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  welcomeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  // Earnings Card
  earningsCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    height: 160,
  },
  earningsContent: {
    padding: 20,
    paddingBottom: 24,
    zIndex: 1,
    flex: 1,
    justifyContent: 'center',
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  earningsButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  earningsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a8cba',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 70,
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a8cba',
  },

  // Stats Section
  statsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (SCREEN_WIDTH - 40 - 24) / 4, // 4 cards with gaps
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 12,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Leads List
  leadsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leadAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F4FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  leadAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a8cba',
  },
  leadAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00A67E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  leadSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#1a8cba',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  bottomSpacer: {
    height: 20,
  },
});
