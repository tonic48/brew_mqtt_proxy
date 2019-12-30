const configBrewapi = require("./conf/brewapi.json");

class BrewSettings{

    constructor() {
    //init properties
     
     this._fermTempSetPoint=-1;
     this._fermDiffSetValue=-1;
     this._fermCompDelaytime=-1;
     this._fermTempCalibrationValue=-1;
     this._onOff=-1;
     this._fermLampSwitch=-1
    }
     
    get  fermTempSetPoint(){
        return this._fermTempSetPoint
    } ;
    get  fermDiffSetValue(){
        return this._fermDiffSetValue
    } ;
    get  fermCompDelaytime(){
        return this._fermCompDelaytime
    } ;
    get  fermTempCalibrationValue(){
        return this._fermTempCalibrationValue
    } ;

    get  onOff(){
        return this._onOff
    } ;
    get  fermLampSwitch(){
        return this._fermLampSwitch
    } 



    set  fermTempSetPoint(val){
        this._fermTempSetPoint=val;
    } ;
    set  fermDiffSetValue(val){
        this._fermDiffSetValue=val;
    } ;
    set  fermCompDelaytime(val){
        this._fermCompDelaytime=val;
    } ;
    set  fermTempCalibrationValue(val){
        this._fermTempCalibrationValue=val;
    } ;
    set  onOff(val){
        this._onOff=val;
    } ;
    set  fermLampSwitch(val){
        this._fermLampSwitch=val;
    } 

    setData(data){
        var payloadArray = data.toString().split(';');

        this.onOff=payloadArray[1].trim();
        this.fermTempSetPoint=parseFloat(payloadArray[3].trim());
        this.fermDiffSetValue=parseFloat(payloadArray[4].trim());
        this.fermCompDelaytime=parseFloat(payloadArray[5].trim());
        this.fermTempCalibrationValue=parseFloat(payloadArray[6].trim());
        this.fermLampSwitch=payloadArray[8].trim();
    }

    getJson(){

        var json=`{"status":{"items":[${constructJson()}]}}\n\n`;

        return json;

    }

    getJson(brewStatus){
        var json=  this.constructJson()+","+
        `{"item":"${configBrewapi.topics.ferm_current_temp_topic}","payload":${brewStatus.fermCurrentTemp}},`+
        `{"item":"${configBrewapi.topics.ferm_mode_topic}","payload":"${brewStatus.fermMode}"}`

        json=`{"status":{"items":[${json}]}}\n\n`;

        return json;
    }

    constructJson(){

        return `{"item":"${configBrewapi.topics.on_off_topic}","payload":${this.onOff}},`+
        `{"item":"${configBrewapi.topics.ferm_temp_set_point_topic}","payload":${this.fermTempSetPoint}},`+
        `{"item":"${configBrewapi.topics.ferm_diff_set_value_topic}","payload":${this.fermDiffSetValue}},`+
        `{"item":"${configBrewapi.topics.ferm_comp_delay_time_topic}","payload":${this.fermCompDelaytime}},`+
        `{"item":"${configBrewapi.topics.ferm_temp_calibration_value_topic}","payload":${this.fermTempCalibrationValue}},`+
        `{"item":"${configBrewapi.topics.ferm_lamp_switch_topic}","payload":${this.fermLampSwitch}}`
    }

    compareAndCopy(obj){
        var retCode=false;

        if(this.onOff!=obj.onOff){
            this.onOff=obj.onOff;
            retCode=true;
      
        }     
        if(this.fermTempSetPoint!=obj.fermTempSetPoint){
            this.fermTempSetPoint=obj.fermTempSetPoint
            retCode=true;
        }

        if(this.fermDiffSetValue!=obj.fermDiffSetValue){
            this.fermDiffSetValue=obj.fermDiffSetValue;
            retCode=true;
        }

        if(this.fermCompDelaytime!=this.fermCompDelaytime){
            this.fermCompDelaytime=this.fermCompDelaytime;
            etCode=true;
        }

        if(this.fermTempCalibrationValue!=obj.fermTempCalibrationValue){
            this.fermTempCalibrationValue=obj.fermTempCalibrationValue
            retCode=true;
        }
        
        if(this.fermLampSwitch!=obj.fermLampSwitch){
            this.fermLampSwitch!=obj.fermLampSwitch
            retCode=true;
        }

        return retCode;
    }
};

class BrewStatus{
    constructor() {
        this._fermCurrentTemp=-1;
        this._fermTempSensorError=-1;
        this._fermMode="";
    }
    
    get  fermCurrentTemp(){
        return this._fermCurrentTemp;
    } ;
    get  fermTempSensorError(){
        return this._fermTempSensorError
    } ;
    get  fermMode(){
        return this._fermMode
    } ;
    set  fermCurrentTemp(val1){
        this._fermCurrentTemp=val1;
    };
    set  fermTempSensorError(val){
        this._fermTempSensorError=val;
    } ;
    set  fermMode(val){
        this._fermMode=val;
    } ;

    setData(data){
        var payloadArray = data.toString().split(';');

        this.fermCurrentTemp=parseFloat(payloadArray[2].trim());
        this.fermMode=payloadArray[7].trim();
    }

    getJson(){

        var json=`{"status":{"items": [{"item":"${configBrewapi.topics.ferm_current_temp_topic}","payload":${this.fermCurrentTemp}},`+
                        `{"item":"${configBrewapi.topics.ferm_mode_topic}","payload":"${this.fermMode}"}]}}\n\n`;

        return json

    }



    compareAndCopy(obj){
        var retCode=false;

        if(this.fermCurrentTemp!=obj.fermCurrentTemp){
            this.fermCurrentTemp=obj.fermCurrentTemp;
            retCode=true;
      
        }    

        if(this.fermMode!=obj.fermMode){
            this.fermMode=obj.fermMode
            retCode=true;
        }
        

        return retCode;
    }

}

module.exports = {
    BrewSettings : BrewSettings,
    BrewStatus : BrewStatus
}

