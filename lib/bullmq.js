var queue       = require('bull');

exports.config  = {};

exports.queue = function( config, host, req, res, qname, amqp ){
  if( !amqp ) this.queueBull( config,host,req,res,qname );
  else this.queueAMQP( config,host,req,res,qname,amqp);
}

exports.queueBull = function( config, host, req, res, qname ){
  var pub = queue( qname, 6379, '127.0.0.1');
  var sub = queue( qname, 6379, '127.0.0.1');

  sub.on('completed', function(job){
    console.log("complete");
    res.setHeader("Context-Type: application/json");
    res.end( JSON.stringify( {succes:true, code:100, msg:"ok", data:{}} ) );
  })
  .on('failed', function(job, err){
    res.setHeader("Context-Type: application/json");
    res.end( JSON.stringify( {succes:false, code:101, msg:"failed",data:{}} ) );
  })
  .on('progress', function(job, progress){
    res.setHeader("Context-Type: application/json");
    res.end( JSON.stringify( {succes:true, code: 102, msg:"processing",data:{}} ) );
  })
  .on('paused', function(){
    res.setHeader("Context-Type: application/json");
    res.end( JSON.stringify( {succes:true, code: 103, msg:"queued",data:{}} ) );
    // The queue has been paused
  })
  pub.add({url:req.url,headers:req.headers,host:host});
  setTimeout( function(){
    res.setHeader("Context-Type: application/json");
    res.end( JSON.stringify( {succes:false, code: 104, msg:"server could not handle your request in time",data:{}} ) );
  }, config.queue[host][req.url].timeout ); // generate timeout if no subscribers  
}
   
exports.queueAMQP = function( config, host, req, res, connection ){
  // Use the default 'amq.topic' exchange
  connection.queue('my-queue', function(q){
      // Catch all messages
      q.bind('#');

      // Receive messages
      q.subscribe(function (message) {
        // Print messages to stdout
        console.log(message);
      });
  });
}

exports.indentJSON = function(obj, indent)
{
  var result = "";
  if (indent == null) indent = "";

  for (var property in obj)
  {
    var value = obj[property];
    if (typeof value == 'string')
      value = "'" + value + "'";
    else if (typeof value == 'object')
    {
      if (value instanceof Array)
      {
        // Just let JS convert the Array to a string!
        value = "[ " + value + " ]";
      }
      else
      {
        var od = this.indentJSON(value, indent + "  ");
        value = "\n" + indent + "{\n" + od + "\n" + indent + "}";
      }
    }
    result += indent + "'" + property + "' : " + value + ",\n";
  }
  return result.replace(/,\n$/, "");
}

// Load configurations in conf.d/*
exports.loadconfig =  function(config){
  require('fs').readdirSync( 'conf.d/' ).forEach(function(file) {
    if (file.match(/.+\.js/g) !== null) {
      var name = file.replace('.js', '');
      exports[name]   = require('./../conf.d/' + file);
      config.proxy    = exports[name].proxy(config.proxy);
      config.queue    = exports[name].queue(config.queue);
      config.limiters = exports[name].limiters(config.limiters);
    }
  });
  return (this.config = config);
}

exports.initlimiters = function(config){
  var RateLimiter = require("limiter").RateLimiter;
  var limiters = {};
  for( slug in config.limiters ){
    limiters[slug] = new RateLimiter( config.limiters[slug].rate, 'hour', true );
  }
  return limiters;
}

// initialize proxies
exports.initproxies =  function(config,proxy,httpProxy){
  for( var p in config.proxy ){
    if( proxy[p] == undefined ) proxy[p] = [];
    for( var target in config.proxy[p] ){
      proxy[p].push( httpProxy.createProxyServer({target: config.proxy[p][target] }) );
      console.log("adding proxy %s => %s", p, config.proxy[p][target] );
    }
  }
  return proxy;
}


exports.log = function(msg){
  if( this.config.stdout )
    console.log((new Date()) + '> ' + msg );
  this.config.logger && this.config.logger.notice( msg );
}
