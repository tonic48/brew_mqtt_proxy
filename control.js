const mqtt = require('mqtt')
var debug = require('debug')('Brew-controller');
const async=require('async');
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline');
const configMqtt = require("./conf/mqtt.json");
const configBrewapi = require("./conf/brewapi.json");
const express = require('express')
const Settings = require("./settings.js");

//Constants
const SENSOR_ERROR="CRC is not valid";
const FLAG="BREWCONTROL";
const CMD="cmd";
const STAT="stat"
const WEBPORT = 3000;
//init expres http server
const app = express();


var successTeller=0;
var sensorError=false;
var firstTime=true;
var skipNextComRead=false;
var skipTeller=2;

var eepromChanged=false;
var dashboardChanged=false;

var eepromSettings= new Settings.BrewSettings;
var screenSettings= new Settings.BrewSettings;
var brewStatus= new Settings.BrewStatus;

var eventRes;

var port = new SerialPort(configBrewapi.comport, {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false
  });
  const parser = port.pipe(new Readline({ delimiter: '\n' }));


  port.on('error', function(err) {
    console.log('Error: ', err.message);
  })

  parser.on('data', function (data) {
    var readableData=data.toString();

      processDataFromComPort(readableData);

  });

  app.listen(WEBPORT, () => console.log(`Brewcontrol app listening on port ${WEBPORT}!`))

  app.use(express.urlencoded({extended: true})); 
  app.use(express.json());

  //setInterval(synchronize,2000);

  app.post("/item_changed", (req, res) => {
    console.log(req.path);
    console.log(req.body);
    //sendPayloadToTopic(CMD,req.path.substr(1),req.body.val)
    //sendPayloadToTopic(STAT,req.path.substr(1),req.body.val)
        dashboardChanged=true;
        processDataFromPostRequest(req)
  });

  app.get("/events", (req, res) => {
    console.log("Checking");
  
    eventRes=prepareEventRespopnce(res);
    eventRes.write(`\n\n`);
  
  
  });

  app.post("/item_changed", (req, res) => {
    console.log(req.path);
    console.log(req.body);
    //sendPayloadToTopic(CMD,req.path.substr(1),req.body.val)
    //sendPayloadToTopic(STAT,req.path.substr(1),req.body.val)
        dashboardChanged=true;
        processDataFromPostRequest(req)
  });

  app.post("/init_controls", (req, res) => {
    console.log("init");

    res=prepareRespopnce(res,"application/json");
    res.json(eepromSettings.getJson(brewStatus));

    //res.send();
});
  

  function processDataFromComPort(data){

    console.log(data);

    if(data.includes(FLAG)){

        if(firstTime){
          //When started, copy Eeprom settins from Arduino
          eepromSettings.setData(data)
          screenSettings.setData(data);
          firstTime=false;
        }

        brewStatus.setData(data);
        // send to GUI
        sendToGui(`data:${brewStatus.getJson()}`)
        
      
      if(sensorError){
        successTeller++;
        if(successTeller>5){
          //After 5 successfull messages reset sensor error
          //sendPayloadToTopic(configBrewapi.topics.ferm_temp_sensor_error_topic,"0");
          sendToGui(`data:${getSensorJson("0")}`);
          sensorError=false;
        }
      }
      
    }else if(data.includes(SENSOR_ERROR)){
        //sendPayloadToTopic(configBrewapi.topics.ferm_temp_sensor_error_topic,"1");
        sendToGui(`data:${getSensorJson("1")}`);
        successTeller=0
        sensorError=true;
    }

  }

  function getSensorJson(value){

    return `{"status":{"items": [{"item":"${configBrewapi.topics.ferm_temp_sensor_error_topic}","payload":"${value}"}]}}\n\n`;

  }

  function processDataFromPostRequest(req){

    var item= req.body.item;
    if(item==configBrewapi.topics.ferm_temp_set_point_topic){
        screenSettings.fermTempSetPoint=parseFloat(req.body.payload.toString());
    }
    if(item==configBrewapi.topics.ferm_diff_set_value_topic){
        screenSettings.fermDiffSetValue=parseFloat(message.toString());
    }
    if(item==configBrewapi.topics.ferm_comp_delay_time_topic){
        screenSettings.fermCompDelaytime=parseFloat(message.toString());
    }
    if(item==configBrewapi.topics.ferm_temp_calibration_value_topic){
        screenSettings.fermTempCalibrationValue=parseFloat(message.toString());
    }
    if(item==configBrewapi.topics.on_off_topic){
        screenSettings.onOff=parseFloat(message.toString());
    }
    if(item==configBrewapi.topics.ferm_lamp_switch_topic){
        screenSettings.fermLampSwitch=parseFloat(message.toString());
    }

  }


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

  function sendToGui(data){
    if(typeof (eventRes)!='undefined'){
      eventRes.write(data)
    } 
  }