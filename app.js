var bullmq      = require('./lib/bullmq');
var httpProxy   = require('http-proxy');
var http        = require('http');
var amqp        = require('amqp');
var SysLogger = require('syslogger');
var RateLimiter = require("limiter").RateLimiter;

var proxy       = {}
var limiters    = {"default": new RateLimiter( 5000, 'hour',true)};
var amqpUse     = false;
var syslog      = true;
var logger = new SysLogger({
  name: 'bullmq',
  facility: 'user',
  address: '127.0.0.1',
  port: 514
});
var config      = { "stdout":true, "proxy":{}, "queue":{}, "limiters":{}, "syslog": syslog ? logger : false }; // will be filled by conf.d/*

config   = bullmq.loadconfig(config);
proxy    = bullmq.initproxies(config,proxy,httpProxy);
limiters = bullmq.initlimiters(config);

function start(amqp){
  var bullmqproxyServer = http.createServer(function (req, res) {
    req.socket.on('close', function() {
    });
    req.socket.on('error', function() {
      bullmq.log("timeout");
      res.end( JSON.stringify( {succes:false, code: 104, msg:"server could not handle your request in time",data:{}} ) );
    });
    req.socket.on('timeout', function() {
      bullmq.log("timeout");
      res.end( JSON.stringify( {succes:false, code: 104, msg:"server could not handle your request in time",data:{}} ) );
    });
    try{
      var host = req.headers.host;
      var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
      var limiter = limiters[host+req.url] || limiters[host] || limiters['default'];
      var bucket = limiter.getTokensRemaining();
      limiter.removeTokens( 1, function(err, remainingRequests){
        if( bucket < 1 ){
          bullmq.log("REJECT => "+host+req.url+" from "+ip+" (bucket:"+bucket+")" );
          res.setHeader("Context-Type: text/plain");
          res.end( JSON.stringify( {succes:false, code: 429, msg:"Too Many Requests - your IP is being rate limited",data:{}} ) );
        }else{
          if( config.queue[host] != undefined && config.queue[host][req.url] != undefined ){
              bullmq.log("adding "+req.url+" to queue '"+ config.queue[host][req.url].queue+"'" );
              var qname = config.queue[host][req.url].queue;
              bullmq.log("QUEUED => "+host+req.url+" from "+ip+" (bucket:"+bucket+")" );
              bullmq.queue( config, host, req, res, qname, amqpUse ? amqp : false );
          }else{
            var p = proxy[host] ? proxy[host][ Math.floor(Math.random() * proxy[host].length) ] : proxy["default"][0]; // roundrobin loadbalancing
            bullmq.log("ACCEPT => "+host+req.url+" from "+ip+" (bucket:"+bucket+")" );
            p.web(req, res);
          }
        }
      });
    }catch (e){ bullmq.log("catch"); console.log(e); }
  }).on('upgrade', function (req, socket, head) {
    // not implemented yet
    // proxy.ws(req, socket, head);
  }).listen( process.env.PORT || 80 );
}

bullmq.log(" _       _ _           ");
bullmq.log("| |_ _ _| | |_____ ___ ");
bullmq.log("| . | | | | |     | . |");
bullmq.log("|___|___|_|_|_|_|_|_  |");
bullmq.log("                    |_|");
bullmq.log("listening at port "+ (process.env.PORT || 8080) );
bullmq.log("config:");
bullmq.log( config );//bullmq.indentJSON(config) );

if( amqpUse ){
  var amqpConn    = amqp.createConnection({ host: 'dev.rabbitmq.com' });
  // Wait for connection to become established.
  connection.on('ready', function () {
    start(this);
  });
}else start();

