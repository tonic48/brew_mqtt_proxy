const mqtt = require('mqtt')
var debug = require('debug')('Brew-controller');
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline');
const configMqtt = require("./conf/mqtt.json");
//define dps constants
const configBrewapi = require("./conf/brewapi.json");

//Constants
const SENSOR_ERROR="CRC is not valid";
const FLAG="BREWCONTROL";


//hold value interface variables
var fermCurrentTemp=-1;
var fermTempSetPoint=-1;
var fermDiffSetValue=-1;
var fermCompDelaytime=-1;
//var fermTempCallibrationValue=0;
var fermTempSensorError=-1;
var fermMode="";
var onOff=-1;
var fermLampSwitch=-1

//hold value eeprom variables 
var eepromFermCurrentTemp=-1;
var eepromFermTempSetPoint=-1;
var eepromFermDiffSetValue=-1;
var eepromFermCompDelaytime=-1;
//var eepromFermTempCallibrationValue=0;
var eepromFermTempSensorError=-1;
var eepromFermMode="";
var eepromOnOff=-1
var eepromFermLampSwitch=-1

var firstTime=true;

var eepromChanged=false;
var dashboardChanged=false;


//var port = new SerialPort('/dev/ttyUSB0');
//var port = new SerialPort(configBrewapi.comport,{ baudRate: 9600 });
var port = new SerialPort(configBrewapi.comport, {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false
});
const parser = port.pipe(new Readline({ delimiter: '\n' }));
//await new Promise(done => setTimeout(done, 400));

var successTeller=0;
var changed=false;

console.log("Debug level : "+process.env.DEBUG);

port.on('error', function(err) {
  console.log('Error: ', err.message);
})

parser.on('data', function (data) {
  var readableData=data.toString();

    //processDataFromInput(readableData);
    processDataFromComPort(readableData);
    console.log('Data:', readableData);
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
 /*
mqttClientDaemon.subscribe(getSubTopics("stat"),(err, granted)=>{
   if(!err){
     console.log("Subscribed to ");
     Object.keys(granted).forEach(key=>{console.log(granted[key])});
   }

 });
*/
 mqttClientDaemon.on("reconnect", (err) => {
   console.log("Reconnect to MQTT");
 });
 
 mqttClientDaemon.on("error", (err) => {
   console.log("Error connection MQTT");
 });
 
 mqttClientDaemon.on('message', (topic, message) => {
   console.log(topic +" ; "+message);

   if(getSubtopicName(topic)==configBrewapi.topics.ferm_temp_set_point_topic){
    fermTempSetPoint=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.topics.ferm_diff_set_value_topic){
    fermDiffSetValue=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.topics.ferm_comp_delay_time_topic){
    fermCompDelaytime=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.topics.on_off_topic){
      onOff=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.ferm_lamp_switch_topic){
    fermLampSwitch=parseFloat(message.toString());
   }

   dashboardChanged=true;

  
 });

 setInterval(synchronize,7000);

 function processDataFromComPort(data){

  if(data.includes(FLAG)){
    var payloadArray = data.toString().split(';');
    var payLoad="";

    comFermCurrentTemp=parseFloat(payloadArray[1].trim());
    comFermTempSetPoint=parseFloat(payloadArray[2].trim());
    comFermDiffSetValue=parseFloat(payloadArray[3].trim());
    comFermCompDelaytime=parseFloat(payloadArray[4].trim());
    comFermMode=payloadArray[5].trim();
    comOnOff=payloadArray[6].trim();
    //comFermLampSwitch=payloadArray[7].trim();

    if(comFermCurrentTemp!=eepromFermCurrentTemp){
      eepromFermCurrentTemp=comFermCurrentTemp;
      eepromChanged=true;

    }
    if(comFermTempSetPoint!=eepromFermTempSetPoint){
      eepromFermTempSetPoint=comFermTempSetPoint;
      eepromChanged=true;
    }

    if(comFermDiffSetValue!=eepromFermDiffSetValue){
      eepromFermDiffSetValue=comFermDiffSetValue;
      eepromChanged=true;
    }

    if(comFermCompDelaytime!=eepromFermCompDelaytime){
      eepromFermCompDelaytime=comFermCompDelaytime;
      eepromChanged=true;
    }

    if(comFermMode!=eepromFermMode){
      eepromFermMode=comFermMode
      eepromChanged=true;
    }

    if(comFermMode!=eepromFermMode){
      eepromFermMode=comFermMode
      eepromChanged=true;
    }
    /*
    if(comFermLampSwitch!=eepromFermLampSwitch){
      eepromFermLampSwitch=comFermLampSwitch
      eepromChanged=true;
    }
    */

    successTeller++;
    if(successTeller>5){
        //After 5 successfull messages reset sensor error
        sendPayloadToTopic(configBrewapi.topics.ferm_temp_sensor_error_topic,"0");
    }


  }else if(data.includes(SENSOR_ERROR)){
    sendPayloadToTopic(configBrewapi.topics.ferm_temp_sensor_error_topic,"1");
    successTeller=0;
  }
 }

/*
 function processDataFromInput(data){

  if(data.includes(FLAG)){
    var payloadArray = data.toString().split(';');
    var payLoad="";
    if(payloadArray.length>1){
      payLoad=payloadArray[1].trim();
      sendPayloadToTopic(configBrewapi.topics.ferm_current_temp_topic,payLoad);
    } 
    if(payloadArray.length>2){
      payLoad=payloadArray[2].trim();
      sendPayloadToTopic(configBrewapi.topics.ferm_temp_set_point_topic,payLoad);
      if(firstTime){
        fermTempSetPoint=payLoad;
      }
    }
    if(payloadArray.length>3){
      payLoad=payloadArray[3].trim();
      sendPayloadToTopic(configBrewapi.topics.ferm_diff_set_value_topic,payLoad);
      if(firstTime){
        fermDiffSetValue=payLoad;
      }
    }
    if(payloadArray.length>4){
      payLoad=payloadArray[4].trim();
      sendPayloadToTopic(configBrewapi.topics.ferm_comp_delay_time_topic,payLoad);
      if(firstTime){
      fermCompDelaytime=payLoad;
      }
    }
    if(payloadArray.length>4){
      payLoad=payloadArray[5].trim();
      sendPayloadToTopic(configBrewapi.topics.ferm_mode_topic,payLoad);
    }

 
    successTeller++;
    if(successTeller>5){
        //After 5 successfull messages reset sensor error
        sendPayloadToTopic(configBrewapi.topics.ferm_temp_sensor_error_topic,"0");
    }

    if(firstTime){
      firstTime=false;
    }
  }else if(data.includes(SENSOR_ERROR)){
    sendPayloadToTopic(configBrewapi.topics.ferm_temp_sensor_error_topic,"1");
    successTeller=0;
  }else{

    //console.log('Message received from COM port doesn\'t contain string '+FLAG);
  }

 }
*/
 function sendPayloadToTopic(topicName, payload){
   var topic= "stat/"+configBrewapi.device+"/"+topicName;

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

 function getMessage(){
   
    var sign="+"
    var fermTempSetPointFloat= parseFloat(fermTempSetPoint);
    if(fermTempSetPointFloat<0){
      sign="-";
    }
    var parts = fermTempSetPoint.toString().split('.'); 
    var integersTemp=parts[0];
    var decimalsTemp =(parts.length>1)?parts[1]:"0"

    parts=fermDiffSetValue.toString().split('.'); 

    var integersDiff=parts[0];
    var decimalsDiff =(parts.length>1)?parts[1]:"0"

    return sign+";"+integersTemp+";"+decimalsTemp+";"+integersDiff+";"+decimalsDiff+";"+fermCompDelaytime+";"+onOff;

 }

 function synchronize(){

  //console.log('SYNC '+eepromChanged +' '+dashboardChanged);

  if(eepromChanged){

    if(fermCurrentTemp!=eepromFermCurrentTemp){
      sendPayloadToTopic(configBrewapi.topics.ferm_current_temp_topic,eepromFermCurrentTemp);
      fermCurrentTemp=eepromFermCurrentTemp;    
    }

    if(fermTempSetPoint!=eepromFermTempSetPoint){
      sendPayloadToTopic(configBrewapi.topics.ferm_temp_set_point_topic,eepromFermTempSetPoint);
      fermTempSetPoint=eepromFermTempSetPoint;
    }

    if(fermDiffSetValue!=eepromFermDiffSetValue){
      sendPayloadToTopic(configBrewapi.topics.ferm_diff_set_value_topic,eepromFermDiffSetValue);
      fermDiffSetValue=eepromFermDiffSetValue;
    }

    if(fermCompDelaytime!=eepromFermCompDelaytime){
      sendPayloadToTopic(configBrewapi.topics.ferm_comp_delay_time_topic,eepromFermCompDelaytime);
      fermCompDelaytime=eepromFermCompDelaytime;

    }

    if(fermMode!=eepromFermMode){
      sendPayloadToTopic(configBrewapi.topics.ferm_mode_topic,eepromFermMode);
      fermMode=eepromFermMode;

    }

    if(onOff!=eepromOnOff){
      sendPayloadToTopic(configBrewapi.topics.on_off_topic,eepromOnOff);
      onOff=eepromOnOff;
    }

    if(fermLampSwitch!=eepromFermLampSwitch){
      sendPayloadToTopic(configBrewapi.topics.on_off_topic,eepromFermLampSwitch);
      fermLampSwitch=eepromFermLampSwitch;
    }

    eepromChanged=false;
  }

  if(dashboardChanged){
    sendToComport();
    eepromFermTempSetPoint=fermTempSetPoint;
    eepromFermDiffSetValue=fermDiffSetValue
    eepromFermCompDelaytime=fermCompDelaytime
    eepromOnOff=onOff


    dashboardChanged=false;
  }

 }


function sendToComport(){
  var messageToPort=getMessage();
  port.write(messageToPort, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    console.log('message written to port-  '+messageToPort);
  });
}