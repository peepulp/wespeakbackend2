'use strict';

const express = require('express');
const router = express.Router();
const VerifyToken = require('../js/verifyToken');
const util = require('../js/util');
const db = require('../js/db');
const omit = require('object.omit');
//==========================================================================================

router.get('/', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      const user = await db.Users.findOne({ _id: req.user.id }).lean();
      if (!user) {
        return res.boom.notFound('No user found');
      }
      return res.status(200).send(user);
    }

    const users = await db.Users.find({}).lean();
    return res.status(200).send(users);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the users');
  }
});

//==========================================================================================

router.get('/:id', VerifyToken, async (req, res) => {
  try {
    // For owner
    if (req.user.id === req.params.id) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }
      return res.status(200).send({ user: dbUser });
    }
    // For another profile
    let dbUser = await db.Users.findOne({ _id: req.params.id });
    if (!dbUser) {
      return res.boom.notFound('Error: user not found');
    }
    return res.status(200).send({ user: omit(dbUser.toObject(), ['facebook', 'twitter', 'google']) });

  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.put('/:id', VerifyToken, async (req, res) => {
  try {
    if (req.user.id === req.params.id) { // The JWT can be decoded (the user is logged in)
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }
      dbUser.name = req.body.user.name;
      dbUser.lastName = req.body.user.lastName;
      dbUser.birthDate = req.body.user.birthDate;
      dbUser.phoneNumber = req.body.user.phoneNumber;
      dbUser.sex = req.body.user.sex;

      await dbUser.save();
      return res.status(200).send({ message: 'Profile info saved.', user: dbUser.toObject() });
    }
    return res.boom.unauthorized('Invalid JWT token');
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================//


router.post('/image', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }

      if (req.body.picture) {

        let imagesAWS = await util.resizeArraImages(req.body.picture.data, 'Users', dbUser._id, req.body.picture.fileName);

        dbUser.userImage = {
          big: imagesAWS.big,
          medium: imagesAWS.medium,
          small: imagesAWS.small
        };

        await dbUser.save();

        return res.status(200).send(omit(dbUser.toObject(), ['password', 'verificationToken']));
      }

    }
    return res.boom.badImplementation('There was a problem saving the complaint');
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the complaints');
  }
});

//==========================================================================================

router.put('/welisten/edituserprofile', VerifyToken, async (req, res) => {
  try {
    if (req.user && req.user.kind === 1) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (dbUser) {
        dbUser.name = req.body.name;
        dbUser.email = req.body.email;
        dbUser.lastName = req.body.lastName;
        dbUser.phoneNumber = req.body.phoneNumber;
        dbUser.sex = req.body.sex;
        await dbUser.save();
        return res.send(dbUser.toObject());
      }
    }
    return res.boom.notFound('There was a problem finding the organization');
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organization');
  }
});

//==========================================================================================

router.post('/welisten/edituserprofile/image', VerifyToken, async (req, res) => {

  try {
    if (req.user && req.user.kind === 1) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }

      if (req.body.picture) {

        let imagesAWS = await util.resizeArraImages(req.body.picture.data, 'Users', dbUser._id, req.body.picture.fileName);

        dbUser.userImage = {
          big: imagesAWS.big,
          medium: imagesAWS.medium,
          small: imagesAWS.small
        };

        await dbUser.save();

        return res.status(200).send(omit(dbUser.toObject(), ['password', 'verificationToken']));
      }

    }
    return res.boom.badImplementation('There was a problem saving the complaint');
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the complaints');
  }
});

//==========================================================================================

router.post('/state-marker', VerifyToken, async (req, res) => {
  try {
    if (req.user) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      if (dbUser) {
        let updatedFollows = Object.assign([], dbUser.follows);
        let OrganizationMarkers = updatedFollows.filter((item) => item.companyId == req.body.companyId)[0];
        let marker = OrganizationMarkers.opinions.find((item) => item.opinion == req.body.marker);
        if (!marker) {
          let arrayOpinions = Object.assign([],OrganizationMarkers.opinions);
          arrayOpinions.push({opinion: req.body.marker, status: 1});
          OrganizationMarkers.opinions = arrayOpinions;
        } else {
          marker.status = req.body.status;
        }
        dbUser.follows = updatedFollows;
        await dbUser.save();
        return res.send(omit(dbUser.toObject(), ['password', 'verificationToken']));
      }
      return res.boom.notFound('User not found');
    }
    return res.boom.notFound('There was a problem finding the organization');
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organization');
  }
});

module.exports = router;
