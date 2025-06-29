'use strict';

const express = require('express');
const router = express.Router();
const VerifyToken = require('../js/verifyToken');
const db = require('../js/db');

//==========================================================================================

router.get('/chatlist', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      let dbChats;
      if (req.user.kind) {
        dbChats = await db.Chats.find({ companyIds: { $elemMatch: { organization: req.user.companyId } } }).lean()
          .sort({ lastMessageDate: -1 })
          .select('-messages')
          .populate({ path: 'userId', select: 'name userImage.small' })
          .populate({ path: 'complaintOrganization', select: 'name organizationImage.small' });
      } else {
        dbChats = await db.Chats.find({ userId: req.user.id }).lean()
          .sort({ lastMessageDate: -1 })
          .select('-messages')
          .populate({ path: 'userId', select: 'name userImage.small' })
          .populate({ path: 'complaintOrganization', select: 'name organizationImage.small' });
      }

      return res.send(dbChats);
    }

  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the complaints');
  }
});

//==========================================================================================

router.get('/:idComplaint', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      let dbComplaint = await db.Complaints.findOne({ _id: req.params.idComplaint })
        .populate({ path: 'companyId', select: 'name organizationImage' })
        .populate({ path: 'userId', select: 'name userImage' });

      let dbChat;
      if (dbComplaint && (dbComplaint.userId.id == req.user.id || req.user.kind)) {
        dbChat = await db.Chats.findOne({ idComplaint: dbComplaint.id })
          .populate({ path: 'userId', select: 'name userImage.small' })
          .populate({ path: 'companyIds.organization', select: 'organizationImage.small' })
          .populate({ path: 'complaintOrganization', select: 'name organizationImage.small' })
          .populate({ path: 'messages.admin', select: 'name' })
          .populate({ path: 'messages.organizationOfAdmin', select: 'name organizationImage.small' });

        if (dbChat) {
          if (req.user.companyId) { //Admin
            dbChat.companyIds = dbChat.companyIds.map((item) =>
              (item.organization == req.user.companyId) ? { organization: item.organization, isReadByAdmin: true } : item);
          } else { //User
            dbChat.isReadByUser = (dbComplaint.userId.id == req.user.id) ? true : dbChat.isReadByUser;
          }

          await dbChat.save();
          return res.send(dbChat.toObject());
        }
        return res.send([]);
      }
      return res.boom.notFound('The complaint you want to access does not exist');
    }
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the complaints');
  }
});


//==========================================================================================

router.post('/:idComplaint', VerifyToken, async (req, res) => {

  try {
    if (req.user) {
      let dbComplaint = await db.Complaints.findOne({ _id: req.params.idComplaint })
        .populate({ path: 'companyId', select: 'name' })
        .populate({ path: 'userId', select: 'name userImage' });


      if (dbComplaint && (dbComplaint.userId.id == req.user.id || req.user.kind)) {
        let dbChat = await db.Chats.findOne({ idComplaint: dbComplaint.id });

        if (!dbChat) {
          let orgArray = [];
          // Default organization
          orgArray = [{
            organization: dbComplaint.companyId.id,
            isReadByAdmin: (dbComplaint.companyId.id == req.user.companyId) && true
          }];

          //External organization
          if (req.user.kind && (dbComplaint.companyId.id != req.user.companyId)) {
            orgArray = orgArray.concat({
              organization: req.user.companyId,
              isReadByAdmin: true
            });
          }

          const newChat = new db.Chats({
            idComplaint: dbComplaint.id,
            complaintOrganization: dbComplaint.companyId.id,
            title: dbComplaint.topic,
            messages: [{
              admin: (req.user.kind) ? req.user.id : undefined,
              organizationOfAdmin: (req.user.kind) ? req.user.companyId : undefined,
              message: req.body.message
            }],
            isReadByUser: (dbComplaint.userId.id == req.user.id) && true,
            companyIds: orgArray,
            userId: dbComplaint.userId.id
          });
          await newChat.save();

          let dbChat = await db.Chats.findOne({ _id: newChat.id }).lean()
            .populate({ path: 'userId', select: 'name userImage.small' })
            .populate({ path: 'companyIds.organization', select: 'organizationImage.small' })
            .populate({ path: 'complaintOrganization', select: 'name organizationImage.small' })
            .populate({ path: 'messages.admin', select: 'name' })
            .populate({ path: 'messages.organizationOfAdmin', select: 'name organizationImage.small' });

          return res.send(dbChat);
        }

        let oldChat = dbChat;

        // Add new organization to the started chat
        if (req.user.companyId) {
          let isExternalOrg = dbChat.companyIds.find((item) => item.organization == req.user.companyId);
          if (!isExternalOrg) {
            dbChat.companyIds = dbChat.companyIds.concat({
              organization: req.user.companyId,
              isReadByAdmin: true
            });
          }
        }

        oldChat.messages.push({
          admin: (req.user.kind) ? req.user.id : undefined,
          organizationOfAdmin: (req.user.kind) ? req.user.companyId : undefined,
          message: req.body.message,
          sentDate: Date.now()
        });

        dbChat.messages = oldChat.messages;
        dbChat.lastMessageDate = Date.now();
        dbChat.isReadByUser = (dbComplaint.userId.id == req.user.id) && true;
        dbChat.companyIds = dbChat.companyIds.map((item) =>
          (item.organization == req.user.companyId) ? { organization: item.organization, isReadByAdmin: true } : { organization: item.organization, isReadByAdmin: false }
        );
        await dbChat.save();

        let dbChatPopulate = await db.Chats.findOne({ _id: dbChat.id }).lean()
          .populate({ path: 'userId', select: 'name userImage.small' })
          .populate({ path: 'companyIds.organization', select: 'organizationImage.small' })
          .populate({ path: 'complaintOrganization', select: 'name organizationImage.small' })
          .populate({ path: 'messages.admin', select: 'name' })
          .populate({ path: 'messages.organizationOfAdmin', select: 'name organizationImage.small' });

        return res.send(dbChatPopulate);
      }
    }
  } catch (error) {
    return res.boom.badImplementation('There was a problem finding the complaints');
  }
});

module.exports = router;
