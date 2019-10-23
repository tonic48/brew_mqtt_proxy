const TuyAPI = require('tuyapi');
const mqtt = require('mqtt')
var debug = require('debug');
const SerialPort = require('serialport')
const configMqtt = require("./conf/mqtt.json");
const dpsCodes = require("./conf/dps-code.json");
//define dps constants
const configBrewapi = require("./conf/brewapi.json");

var port = new SerialPort('/dev/tty-usbserial1');

port.on('error', function(err) {
  console.log('Error: ', err.message);
})

port.on('data', function (data) {
  console.log('Data:', data);
});

//Start mqtt client
var mqttClientDaemon = mqtt.connect(configMqtt.url, configMqtt.options);
console.log('mqtt client has been started');

//subscribe to all command topics
mqttClientDaemon.subscribe(getSubTopics("cmd"),(err, granted)=>{
   if(!err){
     console.log("Subscribed to ");
     Object.keys(granted).forEach(key=>{console.log(granted[key])});
   }

 });

 //subscribe to all status topics
mqttClientDaemon.subscribe(getSubTopics("stat"),(err, granted)=>{
   if(!err){
     console.log("Subscribed to ");
     Object.keys(granted).forEach(key=>{console.log(granted[key])});
   }

 });

 mqttClientDaemon.on("reconnect", (err) => {
   console.log("Reconnect to MQTT");
 });
 
 mqttClientDaemon.on("error", (err) => {
   console.log("Error connection MQTT");
 });
 
 mqttClientDaemon.on('message', (topic, message) => {
   console.log(topic +" ; "+message);
   port.write('message', function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    console.log('message written');
  });

 });


 function getSubTopics(pref){
   var topics = new Object();

   Object.keys(configBrewapi.topics).forEach(key=>{
    topics[pref+"/"+configBrewapi.device+"/"+configBrewapi.topics[key]]=0;
  });

   return topics;
 };
