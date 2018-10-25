/*global require, module, global, process*/
'use strict';


var logger = require('./logger').logger;

// Logger
var log = logger.getLogger('VideoAnalyticsNode');
var Getopt = require('node-getopt');
var amqper = require('./amqp_client')();

var plugin_name = process.env.PLUGIN_LIB_NAME;
var has_message = process.env.HAVE_MESSAGE;
var has_output = process.env.HAVE_OUTPUT; 

var VideoAnalyzer;
try {
	VideoAnalyzer = require('./videoAnalyzer_sw/build/Release/videoAnalyzer-sw');
} catch (e) {
	log.error(e);
	process.exit(-2);
}

var Analyzer = function VAnalyzer(selfRpcId, serverRpcId, rabbitConfig) {
	var that = {},
	    engine,
	    connected = false;

	that.rpcAPI = {
		// Rpc from analytics controller
addanalyticsforstream: function (access_token, stream_id, plugin_guid, callback) {
			       log.debug('received request from controller to start analytics.');
			       if (engine && connected) {
				       engine.addAnalyticsForStream(stream_id, plugin_guid, access_token);
				       callback('callback', 'ok');
			       }
		       },
removeanalyticsforstream: function (token, callback) {
				  log.debug('received request from controller to remove analytics.');
				  if (engine && connected && typeof token === 'object' && token.stream) {
					  engine.removeAnalyticsForStream(token.stream);
					  callback('callback', 'ok');
				  } else {
					  callback('callback', 'error');
				  }
			  }
	};

	that.initialize = function () {
		log.debug('to initialize video analyzer');
		var config =  "analytics";

		engine = new VideoAnalyzer(plugin_name, has_message, has_output);

		log.debug('Video analytics engine init OK.');


                engine.addEventListener('AnalyticsStopped', function() {
                   if (engine) {
                     engine.close();     
                     engine = undefined;
                   }
                });

		var rpcClient;
		amqper.connect(rabbitConfig, function() {
				amqper.asRpcServer(selfRpcId, that.rpcAPI, function(rpcSrv) {
					connected = true;
					process.send('READY');
					console.log('sender initialized as rpc server ok.');
					}, function(reason) {
					process.send('ERROR');
					console.log('sender initialized as rpc client failed. reason:', reason);
					});

				}, 
				function(reason) {
				process.send('ERROR');
				console.log('sender connect failed. reason:', reason);
				});

	};

	that.connect = function (server_url, room_id) {
		if (engine) {
			engine.connect(server_url, room_id);
		}
	};

	that.disconnect = function() {
		if (engine) {
			engine.disconnect();
		}
	}

	that.deinit = function () {
		if (engine) {
			engine.close();
			engine = undefined;
		}
	};

	that.close = function() {
		if (engine) {
			that.deinit();
		}
	};


	that.onSessionSignaling = function (siganling) {
		if (typeof signaling === 'string') {
			if (signaling === 'connected') {
				connected = true;
			} else {
				connected = false; 
			} 
		}
	};

	return that;
};
/*
   module.exports = function (selfRpcId, rabbitConfig) {
   var that = {};

   that.analytics = Analyzer(selfRpcId, rabbitConfig);
   that.analytics.initialize();

   return that;
   };*/


var selfRpcId = process.argv[2];
var serverRpcId = process.argv[3]
var rabbitConfig = {};
rabbitConfig.host = process.argv[4];
rabbitConfig.port = process.argv[5];

var analytics = Analyzer(selfRpcId, serverRpcId, rabbitConfig);
analytics.initialize();

['SIGINT', 'SIGTERM'].map(function (sig) {
		process.on(sig, function () {
			log.warn('Exiting on', sig);
			if (analytics.engine && typeof analytics.engine.close === 'function') {
			analytics.engine.close();
			}
			process.exit();
			});
		});

['SIGHUP', 'SIGPIPE'].map(function (sig) {
		process.on(sig, function () {
			log.warn(sig, 'caught and ignored');
			});
		});

process.on('exit', function () {
		log.debug('exiting analytics worker');
		amqper.disconnect();
		});
