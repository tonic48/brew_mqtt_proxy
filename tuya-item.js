const TuyAPI = require('tuyapi');
const mqtt = require('mqtt')
const debug = require('debug')('TuyAPI-Proxy-Item');

const configMqtt = require("./conf/mqtt.json");
const dpsCodes = require("./conf/dps-code.json");
//define dps constants
const DPS_ACTIVE = '1';
const DPS_SET_TEMP = '2'
const DPS_TEMP_ENV = '3'
const DPS_TEMP_MANUAL = '4'
const DPS_ECO = '5'
const DPS_LOCK = '6'
const DPS_TEMP_FLOOR = '102'

const subDps = {
  DPS_ACTIVE,
  DPS_SET_TEMP,
  DPS_TEMP_MANUAL,
  DPS_ECO,
  DPS_LOCK
};
var device;
var mqttClientDaemon;
var configTuyapi;

class TuyaItem {

    constructor(configTuyapi) {

        device = new TuyAPI(configTuyapi);
        this.configTuyapi=configTuyapi;

        device.on('connected', () => {
            debug('Connected to device.');
          
          });
          
          device.on('disconnected', () => {
            debug('Disconnected from device.');
          });
    
          device.on('data', data => {
            debug('Data from device:', data);
            //const status = data.dps['1'];
            //debug('Current status:', status);
            var payload = "";
            Object.keys(data.dps).forEach(key=>{
              this.publishMqtt(this.getTopicName("stat", key), this.getDevicePayload(key, data.dps[key])).then(result => {
                //debug('Status published to MQTT');
              }).catch(error => {
                debug('Error : ' + error);
              });
            });
          
          });
    
          device.on('error', (err) => {
            debug('Error: ' + err);
          });

          //Start mqtt client
          mqttClientDaemon = mqtt.connect(configMqtt.url, configMqtt.options);
    
          mqttClientDaemon.on('connect', () => {
            debug('Connected to MQTT.');
          
            mqttClientDaemon.subscribe(this.getSubTopics(),(err, granted)=>{
              if(!err){
                debug("Subscribed to ");
                Object.keys(granted).forEach(key=>{debug(granted[key])});
              }
          
            })
          
          })
    
          mqttClientDaemon.on("reconnect", (err) => {
            debug("Reconnect to MQTT");
          });
          
          mqttClientDaemon.on("error", (err) => {
            debug("Error connection MQTT");
          });
          
          mqttClientDaemon.on('message', (topic, message) => {
            this.sendPayloadToDevice(topic, message).then(result => {
              //debug('Command sent to the device');
            }).catch(error => {
              debug('Error : ' + error);
            });
          })
    
          
          //Establish connection to Tuya device
          device.connect();

    };

async publishMqtt(topic, payload) {
    var mqttClient = mqtt.connect(configMqtt.url, configMqtt.options);
    mqttClient.on('connect', async function () {
        mqttClient.publish(topic, payload);
      //debug('Published:',payload);
      mqttClient.end();
    })
  
  }
  
getDevicePayload(key, data) {
    var payload = data.toString();
    switch (key) {
  
      case DPS_ACTIVE:
      case DPS_ECO:
      case DPS_LOCK:
        payload = (data ? "1" : "0");
        break;
  
      case DPS_SET_TEMP:
      case DPS_TEMP_ENV:
      case DPS_TEMP_FLOOR:
        debug('Payload:', parseFloat(data) / 2);
        payload = parseFloat(data) / 2;
        break;
    }
  
    return payload.toString();
  }
  
async sendPayloadToDevice(topic, message) {
    var topic = topic.split("/");
    var dps = topic[topic.length - 1];
    var payload = message.toString();
    switch (dps) {
      case DPS_ACTIVE:
      case DPS_ECO:
      case DPS_LOCK:
        debug(dpsCodes[dps] + ' : ' + message);
        payload = (parseInt(message) == 0) ? false : true;
        break;
  
      case DPS_SET_TEMP:
        debug('Set temperature to : ' + message);
        payload = parseFloat(message) * 2;
  
        break;
    }
    await device.set({
      set: payload,
      dps: dps
    }).then(result => {
      //debug(""+result);
    });
  }
  
getSubTopics() {
    var topics = new Object();
    Object.keys(subDps).forEach(dps => {
        topics[this.getTopicName("cmd", subDps[dps])] = configMqtt.qos;
    });
  
    
    return topics;
  }
  
getTopicName(prefix, dps) {
    // prefix/<tuyaAPI-id>/<tuyaAPI-type (dps)>
    // cmd/4a5252525657bbb/2
    var topic = prefix + "/" + this.configTuyapi.id + "/" + dps
    return topic;
  }
  
};

module.exports = TuyaItem;

// Disconnect after 10 seconds
//setTimeout(() => { device.disconnect(); }, 10000);

