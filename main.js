var get = require('simple-get');
var mqtt = require('mqtt');
var mfc = require('MFCAuto');
var fs = require('fs');
var yaml = require('js-yaml');

var config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

function bla(vs) {
    switch (vs) {
        case 0:
            return "FreeChat";
        case 2:
            return "Away";
        case 12:
            return "Private";
        case 13:
            return "GroupShow";
        case 90:
            return "Online";
        case 127:
            return "Offline";
    }
}

var client = mqtt.connect(config.mqttserver);

client.on('connect', function() {
    client.subscribe(config.mqtttopic + "request/chaturbate");
    UpdateModelsList();
    var timerId = setInterval(UpdateModelsList, 30000);
});

client.on('message', function(topic, message) {
    get.concat({
        url: ("https://chaturbate.com/api/chatvideocontext/" + message.toString()),
        json: true
    }, function(err, res, data) {
        if (err) return;
        if (data.room_status == 'public') {
            client.publish(config.mqtttopic + 'request/chaturbate/' + message.toString(), data.hls_source.split('m3u8')[0] + 'm3u8');
        }
    });
});

function UpdateModelsList() {
    get.concat({
        url: "https://ru.chaturbate.com/affiliates/api/onlinerooms/?wm=bbpsn&format=json",
        json: true
    }, function(err, res, data) {
        if (err) return;
        data.forEach(function(entry) {
            client.publish(config.mqtttopic + 'online/chaturbate/' + entry.username, entry.current_show);
        })
    });
    var Client = new mfc.Client();
    Client.connectAndWaitForModels().then(function() {
        mfc.Model.knownModels.forEach(function(m) {
            m.knownSessions.forEach(function(n) {
                client.publish(config.mqtttopic + 'online/mfc/' + n.nm, '{"UserID": ' + n.uid + ',"Status": ' + bla(n.vs) + ',"CamServer": ' + n.camserv + '}');
            })
        })
    });
    Client.disconnect();
};