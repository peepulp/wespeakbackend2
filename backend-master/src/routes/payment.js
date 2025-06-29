'use strict';

const Config = require('getconfig');
const express = require('express');
const router = express.Router();
const VerifyToken = require('../js/verifyToken');
const db = require('../js/db');
const omit = require('object.omit');
const stripe = require('stripe')(Config.stripe.secretKey);

// ===========================================================================================================//

router.get('/plans', async function (req, res) {
  try {
    stripe.plans.list({ product: Config.stripe.productID }, function (err, plans) {
      if (err) {
        return res.boom.notFound('Error: plan not found');
      }
      return res.send(plans);
    });
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
});

// ===========================================================================================================//

router.post('/subscription', async function (req, res) {
  try {
    if (!req.body.stripeToken || !req.body.plan) {
      return res.boom.notFound('Error: token not found');
    }
    stripe.customers.create(
      {
        source: req.body.stripeToken.id,
        description: req.body.stripeToken.name,
        email: req.body.user.email
      }, async function (err, customer) {
        if (err) {
          return res.boom.badRequest(err.message);
        }
        stripe.subscriptions.create(
          {
            customer: customer.id,
            items: [{ plan: req.body.plan.id }]
          }, async function (err, subscription) {
            if (err) {
              return res.boom.badRequest(err.message);
            }
            const paymentData = {
              plan: req.body.user.plan,
              last4: req.body.stripeToken.card.last4,
              expCard: req.body.stripeToken.card.expDate,
              subscriptionId: subscription.id,
              customerId: customer.id,
              finalDatePlan: new Date(subscription.current_period_end * 1000)
            };

            let dbUser = await db.Users.findOne({ email: req.body.user.email });
            dbUser.payment = paymentData;
            dbUser.kind = 1;
            await dbUser.save();

            return res.send(omit(dbUser.toObject(), ['password']));
          }
        );
      }
    );
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
});

// ===========================================================================================================//

router.post('/cancel', VerifyToken, async function (req, res) {
  try {
    if (req.user && req.user.kind) {
      if (!req.body) {
        return res.boom.badRequest('Customer information missing');
      }
      stripe.customers.del(
        req.body.customerId, async function (err) {
          if (err) {
            return res.boom.badRequest(err.message);
          }

          let dbUser = await db.Users.findOne({ _id: req.user.id });
          dbUser.payment.customerId = undefined;
          dbUser.kind = 0;
          await dbUser.save();

          return res.send({ message: 'Customer removed!' });
        }
      );
    } else {
      return res.boom.unauthorized('Something was wrong');
    }
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
});

// ===========================================================================================================//

router.post('/update-plan', VerifyToken, async function (req, res) {
  try {
    if (req.user && req.user.kind) {
      if (req.body.profile.plan === req.body.plan.nickname) {
        return res.boom.badRequest('Same plan selected');
      }
      stripe.subscriptions.del(
        req.body.profile.subscriptionId, function (err) {
          if (err) {
            return res.boom.badRequest(err.message);
          }
        }
      );
      stripe.subscriptions.create(
        {
          customer: req.body.profile.customerId,
          items: [{ plan: req.body.plan.id }]
        }, async function (err, subscription) {
          if (err) {
            return res.boom.badRequest(err.message);
          }

          let dbUser = await db.Users.findOne({ _id: req.user.id });
          dbUser.payment.plan = req.body.user.plan;
          dbUser.payment.subscriptionId = subscription.id;
          dbUser.payment.finalDatePlan = req.body.user.finalDatePlan;
          await dbUser.save();

          return res.send(omit(dbUser.toObject(), ['password']));
        }
      );
    } else {
      return res.boom.unauthorized('Something was wrong');
    }
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
});

// ===========================================================================================================//

router.post('/update-card', VerifyToken, async function (req, res) {
  try {
    if (req.user && req.user.kind) {
      stripe.customers.update(
        req.body.profile.customerId,
        {
          source: req.body.stripeToken.id
        }, async function (err) {
          if (err) {
            return res.boom.badRequest(err.message);
          }

          let dbUser = await db.Users.findOne({ _id: req.user.id });
          dbUser.payment.last4 = req.body.stripeToken.card.last4;
          await dbUser.save();

          return res.send(omit(dbUser.toObject(), ['password']));
        }
      );
    } else {
      return res.boom.unauthorized('Something was wrong');
    }
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
});

// ===========================================================================================================//

router.get('/get-charges', VerifyToken, async function (req, res) {
  try {
    if (req.user && req.user.kind) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      stripe.charges.list(
        { customer: dbUser.payment.customerId },
        function (err, charges) {
          if (err) {
            return res.boom.badRequest(err.message);
          }
          return res.send(charges);
        }
      );
    } else {
      return res.boom.unauthorized('Something was wrong');
    }
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
});


module.exports = router;