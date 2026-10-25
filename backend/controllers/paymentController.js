const crypto = require('crypto');
const { razorpayInstance, isConfigured, verifySignature, verifyWebhookSignature, keyId } = require('../config/razorpay');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const PaymentReconService = require('../services/paymentReconService');

/**
 * 1. Get Public Razorpay Configuration (Public Key only)
 * GET /api/payment/config
 */
const getPaymentConfig = (req, res) => {
  res.json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID || keyId,
    currency: 'INR',
    isTestMode: (process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_'),
    isLiveConfigured: isConfigured()
  });
};

/**
 * 2. Create Razorpay Payment Order (Backend Order Generation)
 * POST /api/payment/create-order
 *
 * Body: { amount, currency, receipt, idempotencyKey, description, customerDetails }
 */
const createOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', receipt, idempotencyKey, description, customerDetails } = req.body;

    if (!amount || Number(amount) <= 0) {
      res.statusCode = 400;
      return next(new Error('Valid payment amount greater than zero is required.'));
    }

    const numericAmount = Number(amount);
    const amountInPaise = Math.round(numericAmount * 100);
    const generatedReceipt = receipt || `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const effectiveIdempotencyKey = idempotencyKey || generatedReceipt;

    // Idempotency check: Verify if an order for this idempotencyKey already exists
    const existingPayment = await Payment.findOne({
      $or: [
        { idempotencyKey: effectiveIdempotencyKey },
        { receipt: generatedReceipt }
      ]
    });

    if (existingPayment) {
      // If already captured, don't recreate order
      if (existingPayment.status === 'captured') {
        return res.json({
          success: true,
          message: 'Payment for this transaction has already been completed.',
          orderId: existingPayment.orderId,
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          status: existingPayment.status,
          alreadyCaptured: true
        });
      }

      // Return existing pending order
      return res.json({
        success: true,
        orderId: existingPayment.orderId,
        amount: existingPayment.amount,
        amountInPaise: existingPayment.amountInPaise,
        currency: existingPayment.currency,
        keyId: process.env.RAZORPAY_KEY_ID || keyId,
        receipt: existingPayment.receipt
      });
    }

    let razorpayOrderId;

    // Create order with Razorpay SDK if real keys are configured
    if (isConfigured() && razorpayInstance) {
      try {
        const order = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: currency.toUpperCase(),
          receipt: generatedReceipt,
          notes: {
            description: description || 'Financial Reconciliation Plan / Service',
            userId: req.user ? req.user._id.toString() : 'guest'
          }
        });
        razorpayOrderId = order.id;
      } catch (rzpErr) {
        console.error('❌ Razorpay Orders API Error:', rzpErr);
        // Fallback to sandbox simulated order if API fails or credentials invalid
        razorpayOrderId = `order_${Date.now()}${Math.floor(Math.random() * 1000)}`;
      }
    } else {
      // Sandbox fallback order for local development & demonstration
      razorpayOrderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    // Persist Payment in MongoDB with status: 'created'
    const newPayment = await Payment.create({
      orderId: razorpayOrderId,
      amount: numericAmount,
      amountInPaise,
      currency: currency.toUpperCase(),
      receipt: generatedReceipt,
      idempotencyKey: effectiveIdempotencyKey,
      status: 'created',
      description: description || 'Reconciliation System Subscription / Service Fee',
      user: req.user ? req.user._id : undefined,
      customerDetails: {
        name: customerDetails?.name || req.user?.name || 'Authorized Officer',
        email: customerDetails?.email || req.user?.email || 'officer@recon.system',
        contact: customerDetails?.contact || '9876543210'
      },
      transactionDate: new Date()
    });

    res.status(201).json({
      success: true,
      orderId: razorpayOrderId,
      amount: numericAmount,
      amountInPaise,
      currency: currency.toUpperCase(),
      keyId: process.env.RAZORPAY_KEY_ID || keyId,
      receipt: generatedReceipt,
      paymentRecordId: newPayment._id
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 3. Verify Payment Signature & Settle Transaction
 * POST /api/payment/verify
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, method }
 */
const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      method = 'upi',
      customerDetails
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      res.statusCode = 400;
      return next(new Error('Razorpay Order ID and Payment ID are required.'));
    }

    // Cryptographic signature verification
    const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      // Mark payment as failed if record exists
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          status: 'failed',
          paymentId: razorpay_payment_id,
          'errorDetails.description': 'Cryptographic signature mismatch. Potential tampering detected.'
        }
      );

      res.statusCode = 400;
      return next(new Error('Invalid payment signature! Security alert: Payment verification failed.'));
    }

    // Find payment record
    let payment = await Payment.findOne({ orderId: razorpay_order_id });

    if (!payment) {
      // Create payment record if order created out of band
      payment = new Payment({
        orderId: razorpay_order_id,
        amount: 500.00,
        amountInPaise: 50000,
        currency: 'INR'
      });
    }

    // Idempotency: If already captured, don't duplicate ledger insertion
    if (payment.status === 'captured') {
      return res.json({
        success: true,
        message: 'Payment was already verified and captured successfully.',
        payment
      });
    }

    // Update payment record to captured
    payment.paymentId = razorpay_payment_id;
    payment.signature = razorpay_signature;
    payment.status = 'captured';
    payment.method = method;
    if (customerDetails) {
      payment.customerDetails = {
        name: customerDetails.name || payment.customerDetails?.name,
        email: customerDetails.email || payment.customerDetails?.email,
        contact: customerDetails.contact || payment.customerDetails?.contact
      };
    }
    payment.transactionDate = new Date();
    await payment.save();

    // Auto-create corresponding entry in Transaction collection (source: 'gateway')
    // This allows seamless integration into reconciliation system
    try {
      await Transaction.create({
        source: 'gateway',
        transactionId: razorpay_payment_id,
        date: new Date(),
        amount: payment.amount,
        description: `Razorpay Payment (${method.toUpperCase()}) - Order ${razorpay_order_id}`,
        category: 'Gateway Settlement',
        uploadJobId: null,
        status: 'reconciled'
      });
    } catch (txnErr) {
      // Non-blocking log if uploadJobId constraint or similar
      console.warn('Note: Gateway transaction logged with warning:', txnErr.message);
    }

    // Write security audit log
    if (req.user) {
      await AuditLog.create({
        userId: req.user._id,
        action: 'PAYMENT_CAPTURED',
        details: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          amount: payment.amount,
          method
        },
        ipAddress: req.ip
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and settled successfully!',
      payment: {
        id: payment._id,
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        receipt: payment.receipt,
        transactionDate: payment.transactionDate
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 4. Razorpay Webhook Handler
 * POST /api/payment/webhook
 *
 * Receives asynchronous lifecycle notifications from Razorpay:
 * - payment.captured
 * - payment.failed
 * - refund.processed
 */
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = req.headers['x-razorpay-signature'];

    // Verify webhook signature if secret configured
    if (webhookSecret && webhookSignature) {
      const isSignatureValid = verifyWebhookSignature(req.body, webhookSignature, webhookSecret);
      if (!isSignatureValid) {
        console.warn('⚠️ Webhook signature validation failed!');
        return res.status(400).json({ status: 'error', message: 'Invalid webhook signature.' });
      }
    }

    const event = req.body;
    const eventType = event.event;
    console.log(`🔔 Received Razorpay Webhook Event: ${eventType}`);

    if (eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const amount = paymentEntity.amount / 100;
        const method = paymentEntity.method;

        // Idempotent update
        const existing = await Payment.findOne({ $or: [{ orderId }, { paymentId }] });
        if (existing) {
          if (existing.status !== 'captured') {
            existing.status = 'captured';
            existing.paymentId = paymentId;
            existing.method = method;
            existing.gatewayResponse = paymentEntity;
            await existing.save();
          }
        } else {
          await Payment.create({
            orderId: orderId || `order_wh_${Date.now()}`,
            paymentId,
            amount,
            amountInPaise: paymentEntity.amount,
            currency: paymentEntity.currency || 'INR',
            status: 'captured',
            method,
            gatewayResponse: paymentEntity
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      if (paymentEntity) {
        await Payment.findOneAndUpdate(
          { $or: [{ orderId: paymentEntity.order_id }, { paymentId: paymentEntity.id }] },
          {
            status: 'failed',
            paymentId: paymentEntity.id,
            errorDetails: {
              code: paymentEntity.error_code,
              description: paymentEntity.error_description,
              source: paymentEntity.error_source,
              step: paymentEntity.error_step,
              reason: paymentEntity.error_reason
            }
          }
        );
      }
    } else if (eventType === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity;
      if (refundEntity) {
        await Payment.findOneAndUpdate(
          { paymentId: refundEntity.payment_id },
          {
            status: 'refunded',
            refundDetails: {
              refundId: refundEntity.id,
              amount: refundEntity.amount / 100,
              status: refundEntity.status,
              createdAt: new Date(refundEntity.created_at * 1000)
            }
          }
        );
      }
    }

    res.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('💥 Razorpay Webhook Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 5. Get Payment History with Filtering
 * GET /api/payment/history
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;

    const query = {};

    // Non-admin users only view their own payments if user is present
    if (req.user && req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } },
        { receipt: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'name email'),
      Payment.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: payments.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      payments
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get Payment Details by ID
 * GET /api/payment/:id
 */
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('reconciledWith');

    if (!payment) {
      res.statusCode = 404;
      return next(new Error('Payment record not found.'));
    }

    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Run Payment Reconciliation
 * POST /api/payment/reconcile
 */
const runReconciliation = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;
    const reconResults = await PaymentReconService.runReconciliation({ startDate, endDate });

    if (req.user) {
      await AuditLog.create({
        userId: req.user._id,
        action: 'PAYMENT_GATEWAY_RECONCILIATION',
        details: {
          matchedCount: reconResults.stats.matchedCount,
          discrepanciesCount: reconResults.stats.amountMismatchCount + reconResults.stats.duplicateCount,
          matchRate: reconResults.stats.matchRate
        },
        ipAddress: req.ip
      });
    }

    res.json(reconResults);
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get Latest Payment Reconciliation Report
 * GET /api/payment/reconcile/report
 */
const getReconciliationReport = async (req, res, next) => {
  try {
    const reconResults = await PaymentReconService.runReconciliation();
    res.json(reconResults);
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Download Payment Reconciliation PDF Report
 * GET /api/payment/reconcile/download-pdf
 */
const downloadPdfReport = async (req, res, next) => {
  try {
    const reconResults = await PaymentReconService.runReconciliation();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=PaymentReconciliationReport.pdf');

    PaymentReconService.generatePdfReport(reconResults, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Download Payment Reconciliation Excel Report
 * GET /api/payment/reconcile/download-excel
 */
const downloadExcelReport = async (req, res, next) => {
  try {
    const reconResults = await PaymentReconService.runReconciliation();
    const buffer = PaymentReconService.generateExcelReport(reconResults);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=PaymentReconciliationReport.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPaymentConfig,
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentById,
  runReconciliation,
  getReconciliationReport,
  downloadPdfReport,
  downloadExcelReport
};
