const taillMaxPaquetNeogate = 3000;
const Net = require('net');
var socket = new Net.Socket();
var user;
var password;
var ip;//addresse ip
var port;
var listPortSimTel = new Array();
var fs = require('fs');
var mkdirp = require('mkdirp');
var listNomsFichierSms = new Array();
var idMaxSms = 0;
var idNeogate;
//const dossierInstanceSms = './neogate/smsInstances/';
const extention = '.json';
//const dossierRacine = '';

const dossierRacine = './neogate/';
const dossierInstanceSms = dossierRacine + 'smsInstances/';
// const fichierConf = dossierRacine + 'conf' + extention;
const fichierConf = 'conf.json';


var evenements = require('events');
var evenement = new evenements();
exports.evenement = evenement;


//____________________Signer l'identification du Neogate________________________________________________________//
/*var CreerNeogate = function()
{
   ++idMaxNeogate;
    console.log('Neogate: ' + idMaxNeogate);
    mkdirp('a' + idMaxNeogate.toString(), function(erreur) {
        if(erreur)
        {
            console.log('Neogate ERREUR7: ' + erreur + idMaxNeogate);
            return 0;
        }
    })

    return idMaxNeogate;
};
exports.CreerNeogate = CreerNeogate;*/

var SetIdNeogate = function(id)
{
    idNeogate = id;
    var dossier = id;
    mkdirp(idNeogate, function(erreur) {
        if(erreur)
        {
            console.log('Neogate ERREUR7: ' + erreur);
            return false;
        }

        return true;
    });
}
exports.SetIdNeogate = SetIdNeogate;

//____________________Tentative de connexion au neogate________________________________________________________//
var connecterNeogate = function(ipNeogate, portNeogate, userNeogate, passwordNeogate)
{
    if(ipNeogate.length < 7 || portNeogate < 1)
    {
        return false;
    } 

    ip = ipNeogate;
    port = portNeogate;
    user = userNeogate;
    password = passwordNeogate;

    socket.connect(portNeogate, ipNeogate), function() {};

    return true;
};
exports.connecterNeogate = connecterNeogate;

//_______***__________Teste a supprimer après la phase de developpement______________________________________//
// console.log(connecterNeogate('127.0.0.1', 5038, 'apiuser', 'apipass'));

console.log(connecterNeogate('192.168.5.150', 5038, 'apiuser', 'apipass'));

//____________________Erreur de connexion au neogate________________________________________________________//
socket.on('error', function(erreur) {console.log('Erreur socket connexion : ' + erreur);});

//____________________Fin de la connexion au neogate________________________________________________________//
socket.on('end', function() {console.log('Fin de la connexion de ce socket');});  

//____________________Connexion au neogate reussit___________________________________________________________//
socket.on('connect', function() {
    console.log('Connection reussi: ' + ip + ':' + port);
});

//____________________Reception de données du neogate_______________________________________________________//
socket.on('data', function(chunk) {
try
{
    
    //console.log(`Reception de donnees : ${chunk.toString()}.`);
    let donnees = chunk.toString();
    console.log(donnees);

    if(donnees.length > taillMaxPaquetNeogate) { return; }
    
    donnees = donnees.toLocaleLowerCase();
    //console.log('Reception de donnees : ' + donnees);

    if(donnees.search('updatesmssend') >= 0)
    {
        //Emettre Reponse Sms Envoyer
        let idSms = donnees.split('id: ')[1].split('\r')[0];
        let status = donnees.split('status: ')[1].split('\r')[0];

        if(status > 0)
        {
            fs.unlink(dossierInstanceSms + idSms + extention, function(err) 
            {
                try{}
                catch(erreur){console.log('Neogate ERREUR1: ' + erreur)}
            });
            evenement.emit('evenStatusEnvoiSms', idNeogate, true);
        }
        else
        {
            evenement.emit('evenStatusEnvoiSms', idNeogate, false);
        }        
    }
    else if(donnees.search('receivedsms') >= 0)
    {
        
        let sms = {};

        sms.idSms =  donnees.split('id: ')[1].split('\r')[0];
        sms.simPort = donnees.split('gsmspan: ')[1].split('\r')[0];
        sms.nombreTotalSms = donnees.split('total: ')[1].split('\r')[0];
        sms.index = donnees.split('index: ')[1].split('\r')[0];
        sms.sender = donnees.split('sender: ')[1].split('\r')[0];
        sms.smsc = donnees.split('smsc: ')[1].split('\r')[0];
        sms.tempsRecu = donnees.split('recvtime: ')[1].split('\r')[0];
        sms.message = donnees.split('content: ')[1];
        sms.message = decodeURIComponent(sms.message.replace(/\+/g,  " "));//Decodage du message en format URL

        //console.log(sms);
        evenement.emit('evenSmsRecu', idNeogate, sms);
        
    }
    else if(donnees.search('ussd Message:') >= 0)
    {
        //Emettre USSD recu
    }
    else if(donnees.search('asterisk') >= 0)
    {
        socket.write('Action: login\nUsername: ' + user + "\nSecret: " + password + "\r\n\r\n");
    }
    else if(donnees.search('authentication accepted') >= 0)
    {
        socket.write('Action: smscommand\ncommand: gsm show spans\r\n\r\n');
        evenement.emit('evenAutentifNeogate', idNeogate, true);
    }
    else if(donnees.search('authentication failed') >= 0)
    {
        evenement.emit('evenAutentifNeogate', idNeogate, false);
    }
    else if(donnees.search('gsm span') >= 0)
    {//GSM span 2: Power on, Provisioned, Up, Active,Standard
        var decoupDonnees = donnees.split('\n');
        decoupDonnees.forEach(function(ligne, index) {
            if(ligne.search('gsm span') >= 0)
            {
                let portSim = /.+ (\d+).+/.exec(ligne)[1];
                let portStatus = /.+ (.+),.+,.+/.exec(ligne)[1];
                listPortSimTel.push({"portSim" : portSim, "tel" : "", "status" : portStatus});
            }
        });

        if(listPortSimTel.length != 0)
        {
            evenement.emit('evenPortSimDetecter', idNeogate, listPortSimTel);
        }
        //console.log(listPortSimTel);
    }

}
catch(erreur)
{
    console.log('Neogate Erreur7: ' + erreur);
}
});

//____________________Rechargement idMaxSms lord su demarrage________________________________________________//
fs.readFile(fichierConf,'utf8', function(erreur, donnees)
{
    try{
        var sms = JSON.parse(donnees);
        idMaxSms = sms.idMaxSms;
    }
    catch(erreur)
    {
        console.log('Neogate Erreur2: ' + erreur);
    }
});

//____________________Affectation de numero tel au port sim du neogate______________________________________//
var setNumeroTel = function(portSimNeogate, numeroTel)
{//console.log(numeroTel.length);
    let objet = listPortSimTel.find(obj => obj.portSim == portSimNeogate);
    
    if(objet === undefined) return false;

    objet.tel = numeroTel;
    return true;
};
exports.setNumeroTel = setNumeroTel;

//____________________Range le sms dans le fil d'antente pour l'envoi sms__________________________//
var envoyerSms = function(message, numeroSource, numeroDestinataire, hautePriorite)
{//console.log(numeroSource.length);
    try {

    let objet = listPortSimTel.find(obj => obj.tel == numeroSource);
    if(objet === undefined || objet.status != 'up') return false;
    
    let nomFichierSms;
    ++idMaxSms;
    fs.writeFile(fichierConf, '{"idMaxSms" : ' + idMaxSms + '}' , function (err) 
    {
            try{} 
            catch (erreur) { console.log('Neogate ERREUR3: ' + erreur); }
    });

    if(hautePriorite == true)
    {
        nomFichierSms =  'h' + idMaxSms;
        listNomsFichierSms.unshift(nomFichierSms);
    }
    else
    {
        nomFichierSms =  'b' + idMaxSms;
        listNomsFichierSms.push(nomFichierSms)
    }
    let sms = '{"message":"' + message + '","destinataire":"' + numeroDestinataire + '", "source":"' + numeroSource + '"}';
    
    //fs.writeFile(fichierConf, '{"idMaxSms" : ' + idMaxSms + '}' , function (err) {if (err) throw err;});
    fs.writeFile(dossierInstanceSms + nomFichierSms + extention, sms , function (err) 
    {
            try{} 
            catch (erreur) { console.log('Neogate ERREUR4: ' + erreur); }
    });
    
    if(!envoiSmsEnCour)
    {
        delaiEnvoiSms();
    }
} catch (erreur) {
       console.log('Neogate ERREUR5: ' + erreur);
}
    return true;
};
exports.envoyerSms = envoyerSms;

//____________________Envoi sms a chaque 5 second si il y'a instance sms____________________________________//
var envoiSmsEnCour = false;
var delaiEnvoiSms = function()
{
    if(listNomsFichierSms.length < 1)
    {
        envoiSmsEnCour = false;
        return;
    }
    
    const idSms = listNomsFichierSms[0];
    listNomsFichierSms.shift();

    fs.readFile(dossierInstanceSms + idSms + extention, 'utf8', function (erreur, donnees)
    {
    try{
            var sms = JSON.parse(donnees);
            let objet = listPortSimTel.find(obj => obj.tel == sms.source);
            
            if(objet !== undefined && objet.status == 'up')
            {
                let message = 'Action: smscommand\ncommand: gsm send sms ' + 
                objet.portSim + ' ' + sms.destinataire +
                              ' "' + sms.message + '" ' + idSms + "\r\n\r\n";
                socket.write(message);
                
                console.log('envoi d SMS');
                //console.log(message);
            }
        }
    catch(erreur)
        {
            console.log('Neogate Erreur6: ' + erreur);
        }
    });

    envoiSmsEnCour = true;
    setTimeout(delaiEnvoiSms, 5000);
};
delaiEnvoiSms();





//_______***__________Fonction de teste a supprimer après la phase de developpement________________//
function FunctionTest1(parametre) {
    //setNumeroTel('3', "73333333");
    //setNumeroTel('2', "70000000");
    //console.log(listPortSimTel);
}
//setTimeout(FunctionTest1, 1000, 'parametre');

//_______***__________Fonction de teste a supprimer après la phase de developpement________________//
//setTimeout(FunctionTest2, 1500, 'parametre');
function FunctionTest2(parametre) {
    //envoyerSms('mon message1.', '70000000', '70138448', false);
    //envoyerSms('mon message2.', '70000000', '70138448', true);
    //envoyerSms('mon message3.', '70000000', '70138448');
    //envoyerSms('mon message4.', '70000000', '70138448');
    //envoyerSms('mon message5.', '70000000', '70138448', true);

    //console.log(listNomsFichierSms);
}
var valeur;
process.stdin.on('data', function (valeur) {
    process.stdout.write(': ' + valeur + '\n');
});

//console.log ( "S'il vous plaît entrer votre entrée" ); // message affiché à l'utilisateur invitant // utilisateur à entrer, je suppose que vous n'en avez pas besoin pour hackerrank. 
//var userinput = readline ();


/*let {scanf} = require('nodejs-scanf');
 
// input: 'hello world'
scanf('%s', function(str) {
  console.log(str);  // output: //hello
});*/

//var mkdirp = require('mkdirp');
//mkdirp('foo', function(err) { });