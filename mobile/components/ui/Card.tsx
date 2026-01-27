/**
 * Card Component
 * Container with shadow and optional header
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  onPress?: () => void;
  rightAction?: React.ReactNode;
}

export function Card({
  children,
  title,
  subtitle,
  style,
  onPress,
  rightAction,
}: CardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {(title || rightAction) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {rightAction}
        </View>
      )}
      <View style={[styles.content, !title && styles.contentNoHeader]}>
        {children}
      </View>
    </Container>
  );
}

/**
 * Stat Card Component
 * For displaying KPI metrics on dashboard
 */
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
  style?: ViewStyle;
}

export function StatCard({
  title,
  value,
  icon,
  iconColor = Colors.primary,
  trend,
  onPress,
  style,
}: StatCardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.statCard, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.statHeader}>
        {icon && (
          <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
        )}
        {trend && (
          <View style={[
            styles.trendBadge,
            trend.isPositive ? styles.trendPositive : styles.trendNegative
          ]}>
            <Ionicons
              name={trend.isPositive ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={trend.isPositive ? Colors.success : Colors.error}
            />
            <Text style={[
              styles.trendText,
              trend.isPositive ? styles.trendTextPositive : styles.trendTextNegative
            ]}>
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Container>
  );
}

/**
 * List Card Component
 * Card with list item styling
 */
interface ListCardProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
}

export function ListCard({
  title,
  subtitle,
  leftIcon,
  rightContent,
  onPress,
  showChevron = true,
  style,
}: ListCardProps) {
  return (
    <TouchableOpacity
      style={[styles.listCard, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {leftIcon && <View style={styles.listCardIcon}>{leftIcon}</View>}

      <View style={styles.listCardContent}>
        <Text style={styles.listCardTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.listCardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightContent}

      {onPress && showChevron && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.gray[400]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Base Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
  },

  subtitle: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },

  content: {
    padding: 16,
  },

  contentNoHeader: {
    paddingTop: 16,
  },

  // Stat Card
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.teal,
    marginBottom: 4,
  },

  statTitle: {
    fontSize: 13,
    color: Colors.gray[500],
  },

  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },

  trendPositive: {
    backgroundColor: `${Colors.success}15`,
  },

  trendNegative: {
    backgroundColor: `${Colors.error}15`,
  },

  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },

  trendTextPositive: {
    color: Colors.success,
  },

  trendTextNegative: {
    color: Colors.error,
  },

  // List Card
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  listCardIcon: {
    marginRight: 12,
  },

  listCardContent: {
    flex: 1,
  },

  listCardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[900],
  },

  listCardSubtitle: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },
});
