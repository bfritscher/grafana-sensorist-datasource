const express = require('express');
const auth = require('http-auth');
const bodyParser = require('body-parser');
const cors = require('cors');
const request = require('request-json');
const app = express();


/* SSL if not behind nginx proxy
const https = require('https');
const fs = require('fs');
const sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    passphrase: 'test',
    requestCert: false,
    rejectUnauthorized: false
};
*/

app.use(cors())
app.use(bodyParser.json());

const client = request.createClient('https://api.sensorist.com/');

const basic = auth.basic({
        realm: "Sensorist login"
    }, (username, password, callback) => {
        // Custom authentication
        // Use callback(error) if you want to throw async error.

        // Warn... not multi user
        console.log('auth');
        client.setBasicAuth(username, password);
        callback(true);
    }
);

app.use(auth.connect(basic));

app.all('/', (req, res) => {
  res.send('sensorist proxy for grafana json datasource');
  res.end();
});

app.all('/search', (req, res) => {
  client.get('v1/gateways', (err, resc, body) => {
    if (body && !body.gateways) {
      return res.end();
    }
    const result = body.gateways[0].devices.map((device) => {
      return device.devices.map((dataSource) => {
        return `${device.title}_${dataSource.title}_${dataSource.id}`
      })
    }).reduce((l, ll) => {
      return l.concat(ll);
    }, []);
    res.json(result);
    res.end();
  });
});

app.all('/annotations', function(req, res) {
  res.json([]);
  res.end();
});

app.all('/query', function(req, res){
  let dataSources = '';
  let dict = req.body.targets.reduce((dict, target, i) => {
    const id = target.target.split('_').pop();
    if (i > 0) {
      dataSources += ','
    }
    dataSources += id;
    dict[target.target] = id;
    return dict;
  }, {});
  const from = req.body.range.from.substr(0,19) + 'Z';
  const to = req.body.range.to.substr(0,19) + 'Z';
  client.get(`v1/measurements?data_sources=${dataSources}&type=range&from=${from}&to=${to}`, (err, r, body) => {
    const result = req.body.targets.map((target) => {
      let dp = [];
      try {
        dp = body.measurements[dict[target.target]].map((d) => {
          return [d.value, new Date(d.date).getTime()];
        });
      } catch(e) {

      }
      return {
          target: target.target,
          datapoints: dp
        };
    });

    res.json(result);
    res.end();
  });
});

//https.createServer(sslOptions, app).listen(3333)
app.listen(80);
console.log("Server is listening to port 80");
