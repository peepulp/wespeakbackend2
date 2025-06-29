'use strict';
const mongoose = require('mongoose');
const mongoId = mongoose.Schema.Types.ObjectId;
const db = exports;
exports.deepPopulate = require('mongoose-deep-populate')(mongoose);

mongoose.plugin(require('mongoose-merge-plugin'));
mongoose.Promise = global.Promise;


db.connect = function (connString) {
  mongoose.connect(connString, { useMongoClient: true }, function (err) {
    if (err) {
      console.info('ERROR: connecting to Database. ' + err);
    } else {
      console.info('Connected to Database');
    }
  });
};

function arrayLimit(val) {
  return val.length <= 12;
}

//========================================================================

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lastName: String,
  registerDate: { type: Date },
  lastLoginDate: { type: Date },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verificationToken: String,
  username: String,
  kind: { type: Number, required: true, default: 0, $range: [0, 1] }, // 0: Client; 1: Premium
  userImage: { big: String, medium: String, small: String },
  birthDate: Date,
  sex: { type: Number, default: 2, $range: [0, 2] }, // 0: Male; 1: Female; 2: NA
  phoneNumber: String,
  facebook: { type: Boolean, default: false },
  twitter: { type: Boolean, default: false },
  google: { type: Boolean, default: false },
  follows: [{
    companyId: { type: mongoId, ref: 'Organization' },
    opinions: [{
      opinion: String,
      status: { type: Number, $range: [0, 2], default: 0 } // 0: Empty; 1: Follow; 2: Renegade
    }]
  }],
  payment: {
    plan: String,
    last4: String,
    expCard: String,
    subscriptionId: String,
    customerId: String,
    finalDatePlan: Date
  }
});
UserSchema.plugin(db.deepPopulate, {});
db.Users = mongoose.model('User', UserSchema);

//========================================================================

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true }, // NR
  nickName: String,
  createdDate: { type: Date, default: Date.now },
  createdBy: { type: mongoId, ref: 'User' },
  admins: [{ type: mongoId, ref: 'User' }],
  kind: { type: Number, required: true, default: 0, $range: [0, 2] }, // 0: Company; 1: Elected, 2: Political Organization
  sector: String,
  organizationImage: { big: String, medium: String, small: String },
  address: String,
  info: String,
  orgIdentifier: String,
  performanceDetail: String,
  facebook: String,
  twitter: String,
  email: String,
  phoneNumberOrganization: String,
  markers: [String],
  isCrisis: { type: Boolean, default: false },
  stats: {
    complaintsCounter: { type: Number, default: 0 },
    score: { type: Number, default: 100 },
    replies: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 },
    resolves: { type: Number, default: 0 },
    resolveRate: { type: Number, default: 0 },
    totalResolves: { type: Number, default: 0 },
    reimbursed: { type: Number, default: 0 },
    gainedVotes: { type: Number, default: 0 },
    lostVotes: { type: Number, default: 0 },
    dataGraph: {
      day: {
        type: [Number],
        default: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        validate: [arrayLimit, '{PATH} exceeds the limit of 12']
      },
      days: {
        type: [Number],
        default: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
      },
      month: {
        type: [Number],
        default: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        validate: [arrayLimit, '{PATH} exceeds the limit of 12']
      },
      year: {
        type: [Number],
        default: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        validate: [arrayLimit, '{PATH} exceeds the limit of 12']
      }
    },
    votes: [{
      user: { type: mongoId, ref: 'User' },
      gained: { type: Boolean, default: true },
      date: Date
    }]
  }
});
OrganizationSchema.plugin(db.deepPopulate, {});
db.Organizations = mongoose.model('Organization', OrganizationSchema);

//========================================================================

const ComplaintSchema = new mongoose.Schema({
  userId: { type: mongoId, ref: 'User', required: true },
  companyId: { type: mongoId, ref: 'Organization', required: true },
  topic: { type: String, required: true },
  when: { type: Date, default: Date.now },
  created: { type: Date, default: Date.now },
  finished: Date,
  message: { type: String, required: true },
  replies: [{
    from: String,
    message: String,
    sent: { type: Date, default: Date.now }
  }],
  where: { type: String },
  state: { type: Number, default: 1, $range: [0, 5] }, // 0: submitted, 1: delivered, 2: processed, 3: unresolved, 4: resolved, 5: reimbursed
  stateDates: [{ type: Date }],
  anonymous: { type: Boolean, default: false },
  hashtags: [String],
  angryLevel: { type: Number, default: 0, $range: [0, 3] }, // NR
  reimbursement: { type: Boolean, default: false },
  reimbursementAmount: { type: Number, default: 0 },
  waitingTimer: { type: Boolean, default: false },
  facebook: { type: Boolean, default: false },
  twitter: { type: Boolean, default: false },
  facebookShares: [{ type: mongoId, ref: 'User' }],
  twitterShares: [{ type: mongoId, ref: 'User' }],
  speaksShares: [{ type: mongoId, ref: 'User' }],
  views: [{ type: mongoId, ref: 'User' }],
  history: [{
    date: { type: Date, default: Date.now },
    message: String
  }],
  pictures: [{
    big: String,
    medium: String,
    small: String
  }],
  reopen: { type: Boolean, default: false }
});
ComplaintSchema.plugin(db.deepPopulate, {});
db.Complaints = mongoose.model('Complaint', ComplaintSchema);

//========================================================================

const ChatSchema = new mongoose.Schema({
  idComplaint: { type: mongoId, ref: 'Complaint', required: true },
  complaintOrganization: { type: mongoId, ref: 'Organization', required: true },
  title: { type: String, default: 'Title' },
  messages: [{
    admin: { type: mongoId, ref: 'User' },
    organizationOfAdmin: { type: mongoId, ref: 'Organization' },
    message: { type: String, required: true },
    sentDate: { type: Date, required: true, default: Date.now }
  }],
  lastMessageDate: { type: Date, required: true, default: Date.now },
  userId: { type: mongoId, ref: 'User', required: true },
  isReadByUser: { type: Boolean, default: false },
  companyIds: [{
    organization: { type: mongoId, ref: 'Organization', required: true },
    isReadByAdmin: { type: Boolean, default: false }
  }]
});
ChatSchema.plugin(db.deepPopulate, {});
db.Chats = mongoose.model('Chat', ChatSchema);

//========================================================================

const PlanSchema = new mongoose.Schema({
  name: { type: String, unique: String, required: true },
  analytics: { type: Number, required: true, $range: [0, 1] }, // 0: basic, 1: advanced
  speaks: { type: Number, required: true, $range: [0, 1] }, // 0: limited, 1: unlimited
  messaging: { type: Number, required: true, $range: [0, 1] }, // 0: limited, 1: unlimited
  reports: { monthly: Boolean, weekly: Boolean, daily: Boolean },
  pageBranding: [{ type: Boolean, $range: [0, 10000] }], // NR
  notifications: [], // NR
  teamMembers: Number // [0, oo[: number of members, -1: unlimited
});
db.Plans = mongoose.model('Plan', PlanSchema);

//========================================================================