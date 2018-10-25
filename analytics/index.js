/*/global require, global, process*/
'use strict';
var spawn = require('child_process').spawn;
var fs = require('fs');
var toml = require('toml');
var md5 = require('md5');
var log = require('./logger').logger.getLogger('AnalyticsController');

var config;
try {
	config = toml.parse(fs.readFileSync('./analytics.toml'));
} catch (e) {
	log.error('Parsing config error on line ' + e.line + ', column ' + e.column + ': ' + e.message);
	process.exit(1);
}

var loadConfig = {};
try {
	loadConfig = require('./loader.json');
} catch (e) {
	log.info('No loader.json found.');
}

var pluginconfig;
try {
    pluginconfig = toml.parse(fs.readFileSync('./plugin.cfg'));
} catch (e) {
	log.error('Parsing config error on line ' + e.line + ', column ' + e.column + ': ' + e.message);
	process.exit(1);
}

var amper = require('./amqp_client')();
var rpcClient;
var rpcChannel;
var rpcReq;
var rpcIdapp = 'analytics-app';
var rpcIdpc = 'portal-controller-' + Math.random().toString(36).substring(2) + (new Date()).getTime().toString(36);
var current_worker_num = 0;
var processes = {};


// Configuration default values
global.config = config || {};

global.config.agent = global.config.agent || {};
global.config.agent.maxProcesses = global.config.agent.maxProcesses || 4;

global.config.rabbit = global.config.rabbit || {};
config.rabbit.host = config.rabbit.host || 'localhost';
config.rabbit.port = config.rabbit.port || 5672;

global.config.video = global.config.video || {};
global.config.video.hardwareAccelerated = !!global.config.video.hardwareAccelerated;

global.config.analytics = global.config.analytics || {};
global.config.analytics.port = global.config.analytics.port || 9900;

var registerController = function(uuid) {
    console.log('registering to app with rpcID:' + uuid +',to:' + rpcIdapp);
    rpcReq.register(rpcIdapp, uuid)
    .then(function() {
       console.log('succeed registered controller to app');
    })
    .catch(function(err) {
       console.log('failed to register controller to app');
    });
};

var unRegisterController = function(uuid) {
    console.log('unregistering to app with rpcID:' + uuid +',to:' + rpcIdapp);
    rpcReq.unregister(rpcIdapp, uuid)
    .then(function() {
       console.log('succeed unregistered controller to app');
    })
    .catch(function(err) {
       console.log('failed to unregister controller to app');
    });
};

var createAnalyticsWorker = function(token, streamId, pluginGuid) {
        console.log('pluginGuid provided:', pluginGuid);
        
        if (!pluginconfig.hasOwnProperty(pluginGuid)) {
           return false;
        }
        (function init_env() {
            var plugin_config = pluginconfig;
            if (plugin_config && plugin_config.hasOwnProperty(pluginGuid)){
              var currentconfig = plugin_config[pluginGuid];
              var messaging, output;
              var path = require('path');
              process.env.LD_LIBRARY_PATH = [
                  path.resolve(process.cwd(), currentconfig.libpath),
                  process.env.LD_LIBRARY_PATH,
                  path.resolve(process.cwd(),'./lib/'),
              ].join(':');
              process.env.PLUGIN_LIB_NAME = currentconfig.name;
              process.env.HAVE_MESSAGE = !!currentconfig.messaging;
              process.env.HAVE_OUTPUT = !!currentconfig.outputfourcc;
            }

        })();
	//var rpcId = JSON.stringify(token).substring(4, 16) + '_' + streamId + '_' + pluginGuid;
	var rpcId = md5(rpcIdpc) + '_' + md5(token) + '_' + streamId + '_' + pluginGuid;
        console.log('token to pass to worker:', rpcId); 

        if (processes.hasOwnProperty(rpcId)) {
          console.log('the same analytics has been requested');
          return false;
        }
	if (!fs.existsSync('./logs')){
		fs.mkdirSync('./logs');
	}
	var out = fs.openSync('./logs/' + rpcId + '.log', 'a');
	var err = fs.openSync('./logs/' + rpcId + '.log', 'a');
	var execName = 'node';
	var child = spawn(execName, ['./analytics.js', rpcId, rpcIdpc, global.config.rabbit.host, global.config.rabbit.port], {
            detached: true,
            stdio: [ 'ignore', out, err, 'ipc' ]
        });

       child.unref();
       child.out_log_fd = out;
       child.err_log_fd = err;
       console.log('launched worker. Id:', rpcId);

       child.on('close', function (code) {
		fs.closeSync(child.out_log_fd);
		fs.closeSync(child.err_log_fd);
		});

       child.on('error', function (error) {
		child.READY = false;
		fs.closeSync(child.out_log_fd);
		fs.closeSync(child.err_log_fd);
		});
       child.on('message', function (message) {
		log.info('message from worker', rpcId, ":", message);
		if (message == 'READY') {
		child.READY = true;
		// send request to the worker to start analytics
		rpcReq.analyze(rpcId, token, streamId, pluginGuid)
		.then(function() {
			log.info('request sent to worker');
			})
		.catch(function(err) {
			log.warn('failed to send request to worker');
			}); 
		} else {
		    child.READY = false;
		    child.kill();
		    fs.closeSync(child.out_log_fd);
		    fs.closeSync(child.err_log_fd);
		}
	});
        processes[rpcId] = child;
        return true;
};

var stopAnalyticsWorker = function(rpcId, token) {
	rpcReq.deanalyze(rpcId, token)
		.then(function() {
			if(processes.hasOwnProperty(rpcId)) {
			    processes[rpcId].kill();
			    delete processes[rpcId];
			} 
		})
	        .catch(function(err) {
			if(processes.hasOwnProperty(rpcId)) {
			    processes[rpcId].kill();
			    delete processes[rpcId];
			} 
			log.warn('failed to stop analyzer worker.');
		 });
};

var rpcPublic = {
addanalyticsforstream: function(token, streamId, pluginGuid, callback) {
			       // spawn the worker node and send request over.
                               if (current_worker_num + 1 >= global.config.agent.maxProcesses) {
                                  callback('callback', 'error');
                                  return;
                               } else {
                                 current_worker_num = current_worker_num + 1;
			         var result = createAnalyticsWorker(token, streamId, pluginGuid);
                                 if (result) {
			           callback('callback', 'ok');
                                   return;
                                 } else {
                                   callback('callback', 'error');
                                   return;
                                 }
                               }
		       },
removeanalyticsforstream: function(token, callback) {
				  if (typeof token !== 'object' || !token.access_token 
						   || !token.stream || !token.plugin) {
					  callback('callback', 'error');
					  return;
				  }

	                          var targetRpcId = md5(rpcIdpc) + '_' + md5(token.access_token) + '_' + token.stream + '_' + token.plugin;
                                  console.log("stopping analytics on nodeid:" + targetRpcId);
				  stopAnalyticsWorker(targetRpcId, token);
                                  current_worker_num = current_worker_num - 1;
				  callback('callback', 'ok');
			  }
};

var amqper = require('./amqp_client')();
amqper.connect(config.rabbit, function() {
		amqper.asRpcServer(rpcIdpc, rpcPublic, function(rpcSrv) {
			log.info('controller initialized as rpc server ok.');
			amqper.asRpcClient(function(rpcClnt) {
				log.info('start as rpc client ok');
				rpcClient = rpcClnt;
				rpcChannel = require('./rpcChannel')(rpcClient);
				rpcReq = require('./rpcRequest')(rpcChannel);
                                registerController(rpcIdpc);
			},
			function(reason) {
				console.log('initialized as rpc client failed.');
				})
			},
			function(reason) {
			       console.log('controller initialized as rpc client failed. reason:', reason);
			});

		}, 
		function(reason) {
			console.log('rabbitmq connect failed. reason:', reason);
		});

['SIGINT', 'SIGTERM'].map(function (sig) {
    process.on(sig, function () {
        log.warn('Exiting on', sig);
        unRegisterController(rpcIdpc);
        Object.keys(processes).forEach(function(key){
            processes[key].kill();
            delete processes[key];
        });
        process.exit();
    });
});

process.on('exit', function () {
    amqper.disconnect();
});
