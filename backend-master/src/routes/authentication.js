'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const util = require('../js/util');
const randomstring = require('randomstring');
const nunjucks = require('nunjucks');
const EmailValidator = require('email-validator');
const omit = require('object.omit');

// Configure JWT
const JWT = require('jsonwebtoken'); // used to create, sign, and verify tokens
const Config = require('getconfig');
const VerifyToken = require('../js/verifyToken');

// Import templates for emails
const PATH_TO_TEMPLATES = './src/templates';
nunjucks.configure(PATH_TO_TEMPLATES, { autoescape: true });


// DB
const db = require('../js/db');
const Bcrypt = require('bcryptjs'); // To hash passwords


//==========================================================================================//

router.post('/login', async (req, res) => {

  try {
    const user = await db.Users.findOne({ email: req.body.email });
    if (user && EmailValidator.validate(req.body.email)) {
      if (Bcrypt.compareSync(req.body.password, user.password)) { // Check if the password is correct
        const token = JWT.sign({ id: user.id, name: user.name }, Config.jwt.secret, { expiresIn: 2592000 });  // expires in one month
        user.lastLoginDate = new Date();
        await user.save();
        return res.status(200).send({
          user: omit(user.toObject(), ['password', 'verificationToken']),
          token
        });
      }
      return res.boom.notFound('Incorrect password');

    }
    return res.boom.notFound('User was not found or email could not be validated');

  } catch (error) {
    return res.boom.badImplementation('There was a problem in the login process');
  }
});

//==========================================================================================//

router.post('/welisten/login', async (req, res) => {

  try {
    const dbUser = await db.Users.findOne({ email: req.body.email });
    if (dbUser.kind === 1 && dbUser.payment.customerId) {
      let isDeliquent = await util.checkPayment(dbUser.payment.customerId);
      if (isDeliquent) {
        return res.boom.unauthorized('Check payments to this website.');
      }
      const dbOrg = await db.Organizations.findOne({ admins: dbUser.id }).lean();
      if (dbUser && EmailValidator.validate(req.body.email)) {
        if (Bcrypt.compareSync(req.body.password, dbUser.password)) { // Check if the password is correct
          const token = JWT.sign({ id: dbUser.id, kind: dbUser.kind, companyId: dbOrg._id.toString() }, Config.jwt.secret, { expiresIn: 2592000 });  // expires in one month
          return res.status(200).send({
            user: omit(dbUser.toObject(), ['password', 'verificationToken']),
            token,
            dbOrg
          });
        }
        return res.boom.notFound('Incorrect credentials');

      }
      return res.boom.notFound('Incorrect credentials');
    } else if (dbUser.kind === 0 && dbUser.payment.subscriptionId) {
      return res.status(200).send({
        user: omit(dbUser.toObject(), ['password', 'verificationToken']),
        temp: true
      });
    }
    return res.boom.unauthorized('Unauthorized');

  } catch (error) {
    return res.boom.badImplementation('There was a problem in the login process');
  }
});

//==========================================================================================//

router.post('/register', async function (req, res) {

  try {
    if (!req.body.email || !EmailValidator.validate(req.body.email)) {
      return res.boom.badRequest('Please enter a valid email');
    }

    const newUser = new db.Users({
      name: req.body.name || req.body.email.split('@')[0],
      email: req.body.email,
      registerDate: Date.now(),
      password: Bcrypt.hashSync(req.body.password, 10),
      verificationToken: randomstring.generate(48),
      userImage: {
        big: '',
        medium: '',
        small: 'https://s3.amazonaws.com/complaints-wespeak/Users/Tester/avatar.png'
      }
    });
    let dbOrganizations = await db.Organizations.find({}).select('_id');
    let arraydbOrgs = dbOrganizations.map((item) => {
      return { companyId: item, opinions: [] };
    });

    newUser.follows = arraydbOrgs;
    await db.Users.create(newUser);

    const html = nunjucks.render('emailVerification.html', {
      link: Config.BASE_URL + '/auth/email-verification/?verificationToken=' + newUser.verificationToken,
      name: newUser.name
    });

    util.sendEmail(newUser.email, Config.nev.email, 'WeSpeak', html, (err) => {
      if (err) {
        return res.boom.serverUnavailable('Gmail service temporary unaccessible');
      }
      return res.status(200).send({ message: 'Verification email sent to ' + req.body.email });
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.boom.conflict('The user with email ' + req.body.email + ' already exists');
    }
    return res.boom.badImplementation('There was a problem registering the user');
  }
});

//==========================================================================================//

router.post('/welisten/register', async function (req, res) {
  try {
    if (!req.body.user || !EmailValidator.validate(req.body.user.email)) {
      return res.boom.badRequest('Complete the register process');
    }

    let userExist = await db.Users.findOne({ email: req.body.user.email }).lean();
    if (userExist) {
      if (Bcrypt.compareSync(req.body.user.password, userExist.password)) {
        return res.status(200).send('Continue');
      }
      return res.boom.badRequest('This email account is already register');
    }

    const newUser = new db.Users({
      name: req.body.user.name || req.body.email.split('@')[0],
      email: req.body.user.email,
      password: Bcrypt.hashSync(req.body.user.password, 10),
      registerDate: Date.now(),
      verificationToken: randomstring.generate(48),
      userImage: {
        big: '',
        medium: '',
        small: 'https://s3.amazonaws.com/complaints-wespeak/Users/Tester/avatar.png'
      }
    });
    await db.Users.create(newUser);

    const html = nunjucks.render('emailVerification.html', {
      link: Config.BASE_URL + '/auth/email-verification/?verificationToken=' + newUser.verificationToken,
      name: newUser.name
    });

    util.sendEmail(newUser.email, Config.nev.email, 'WeSpeak', html, (err) => {
      if (err) {
        return res.boom.serverUnavailable('Gmail service temporary unaccessible');
      }
      return res.status(200).send({ message: 'Verification email sent to ' + req.body.user.email });
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.boom.conflict('The user with email ' + req.body.user.email + ' already exists');
    }
    return res.boom.badImplementation('There was a problem registering the user');
  }
});

//==========================================================================================//

router.get('/me', VerifyToken, async (req, res) => {

  try {
    if (req.user) { // The JWT can be decoded (the user is logged in)
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }
      dbUser.lastLoginDate = Date.now();
      await dbUser.save();
      return res.status(200).send(omit(dbUser.toObject(), ['password', 'verificationToken']), );
    }
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================//

router.get('/welisten/me', VerifyToken, async (req, res) => {

  try {
    if (req.user && req.user.kind === 1) { // The JWT can be decoded (the user is logged in)
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }
      let isDeliquent = await util.checkPayment(dbUser.payment.customerId);
      if (isDeliquent) {
        return res.boom.unauthorized('Check payments to this website.');
      }
      dbUser.lastLoginDate = Date.now();
      await dbUser.save();

      let dbOrg = await db.Organizations.findOne({ admins: dbUser.id }).lean();
      return res.status(200).send({
        user: omit(dbUser.toObject(), ['password', 'verificationToken']),
        org: dbOrg
      });
    } else if (req.user && req.user.kind === 0) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (dbUser.payment.subscriptionId) {
        return res.status(200).send({
          user: omit(dbUser.toObject(), ['password', 'verificationToken']),
          temp: true
        });
      }
      return res.boom.unauthorized('Invalid JWT token');
    }
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================

router.get('/changepassword', VerifyToken, async function (req, res) {
  try {
    if (req.user) { // The JWT can be decoded (the user is logged in)
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }
      const html = nunjucks.render('changepassword.html');

      return res.send(html);
    }
    return res.boom.unauthorized('Invalid JWT token');
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.post('/changepassword', VerifyToken, async function (req, res) {
  try {
    if (req.user) { // The JWT can be decoded (the user is logged in)
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }
      dbUser.password = Bcrypt.hashSync(req.body.password, 10);
      await dbUser.save();
      return res.status(200).send({ message: 'Password was changed.' });
    }
    return res.boom.unauthorized('Invalid JWT token');
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.post('/resetpassword', async function (req, res) {
  try {
    let dbUser = await db.Users.findOne({ email: req.body.email });
    if (!dbUser) {
      return res.boom.notFound('Error: user not found');
    }
    const token = JWT.sign({ id: dbUser.id, name: dbUser.name }, Config.jwt.secret, { expiresIn: 900 });  // expires in 15 minutes
    const html = nunjucks.render('resetpassword.html', {
      link: Config.BASE_URL + '/auth/changepassword?email=' + req.body.email + '&token=' + token,
      name: dbUser.name
    });

    util.sendEmail(dbUser.email, Config.nev.email, 'WeSpeak', html, (err) => {
      if (err) {
        return res.boom.serverUnavailable('Gmail service temporary unaccessible');
      }
      return res.status(200).send({ message: 'Change password' });
    });
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});


//==========================================================================================//

router.get('/email-verification', async function (req, res) {

  try {
    const user = await db.Users.findOne({ verificationToken: req.query.verificationToken });

    if (!user) {
      return res.boom.notFound('This token URL does is not associated to any user');
    }
    user.verificationToken = undefined;
    await user.save();
    return res.status(200).send('User verification success');
  } catch (error) {
    return res.boom.badImplementation('There was a problem verifying the user\'s email');
  }
});

router.get('/terms-conditions', async function (req, res) {

  try {

    const html = await nunjucks.render('termsconditions.html', {});

    return res.status(200).send({ html: html });

  } catch (error) {
    return res.boom.badImplementation('There was a problem verifying the user\'s email');
  }
});

//==========================================================================================//

router.get('/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));

//==========================================================================================//

router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/facebook' }), (req, res) => res.redirect('OAuthLogin://login?user=' + JSON.stringify(req.user)));

//==========================================================================================//

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

//==========================================================================================//

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/google' }), (req, res) => res.redirect('OAuthLogin://login?user=' + JSON.stringify(req.user)));

//==========================================================================================//

router.get('/twitter', passport.authenticate('twitter'));

//==========================================================================================//

router.get('/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/twitter' }), (req, res) => res.redirect('OAuthLogin://login?user=' + JSON.stringify(req.user)));

//==========================================================================================//


module.exports = router;
