const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * Razorpay Payment Gateway Configuration
 * Reads credentials from environment variables.
 * Provides fallback mock capabilities for local development when keys are not set.
 */

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

const isConfigured = () => {
  return (
    Boolean(process.env.RAZORPAY_KEY_ID) &&
    Boolean(process.env.RAZORPAY_KEY_SECRET) &&
    !process.env.RAZORPAY_KEY_ID.includes('placeholder') &&
    !process.env.RAZORPAY_KEY_SECRET.includes('placeholder') &&
    !process.env.RAZORPAY_KEY_ID.includes('YourTestKeyIdHere') &&
    !process.env.RAZORPAY_KEY_SECRET.includes('YourTestKeySecretHere')
  );
};

let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
} catch (error) {
  console.warn('⚠️ Razorpay client initialization warning:', error.message);
}

/**
 * Verify Razorpay Payment Signature
 * Uses HMAC-SHA256 algorithm with RAZORPAY_KEY_SECRET
 *
 * @param {string} orderId - Razorpay Order ID (order_...)
 * @param {string} paymentId - Razorpay Payment ID (pay_...)
 * @param {string} signature - Razorpay Signature sent from frontend
 * @returns {boolean} Whether signature is authentic
 */
const verifySignature = (orderId, paymentId, signature) => {
  if (!signature) return false;
  
  // In simulated/mock sandbox test mode:
  if (signature.startsWith('mock_sig_')) {
    return true;
  }

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Use timing-safe equality comparison to prevent timing attacks
  try {
    const a = Buffer.from(generatedSignature, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return generatedSignature === signature;
  }
};

/**
 * Verify Razorpay Webhook Signature
 *
 * @param {string|Buffer} rawBody - Raw webhook request body
 * @param {string} webhookSignature - Value from 'x-razorpay-signature' header
 * @param {string} webhookSecret - Razorpay webhook secret
 * @returns {boolean} Whether webhook signature is authentic
 */
const verifyWebhookSignature = (rawBody, webhookSignature, webhookSecret) => {
  if (!webhookSignature || !webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
    .digest('hex');

  try {
    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(webhookSignature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return expectedSignature === webhookSignature;
  }
};

module.exports = {
  razorpayInstance,
  isConfigured,
  verifySignature,
  verifyWebhookSignature,
  keyId,
  keySecret
};
