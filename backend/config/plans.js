/**
 * Subscription Plans & Usage Limits Configuration
 * Defines all tier features, monthly & yearly pricing, and operational quotas.
 */

const PLANS = {
  free: {
    id: 'free',
    name: 'Free Starter',
    badge: 'FREE',
    description: 'Essential reconciliation tools for individuals and small test batches.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'INR',
    limits: {
      jobsPerMonth: 5,
      transactionsPerJob: 200,
      transactionsPerMonth: 1000,
      aiChecksPerMonth: 10,
      teamMembers: 1,
      retentionDays: 30
    },
    features: [
      'Up to 5 reconciliation jobs / month',
      'Max 200 transactions per batch',
      'Basic rule-based match engine',
      'CSV statement ingestion',
      'Standard fraud anomaly alerts',
      'Community forum support'
    ],
    highlight: false
  },
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    badge: 'STARTER',
    description: 'Accelerate ledger audits with AI fuzzy matching and automated webhooks.',
    monthlyPrice: 999,
    yearlyPrice: 9990, // ~17% discount (2 months free)
    currency: 'INR',
    limits: {
      jobsPerMonth: 50,
      transactionsPerJob: 5000,
      transactionsPerMonth: 25000,
      aiChecksPerMonth: 100,
      teamMembers: 3,
      retentionDays: 180
    },
    features: [
      'Up to 50 reconciliation jobs / month',
      'Max 5,000 transactions per batch',
      'AI-powered fuzzy matching engine (Levenshtein & Token Set)',
      'Automated Razorpay webhook synchronization',
      'PDF & Excel reconciliation report exports',
      'Priority email support (24-hour SLA)'
    ],
    highlight: false
  },
  pro: {
    id: 'pro',
    name: 'Professional Plan',
    badge: 'MOST POPULAR',
    description: 'High-throughput automated reconciliation with real-time predictive fraud detection.',
    monthlyPrice: 2999,
    yearlyPrice: 29990, // ~17% discount (2 months free)
    currency: 'INR',
    limits: {
      jobsPerMonth: 250,
      transactionsPerJob: 25000,
      transactionsPerMonth: 150000,
      aiChecksPerMonth: 500,
      teamMembers: 10,
      retentionDays: 365
    },
    features: [
      'Up to 250 reconciliation jobs / month',
      'Max 25,000 transactions per batch',
      'High-confidence multi-pass AI matching',
      'Real-time predictive fraud detection & velocity alerts',
      'Automated dispute resolution workflows',
      'Instant webhook ingestion & real-time socket events',
      'Priority live chat & dedicated technical support'
    ],
    highlight: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Sync',
    badge: 'ENTERPRISE',
    description: 'Unlimited volume, custom AI fine-tuning, multi-entity ledgers, and dedicated SLAs.',
    monthlyPrice: 7999,
    yearlyPrice: 79990, // ~17% discount (2 months free)
    currency: 'INR',
    limits: {
      jobsPerMonth: 999999,
      transactionsPerJob: 999999,
      transactionsPerMonth: 9999999,
      aiChecksPerMonth: 999999,
      teamMembers: 50,
      retentionDays: 1825 // 5 years
    },
    features: [
      'Unlimited reconciliation jobs & transactions',
      'Custom neural match rule weights & OCR extraction',
      'Custom webhook triggers & bi-directional ERP sync',
      'Dedicated compliance & audit trail archive (5 years)',
      'Role-based multi-team governance & SSO support',
      '24/7 dedicated Account Manager & 1-hour SLA guarantee'
    ],
    highlight: false
  }
};

/**
 * Get plan configuration by plan ID
 * @param {string} planId
 * @returns {object} Plan definition
 */
const getPlanById = (planId) => {
  return PLANS[planId] || PLANS.free;
};

/**
 * Calculate pricing based on plan and billing cycle
 * @param {string} planId
 * @param {string} cycle - 'monthly' | 'yearly'
 * @returns {object} { price, amountInPaise, cycle, savings }
 */
const calculatePlanPrice = (planId, cycle = 'monthly') => {
  const plan = getPlanById(planId);
  const isYearly = cycle === 'yearly';
  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const amountInPaise = Math.round(price * 100);

  // Calculate annual savings compared to 12x monthly
  const fullYearlyAtMonthlyRate = plan.monthlyPrice * 12;
  const savings = isYearly && fullYearlyAtMonthlyRate > 0
    ? fullYearlyAtMonthlyRate - plan.yearlyPrice
    : 0;

  return {
    planId: plan.id,
    planName: plan.name,
    cycle: isYearly ? 'yearly' : 'monthly',
    price,
    amountInPaise,
    monthlyEquivalent: isYearly ? Math.round(price / 12) : price,
    savings,
    currency: plan.currency
  };
};

module.exports = {
  PLANS,
  getPlanById,
  calculatePlanPrice
};
