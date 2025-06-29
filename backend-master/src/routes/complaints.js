'use strict';

const express = require('express');
const router = express.Router();
const VerifyToken = require('../js/verifyToken');
const util = require('../js/util');
const db = require('../js/db');
const omit = require('object.omit');
const _ = require('lodash');
//==========================================================================================

router.post('/', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      if (req.body.complaint) {

        // Message contain
        const newComplaint = new db.Complaints({
          userId: req.user.id,
          companyId: req.body.complaint.companyId,
          topic: req.body.complaint.topic,
          when: req.body.complaint.when || new Date,
          message: req.body.complaint.message,
          where: req.body.complaint.where || '',
          anonymous: req.body.complaint.anonymous,
          hashtags: req.body.complaint.hashtags || [],
          angryLevel: req.body.complaint.angryLevel,
          reimbursement: req.body.complaint.reimbursement,
          reimbursementAmount: req.body.complaint.reimbursementAmount || 0,
          waitingTimer: req.body.complaint.waitingTimer
        });

        // Upload images
        let picturesList = [];
        if (req.body.complaint.pictures.length > 0) {
          for (const picture of req.body.complaint.pictures) {
            let imagesAWS = await util.resizeArraImages(picture.data, 'Complaints', newComplaint.id, picture.fileName);
            picturesList.push({
              big: imagesAWS.big,
              medium: imagesAWS.medium,
              small: imagesAWS.small
            });
          }
          newComplaint.pictures = picturesList;
        }

        newComplaint.stateDates[0] = new Date();
        newComplaint.stateDates[1] = new Date();
        await db.Complaints.create(newComplaint);


        let dbCompaint = await db.Complaints.findOne({ _id: newComplaint.id }).lean()
          .populate({ path: 'companyId', select: 'name organizationImage stats' })
          .populate({ path: 'userId', select: 'name userImage' });

        dbCompaint.views = '0';
        dbCompaint.facebookShares = '0';
        dbCompaint.twitterShares = '0';
        dbCompaint.speaksShares = '0';

        await util.updateStats(newComplaint);
        await util.checkCrisis(req.body.complaint.companyId);

        return res.status(200).send(dbCompaint);
      }
      return res.boom.badImplementation('There was a problem saving the complaint');
    }
  } catch (error) {
    return res.boom.badRequest(error);
  }
});


//==========================================================================================//

router.get('/user/:id', VerifyToken, async (req, res) => {

  try {
    if (req.user.id === req.params.id) { // The JWT can be decoded (the user is logged in)
      let dbOwnComplaints = await db.Complaints.find({ userId: req.user.id }).lean()
        .sort({ created: -1 })
        .populate({ path: 'companyId', select: 'name organizationImage sector stats' })
        .populate({ path: 'userId', select: 'name userImage' });
      if (!dbOwnComplaints) {
        return res.boom.notFound('Error: complaints not found');
      }

      for (let complaint of dbOwnComplaints) {
        complaint.views = complaint.views.length.toString();
        complaint.facebookShares = complaint.facebookShares.length.toString();
        complaint.twitterShares = complaint.twitterShares.length.toString();
        complaint.speaksShares = complaint.speaksShares.length.toString();
      }
      return res.status(200).send(dbOwnComplaints);
    }
    return res.boom.notFound('Error: user not found');
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});


//==========================================================================================//

router.get('/organization/', VerifyToken, async (req, res) => {

  try {
    if (req.user) { // The JWT can be decoded (the user is logged in)
      let dbOrgComplaints = await db.Complaints.find().lean()
        .sort({ created: -1 })
        .populate({ path: 'companyId', select: 'name organizationImage sector stats' })
        .populate({ path: 'userId', select: 'name userImage' });
      if (!dbOrgComplaints) {
        return res.boom.notFound('Error: complaints not found');
      }

      for (let complaint of dbOrgComplaints) {
        complaint.views = complaint.views.length.toString();
        complaint.facebookShares = complaint.facebookShares.length.toString();
        complaint.twitterShares = complaint.twitterShares.length.toString();
        complaint.speaksShares = complaint.speaksShares.length.toString();
      }

      return res.status(200).send(dbOrgComplaints);
    }
    return res.boom.notFound('Error: user not found');
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================//

router.get('/crisis', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      let size = Number(req.query.size) || 20;
      let skip = Number(req.query.page) || 0;

      let dbCrisisOrganizations = await db.Organizations.find({ isCrisis: true })
        .sort({ 'stats.complaintsCounter': -1 });

      let principalCrisis = dbCrisisOrganizations.filter((item, index) => index < 5);

      let arrayIds = principalCrisis.map((item) => item.id.toString());

      let dbComplaints = await db.Complaints.find({ companyId: { $in: arrayIds } }).lean()
        .skip(skip).limit(size).sort({ created: -1 })
        .populate({ path: 'companyId', select: 'name organizationImage sector stats' })
        .populate({ path: 'userId', select: 'name userImage' });

      for (let complaint of dbComplaints) {
        complaint.views = complaint.views.length.toString();
        complaint.facebookShares = complaint.facebookShares.length.toString();
        complaint.twitterShares = complaint.twitterShares.length.toString();
        complaint.speaksShares = complaint.speaksShares.length.toString();
      }
      return res.status(200).send(dbComplaints);
    }
    return res.boom.notFound('Error: user not found');
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the complaints');
  }
});

//==========================================================================================//

router.get('/organization/:id', VerifyToken, async (req, res) => {

  try {
    if (req.user) { // The JWT can be decoded (the user is logged in)
      let size = Number(req.query.size);
      let skip = Number(req.query.page);

      let dbOrgComplaints = await db.Complaints.find({ companyId: req.params.id }).lean()
        .sort({ created: -1 }).skip(skip).limit(size)
        .populate({ path: 'companyId', select: 'name organizationImage sector stats' })
        .populate({ path: 'userId', select: 'name userImage' });
      if (!dbOrgComplaints) {
        return res.boom.notFound('Error: complaints not found');
      }

      for (let complaint of dbOrgComplaints) {
        complaint.views = complaint.views.length.toString();
        complaint.facebookShares = complaint.facebookShares.length.toString();
        complaint.twitterShares = complaint.twitterShares.length.toString();
        complaint.speaksShares = complaint.speaksShares.length.toString();
      }

      return res.status(200).send(dbOrgComplaints);
    }
    return res.boom.notFound('Error: user not found');
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================//

router.get('/myfeed', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      let size = Number(req.query.size);
      let skip = Number(req.query.page);

      let dbUser = await db.Users.findOne({ _id: req.user.id });
      let arrayFollows = [];
      for (let companyId of dbUser.follows) {
        arrayFollows.push(companyId.companyId.toString());
      }
      let dbFeedComplaints = await db.Complaints.find({ 'companyId': { $in: arrayFollows }, state: { $lt: 4 } }).lean()
        .skip(skip).limit(size).sort({ created: -1 })
        .populate({ path: 'companyId', select: 'name organizationImage sector stats' })
        .populate({ path: 'userId', select: 'name userImage' });

      if (!dbFeedComplaints) {
        return res.boom.notFound('Error: complaints not found');
      }

      for (let complaint of dbFeedComplaints) {
        complaint.views = complaint.views.length.toString();
        complaint.facebookShares = complaint.facebookShares.length.toString();
        complaint.twitterShares = complaint.twitterShares.length.toString();
        complaint.speaksShares = complaint.speaksShares.length.toString();
      }

      return res.status(200).send(dbFeedComplaints);
    }
    return res.boom.notFound('Error: user not found');
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================//

router.get('/myfeed/search', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      const regexQuery = new RegExp(`.*${req.query.word}.*`, 'i');

      let dbUser = await db.Users.findOne({ _id: req.user.id });
      let arrayFollows = [];
      for (let companyId of dbUser.follows) {
        arrayFollows.push(companyId.companyId.toString());
      }
      let dbFeedComplaints = await db.Complaints.find({ message: { $regex: regexQuery }, 'companyId': { $in: arrayFollows } }).lean()
        .limit(50).sort({ created: -1 })
        .populate({ path: 'companyId', select: 'name organizationImage sector stats' })
        .populate({ path: 'userId', select: 'name userImage' });

      if (!dbFeedComplaints) {
        return res.boom.notFound('Error: complaints not found');
      }

      for (let complaint of dbFeedComplaints) {
        complaint.views = complaint.views.length.toString();
        complaint.facebookShares = complaint.facebookShares.length.toString();
        complaint.twitterShares = complaint.twitterShares.length.toString();
        complaint.speaksShares = complaint.speaksShares.length.toString();
      }

      return res.status(200).send(dbFeedComplaints);
    }
    return res.boom.notFound('Error: user not found');
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================//

router.get('/topic/search', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      const regexQuery = new RegExp(`.*${req.query.word}.*`, 'i');
      let size = Number(req.query.size);
      let skip = Number(req.query.page);

      let dbTopic = await db.Complaints.find({ topic: { $regex: regexQuery } }).lean()
        .skip(skip).limit(size).sort({ created: -1 })
        .populate({ path: 'companyId', select: 'name organizationImage' })
        .populate({ path: 'userId', select: 'name userImage' });

      if (!dbTopic) {
        return res.boom.notFound('Error: complaints not found');
      }

      for (let complaint of dbTopic) {
        complaint.views = complaint.views.length.toString();
        complaint.facebookShares = complaint.facebookShares.length.toString();
        complaint.twitterShares = complaint.twitterShares.length.toString();
        complaint.speaksShares = complaint.speaksShares.length.toString();
      }
      return res.status(200).send(dbTopic);
    }
    return res.boom.notFound('Error: user not found');
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================//

router.get('/searchby', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      let kind = Number(req.query.kind);
      const regexQuery = new RegExp(`.*${req.query.word}.*`, 'i');
      let size = Number(req.query.size);
      let skip = Number(req.query.page);

      if (kind == 0) {
        let dbTopic = await db.Complaints.find({ topic: { $regex: regexQuery } }).lean()
          .skip(skip).limit(size).sort({ created: -1 }).select('topic');
        dbTopic = _.unionBy(dbTopic, 'topic');
        return res.status(200).send(dbTopic);
      }

      let dbOrganizations = await db.Organizations.find({ name: { $regex: regexQuery } }).lean()
        .skip(skip).limit(size).sort({ created: -1 }).select('name');
      return res.status(200).send(dbOrganizations);

    }
    return res.boom.notFound('Error: user not found');
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================//

router.get('/welisten/complaintid/:id', VerifyToken, async (req, res) => {

  try {
    if (req.user && req.user.kind === 1) { // The JWT can be decoded (the user is logged in)
      let dbComplaintDetailed = await db.Complaints.findOne({ _id: req.params.id }).lean()
        .populate({ path: 'companyId', select: 'name organizationImage' })
        .populate({ path: 'userId', select: 'name email userImage follows birthDate registerDate lastLoginDate' });

      if (!dbComplaintDetailed) {
        return res.boom.notFound('Error: complaint not found');
      }

      dbComplaintDetailed.views = dbComplaintDetailed.views.length.toString();
      dbComplaintDetailed.facebookShares = dbComplaintDetailed.facebookShares.length.toString();
      dbComplaintDetailed.twitterShares = dbComplaintDetailed.twitterShares.length.toString();
      dbComplaintDetailed.speaksShares = dbComplaintDetailed.speaksShares.length.toString();

      return res.status(200).send(dbComplaintDetailed);
    }
    return res.boom.notFound('Error: user not found or unauthorizated');
  } catch (error) {
    return res.boom.unauthorized('Invalid JWT token');
  }
});

//==========================================================================================

router.post('/viewcrisis/:id', VerifyToken, async function (req, res) {
  try {
    if (req.user) {
      let dbCompaint = await db.Complaints.findOne({ _id: req.params.id });

      let isView = dbCompaint.views.find((item) => item == req.user.id);
      if (!isView) {
        let oldViews = dbCompaint.views;
        oldViews.push(req.user.id);
        dbCompaint.views = oldViews;
        await dbCompaint.save();
        return res.send(dbCompaint.views.length.toString());
      }
      return res.send(dbCompaint.views.length.toString());
    }
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.post('/shares-count/:kind/:id', VerifyToken, async function (req, res) {
  try {
    if (req.user) {
      let kind = (req.params.kind == '0') ? 'facebookShares' : 'twitterShares';
      let dbCompaint = await db.Complaints.findOne({ _id: req.params.id });

      let isShared = dbCompaint[kind].find((item) => item == req.user.id);

      if (!isShared) {
        let oldShares = dbCompaint[kind];
        oldShares.push(req.user.id);
        dbCompaint[kind] = oldShares;
        dbCompaint.speaksShares = _.union(dbCompaint.speaksShares, oldShares);
        await dbCompaint.save();
        return res.send(dbCompaint[kind].length.toString());
      }
      return res.send(dbCompaint[kind].length.toString());
    }
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.put('/change-state/:idComplaint', VerifyToken, async (req, res) => {
  try {
    if (req.user) {
      let dbComplaint = await db.Complaints.findOne({ _id: req.params.idComplaint });
      if (!dbComplaint) {
        return res.boom.notFound('Error: complaint not found');
      }
      dbComplaint.state = req.body.state;
      dbComplaint.reopen = ((req.body.state == '4') || (req.body.state == '5')) ? false : dbComplaint.reopen;
      let oldStateDates = Object.assign([], dbComplaint.stateDates);
      oldStateDates[req.body.state] = new Date();
      for (let i = 0; i < Number(req.body.state); i++) {
        if (!oldStateDates[i]) {
          oldStateDates[i] = new Date();
        }
      }
      dbComplaint.stateDates = oldStateDates;
      await dbComplaint.save();

      if (dbComplaint.state == 4) {
        await util.updateStats(dbComplaint);
      }

      let dbComplaintUpdated = await db.Complaints.findOne({ _id: req.params.idComplaint }).lean()
        .populate({ path: 'companyId', select: 'name organizationImage sector stats' })
        .populate({ path: 'userId', select: 'name userImage' });

      dbComplaintUpdated.views = dbComplaintUpdated.views.length.toString();
      dbComplaintUpdated.facebookShares = dbComplaintUpdated.facebookShares.length.toString();
      dbComplaintUpdated.twitterShares = dbComplaintUpdated.twitterShares.length.toString();
      dbComplaintUpdated.speaksShares = dbComplaintUpdated.speaksShares.length.toString();

      return res.status(200).send(dbComplaintUpdated);
    }
    return res.boom.unauthorized('Invalid JWT token');
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.put('/reopen-complaint/:idComplaint', VerifyToken, async (req, res) => {
  try {
    if (req.user) {
      let dbComplaint = await db.Complaints.findOne({ _id: req.params.idComplaint });
      if (!dbComplaint) {
        return res.boom.notFound('Error: complaint not found');
      }
      if (!dbComplaint.reopen) {
        dbComplaint.state = 1;
        dbComplaint.reopen = true;
        await dbComplaint.save();

        await util.updateStats(dbComplaint);

      }

      let dbComplaintUpdated = await db.Complaints.findOne({ _id: req.params.idComplaint }).lean()
        .populate({ path: 'companyId', select: 'name organizationImage sector stats' })
        .populate({ path: 'userId', select: 'name userImage' });

      dbComplaintUpdated.views = dbComplaintUpdated.views.length.toString();
      dbComplaintUpdated.facebookShares = dbComplaintUpdated.facebookShares.length.toString();
      dbComplaintUpdated.twitterShares = dbComplaintUpdated.twitterShares.length.toString();
      dbComplaintUpdated.speaksShares = dbComplaintUpdated.speaksShares.length.toString();

      return res.status(200).send(dbComplaintUpdated);
    }
    return res.boom.unauthorized('Invalid JWT token');
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.get('/welisten/user-info/:id', VerifyToken, async (req, res) => {
  try {
    if (req.user.kind === 1) {
      let dbUser = await db.Users.findOne({ _id: req.params.id });
      if (!dbUser) {
        return res.boom.notFound('Error: user not found');
      }
      let dbComplaints = await db.Complaints.find({ userId: dbUser._id });
      let numComplaints = dbComplaints.length || 0;
      let arrTopics = dbComplaints.map((item) => item.topic);
      let numTopics = _.uniq(arrTopics).length || 0;
      return res.status(200).send({
        user: omit(dbUser.toObject(), ['password', 'verificationToken']),
        numComplaints,
        numTopics
      });
    }
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

module.exports = router;
