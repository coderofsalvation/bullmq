var connect     = require('connect')
var bullmq      = require('./lib/bullmq');
var httpProxy   = require('http-proxy')
var amqp        = require('amqp');
var RateLimiter = require("limiter").RateLimiter;
var config      = { "debug":true, "proxy":{}, "queue":{}, "limiters":{} }; // will be filled by conf.d/*
var proxy       = {}
var limiters    = {"default": new RateLimiter( 5000, 'hour',true)};
var amqpUse     = false;

config   = bullmq.loadconfig(config);
proxy    = bullmq.initproxies(config,proxy,httpProxy);
limiters = bullmq.initlimiters(config);

function start(amqp){
  connect.createServer(false,
    function (req, res) {
      try{
        var host = req.headers.host;
        bullmq.log("=> "+host+req.url);
        var limiter = limiters[host+req.url] || limiters[host] || limiters['default'];
        limiter.removeTokens( 1, function(err, remainingRequests){
          bullmq.log( "remaining calls: "+limiter.getTokensRemaining()  );
          if( limiter.getTokensRemaining() < 1 ){
            res.setHeader("Context-Type: text/plain");
            res.end( JSON.stringify( {succes:false, code: 429, msg:"Too Many Requests - your IP is being rate limited",data:{}} ) );
          }else{
            if( config.queue[host] != undefined && config.queue[host][req.url] != undefined ){
                bullmq.log("adding "+req.url+" to queue '"+ config.queue[host][req.url].queue+"'" );
                var qname = config.queue[host][req.url].queue;
                bullmq.queue( config, host, req, res, qname, amqpUse ? amqp : false );
            }else if( proxy[host] != undefined ){
              var p = proxy[host][ Math.floor(Math.random() * proxy[host].length) ]; // roundrobin loadbalancing
              p.web(req, res);
            }else{
              res.setHeader("Context-Type: text/plain");
              res.end("bullmq: error 404");
            }
          }
        });
      }catch (e){ bullmq.log("catch"); console.log(e); }
    }
  ).listen( process.env.PORT || 8080 );
}

bullmq.log(" _       _ _           ");
bullmq.log("| |_ _ _| | |_____ ___ ");
bullmq.log("| . | | | | |     | . |");
bullmq.log("|___|___|_|_|_|_|_|_  |");
bullmq.log("                    |_|");
bullmq.log("listening at port "+ (process.env.PORT || 8080) );
bullmq.log("config:");
bullmq.log( bullmq.indentJSON(config) );

if( amqpUse ){
  var amqpConn    = amqp.createConnection({ host: 'dev.rabbitmq.com' });
  // Wait for connection to become established.
  connection.on('ready', function () {
    start(this);
  });
}else start();

