var WebSocket = require('ws');
var fs = require('fs');

if( process.argv.length < 3 ) {
	console.log(
		'Usage: \n' +
		'node stream-server.js <secret> [<stream-port> <websocket-port>]'
	);
	process.exit();
}

var STREAM_SECRET = process.argv[2],
	STREAM_PORT = process.argv[3] || 8082,
	WEBSOCKET_PORT = process.argv[4] || 8084,
	STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes

var width = 320,
	height = 240,
	system_id = "";

var d = new Date().getDate() + "_" + new Date().getMonth() + "_" + new Date().getFullYear();

// Websocket Server
var socketServer = new (require('ws').Server)({port: WEBSOCKET_PORT});
socketServer.on('connection', function(socket) {
	// Send magic bytes and video size to the newly connected socket
	// struct { char magic[4]; unsigned short width, height;}
	var streamHeader = new Buffer(8);
	streamHeader.write(STREAM_MAGIC_BYTES);
	streamHeader.writeUInt16BE(width, 4);
	streamHeader.writeUInt16BE(height, 6);
	socket.send(streamHeader, {binary:true});

	console.log( 'New WebSocket Connection ('+socketServer.clients.length + ' total)' );
	
	socket.on('close', function(code, message){
		console.log( 'Disconnected WebSocket ('+socketServer.clients.length + ' total)' );
	});
});

socketServer.broadcast = function(data, opts) {
	for( var i in this.clients ) {
		if (this.clients[i].readyState == 1) {
			this.clients[i].send(data, opts);
			// Append frames to video
			appendToVideo(data, opts);
		}
		else {
			console.log( 'Error: Client ('+i+') not connected.' );
		}
	}
};


// HTTP Server to accept incomming MPEG Stream
var streamServer = require('http').createServer( function(request, response) {
	var params = request.url.substr(1).split('/');

	if( params[0] == STREAM_SECRET ) {
		if (!params[3]) { // Check if the system id has been specified
			console.log(
				'Failed Stream Connection: '+ request.socket.remoteAddress + 
				request.socket.remotePort + ' - system id not provided.'
			);
			response.end();			
		}		

		response.connection.setTimeout(0);
		
		width = (params[1] || 320)|0;
		height = (params[2] || 240)|0;
		system_id = params[3];
	
		console.log(
			'Stream Connected: ' + request.socket.remoteAddress + 
			':' + request.socket.remotePort + ' size: ' + width + 'x' + height + ' system id: ' + system_id
		);

		// Create the video if it doesn't exist
		createVideo();

		request.on('data', function(data){
			socketServer.broadcast(data, {binary:true});
		});
	}
	else {
		console.log(
			'Failed Stream Connection: '+ request.socket.remoteAddress + 
			request.socket.remotePort + ' - wrong secret.'
		);
		response.end();
	}
}).listen(STREAM_PORT);

// Save our encoding data at the beginning of the file
function createVideo() {	
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
        0x00, 0x00, 0x00 // First Picture Start Code
    ]));

    fs.writeFile(d + "_" + system_id + ".mpeg", blob, {flag: "wx"}, function(err) {
        if(err && err.code !== "EEXIST") {
          console.log("err", err);
        } 
    });
}

// Append frames to our video file
function appendToVideo(data, flags) {	
    fs.appendFile(d + "_" + system_id + ".mpeg", data, function(err) {
        if(err) {
          console.log("err", err);
        }
    });
}

console.log('Listening for MPEG Stream on http://127.0.0.1:'+STREAM_PORT+'/<secret>/<width>/<height>');
console.log('Awaiting WebSocket connections on ws://127.0.0.1:'+WEBSOCKET_PORT+'/');
