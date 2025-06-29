let mysql = require('mysql');
let moment = require('moment');
let config = require('./mysql_config.js');
let connection = mysql.createConnection(config);

data = {
  companies: [
    {
      image: '@images/WeSpeakLogo.png',
      name: 'American Airways'
    },
    {
      image: '@images/WeSpeakLogo.png',
      name: 'Lufthansa'
    },
    {
      image: '@images/WeSpeakLogo.png',
      name: 'Air France'
    },
    {
      image: '@images/WeSpeakLogo.png',
      name: 'WizzAir'
    },
    {
      image: '@images/WeSpeakLogo.png',
      name: 'KLM'
    }
  ],
  complaints: [
    {
      subject: 'Flight delay',
      author: 'Angie Schevchenko',
      topic: '#FlightDelay',
      time: '2017-07-09T03:01:00.000Z',
      status: 'unresolved',
      company: 'American Airways',
      mood: 'slightly_mad'
    },
    {
      subject: 'Lost Baggage',
      author: 'Dale Cooper',
      topic: '#LostBaggage',
      time: '2017-07-10T03:01:00.000Z',
      status: 'unresolved',
      company: 'American Airways',
      mood: 'on_fire',
      content: 'Spent 3 hours on the tarmac in Denver after a "small maintenance item" a young lady had a panic/anxiety attack probably because it was 90+ degrees on the plane. This morning flying back to Denver we almost took off but had to return to the gate in Dulles airport we were delayed 6+ hours this time! Oh and they lost our checked bag on the way back from St. Thomas 3 days ago and still have not found it!',
      images: [
        'baggage1.jpg',
        'baggage2.jpg',
        'baggage3.jpg',
        'baggage4.png'
      ]
    },
    {
      subject: 'Helpless attendants',
      author: 'John Wick',
      topic: '#BadService',
      time: '2017-07-07T03:01:00.000Z',
      status: 'unresolved',
      company: 'American Airways',
      mood: 'ok'
    },
    {
      subject: 'Drunk pilot',
      author: 'John Wick',
      topic: '#DangerousService',
      time: '2017-07-12T03:01:00.000Z',
      status: 'unresolved',
      company: 'American Airways',
      mood: 'slightly_mad'
    },
    {
      subject: 'No food onboard',
      author: 'John Wick',
      topic: 'None',
      time: '2017-07-06T03:01:00.000Z',
      status: 'unresolved',
      company: 'American Airways',
      mood: 'ok'
    }
  ]
};

let sql = 'DELETE from companies';
connection.query(sql, function (err) {
  if (err) {
    throw err;
  }
});

sql = 'DELETE from complaints';
connection.query(sql, function (err) {
  if (err) {
    throw err;
  }
});

sql = 'DELETE from replies';
connection.query(sql, function (err) {
  if (err) {
    throw err;
  }
});

sql = 'DELETE from images';
connection.query(sql, function (err) {
  if (err) {
    throw err;
  }
});


let companyValues = [];
for (i in data.companies) {
  let company = data.companies[i];
  companyValues.push([company.name, company.image]);
}
sql = 'INSERT INTO companies (name, image) VALUES ?';
let insertId;
connection.query(sql, [companyValues], function (err, result) {
  let complaintValues = [];
  if (err) {
    throw err;
  }
  insertId = result.insertId;

  for (i in data.complaints) {
    let complaint = data.complaints[i];
    complaintValues.push([
      complaint.subject,
      complaint.author,
      complaint.topic,
      moment(new Date(complaint.time)).format('YYYY-MM-DD HH:mm:ss'),
      complaint.status,
      complaint.mood,
      data.companies.findIndex(function (company) {
        return company.name === complaint.company;
      }) + insertId,
      complaint.content
    ]);
  }
  sql = 'INSERT INTO complaints (subject, author, topic, time, state, mood, company_id, message) VALUES ?';
  connection.query(sql, [complaintValues], function (err, result) {
    if (err) {
      throw err;
    }
    let imageValues = [];
    insertId = result.insertId;
    for (i in data.complaints) {
      let images = data.complaints[i].images;
      if (images) {
        let complaintId = insertId + parseInt(i);
        for (j in images) {
          imageValues.push([images[j], complaintId]);
        }
      }
    }
    sql = 'INSERT INTO images (src, complaint_id) VALUES ?';
    connection.query(sql, [imageValues], function (err) {
      if (err) {
        throw err;
      }
    });
  });

});