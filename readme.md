# NeogateInterface is a NodeJS module that allows you to seamlessly access neogate APIs for SMS and USSD services. 

### Tested with Neogate TG 200 and TG 400  but should work with others,

Feel free to file an issue.


# How to, example



    var neogate = require("NeogateInterface");

    neogate.open({
        ip: '192.168.3.227',
        port: '5038',
        apiuser: 'apiuser',
        apipass: 'apipass'
    });


    neogate.sendUSSD("*101#",3);
    neogate.sendSMS("scscsc",2);
    // The second parameter is the port number, note that for some (weird) reasons, they label they ports starting from 2 😆. So the first port is 2 and the second is 3.

    neogate.events.on("ready", function () {

        setInterval(() => {
            neogate.scanSIM();
        }, 5000);

        neogate.sendUSSD("*124*1234*200*");
    });

    neogate.events.on("siminfo", function (siminfo) {
        console.log("siminfo");
        console.log(siminfo);
    });

    neogate.events.on("SMSUpdate", function (data) {
        console.log(SMSUpdate);
        console.log(data);
    });

    neogate.events.on("SMSReceived", function (sms) {
        console.log("SMSReceived");
        console.log(sms);
    });

    neogate.events.on("USSDResponse", function (data) {
        console.log("USSDResponse");
        console.log(data);
    });
