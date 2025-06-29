'use strict';

const express = require('express');
const Config = require('getconfig');
const router = express.Router();
const VerifyToken = require('../js/verifyToken');
const db = require('../js/db');
const util = require('../js/util');
const fs = require('fs');
const _ = require('lodash');

//==========================================================================================

router.get('/', VerifyToken, async (req, res) => {

  try {

    const organizations = await db.Organizations.find({}).lean();
    return res.status(200).send(organizations);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

//==========================================================================================

router.get('/page/:kind', VerifyToken, async (req, res) => {

  try {
    let kind = Number(req.params.kind);
    let size = Number(req.query.size);
    let skip = Number(req.query.page);

    const organizations = await db.Organizations.find({ kind: kind }).lean()
      .sort({ name: 1 }).skip(skip).limit(size);
    return res.status(200).send(organizations);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

//==========================================================================================

router.get('/search', async (req, res) => {

  try {
    let size = Number(req.query.size);
    let skip = Number(req.query.page);
    let regexQuery = new RegExp(`^${req.query.word}.*`, 'i');

    let dbOrganization = await db.Organizations.find({ name: { $regex: regexQuery } }).lean()
      .sort({ name: 1 }).skip(skip).limit(size);

    return res.status(200).send(dbOrganization);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

//==========================================================================================
router.get('/public/', async (req, res) => {
  try {
    let organizations;
    let kind = Number(req.query.kind);
    let size = Number(req.query.size);
    let skip = Number(req.query.page);
    let crisis = Number(req.query.crisis);
    let sortBy = req.query.sortBy || 'score';

    if (sortBy == 'score') {
      sortBy = 'stats.score';
    }

    if (crisis == 1) {
      organizations = await db.Organizations.find({ kind: kind, isCrisis: true }).lean()
        .skip(skip).limit(size).sort({ [sortBy]: (sortBy == 'name') ? 1 : -1 });
    } else {
      organizations = await db.Organizations.find({ kind: kind }).lean()
        .skip(skip).limit(size).sort({ [sortBy]: (sortBy == 'name') ? 1 : -1 });
    }
    return res.status(200).send(organizations);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

//==========================================================================================

router.get('/:id', VerifyToken, async (req, res) => {

  try {
    const organization = await db.Organizations.findOne({ _id: req.params.id }).lean();

    if (!organization) {
      return res.boom.notFound('No organization found for type ' + req.params.id);
    }
    return res.status(200).send(organization);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

//==========================================================================================

router.get('/performancedetail/:name', async (req, res) => {
  try {
    let name =  decodeURIComponent(req.params.name);
    const organization = await db.Organizations.findOne({ name: name }).lean();

    if (!organization) {
      return res.boom.notFound('No organization found for type ' + req.params.name);
    }
    return res.status(200).send(organization);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});


//==========================================================================================

router.post('/follow', VerifyToken, async function (req, res) {
  try {
    if (req.user) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });
      let dbOrganization = await db.Organizations.findOne({ _id: req.body.id }).lean();

      let newFollows = Object.assign([], dbUser.follows) || [];
      let isFollowed = newFollows.find((item) => item.companyId == req.body.id);
      if (!isFollowed) {
        let defaultMarkers = [];
        if (dbOrganization.markers) {
          for (let marker of dbOrganization.markers) {
            defaultMarkers.push({ opinion: marker });
          }
          newFollows.push({ companyId: req.body.id, opinions: defaultMarkers });
        } else {
          newFollows.push({ companyId: req.body.id, opinions: { opinion: '' } });
        }

        dbUser.follows = newFollows;
        await dbUser.save();
      }


      return res.send(dbUser.follows);
    }
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.post('/unfollow', VerifyToken, async function (req, res) {
  try {
    if (req.user) {
      let dbUser = await db.Users.findOne({ _id: req.user.id });

      let oldFollows = Object.assign([], dbUser.follows);
      dbUser.follows = oldFollows.filter((item) => item.companyId != req.body.id);
      await dbUser.save();

      return res.send(dbUser.follows);
    }
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.get('/welisten/searchorganizations', async (req, res) => {

  try {
    const regexQuery = new RegExp(`.*${req.query.word}.*`, 'i');
    let size = Number(req.query.size);
    let skip = Number(req.query.page);

    const organizations = await db.Organizations.find({ name: { $regex: regexQuery } }).lean().select('-admins')
      .skip(skip).limit(size);
    return res.status(200).send(organizations);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

//==========================================================================================


router.put('/welisten/editprofile', VerifyToken, async (req, res) => {
  try {
    if (req.user && req.user.kind === 1) {
      let dbOrg = await db.Organizations.findOne({ _id: req.user.companyId });
      if (dbOrg) {
        dbOrg.name = req.body.name;
        dbOrg.address = req.body.address;
        dbOrg.email = req.body.email;
        dbOrg.phoneNumberOrganization = req.body.phoneNumberOrganization;
        dbOrg.facebook = req.body.facebook;
        dbOrg.twitter = req.body.twitter;
        dbOrg.markers = req.body.markers;
        await dbOrg.save();
        return res.send(dbOrg.toObject());
      }
      return res.boom.notFound('There was a problem finding the organization');
    }
    return res.boom.notFound('There was a problem finding the organization');
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organization');
  }
});

//==========================================================================================

router.post('/neworganization', async function (req, res) {
  try {
    let url = '';
    let dbOrganization = await db.Organizations.findOne({ name: req.body.name });
    if (!dbOrganization) {
      if (req.body.organizationImage) {
        url = req.body.organizationImage.small;
        delete req.body.organizationImage;
      }
      const newOrganization = new db.Organizations(req.body);

      if (url) {
        util.downloadImagesURL(url, 'downloaded.jpg');
        let imageData = fs.readFileSync('downloaded.jpg');

        let smallFilename = 'OrganizationsLogos/' + newOrganization._id + '/' + 'small_' + 'downloaded.jpg';
        let mediumFilename = 'OrganizationsLogos/' + newOrganization._id + '/' + 'medium_' + 'downloaded.jpg';
        let bigFilename = 'OrganizationsLogos/' + newOrganization._id + '/' + 'big_' + 'downloaded.jpg';
        let smallImage = await util.resizeImage(imageData, 256);
        let mediumImage = await util.resizeImage(imageData, 640);
        let bigImage = await util.resizeImage(imageData, 960);
        await util.uploadToS3(smallFilename, smallImage, Config.awsBucketName.name);
        await util.uploadToS3(mediumFilename, mediumImage, Config.awsBucketName.name);
        await util.uploadToS3(bigFilename, bigImage, Config.awsBucketName.name);

        fs.unlinkSync('downloaded.jpg');

        newOrganization.organizationImage = {
          big: Config.awsBucketName.s3BucketURL + bigFilename,
          medium: Config.awsBucketName.s3BucketURL + mediumFilename,
          small: Config.awsBucketName.s3BucketURL + smallFilename
        };
      }

      await newOrganization.save();
      return res.send(newOrganization);
    }
    return res.boom.conflict('The organization already exists');
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.post('/neworganization/mobile', VerifyToken, async function (req, res) {
  try {
    if (req.user) {
      let dataImage = '';
      let nameImage = '';

      let dbOrganization = await db.Organizations.findOne({ name: req.body.name });
      if (!dbOrganization) {
        req.body.createdBy = req.user.id; // Add createdBy user
        if (req.body.organizationImage) {
          dataImage = req.body.organizationImage.small.data;
          nameImage = req.body.organizationImage.small.fileName;
          delete req.body.organizationImage;
        }
        const newOrganization = new db.Organizations(req.body);

        if (dataImage) {

          let imagesAWS = await util.resizeArraImages(dataImage, 'OrganizationsLogos', newOrganization.name, nameImage);

          newOrganization.organizationImage = {
            big: imagesAWS.big,
            medium: imagesAWS.medium,
            small: imagesAWS.small
          };
        }

        await newOrganization.save();
        await util.defaultGraphs(newOrganization.id);

        let dbOrganizationUpdated = await db.Organizations.findOne({ name: req.body.name });

        return res.send(dbOrganizationUpdated);
      }
      return res.boom.conflict('The organization already exists');
    }
  } catch (err) {
    return res.boom.badImplementation(err);
  }
});

//==========================================================================================

router.get('/welisten/search', async (req, res) => {
  try {
    let organizationsFiltered;
    let kind = Number(req.query.kind);
    let search = Number(req.query.search);
    let size = Number(req.query.size);
    let skip = Number(req.query.page);
    let crisis = Number(req.query.crisis);
    const regexQuery = new RegExp(`.*${req.query.search}.*`, 'i');

    if (req.query.filter == 'name') {
      if (crisis == 1) {
        organizationsFiltered = await db.Organizations.find({ kind: kind, name: { $regex: regexQuery }, isCrisis: true }).lean().select('-admins')
          .skip(skip).limit(size).sort({ 'stats.score': -1 });
      } else {
        organizationsFiltered = await db.Organizations.find({ kind: kind, name: { $regex: regexQuery } }).lean().select('-admins')
          .skip(skip).limit(size).sort({ 'stats.score': -1 });
      }
    } else {
      if (crisis == 1) {
        organizationsFiltered = await db.Organizations.find({ kind: kind, isCrisis: true, 'stats.score': { $gte: search } }).lean().select('-admins')
          .skip(skip).limit(size).sort({ 'stats.score': -1 });
      } else {
        organizationsFiltered = await db.Organizations.find({ kind: kind, 'stats.score': { $gte: search } }).lean().select('-admins')
          .skip(skip).limit(size).sort({ 'stats.score': -1 });
      }
    }

    return res.status(200).send(organizationsFiltered);
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

//==========================================================================================

router.get('/welisten/organization-by-date', async (req, res) => {
  try {
    let kind = Number(req.query.kind);
    let size = Number(req.query.size);
    let skip = Number(req.query.page);
    let startDate = new Date(Number(req.query.startDate));
    let finishDate = new Date(Number(req.query.finishDate));
    let crisis = Number(req.query.crisis);

    let dbComplaints = await db.Complaints.find({
      created: {
        $gte: startDate,
        $lt: finishDate
      }
    });
    let arrayOrganizations = dbComplaints.map((item) => item.companyId.toString());
    arrayOrganizations = _.uniq(arrayOrganizations);
    let dbOrganizations;
    if (crisis == 1) {
      dbOrganizations = await db.Organizations.find({ _id: { $in: arrayOrganizations }, kind: kind, crisis: true }).select('-admins')
        .lean().skip(skip).limit(size);
    } else {
      dbOrganizations = await db.Organizations.find({ _id: { $in: arrayOrganizations }, kind: kind }).select('-admins')
        .lean().skip(skip).limit(size);
    }

    return res.status(200).send(dbOrganizations);

  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

//==========================================================================================

router.post('/welisten/editprofile/image', VerifyToken, async (req, res) => {

  try {
    if (req.user && req.user.kind === 1) {
      let dbOrg = await db.Organizations.findOne({ _id: req.user.companyId });
      if (!dbOrg) {
        return res.boom.notFound('Error: user not found');
      }

      if (req.body.picture) {

        let imagesAWS = await util.resizeArraImages(req.body.picture.data, 'OrganizationsLogos', dbOrg.name, req.body.picture.fileName);

        dbOrg.organizationImage = {
          big: imagesAWS.big,
          medium: imagesAWS.medium,
          small: imagesAWS.small
        };

        await dbOrg.save();

        return res.status(200).send(dbOrg.toObject());
      }

    }
    return res.boom.badImplementation('There was a problem saving the complaint');
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the complaints');
  }
});

//==========================================================================================

router.post('/welisten/link-organization', async (req, res) => {

  try {
    let isNewOrganization = (req.body.organization._id) ? false : true;

    const dbUser = await db.Users.findOne({ email: req.body.email });
    if (!dbUser || dbUser.kind == 0) {
      return res.boom.notFound('User is not premium');
    }
    if (isNewOrganization) {
      let dbOrg = new db.Organizations(req.body.organization);

      if (req.body.organization.picture) {
        let imagesAWS = await util.resizeArraImages(req.body.picture.data, 'OrganizationsLogos', dbOrg.name, req.body.organization.picture.fileName);

        dbOrg.organizationImage = {
          big: imagesAWS.big,
          medium: imagesAWS.medium,
          small: imagesAWS.small
        };
      } else {
        dbOrg.organizationImage.small = 'https://s3.amazonaws.com/complaints-wespeak/OrganizationsLogos/WeSpeaK_LOGO/no-logo-available.jpg';
      }
      await db.Organizations.create(dbOrg);

      return res.status(200).send(dbOrg.toObject());

    }

    let dbOrg = await db.Organizations.findOne({ _id: req.body.organization._id });
    dbOrg.admins = dbOrg.admins.concat(dbUser._id);
    await dbOrg.save();

    return res.status(200).send(dbOrg.toObject());

  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the organizations');
  }
});

module.exports = router;
