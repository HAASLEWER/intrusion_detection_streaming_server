var WebSocket = require('ws');
var fs = require('fs');

var ws = new WebSocket('ws://0.0.0.0:8084/');

var d = new Date().getDate() + "_" + new Date().getMonth() + "_" + new Date().getFullYear();

ws.on('open', function() {
  process.stderr.write('open')
    var width = 320
    var height = 240
    var wh1 = (width >> 4),
        wh2 = ((width & 0xf) << 4) | (height >> 8),
        wh3 = (height & 0xff);
    var blob = new Buffer(new Uint8Array([
        0x00, 0x00, 0x01, 0xb3, // Sequence Start Code
        wh1, wh2, wh3, // Width & height
        0x13, // aspect ratio & framerate
        0xff, 0xff, 0xe1, 0x58, // Meh. Bitrate and other boring stuff
        0x00, 0x00, 0x01, 0xb8, 0x00, 0x08, 0x00, // GOP
        0x00, 0x00, 0x00, 0x01, 0x00 // First Picture Start Code
    ]));

    fs.writeFile("out.mpeg", blob, {flag: "wx"}, function(err) {
        if(err) {
          console.log("err", err);
        } 
    });
});
ws.on('message', function(data, flags) {
    fs.appendFile("out.mpeg", data, function(err) {
        if(err) {
          console.log("err", err);
        }
    });
});
