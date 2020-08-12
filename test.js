var log = require("noogger");
var neo = require("./index.js");

neo.events.on("siminfo", function (siminfo) {
    console.log(siminfo);    
});

neo.events.on("SMSUpdate", function (data) {
    console.log(data);    
});

neo.events.on("SMSReceived", function (data) {
    console.log(data);    
});

neo.events.on("USSDResponse", function (data) {
    console.log(data);    
});

neo.events.on("ready", function() {
    // neo.sendSMS({
    //     destinator:'52004896',
    //     content:"Booo!",
    // },3);

    // setTimeout(() => {
    //     neo.sendUSSD("*9999#",3);
    // }, 1000);
    // setTimeout(() => {
    //     neo.sendUSSD("*101#",3);
    // }, 2000);
});

// [
//     "Response: Follows",
//     "Privilege: SMSCommand",
//     "1:Received USSD success on span: 3\n\tUSSD Responses: 0\n\tUSSD Code: 15\n\tUSSD Len: 100\n\tUSSD Message: Solde Principal: 170 FCFA, expire le 2019-11-17. Total Bonus: 0F.Pour plus de details tapez *101*1#.\n--END COMMAND--",
//     "",
//     "Event: UpdateSMSSend",
//     "Privilege: all,smscommand",
//     "ID: 1het321jlob#qssrb624xpi#jzivl4lp",
//     "Smsc: +22670900505",
//     "Status: 1",
//     "--END SMS EVENT--",
//     "",
//     "Response: Follows",
//     "Privilege: SMSCommand",
//     "1:Received USSD success on span: 3\n\tUSSD Responses: 0\n\tUSSD Code: 15\n\tUSSD Len: 100\n\tUSSD Message: Solde Principal: 170 FCFA, expire le 2019-11-17. Total Bonus: 0F.Pour plus de details tapez *101*1#.\n--END COMMAND--",
//     "",
//     ""
//  ]
/**
 * 19-08-2019 17:00:08.1 [  DEBUG  ]  Response: Follows
Privilege: SMSCommand
--END COMMAND--


19-08-2019 17:00:11.2 [  DEBUG  ]  Event: UpdateSMSSend
Privilege: all,smscommand
ID: jxhs9isynj#30ezhlzpwkj#jzil5996
Smsc: +22678819999
Status: 1
--END SMS EVENT--


19-08-2019 17:00:11.3 [  DEBUG  ]  
{
   "Event": "UpdateSMSSend",
   "Privilege": "all,smscommand",
   "ID": "jxhs9isynj#30ezhlzpwkj#jzil5996",
   "Smsc": "+22678819999",
   "Status": "1"
}
19-08-2019 17:01:48.1 [  DEBUG  ]  Event: ReceivedSMS
Privilege: all,smscommand
ID: 
GsmSpan: 2
Sender: +22652004896
Recvtime: 2019-08-19 15:39:21
Index: 1
Total: 1
Smsc: +22670900505
Content: Ok
--END SMS EVENT--


19-08-2019 17:01:48.1 [  DEBUG  ]  
{
   "Event": "ReceivedSMS",
   "Privilege": "all,smscommand",
   "ID": "",
   "GsmSpan": "2",
   "Sender": "+22652004896",
   "Recvtime": "2019-08-19 15:39:21",
   "Index": "1",
   "Total": "1",
   "Smsc": "+22670900505",
   "Content": "Ok"
}

 */