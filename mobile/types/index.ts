/**
 * Shared TypeScript Types
 * These types mirror the web app types for consistency
 */

// User & Auth Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  surname: string;
  phone?: string;
  mobile?: string;
  state?: string;
  role: UserRole;
  organisation_id: string | null;
  is_active: boolean;
  created_at: string;
}

export type UserRole =
  | 'super_admin'
  | 'admin_team'
  | 'referrer_admin'
  | 'referrer_team'
  | 'client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: User;
  requires_2fa?: boolean;
  temp_token?: string;
  error?: string;
  attempts_remaining?: number;
}

export interface OTPRequestResponse {
  success: boolean;
  message?: string;
  otp_id?: string;
  expires_in?: number;
  masked_email?: string;
  masked_mobile?: string;
  error?: string;
}

export interface OTPVerifyResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: User;
  error?: string;
  attempts_remaining?: number;
}

// Organisation Types
export interface Organisation {
  id: string;
  entity_name: string;
  key_contact_name?: string;
  mobile?: string;
  email?: string;
  abn?: string;
  trading_name?: string;
  address?: string;
  industry_type?: string;
  is_active: boolean;
  agreement_ip?: string;
  agreement_date?: string;
  created_at: string;
}

export interface Director {
  first_name: string;
  surname: string;
}

// Client Types
export interface Client {
  _id: string;
  organisation_id: string;
  entity_name: string;
  entity_type: EntityType;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  abn?: string;
  address?: string;
  industry?: string;
  time_in_business?: string;
  created_at: string;
  opportunities_count?: number;
}

// Entity type is stored as integer 1-6
export type EntityType = 1 | 2 | 3 | 4 | 5 | 6;

export const EntityTypeLabels: Record<EntityType, string> = {
  1: 'Private Company',
  2: 'Sole Trader',
  3: 'SMSF Trust',
  4: 'Trust',
  5: 'Partnership',
  6: 'Individual',
};

// Opportunity Types
export interface Opportunity {
  _id: string;
  id?: string; // API returns 'id' in list responses
  organization_id: string;
  client_id: string;
  created_by: string;
  created_by_name?: string;
  opportunity_id: string; // CF-prefixed ID like "CF10020"
  status: OpportunityStatus;
  external_ref?: string;
  loan_amount?: number;
  estimated_property_value?: number;
  loan_type?: LoanType;
  loan_purpose?: string;
  asset_type?: AssetType;
  asset_address?: string;
  brief_overview?: string;
  icr?: number;
  lvr?: number;
  outcome_level?: OutcomeLevel;
  created_at: string;
  updated_at?: string;

  // Flattened client data from API
  borrowing_entity?: string;
  contact_name?: string;

  // Joined data
  client?: Client;
  details?: OpportunityDetails;
}

export type OpportunityStatus =
  | 'draft'
  | 'opportunity'
  | 'application_created'
  | 'application_submitted'
  | 'conditionally_approved'
  | 'approved'
  | 'declined'
  | 'settled'
  | 'withdrawn';

export type LoanType =
  | 'construction'
  | 'lease_doc'
  | 'low_doc'
  | 'private_short_term'
  | 'unsure';

export const LoanTypeLabels: Record<LoanType, string> = {
  construction: 'Construction',
  lease_doc: 'Lease Doc',
  low_doc: 'Low Doc',
  private_short_term: 'Private / Short Term',
  unsure: 'Unsure',
};

export type AssetType =
  | 'commercial_property'
  | 'residential_property'
  | 'vacant_land';

export const AssetTypeLabels: Record<AssetType, string> = {
  commercial_property: 'Commercial Property',
  residential_property: 'Residential Property',
  vacant_land: 'Vacant Land',
};

export type OutcomeLevel = 1 | 2 | 3; // 1=Green, 2=Yellow, 3=Red

export interface OpportunityDetails {
  _id: string;
  opportunity_id: string;
  is_unqualified?: number;
  unqualified_reason?: string;
  financial_details?: FinancialDetails;
  created_at: string;
}

export interface FinancialDetails {
  fundedFromRental?: 'yes' | 'no';
  proposedRentalIncome?: number;
  netProfitBeforeTax?: number;
  amortisation?: number;
  depreciation?: number;
  existingInterestCosts?: number;
  rentalExpense?: number;
  existingLiabilities?: 'yes' | 'no';
  additionalSecurity?: 'yes' | 'no';
  smsf?: 'yes' | 'no';
  existingATO?: 'yes' | 'no';
  creditIssues?: 'yes' | 'no';
}

// Note Types
export interface Note {
  _id: string;
  opportunity_id: string;
  content: string;
  created_by: string;
  created_by_name?: string;
  is_public?: number;
  created_at: string;
  updated_at?: string;
}

// Dashboard Types
export interface DashboardStats {
  openOpportunities: number;
  opportunityValue: number;
  openApplications: number;
  settledApplications: number;
  settledValue: number;
  conversionRatio: string;
}

// Dashboard opportunity is a simplified version returned by the API
export interface DashboardOpportunity {
  id: string;
  opportunity_id: string;
  status: OpportunityStatus;
  created_at: string;
  loan_amount: number;
  loan_type: string;
  borrowing_entity: string;
  contact_name: string;
}

export interface DashboardResponse {
  statistics: DashboardStats;
  recentOpportunities: DashboardOpportunity[];
  organization?: {
    id: string;
    company_name: string;
  };
}

// History/Audit Types
export interface HistoryEntry {
  _id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes?: Record<string, { old: any; new: any }>;
  user_id: string;
  user_name?: string;
  ip_address?: string;
  created_at: string;
}

// Login History Types
export interface LoginHistoryEntry {
  _id: string;
  email: string;
  status: 'success' | 'failed' | 'blocked';
  ip_address?: string;
  failure_reason?: string;
  created_at: string;
  device_info?: {
    os?: string;
    version?: string;
    app_version?: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form Types
export interface CreateOpportunityPayload {
  referrer_user_id?: string;
  client_type: 'new' | 'existing';
  selected_client_id?: string;
  new_client_data?: {
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    entityType?: string;
    companyAddress?: string;
    abn?: string;
    entityName?: string;
    timeInBusiness?: string;
    industry?: string;
  };
  brief_overview?: string;
  has_more_info: boolean;
  loan_amount?: number;
  estimated_property_value?: number;
  loan_type?: LoanType;
  loan_purpose?: string;
  asset_type?: AssetType;
  asset_address?: string;
  financial_details?: FinancialDetails;
  icr?: number;
  lvr?: number;
  outcome_level?: OutcomeLevel;
  additional_notes?: string;
  terms_accepted?: {
    term1: boolean;
    term2: boolean;
    term3: boolean;
    term4: boolean;
  };
  status: 'draft' | 'opportunity';
}

// Industry options
export const IndustryOptions = [
  { value: 'accommodation_food', label: 'Accommodation & Food Services' },
  { value: 'admin_support', label: 'Administrative & Support Services' },
  { value: 'agriculture', label: 'Agriculture, Forestry & Fishing' },
  { value: 'arts_recreation', label: 'Arts & Recreation Services' },
  { value: 'construction', label: 'Construction' },
  { value: 'education', label: 'Education & Training' },
  { value: 'electricity_gas', label: 'Electricity, Gas, Water & Waste' },
  { value: 'financial_services', label: 'Financial & Insurance Services' },
  { value: 'healthcare', label: 'Health Care & Social Assistance' },
  { value: 'information_tech', label: 'Information Media & Telecommunications' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'mining', label: 'Mining' },
  { value: 'professional_services', label: 'Professional, Scientific & Technical Services' },
  { value: 'public_admin', label: 'Public Administration & Safety' },
  { value: 'rental_real_estate', label: 'Rental, Hiring & Real Estate Services' },
  { value: 'retail', label: 'Retail Trade' },
  { value: 'transport', label: 'Transport, Postal & Warehousing' },
  { value: 'wholesale', label: 'Wholesale Trade' },
  { value: 'other', label: 'Other Services' },
];

// State options (Australia)
export const StateOptions = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];
