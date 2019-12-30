var debug = require('debug')('webgui');
const express = require('express')
const mqtt = require('mqtt')
const async=require('async');
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline');
const configMqtt = require("./conf/mqtt.json");
const configBrewapi = require("./conf/brewapi.json");
var bodyParser = require('body-parser')

const app = express()
const webPort = 3000

const CMD="cmd";
const STAT="stat"

var fermTempSetPoint=-1;

eventRes;

app.use(express.json());
app.use(express.urlencoded());

app.post("/+"+configBrewapi.topics.ferm_temp_set_point_topic, (req, res) => {
  console.log(req.path);
  console.log(req.body);
  sendPayloadToTopic(CMD,req.path.substr(1),req.body.val)
  sendPayloadToTopic(STAT,req.path.substr(1),req.body.val)

  res=prepareRespopnce(res,"application/json");
  res.json({"val":fermTempSetPoint});
  //res.send();
});

app.post("/getstatus", (req, res) => {
    console.log("Checking");

    res=prepareRespopnce(res,"application/json");
    res.json({"val":fermTempSetPoint});
    //res.send();
});

app.get("/events", (req, res) => {
  console.log("Checking");

  this.eventRes=prepareEventRespopnce(res);
  this.eventRes.write(`\n\n`);

});

app.listen(webPort, () => console.log(`Example app listening on port ${webPort}!`))

//Start mqtt client
var mqttClientDaemon = mqtt.connect(configMqtt.url, configMqtt.options);
console.log('mqtt client has been started');

//subscribe to all command topics
mqttClientDaemon.subscribe(getSubTopics(CMD),rh=1,(err, granted)=>{
   if(!err){
     console.log("Subscribed to ");
     Object.keys(granted).forEach(key=>{console.log(granted[key])});
   }

 });

 mqttClientDaemon.on('message', (topic, message) => {
    console.log(topic +" ; "+message);
    if(getSubtopicName(topic)==configBrewapi.topics.ferm_temp_set_point_topic){
      fermTempSetPoint=parseFloat(message.toString());
      this.eventRes.write(`data: {"item":"${configBrewapi.topics.ferm_temp_set_point_topic}","payload":${fermTempSetPoint}} \n\n`);
     }
 });

 function sendPayloadToTopic(pref,topicName, payload){
  var topic= pref+"/"+configBrewapi.device+"/"+topicName;

  var mqttClient = mqtt.connect(configMqtt.url, configMqtt.options);
  mqttClient.on('connect', async function () {
      mqttClient.publish(topic, ""+payload);
    //debug('Published:',payload);
    mqttClient.end();
  })
}

function getSubtopicName(topic){
  var topics = topic.toString().split('/'); 
  return topics[2];
};

 function getSubTopics(pref){
  var topics = new Object();

  Object.keys(configBrewapi.topics).forEach(key=>{
   topics[pref+"/"+configBrewapi.device+"/"+configBrewapi.topics[key]]=0;
 });

  return topics;
};

function prepareRespopnce(res,type){
   // Website you wish to allow to connect
   res.setHeader('Access-Control-Allow-Origin', "*");
   // Request methods you wish to allow
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
   // Request headers you wish to allow
   res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
   // Set to true if you need the website to include cookies in the requests sent
   // to the API (e.g. in case you use sessions)
   res.setHeader('Access-Control-Allow-Credentials', true);

   res.contentType(type);

   return res;
}

function prepareEventRespopnce(res){

  //res.setHeader('Access-Control-Allow-Origin', '*');
  //res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  //res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  //res.setHeader('Access-Control-Allow-Credentials', true);
  //res.setHeader('Content-Type', 'no-cache');
  //res.setHeader('Cache-Control', "*");
  //res.setHeader('Connection', 'keep-alive');

  res.writeHead(200, {
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Content-Encoding': 'identity',
    'Access-Control-Allow-Origin': "*",
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
    'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
    'Access-Control-Allow-Credentials':true,

  });

  return res;
}