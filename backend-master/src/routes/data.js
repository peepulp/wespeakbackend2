'use strict';

const _ = require('lodash');
const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const moment = require('moment');
const util = require('util');
let dbConfig = require('../../mysql/mysql_config.js');

//==========================================================================================

let pool = mysql.createPool(dbConfig);

function objectToCamelCase(obj) {
  return _.mapKeys(obj, (v, k) => _.camelCase(k));
}

const query = util.promisify(pool.query).bind(pool);

router.get('/companies', async (req, res) => {

  pool.query('SELECT * FROM companies', function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    return res.status(200).send(result.map(objectToCamelCase));
  });
});


//==========================================================================================

function getJSONComplaints(complaints, onFinish) {
  let complaintsFinishedCount = 0;
  if (complaints.length == 0) {
    onFinish(false, complaints);
  }
  for (let i in complaints) {
    pool.query('SELECT * FROM replies WHERE complaint_id = ' + complaints[i].id, function (err, result) {
      if (err) {
        onFinish(err);
      }
      complaints[i].replies = result.map(objectToCamelCase);
      pool.query('SELECT * FROM images WHERE complaint_id = ' + complaints[i].id, function (err, result) {
        if (err) {
          onFinish(err);
        }
        complaints[i].images = result.map(objectToCamelCase);
        pool.query('SELECT * FROM complaints_history WHERE complaint_id = ' + complaints[i].id, function (err, result) {
          if (err) {
            onFinish(err);
          }
          complaints[i].history = result.map(objectToCamelCase);
          pool.query('SELECT * FROM companies WHERE id = ' + complaints[i].companyId, function (err, result) {
            if (err) {
              onFinish(err);
            }
            complaints[i].company = result.map(objectToCamelCase)[0];
            complaintsFinishedCount++;
            if (complaintsFinishedCount == complaints.length) {
              onFinish(false, complaints);
            }
          });
        });
      });
    });
  }
}

//==========================================================================================

router.get('/complaints', async (req, res) => {

  pool.query('SELECT * FROM complaints', function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    getJSONComplaints(result.map(objectToCamelCase), function (err, complaints) {
      if (err) {
        console.error(err);
        return res.boom.badImplementation(err);
      }
      return res.status(200).send(complaints);
    });
  });
});


//==========================================================================================

router.get('/companies/:id', async (req, res) => {

  let dataArray = [];
  let i = 0;
  for (i = 0; i < 12; i++) {
    dataArray.push(Math.floor(Math.random() * 200) / 10);
  }
  const randomData = {
    dataChart: dataArray,
    number: Math.floor(Math.random() * 100),
    percentage: Math.floor(Math.random() * 10000) / 100 + '%',
    replies: Math.floor(Math.random() * 100000),
    votesGained: Math.floor(Math.random() * 1000),
    votesLost: Math.floor(Math.random() * 1000),
    resolved: Math.floor(Math.random() * 10000) / 100 + '%',
    reimbursed: Math.floor(Math.random() * 10000) / 100 + '%',
    info: 'WeListen score',
    score: Math.floor(Math.random() * 20000) / 100
  };
  return res.status(200).send(randomData);
});

//==========================================================================================

router.post('/complaints/insert', async (req, res) => {
  let time = req.body.complaint.time ? Date.parse(req.body.complaint.time) : new Date();
  let complaintValues = [[
    req.body.complaint.subject,
    req.body.complaint.author,
    req.body.complaint.topic,
    moment(time).format('YYYY-MM-DD HH:mm:ss'),
    'unresolved',
    req.body.complaint.mood,
    req.body.complaint.companyId,
    req.body.complaint.userId,
    req.body.complaint.message,
    req.body.complaint.description,
    req.body.complaint.anonymous,
    req.body.complaint.angryLevel,
    req.body.complaint.reimbursement,
    req.body.complaint.reimbursementAmount,
    req.body.complaint.waitingTimer]];
  let sql = 'INSERT INTO complaints (subject,author,topic,time,state,mood,company_id,user_id,message,description,anonymous,angry_level,reimbursement,reimbursement_amount,waiting_timer) VALUES ?';
  pool.query(sql, [complaintValues], function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    return res.status(200).send(result);
  });
});

//==========================================================================================

router.post('/complaints/:complaintId/edit', async (req, res) => {
  if (req.body.complaint.description) {
    let complaintValues = [
      req.body.complaint.description,
      req.params.complaintId
    ];
    pool.query('UPDATE complaints SET description = ? WHERE id = ?', complaintValues, function (err, result) {
      if (err) {
        console.error(err);
        return res.boom.badImplementation(err);
      }
      return res.status(200).send(result);
    });
  } else {
    let complaintValues = [
      req.body.complaint.state,
      req.params.complaintId
    ];
    pool.query('UPDATE complaints SET state = ? WHERE id = ?', complaintValues, function (err, result) {
      if (err) {
        console.error(err);
        return res.boom.badImplementation(err);
      }
      return res.status(200).send(result);
    });
  }
});

//==========================================================================================

router.get('/complaints/company/:companyId', async (req, res) => {
  pool.query('SELECT * FROM complaints WHERE company_id= ' + req.params.companyId, function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    getJSONComplaints(result.map(objectToCamelCase), function (err, complaints) {
      if (err) {
        console.error(err);
        return res.boom.badImplementation(err);
      }
      return res.status(200).send(complaints);
    });
  });
});

//==========================================================================================

router.get('/complaints/user/:userId', async (req, res) => {
  pool.query('SELECT * FROM complaints WHERE user_id= ' + req.params.userId, function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    getJSONComplaints(result.map(objectToCamelCase), function (err, complaints) {
      if (err) {
        console.error(err);
        return res.boom.badImplementation(err);
      }
      return res.status(200).send(complaints);
    });
  });
});

//==========================================================================================

router.get('/replies/:complaintId', async (req, res) => {
  pool.query('SELECT * FROM replies WHERE complaint_id = ' + req.params.complaintId, function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    return res.status(200).send(result.map(objectToCamelCase));
  });
});


//==========================================================================================

router.post('/replies/insert', async (req, res) => {
  let replyValues = [[req.body.complaintId, req.body.message, moment(new Date()).format('YYYY-MM-DD HH:mm:ss')]];
  let sql = 'INSERT INTO replies (complaint_id,message,sent) VALUES ?';
  pool.query(sql, [replyValues], function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    return res.status(200).send(result);
  });
});


//==========================================================================================

router.get('/images/:complaintId', async (req, res) => {
  pool.query('SELECT * FROM images WHERE complaint_id = ' + req.params.complaintId, function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    return res.status(200).send(result.map(objectToCamelCase));
  });
});

//==========================================================================================

function getJSONChat(complaintId, onFinished) {
  pool.query('SELECT * FROM chats WHERE complaint_id = ' + complaintId, function (err, result) {
    if (err || result.length == 0) {
      onFinished(err);
    }
    if (result.length > 0) {
      let chat = result.map(objectToCamelCase)[0];
      pool.query('SELECT * FROM chat_messages WHERE chat_id = ' + chat.id, function (err, result) {
        if (err) {
          onFinished(err);
        }
        chat.messages = result.map(objectToCamelCase);
        pool.query('SELECT * FROM chat_companies WHERE chat_id = ' + chat.id, function (err, result) {
          if (err) {
            onFinished(err);
          }
          chat.companies = result.map(objectToCamelCase);
          onFinished(false, chat);
        });
      });
    } else {
      onFinished(false, {});
    }
  });
}

//==========================================================================================

router.post('/chat/:complaintId/insert', async (req, res) => {
  let complaint;
  let chatId;
  let messageUserId = req.body.userId ? req.body.userId : 5;
  pool.query('SELECT * FROM complaints WHERE id= ' + req.params.complaintId, async function (err, result) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    if (result.length == 0) {
      console.error(err);
      return res.boom.badImplementation();
    }
    complaint = result.map(objectToCamelCase)[0];

    pool.query('SELECT * FROM chats WHERE complaint_id = ' + req.params.complaintId, async function (err, result) {
      if (err) {
        console.error(err);
        return res.boom.badImplementation(err);
      }
      if (result.length == 0) {
        let chatValues = [[
          complaint.id,
          complaint.companyId,
          complaint.topic,
          false,
          complaint.userId
        ]];
        let sql = 'INSERT INTO chats (complaint_id,company_id,title,is_read_by_user,user_id) VALUES ?';
        let insertResult = await query(sql, [chatValues]);
        chatId = insertResult.insertId;
        // Default organization
        let chatCompanyValues = [[
          chatId,
          complaint.companyId,
          true
        ]];
        //External organization
        sql = 'INSERT INTO chat_companies (chat_id,company_id,is_read_by_admin) VALUES ?';
        await query(sql, [chatCompanyValues]);
      } else {
        chatId = result[0].id;
      }
      //Add new organization to the started chat
      pool.query('SELECT * FROM chat_companies WHERE chat_id = ' + chatId, function (err, result) {
        if (err) {
          console.error(err);
          return res.boom.badImplementation(err);
        }
        if (result.length == 0) {
          let chatCompanyValues = [[
            chatId,
            complaint.companyId,
            true
          ]];
          let sql = 'INSERT INTO chat_companies (chat_id,company_id,is_read_by_admin) VALUES ?';
          pool.query(sql, [chatCompanyValues], function (err) {
            if (err) {
              console.error(err);
              return res.boom.badImplementation(err);
            }
          });
        }
      });

      let chatMessageValues = [[
        chatId,
        messageUserId,
        1,
        complaint.companyId,
        req.body.message,
        moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
      ]];
      let sql = 'INSERT INTO chat_messages (chat_id,user_id,admin_user_id,organization_of_admin,message,sent_date) VALUES ?';
      pool.query(sql, [chatMessageValues], function (err) {
        if (err) {
          console.error(err);
          return res.boom.badImplementation(err);
        }
        sql = 'UPDATE chats SET last_message_date = \'' +
          moment(new Date()).format('YYYY-MM-DD HH:mm:ss') +
          '\', is_read_by_user =' +
          false +
          ' WHERE id = \'' +
          chatId +
          '\'';
        pool.query(sql, function (err) {
          if (err) {
            console.error(err);
            return res.boom.badImplementation(err);
          }
          getJSONChat(req.params.complaintId, function (err, chat) {
            if (err) {
              console.error(err);
              return res.boom.badImplementation(err);
            }
            return res.status(200).send(chat);
          });
        });
      });
    });
  });
});

//==========================================================================================

router.get('/chat/:complaintId', async (req, res) => {
  getJSONChat(req.params.complaintId, function (err, chat) {
    if (err) {
      console.error(err);
      return res.boom.badImplementation(err);
    }
    return res.status(200).send(chat);
  });
});


module.exports = router;
