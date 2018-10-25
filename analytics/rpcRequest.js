/* global require */
'use strict';

var RpcRequest = function(rpcChannel) {
  var that = {};

  // used between sample service and controller. Also used between controller and worker
  that.analyze = function(controller, token, streamId, pluginGuid) {
    return rpcChannel.makeRPC(controller, 'addanalyticsforstream', [token, streamId, pluginGuid], 6000);
  };

  that.deanalyze = function(controller, token) {
    return rpcChannel.makeRPC(controller, 'removeanalyticsforstream', [token], 4000);
  };
  
  // RPC for analytics agent to report uuid
  that.register = function(controller, uuid) {
    return rpcChannel.makeRPC(controller, 'reportid', [uuid], 60000); 
  };

  that.unregister = function(controller, uuid) {
    return rpcChannel.makeRPC(controller, 'leave', [uuid], 60000); 
  };

  return that;
};

module.exports = RpcRequest;

