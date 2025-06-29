'use strict';

const Config = require('getconfig');
const TwitterStrategy = require('passport-twitter');
const FacebookStrategy = require('passport-facebook');
const GoogleStrategy = require('passport-google-oauth20');
const EmailValidator = require('email-validator');
const JWT = require('jsonwebtoken'); // used to create, sign, and verify tokens
const db = require('./db');
const randomstring = require('randomstring');
const Bcrypt = require('bcryptjs'); // To hash passwords

module.exports = function (passport) {

  passport.serializeUser((user, done) => done(null, user));   // Serialize user into the sessions
  passport.deserializeUser((user, done) => done(null, user)); // Deserialize user from the sessions


  // Register Google Passport strategy
  passport.use(new GoogleStrategy(Config.google,
    async function (token, tokenSecret, profile, done) {
      try {
        if (!EmailValidator.validate(profile.emails[0].value)) {
          throw new Error('ValidationError');
        }

        let user = await db.Users.findOne({ email: profile.emails[0].value });

        if (user) {
          // if a user is found, log them in
          const token = JWT.sign({ id: user.id, name: user.name }, Config.jwt.secret, { expiresIn: 2592000 });  // expires in one month
          return done(null, { token: token });
        }
        // if the user isnt in our database, create a new user
        const newUser = new db.Users({
          name: profile.displayName,
          email: profile.emails[0].value,
          registerDate: Date.now(),
          password: Bcrypt.hashSync(randomstring.generate(20), 10),
          userImage: { small: profile.photos[0].value },
          google: true
        });

        let dbOrganizations = await db.Organizations.find({}).select('_id');
        let arraydbOrgs = dbOrganizations.map((item) => {
          return { companyId: item, opinions: [] };
        });

        newUser.follows = arraydbOrgs;

        // save the user
        await db.Users.create(newUser);
        const token = JWT.sign({ id: newUser.id, name: newUser.name }, Config.jwt.secret, { expiresIn: 2592000 });  // expires in one month
        return done(null, { token: token });
      } catch (error) {
        return done(null, error);
      }
    }));


  // Register Facebook Passport strategy
  passport.use(new FacebookStrategy(Config.facebook,
    async function (token, tokenSecret, profile, done) {
      try {
        if (!EmailValidator.validate(profile.emails[0].value)) {
          throw new Error('ValidationError');
        }

        let user = await db.Users.findOne({ email: profile.emails[0].value });

        if (user) {
          // if a user is found, log them in
          const token = JWT.sign({ id: user.id, name: user.name }, Config.jwt.secret, { expiresIn: 2592000 });  // expires in one month
          return done(null, { token: token });
        }
        // if the user isnt in our database, create a new user
        const newUser = new db.Users({
          name: profile.name.givenName + ' ' + profile.name.familyName,
          email: profile.emails[0].value,
          registerDate: Date.now(),
          password: Bcrypt.hashSync(randomstring.generate(20), 10),
          userImage: { small: profile.photos[0].value },
          facebook: true
        });

        let dbOrganizations = await db.Organizations.find({}).select('_id');
        let arraydbOrgs = dbOrganizations.map((item) => {
          return { companyId: item, opinions: [] };
        });

        newUser.follows = arraydbOrgs;

        // save the user
        await db.Users.create(newUser);
        const token = JWT.sign({ id: newUser.id, name: newUser.name }, Config.jwt.secret, { expiresIn: 2592000 });  // expires in one month
        return done(null, { token: token });
      } catch (error) {
        return done(null, error);
      }
    }));

  // Register Twitter Passport strategy
  passport.use(new TwitterStrategy(Config.twitter,
    async function (token, tokenSecret, profile, done) {
      try {
        if (!EmailValidator.validate(profile.emails[0].value)) {
          throw new Error('ValidationError');
        }

        let user = await db.Users.findOne({ email: profile.emails[0].value });

        if (user) {
          // if a user is found, log them in
          const token = JWT.sign({ id: user.id, name: user.name }, Config.jwt.secret, { expiresIn: 2592000 });  // expires in one month
          return done(null, { token: token });
        }
        // if the user isnt in our database, create a new user
        const newUser = new db.Users({
          name: profile.displayName,
          email: profile.emails[0].value,
          registerDate: Date.now(),
          password: Bcrypt.hashSync(randomstring.generate(20), 10),
          userImage: { small: profile.photos[0].value },
          twitter: true
        });

        let dbOrganizations = await db.Organizations.find({}).select('_id');
        let arraydbOrgs = dbOrganizations.map((item) => {
          return { companyId: item, opinions: [] };
        });
        newUser.follows = arraydbOrgs;

        // save the user
        await db.Users.create(newUser);
        const token = JWT.sign({ id: newUser.id, name: newUser.name }, Config.jwt.secret, { expiresIn: 2592000 });  // expires in one month
        return done(null, { token: token });
      } catch (error) {
        return done(null, error);
      }
    }));
};
