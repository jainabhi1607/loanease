/**
 * Badge Component
 * Status badges and labels
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, StatusColors } from '../../constants/colors';
import { OpportunityStatus } from '../../types';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  style,
}: BadgeProps) {
  const bgColor = {
    default: Colors.gray[100],
    success: `${Colors.success}15`,
    warning: `${Colors.warning}15`,
    error: `${Colors.error}15`,
    info: `${Colors.info}15`,
  }[variant];

  const textColor = {
    default: Colors.gray[700],
    success: Colors.success,
    warning: Colors.warning,
    error: Colors.error,
    info: Colors.info,
  }[variant];

  return (
    <View style={[
      styles.badge,
      size === 'sm' && styles.badgeSm,
      { backgroundColor: bgColor },
      style,
    ]}>
      <Text style={[
        styles.text,
        size === 'sm' && styles.textSm,
        { color: textColor },
      ]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Status Badge Component
 * For displaying opportunity status
 */
interface StatusBadgeProps {
  status: OpportunityStatus;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const StatusLabels: Record<OpportunityStatus, string> = {
  draft: 'Draft',
  opportunity: 'Opportunity',
  application_created: 'Application Created',
  application_submitted: 'Application Submitted',
  conditionally_approved: 'Conditionally Approved',
  approved: 'Approved',
  declined: 'Declined',
  settled: 'Settled',
  withdrawn: 'Withdrawn',
};

export function StatusBadge({ status, size = 'md', style }: StatusBadgeProps) {
  const colors = StatusColors[status] || StatusColors.draft;

  return (
    <View style={[
      styles.badge,
      size === 'sm' && styles.badgeSm,
      { backgroundColor: colors.bg },
      style,
    ]}>
      <Text style={[
        styles.text,
        size === 'sm' && styles.textSm,
        { color: colors.text },
      ]}>
        {StatusLabels[status]}
      </Text>
    </View>
  );
}

/**
 * Outcome Badge Component
 * For displaying ICR/LVR outcome level
 */
interface OutcomeBadgeProps {
  level: 1 | 2 | 3; // 1=Green, 2=Yellow, 3=Red
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function OutcomeBadge({ level, size = 'md', style }: OutcomeBadgeProps) {
  const config = {
    1: { bg: `${Colors.outcomeGreen}15`, text: Colors.outcomeGreen, label: 'Green' },
    2: { bg: `${Colors.outcomeYellow}15`, text: Colors.outcomeYellow, label: 'Yellow' },
    3: { bg: `${Colors.outcomeRed}15`, text: Colors.outcomeRed, label: 'Red' },
  }[level];

  return (
    <View style={[
      styles.badge,
      size === 'sm' && styles.badgeSm,
      { backgroundColor: config.bg },
      style,
    ]}>
      <View style={[styles.outcomeDot, { backgroundColor: config.text }]} />
      <Text style={[
        styles.text,
        size === 'sm' && styles.textSm,
        { color: config.text },
      ]}>
        {config.label}
      </Text>
    </View>
  );
}

/**
 * Role Badge Component
 * For displaying user roles
 */
interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const RoleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_team: 'Admin',
  referrer_admin: 'Account Owner',
  referrer_team: 'Team Member',
  client: 'Client',
};

export function RoleBadge({ role, size = 'md', style }: RoleBadgeProps) {
  const isAdmin = role === 'referrer_admin' || role === 'super_admin' || role === 'admin_team';

  return (
    <View style={[
      styles.badge,
      size === 'sm' && styles.badgeSm,
      { backgroundColor: isAdmin ? `${Colors.primary}15` : Colors.gray[100] },
      style,
    ]}>
      <Text style={[
        styles.text,
        size === 'sm' && styles.textSm,
        { color: isAdmin ? Colors.primary : Colors.gray[600] },
      ]}>
        {RoleLabels[role] || role}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  text: {
    fontSize: 13,
    fontWeight: '500',
  },

  textSm: {
    fontSize: 11,
  },

  outcomeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});
