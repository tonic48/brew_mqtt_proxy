const TuyAPI = require('tuyapi');
const mqtt = require('mqtt')
var debug = require('debug');
const SerialPort = require('serialport')
const configMqtt = require("./conf/mqtt.json");
const dpsCodes = require("./conf/dps-code.json");
//define dps constants
const configBrewapi = require("./conf/brewapi.json");

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

 //subscribe to all command topics
mqttClientDaemon.subscribe(getSubTopics("cmd"),(err, granted)=>{
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
 });


 function getSubTopics(pref){
   var topics = new Object();
   topics[pref+"/"+configBrewapi.device+"/"+configBrewapi.current_temp_topic]=0;
   return topics;
 };
