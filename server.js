// init project
var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;

var bodyParser = require('body-parser');
var dns = require('dns');

var db = null;

mongo.connect(process.env.URI, (err, database) => {
  if (err) throw err;
  db = database;
});

app.use(bodyParser.urlencoded({'extended': false}));

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/api/shorturl/:index", (request, response) => {
  var collection = db.collection('url');
  collection.findOne({index: Number(request.params.index)}, (err, data) => {
    if (err) throw err;
    if(!data) {
      response.json({"error": "No short url found for given input"});
    }else {
      response.redirect(data.url);
    }
    
  })
});

app.post("/api/shorturl/new", function (request, response) {
  var url = request.body.url;
  
  var protocolReg = /^https?:\/\/(.*)/i;
  var hostReg = /^([a-z0-9\-_]+\.)+[a-z0-9\-_]+/i;
  
  if (url.match(/\/$/i)) {
    url = url.slice(0, -1);
  }
  
  var protocolMatch = url.match(protocolReg);
  if(!protocolMatch) {
    return response.json({"error": "invalid URL"})
  }
  
  var host = protocolMatch[1];
  
  var hostMatch = host.match(hostReg);
  if(hostMatch) {
    dns.lookup(hostMatch[0], (err) => {
      if (err) {
        response.json({"error": "invalid Hostname"})
      }else {
        var collection = db.collection('url');
        var obj = {
          url: url
        }
          
        collection.findOne(obj, (err, data) => {
          if (err) throw err;
          if (data) {
            response.json({"original_url": url, "short_url": data.index})
            }else {
            collection.count({}, (err, data) => {
              if (err) throw err;
              obj.index = data + 1;
                
              collection.insert(obj, (err, data) => {
                if (err) throw err;
                response.json({"original_url": url, "short_url": obj.index});
                console.log("inserted: " + obj.toString());
                db.close();
               })
            });
          }
        });
      }
    })
  }
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
