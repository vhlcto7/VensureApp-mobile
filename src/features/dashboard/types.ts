export type CustomerPolicyStatus = 'Active' | 'Expiring Soon' | 'Expired';

export type CustomerDashboardPolicy = {
  id: string;
  policyNumber: string;
  insurerName: string;
  logoUrl?: string;
  vehicleId?: string;
  vehicleRegistrationNumber: string;
  vehicleDetails?: string;
  coverType: string;
  expiryDate: string;
  status: CustomerPolicyStatus;
  backendStatus: string;
};

export type CustomerDashboardQuote = {
  id: string;
  vehicleRegistrationNumber: string;
  insurerName: string;
  coverType?: string;
  totalPremium?: number;
  currency: string;
  validUntil?: string;
  quoteStatus?: string;
  isActionable: boolean;
};

export type CustomerDashboardTransaction = {
  transactionId: string;
  quoteReference?: string;
  vehicleRegistrationNumber?: string;
  policyNumber?: string;
  amount?: number;
  currencyCode: string;
  status: string;
  createdDate?: string;
};

export type CustomerDashboardData = {
  customerName: string;
  activePolicies: number;
  expiringSoon: number;
  expiredPolicies: number;
  pendingQuotes: number;
  pendingPayments: number;
  totalVehicles?: number;
  recentPolicies: CustomerDashboardPolicy[];
  recentQuotes: CustomerDashboardQuote[];
  pendingTransactions: CustomerDashboardTransaction[];
  recentTransactions: CustomerDashboardTransaction[];
};
