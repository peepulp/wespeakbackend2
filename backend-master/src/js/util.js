'use strict';
const Config = require('getconfig');
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const db = require('../js/db');
const Bcrypt = require('bcryptjs'); // To hash passwords
const randomstring = require('randomstring');
const sharp = require('sharp');
const request = require('request');
const fs = require('fs');
const stripe = require('stripe')(Config.stripe.secretKey);
const schedule = require('node-schedule');
const _ = require('lodash');
const vader = require('vader-sentiment');

let util = exports;

const emailer = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: Config.nev.email,
    pass: Config.nev.password
  }
});

//========================================================

util.sendEmail = function (to, from, subject, html, cb) {
  let message = {
    from: from,
    to: to,
    subject: subject,
    text: html,
    html: html
  };

  emailer.sendMail(message, function (err) {
    if (err) {
      return cb(err);
    }
    cb(null);
  });
};

//========================================================

util.uploadToS3 = (dstFilename, srcFile, bucketName) => {
  return new Promise(function (resolve, reject) {
    let s3Bucket = new AWS.S3({ ...Config.aws, params: { Bucket: bucketName } });
    s3Bucket.putObject({ Key: dstFilename, Body: srcFile, ACL: 'public-read' }, function (err) {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
};

//========================================================

util.resizeImage = async (imageData, height) => {
  return await sharp(imageData)
    .resize(height)
    .max()
    .crop(sharp.gravity.centre)
    .toFormat('png')
    .toBuffer();
};

//========================================================

util.resizeArraImages = async (imageBase64, kindPath, folderName, newFileName) => {
  try {
    fs.writeFileSync(newFileName, new Buffer(imageBase64, 'base64'));
    let imageData = fs.readFileSync(newFileName);

    let smallFilename = kindPath + '/' + folderName + '/' + 'small_' + newFileName;
    let mediumFilename = kindPath + '/' + folderName + '/' + 'medium_' + newFileName;
    let bigFilename = kindPath + '/' + folderName + '/' + 'big_' + newFileName;
    let smallImage = await util.resizeImage(imageData, 256);
    let mediumImage = await util.resizeImage(imageData, 640);
    let bigImage = await util.resizeImage(imageData, 960);
    await util.uploadToS3(smallFilename, smallImage, Config.awsBucketName.name);
    await util.uploadToS3(mediumFilename, mediumImage, Config.awsBucketName.name);
    await util.uploadToS3(bigFilename, bigImage, Config.awsBucketName.name);

    fs.unlinkSync(newFileName);

    let awsImages = {
      big: Config.awsBucketName.s3BucketURL + bigFilename,
      medium: Config.awsBucketName.s3BucketURL + mediumFilename,
      small: Config.awsBucketName.s3BucketURL + smallFilename
    };

    return awsImages;
  } catch (error) {
    return console.info(error);
  }
};

//========================================================

util.downloadImagesURL = (url, filename) => {
  request(url, { encoding: 'binary' }, function (error, response, body) {
    fs.writeFile(filename, body, 'binary', function (err) {
      console.info(err);
    });
  });

  return filename;
};

//========================================================

util.checkCrisis = async (companyId) => {
  try {
    //let numberdbUser = await db.Users.find({ follows: { $elemMatch: { companyId: companyId} } }).count();
    let numberdbUser = await db.Users.count({});
    let threshold = Math.pow(numberdbUser, 0.4);

    let dbOrganization = await db.Organizations.findOne({ _id: companyId });
    let speaksOrg = await db.Complaints.find({ companyId: companyId }).lean();

    let numberSpeaks = speaksOrg.length;
    let numberSpeaksResolved = speaksOrg.filter((item) => (item.state == 4 || item.state == 5) && item).length;

    let isCrisis = ((numberSpeaks - numberSpeaksResolved) >= threshold) ? true : false;

    dbOrganization.isCrisis = isCrisis;
    await dbOrganization.save();

    return isCrisis;
  } catch (error) {
    return console.info(error);
  }
};

//========================================================

util.checkPayment = async function (customerId) {
  try {
    return stripe.customers.retrieve(
      customerId
    ).then(function (customer) {
      return customer.delinquent;
    }).catch(function (err) {
      return err;
    });
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
};

//========================================================

util.fillDefaultDatabase = async function () {

  try {
    /*let organizations = await db.Organizations.find();
  for (const org of organizations) {
    const newComplaint = new db.Complaints({
      userId: '5a97ed4078353800ec29d343',
      companyId: org._id,
      topic: 'Big complaint',
      time: new Date(),
      message: 'This is the contain of your complaint.',
      where: 'California',
      state: 0,
      anonymous: false,
      angryLevel: 1
    });
    await db.Complaints.update({companyId: org}, {$set: newComplaint}, {upsert: true});
  }*/
    const user = await db.Users.findOne({ email: 'jmoya@celtiberian.es' });
    if (!user) {
      const newUser = new db.Users({
        name: 'Tester 1',
        email: 'jmoya@celtiberian.es',
        password: Bcrypt.hashSync('1234', 10),
        userImage: { small: 'https://s3.amazonaws.com/complaints-wespeak/Users/Tester/avatar.png' },
        kind: 0,
        verificationToken: randomstring.generate(48)
      });
      await db.Users.create(newUser);
    }

    const userPrem = await db.Users.findOne({ email: 'mbolivar@celtiberian.es' });
    if (!userPrem) {
      const newUserPrem = new db.Users({
        name: 'Tester Premium',
        email: 'mbolivar@celtiberian.es',
        password: Bcrypt.hashSync('1234', 10),
        userImage: { small: 'https://s3.amazonaws.com/complaints-wespeak/Users/Tester/avatar.png' },
        kind: 1,
        verificationToken: randomstring.generate(48)
      });
      await db.Users.create(newUserPrem);
    }

    let companyIds = await db.Complaints.find().distinct('companyId');
    let nonComplaintOrganizations = await db.Organizations.find({ _id: { $nin: companyIds } });
    let listComplaints = [];

    const userCheck = await db.Users.findOne({ email: 'jmoya@celtiberian.es' });
    for (const [index, org] of nonComplaintOrganizations.entries()) {
      if (index === 15) {
        break;
      }
      const newComplaint = new db.Complaints({
        userId: userCheck.id,
        companyId: org._id,
        topic: 'Big complaint',
        time: new Date(),
        message: 'This is the contain of your complaint.',
        where: 'California',
        angryLevel: 1,
        hashtags: ['Hastag']
      });
      listComplaints.push(newComplaint);
    }

    await db.Complaints.create(listComplaints);

  } catch (error) {
    console.info(error);
  }

};

//========================================================

// Schedule for scores

schedule.scheduleJob('*/1 * * *', async () => {
  try {
    let todayDate = new Date();

    let dbOrganizations = await db.Organizations.find({});
    let dbComplaints = await db.Complaints.find({});
    for (let dbOrganization of dbOrganizations) {
      let complaintsOrg = dbComplaints.filter((item) => item.companyId == dbOrganization.id.toString());
      let numComplaints = complaintsOrg.length;
      if (complaintsOrg.length == 0) {
        dbOrganization.stats.score = 100;
        let { updatedHours, updatedDays, updatedMonths, updatedYears } = await util.updateGraphs(dbOrganization.stats.score, dbOrganization.stats.dataGraph);
        dbOrganization.stats.dataGraph.day = updatedHours;
        dbOrganization.stats.dataGraph.days = updatedDays;
        dbOrganization.stats.dataGraph.month = updatedMonths;
        dbOrganization.stats.dataGraph.year = updatedYears;
      } else {
        let complaintsUnresolved = complaintsOrg.filter((item) => ((item.state != 4) && (item.state != 5)));
        let oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        let totalDaysUnresolved = 0;
        for (let complaint of complaintsUnresolved) {
          let complaintDate = new Date(complaint.created);
          let diffDays = Math.round(Math.abs((todayDate.getTime() - complaintDate.getTime()) / (oneDay)));
          totalDaysUnresolved = totalDaysUnresolved + diffDays;
        }

        dbOrganization.stats.score = 100 - (complaintsUnresolved.length + 0.25 * totalDaysUnresolved);

        let { updatedHours, updatedDays, updatedMonths, updatedYears } = await util.updateGraphs(dbOrganization.stats.score, dbOrganization.stats.dataGraph);
        dbOrganization.stats.dataGraph.day = updatedHours;
        dbOrganization.stats.dataGraph.days = updatedDays;
        dbOrganization.stats.dataGraph.month = updatedMonths;
        dbOrganization.stats.dataGraph.year = updatedYears;
      }

      let complaintResolved = complaintsOrg.filter((item) => (item.state == 4));
      let complaintReimbursed = complaintsOrg.filter((item) => (item.state == 5));

      let numReplies = await db.Chats.count({ companyIds: { $elemMatch: { organization: dbOrganization.id.toString() } } });

      dbOrganization.stats.complaintsCounter = numComplaints;
      dbOrganization.stats.replies = numReplies;
      dbOrganization.stats.resolves = complaintResolved.length;
      dbOrganization.stats.reimbursed = complaintReimbursed.length;
      dbOrganization.stats.resolveRate = (numComplaints == 0) ? 0 : (complaintResolved.length / numComplaints * 100).toFixed(1);
      dbOrganization.stats.responseRate = (numComplaints == 0) ? 0 : (numReplies / numComplaints * 100).toFixed(1);
      await dbOrganization.save();
    }
  } catch (error) {
    console.info(error);
  }
});


//========================================================

util.updateStats = async function (dbComplaint) {
  try {
    let dbOrganization = await db.Organizations.findOne({ _id: dbComplaint.companyId });
    let todayDate = new Date();

    if (dbComplaint.state == 4 || dbComplaint.state == 5) {
      let oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
      let complaintDate = new Date(dbComplaint.created);
      let totalDaysUnresolved = Math.round(Math.abs((todayDate.getTime() - complaintDate.getTime()) / (oneDay)));
      dbOrganization.stats.score = dbOrganization.stats.score + (1 + (0.25 * totalDaysUnresolved));
      let { updatedHours, updatedDays, updatedMonths, updatedYears } = await util.updateGraphs(dbOrganization.stats.score, dbOrganization.stats.dataGraph);
      dbOrganization.stats.dataGraph.day = updatedHours;
      dbOrganization.stats.dataGraph.days = updatedDays;
      dbOrganization.stats.dataGraph.month = updatedMonths;
      dbOrganization.stats.dataGraph.year = updatedYears;
      dbOrganization.stats.resolves = (dbComplaint.state == 4) ? dbOrganization.stats.resolves + 1 : dbOrganization.stats.resolves;
      dbOrganization.stats.reimbursed = (dbComplaint.state == 5) ? dbOrganization.stats.reimbursed + 1 : dbOrganization.stats.reimbursed;
      dbOrganization.stats.resolveRate = (dbOrganization.stats.resolves / dbOrganization.stats.complaintsCounter * 100).toFixed(1);
      dbOrganization.stats.responseRate = (dbOrganization.stats.replies / dbOrganization.stats.complaintsCounter * 100).toFixed(1);
    } else {
      if (dbComplaint.reopen) {
        let oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        let complaintDate = new Date(dbComplaint.created);
        let totalDaysUnresolved = Math.round(Math.abs((todayDate.getTime() - complaintDate.getTime()) / (oneDay)));
        dbOrganization.stats.score = dbOrganization.stats.score - (1 + (0.25 * totalDaysUnresolved));
        dbOrganization.stats.resolves--;
      } else {
        dbOrganization.stats.score--;
        dbOrganization.stats.complaintsCounter++;
        let sentimentPoint = vader.SentimentIntensityAnalyzer.polarity_scores(dbComplaint.message);
        if (sentimentPoint.compound >= 0.3) {
          dbOrganization.stats.gainedVotes++;
        }
        if (sentimentPoint.compound <= -0.3 && !dbComplaint.reimbursement) {
          dbOrganization.stats.lostVotes++;
        }
      }
      let { updatedHours, updatedDays, updatedMonths, updatedYears } = await util.updateGraphs(dbOrganization.stats.score, dbOrganization.stats.dataGraph);
      dbOrganization.stats.dataGraph.day = updatedHours;
      dbOrganization.stats.dataGraph.days = updatedDays;
      dbOrganization.stats.dataGraph.month = updatedMonths;
      dbOrganization.stats.dataGraph.year = updatedYears;
      dbOrganization.stats.resolveRate = (dbOrganization.stats.resolves / dbOrganization.stats.complaintsCounter * 100).toFixed(1);
      dbOrganization.stats.responseRate = (dbOrganization.stats.replies / dbOrganization.stats.complaintsCounter * 100).toFixed(1);
    }
    await dbOrganization.save();
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
};

//========================================================

util.defaultGraphs = async function (companyId) {
  try {
    let todayDate = new Date();
    let hoursArray = new Array(12 + 1).join(0).split('').map(parseFloat);
    let dayArray = new Array(31 + 1).join(0).split('').map(parseFloat);
    let monthArray = new Array(12 + 1).join(0).split('').map(parseFloat);
    let yearArray = new Array(12 + 1).join(0).split('').map(parseFloat);

    let hour = todayDate.getHours();
    if (todayDate.getHours() % 2 == 1) {
      hour = todayDate.getHours() - 1;
    }

    hoursArray.fill(100, 0, Math.floor(hour / 2) + 1);
    dayArray.fill(100, 0, todayDate.getDate());
    monthArray.fill(100, 0, todayDate.getMonth() + 1);
    yearArray.fill(100, 0, ((todayDate.getFullYear() - 2018) % 12) + 1);

    let dbOrganization = await db.Organizations.findOne({ _id: companyId });
    dbOrganization.stats.dataGraph.day = hoursArray;
    dbOrganization.stats.dataGraph.days = dayArray;
    dbOrganization.stats.dataGraph.month = monthArray;
    dbOrganization.stats.dataGraph.year = yearArray;

    await dbOrganization.save();

  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
};

//========================================================

util.updateGraphs = async (score, orgGraphs) => {
  try {
    let todayDate = new Date();
    let updatedHours = Object.assign([], orgGraphs.day);
    updatedHours[Math.floor(todayDate.getHours() / 2)] = score;
    let updatedDays = Object.assign([], orgGraphs.days);
    let cleanDay = updatedHours.filter((item, index) => index < Math.floor(todayDate.getHours() / 2) + 1);
    updatedDays[todayDate.getDate() - 1] = Number((_.sum(cleanDay) / cleanDay.length).toFixed(2));
    let updatedMonths = Object.assign([], orgGraphs.month);
    let cleanDays = updatedDays.filter((item, index) => index < todayDate.getDate());
    updatedMonths[todayDate.getMonth()] = Number((_.sum(cleanDays) / cleanDays.length).toFixed(2));
    let updatedYears = Object.assign([], orgGraphs.year);
    let cleanMonth = updatedMonths.filter((item, index) => index < (todayDate.getFullYear() - 2018) % 12 + 1);
    updatedYears[(todayDate.getFullYear() - 2018) % 12] = Number((_.sum(cleanMonth) / cleanMonth.length).toFixed(2));

    return {
      updatedHours: updatedHours,
      updatedDays: updatedDays,
      updatedMonths: updatedMonths,
      updatedYears: updatedYears
    };
  } catch (error) {
    return res.boom.badImplementation('Something was wrong.');
  }
};
