const mqtt = require('mqtt')
var debug = require('debug')('Brew-controller');
const async=require('async');
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline');
const configMqtt = require("./conf/mqtt.json");
const configBrewapi = require("./conf/brewapi.json");

//Constants
const SENSOR_ERROR="CRC is not valid";
const FLAG="BREWCONTROL";

//Hold variables interface
var fermCurrentTemp=-1;
var fermTempSetPoint=-1;
var fermDiffSetValue=-1;
var fermCompDelaytime=-1;
var fermTempCalibrationValue=-1;
var fermTempSensorError=-1;
var fermMode="";
var onOff=-1;
var fermLampSwitch=-1

//Hold variables eeprom
var eepromFermCurrentTemp=-1;
var eepromFermTempSetPoint=-1;
var eepromFermDiffSetValue=-1;
var eepromFermCompDelaytime=-1;
var eepromFermTempCalibrationValue=-1;
var eepromFermTempSensorError=-1;
var eepromFermMode="";
var eepromOnOff=-1
var eepromFermLampSwitch=-1

var firstTime=true;
var skipNextComRead=false;
var skipTeller=2;

var eepromChanged=false;
var dashboardChanged=false;

var port = new SerialPort(configBrewapi.comport, {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false
});
const parser = port.pipe(new Readline({ delimiter: '\n' }));

var successTeller=0;
var changed=false;

console.log("Debug level : "+process.env.DEBUG);

port.on('error', function(err) {
  console.log('Error: ', err.message);
})

parser.on('data', function (data) {
  var readableData=data.toString();
    //processDataFromInput(readableData);
    //dashboardChanged is set to true just to skip next arduino update
    //which can override just chandged settings from the Dashboard
    if(!skipNextComRead && skipTeller>1){
      processDataFromComPort(readableData);
      console.log('Data:', readableData);
    }else{
      skipNextComRead=false;
      skipTeller++;
    }


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

 mqttClientDaemon.on("reconnect", (err) => {
   console.log("Reconnect to MQTT");
 });
 
 mqttClientDaemon.on("error", (err) => {
   console.log("Error connection MQTT");
 });
 
 mqttClientDaemon.on('message', (topic, message) => {
   console.log(topic +" ; "+message);
   
   dashboardChanged=true;

   if(getSubtopicName(topic)==configBrewapi.topics.ferm_temp_set_point_topic){
    fermTempSetPoint=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.topics.ferm_diff_set_value_topic){
    fermDiffSetValue=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.topics.ferm_comp_delay_time_topic){
    fermCompDelaytime=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.topics.ferm_temp_calibration_value_topic){
    fermTempCalibrationValue=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.topics.on_off_topic){
      onOff=parseFloat(message.toString());
   }
   if(getSubtopicName(topic)==configBrewapi.topics.ferm_lamp_switch_topic){
    fermLampSwitch=parseFloat(message.toString());
   }

 });

 setInterval(synchronize,2000);


 function processDataFromComPort(data){

  if(data.includes(FLAG)){
    var payloadArray = data.toString().split(';');
    var payLoad="";

    comOnOff=payloadArray[1].trim();
    comFermCurrentTemp=parseFloat(payloadArray[2].trim());
    comFermTempSetPoint=parseFloat(payloadArray[3].trim());
    comFermDiffSetValue=parseFloat(payloadArray[4].trim());
    comFermCompDelaytime=parseFloat(payloadArray[5].trim());
    comFermTempCalibrationValue=parseFloat(payloadArray[6].trim());
    comFermMode=payloadArray[7].trim();
    comFermLampSwitch=payloadArray[8].trim();

    if(comOnOff!=eepromOnOff){
      eepromOnOff=comOnOff;
      eepromChanged=true;

    }

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

    if(comFermTempCalibrationValue!=eepromFermTempCalibrationValue){
      eepromFermTempCalibrationValue=comFermTempCalibrationValue
      eepromChanged=true;
    }

    if(comFermMode!=eepromFermMode){
      eepromFermMode=comFermMode
      eepromChanged=true;
    }
    
    if(comFermLampSwitch!=eepromFermLampSwitch){
      eepromFermLampSwitch=comFermLampSwitch
      eepromChanged=true;
    }
    

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

  //Create message that will be send to Arduino
  /*
      Message structure

      0 -  main switch status (0 - OFF, 1 - ON)
      1 -  target temperature sign (1 => '-' , 0 => '+')
      2 -  target temperature integers 
      3 -  target temperarure decimals 
      4 -  difference set value (C)
      5 -  compressor delay value (min)
      6 -  temperature calibration value sign (0 => '-' , 1 => '+')
      7 -  temperature calibration value integers 
      8 -  temperature calibration value decimals 
      9 -  lamp switch status  (0 - OFF, 1 - ON)
   */

   /*
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

    return sign+";"+integersTemp+";"+decimalsTemp+";"+integersDiff+";"+decimalsDiff+";"+fermCompDelaytime+";"+onOff+";"+fermLampSwitch+";";
    */

   var messageValues = [];
   //element 0
   messageValues.push(onOff);
    //Temperature set point
   var fermTempSetPointSign="0"
   var fermTempSetPointFloat= parseFloat(fermTempSetPoint);
   if(fermTempSetPointFloat<0){
    fermTempSetPointSign="1";
   }
   //element 1
   messageValues.push(fermTempSetPointSign);
   var parts = fermTempSetPoint.toString().split('.'); 
   var integersTemp=parts[0];
   //element 2
   messageValues.push(integersTemp);
   var decimalsTemp =(parts.length>1)?parts[1]:"0"
   //element 3
   messageValues.push(decimalsTemp);
   //element 4
   messageValues.push(fermDiffSetValue);
   //element 5
   messageValues.push(fermCompDelaytime);


   //Temperature calibration
   var fermTempCalibrationValueSign="0"
   var fermTempCalibrationValueFloat= parseFloat(fermTempCalibrationValue);
   if(fermTempCalibrationValueFloat<0){
    fermTempCalibrationValueSign="1";
   }
   //element 6
    messageValues.push(fermTempCalibrationValueSign);

   var parts = fermTempCalibrationValue.toString().split('.'); 
   var integersCalibrationTemp=parts[0];
   var integersCalibrationTempInt= parseInt(integersCalibrationTemp)
   if(integersCalibrationTempInt<0){
    integersCalibrationTempInt=integersCalibrationTempInt*-1
   }
   //element 7
    messageValues.push(integersCalibrationTempInt);
   var decimalsCalibrationTemp =(parts.length>1)?parts[1]:"0"
   //element 8
   messageValues.push(decimalsCalibrationTemp);

   //element 9
   messageValues.push(fermLampSwitch);

   return messageValues.join(";");

 }

 function synchronize(){

  //console.log('SYNC '+eepromChanged +' '+dashboardChanged);

    if(dashboardChanged){
      sendToComport();
      eepromFermTempSetPoint=fermTempSetPoint;
      eepromFermDiffSetValue=fermDiffSetValue
      eepromFermCompDelaytime=fermCompDelaytime
      eepromFermTempCalibrationValue=fermTempCalibrationValue;
      eepromOnOff=onOff
      eepromFermLampSwitch=fermLampSwitch
      
      dashboardChanged=false;
      skipNextComRead=true;
      skipTeller=0;
    }
    
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

    if(fermTempCalibrationValue!=eepromFermTempCalibrationValue){
      sendPayloadToTopic(configBrewapi.topics.ferm_comp_delay_time_topic,eepromFermTempCalibrationValue);
      fermTempCalibrationValue=eepromFermTempCalibrationValue;

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
      sendPayloadToTopic(configBrewapi.topics.ferm_lamp_switch_topic,eepromFermLampSwitch);
      fermLampSwitch=eepromFermLampSwitch;
    }

    eepromChanged=false;
  }

 }


function sendToComport(){
  wait(1);
  var messageToPort=getMessage();
  //console.log('Sending to COM');
  port.write(messageToPort, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    console.log('message written to port-  '+messageToPort);
  });
  //wait(1);
}

function wait(sec){
  var waitTill = new Date(new Date().getTime() + sec * 1000);
  while(waitTill > new Date()){
  }
}