const SubscriptionService = require('../services/subscriptionService');

/**
 * Middleware to enforce subscription usage limits before running reconciliation jobs
 */
const checkReconUsageLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      res.statusCode = 401;
      return next(new Error('Authentication required to verify usage limits.'));
    }

    // Admins bypass usage limits
    if (req.user.role === 'admin') {
      return next();
    }

    const subscription = await SubscriptionService.getUserSubscription(req.user._id);

    // If subscription is expired or cancelled past period end
    if (subscription.status === 'expired' || (subscription.status === 'cancelled' && new Date() > new Date(subscription.currentPeriodEnd))) {
      return res.status(403).json({
        success: false,
        quotaExceeded: true,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please renew or upgrade your plan to run new reconciliation jobs.',
        currentPlan: subscription.planId,
        limits: subscription.usage
      });
    }

    // Check monthly jobs quota
    const { jobsUsedThisMonth, jobsLimit } = subscription.usage;
    if (jobsUsedThisMonth >= jobsLimit) {
      return res.status(403).json({
        success: false,
        quotaExceeded: true,
        code: 'MONTHLY_JOBS_QUOTA_EXCEEDED',
        message: `You have reached your monthly reconciliation jobs limit (${jobsUsedThisMonth}/${jobsLimit} jobs). Upgrade your plan to continue processing statements.`,
        currentPlan: subscription.planId,
        usage: {
          jobsUsedThisMonth,
          jobsLimit,
          resetDate: subscription.currentPeriodEnd
        }
      });
    }

    // Attach verified subscription to request object for downstream controllers
    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkReconUsageLimit
};
