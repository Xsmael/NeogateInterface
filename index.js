const Net = require('net');
var socket = new Net.Socket();
var fs = require('fs');

var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();

var log= require('noogger');
var receivingData="";
var gsmPorts={};
var portToDetect;
var SIMs={};
var serverStatus={state:"", task:""};

/** These propertiies are defaults for the Config, and overrittent by the open function */
var CONFIG= {
    model:'TG200',
    ip: '192.168.5.150',
    port: '5038',
    apiuser:'apiuser',
    apipass:'apipass',
    RECONNECTION_TIMEOUT: 3000
};

function status(currentState, currentTask) {
    serverStatus.task=currentTask || serverStatus.task;
    serverStatus.state=currentState || serverStatus.state;
    eventEmitter.emit("gatewayStatus",serverStatus);
}
function reconnect() {
    if (serverStatus.task == "CONNECTING") return;
    if (serverStatus.state == "CONNECTED") return;
    status("DISCONNECTED","CONNECTING");
    log.notice("reconnecting...");
    socket.connect(CONFIG.port, CONFIG.ip);
}

function dfault( param, defaultValue){ /*  to enable default parameters in functions */
	return ( typeof param !== 'undefined' ? param : defaultValue) ;
}

function open(conf) {
    CONFIG.ip= conf.ip;
    CONFIG.port= conf.port;
    CONFIG.apiuser= dfault(conf.apiuser, CONFIG.apiuser);
    CONFIG.apipass= dfault(conf.apipass, CONFIG.apipass);
    CONFIG.RECONNECTION_TIMEOUT= dfault(conf.RECONNECTION_TIMEOUT, CONFIG.RECONNECTION_TIMEOUT);
    CONFIG.model= dfault(conf.model, CONFIG.model);

    socket.connect(CONFIG.port, CONFIG.ip);
}

socket.on('timeout', function () {
    status("DISCONNECTED","IDLE");
    log.error('connection timeout. ');
    setTimeout(() => {reconnect();}, CONFIG.RECONNECTION_TIMEOUT); 
});
socket.on('error', function(err) {
    status("DISCONNECTED","IDLE");
    log.error('socket error: ' + err);
    setTimeout(() => {reconnect();}, CONFIG.RECONNECTION_TIMEOUT); 
});
socket.on('end', function() {
    status("DISCONNECTED","IDLE");
    log.warning('socket disconnected.'); 
    setTimeout(() => {reconnect();}, CONFIG.RECONNECTION_TIMEOUT); 
});  
socket.on('connect', function() {log.notice('socket connected to ' + CONFIG.ip + ':' + CONFIG.port); status("CONNECTED","LOGING-IN");  });

/** Messages are sent intermittently and the response to one command can be divided and sent sperately each subdivision ends with
 * a single '\r\n' but the last one ends with a double '\r\n' allowing to know we got all the message and start processing.
 * The fisrt message received right after the connection is the only exception it ends just with single '\r\n'
 */
socket.on('data', function(chunk) {
    receivingData+= chunk.toString();
    // console.log(receivingData);
    
    if(receivingData.startsWith("Asterisk Call Manager/1.1"))
    // So far, this is the only case where the message is not terminated with a double '\r\n\'
    {
        log.debug('login');
        login();
        receivingData='';
    }

    if(!receivingData.endsWith('\r\n\r\n')) return;
    // From here we know we received a full message

    // But the message can be several packets concatenated; so we treat them accordingly
    
    let data=receivingData.split('\r\n\r\n');
    data.pop();
    receivingData='';
    
    // log.critical(data);
    
    while (data.length) {
        processPacket(data.pop());        
    }
});

function processPacket(packet) {
    
    // log.debug(packet);  
    let data= packet.split('\r\n',);
    // log.debug(data);  

    let res;  
    switch (data[0]) {
        case "Response: Success":
            log.debug("Athenticated");
            detectGsmPorts();     
            status("CONNECTED","READY");
            eventEmitter.emit("ready"); 
        break;

        case 'Response: Follows':
            let dataType;
            if(data[2].indexOf("GSM span")> -1){
                data=data.concat(data[2].split('\n'));
                data.splice(2,1);
                // console.log(data);
                dataType= 'SIMPORTS';
            }
            else if(data[2].indexOf("D-channel")> -1){
                data[2]= data[2].replace("Signal Quality (0,31)","SignalQuality")
                    .replace("Model IMEI","ModelIMEI")
                    .replace("Model Name","ModelName")
                    .replace("Network Name","NetworkName")
                    .replace("Network Status","NetworkStatus")
                    .replace("SIM IMSI","SIMIMSI")
                    .replace("SIM SMS Center Number","SIMSMSC");
                data=data.concat(data[2].split('\n'));
                data.splice(2,1);
                dataType= 'SIMSTATUS';
            }
            else if(data[2].indexOf("USSD") > -1){
                // log.warning(data);                
                // let portion= data[2].replace(/\t/g,"");
                // log.critical(portion);                
                // data=data.concat(portion.split('\n'));
                // data.splice(2,1);  
                dataType= 'USSD';                
            }

            switch (dataType) {
                case 'SIMPORTS':
                        res= toJSON(data);
                        delete res.Response;
                        delete res.Privilege;
                    gsmPorts=res;    
                    // log.debug(res);
                    detectGsmPorts();                
                break;

                case 'SIMSTATUS':
                        res= toJSON(data);
                        delete res.Response;
                        delete res.Privilege;
                        // log.debug(res);
                    detectGsmPorts(res);  
                    break;
                case 'USSD':
                    log.debug(data[2]);
                    if(data[2].indexOf("0:Send USSD failed")>-1) {
                        let port= data[2].replace('0:Send USSD failed on span ','');
                        eventEmitter.emit("USSDResponse",{
                            // port:port.replace("\n--END COMMAND--",""), // #IMPORTANT-NOTICE: check why we have to do this so that it works
                            port:port,
                            success:false
                        });

                    }
                    else if(data[2].indexOf("0:Send USSD timeout")>-1) {
                        let port= data[2].replace('0:Send USSD failed on span ','');
                        eventEmitter.emit("USSDResponse",{
                            port:port,
                            success:false
                        });

                    }
                    else{
                        let port;
                        if(CONFIG.model == "TG400")
                            port= data[2].split("USSD Message: ")[0].split("\n\t")[0].replace('1:Recive USSD sucess on span ',''); // this is a known issue with TG 400 model, a typo in the response ("Recive" instead of  "Received") 
                        else 
                            port= data[2].split("USSD Message: ")[0].split("\n\t")[0].replace('1:Received USSD success on span: ','');
                            
                        ussdMessage=data[2].split("USSD Message: ")[1];
                        eventEmitter.emit("USSDResponse",{
                            success:true,
                            port:port,
                            content:ussdMessage.replace("\n--END COMMAND--","")
                        });
                    }
                break;
            
                default:
                    break;
            }
            
        break;
            
        case 'Event: UpdateSMSSend':
            res= toJSON(data);
            eventEmitter.emit("SMSUpdate", {
                id:res.ID,
                sent:1,
                smsc:res.Smsc
            });
            // log.debug(res);
        break;
                    
        case 'Event: ReceivedSMS':
            res= toJSON(data);
            eventEmitter.emit("SMSReceived", {
                id: res.ID,
                port: res.GsmSpan,
                sender: res.Sender,
                time: res.Recvtime,
                index: res.Index,
                total: res.Total,
                content: res.Content
            });
            // log.debug(res);
        break;

        case 'Response: Error':
            res= toJSON(data);
            log.error(res.Message);
            // log.error("Command isn't supported");
        break;
    
        default:
            log.warning("Unhandled Response");
            log.warning(res);
            break;
    }
    
}


function sendUSSD(code,port) {
    socket.write('Action: SMSCommand\ncommand: gsm send ussd '+port+' "'+code+'" \r\n\r\n');
    // socket.write('Action: smscommand\ncommand: gsm send ussd 3 "*101#"  \r\n\r\n');
    // “Action: SMSCommand \r\ncommand: gsm send ussd $port+1 \"$message\" [$timeout]\r\n\r\n”
    // socket.write("Action: ListCommands \r\n\r\n");
}

function sendSMS(sms,port) {
    port= parseInt(port);
    let smsId= generateToken();
    let command = 'Action: smscommand\ncommand: gsm send sms ' +port+' '+ sms.destinator +' "' + sms.content + '" ' + smsId + "\r\n\r\n";
    // “Action: smscommand\r\ncommand: gsm send sms $port+1 $dest \"$message\" $id\r\n\r\n”
    socket.write(command);
    return smsId;    
}

function generateToken() { return Math.random().toString(36).substring(2, 15) + '#' + Math.random().toString(36).substring(2, 15) + '#' + Date.now().toString(36); }


function detectGsmPorts(portData) {
    if(portData) {
        if(!portData.NetworkName)
            portData.NetworkName= portData.SIMIMSI.substring(0,5);
            
        SIMs.push( Object.assign(portData, getNMCDetails( portData.NetworkName), {"port": portToDetect} ));
    }
    else if(Object.keys(gsmPorts).length == 0 ) {
        SIMs=[];
        socket.write('Action: smscommand\ncommand: gsm show spans\r\n\r\n');
        return;
    }
    if(Object.keys(gsmPorts).length == 0) {        //  FINISHED
        eventEmitter.emit("siminfo", SIMs);
        // log.warning(SIMs);
        // fs.writeFile('sims.json',JSON.stringify(SIMs), function(err) {
        //     if(err) log.error("Failed to write sims.json");
        // });
    }
    for (var key in gsmPorts) {
        portToDetect= key.replace('GSM span ','');
        delete gsmPorts[key];
        socket.write('Action: smscommand\r\ncommand: gsm show span '+portToDetect+'\r\n\r\n');
        break;
    }
}

function getNMCDetails(MNC_CODE) {
    try {
        let MNC = JSON.parse(fs.readFileSync("mnc.json"));
        
        return MNC.find(obj => { return obj.mnc == MNC_CODE });
    } catch (err) {
        log.error(err);
    }
}

function toJSON(data) {
    let Obj= {};
    data.forEach(line => {
        if(line.length==0 || line.startsWith('--END')) return;

        let arr=line.split(': ');
        Obj[arr[0]] = arr[1];
        
    });
    return Obj;
}

function login() {
    socket.write('Action: login\nUsername: ' + CONFIG.apiuser + "\nSecret: " + CONFIG.apipass + "\r\n\r\n");
}

function scanSIM() {
    detectGsmPorts(); 
}


/**Exports */

exports.events=eventEmitter;
exports.sendUSSD= sendUSSD;
exports.sendSMS= sendSMS;
exports.scanSIM= scanSIM;
exports.open= open;