var Queue = require('bull');
var connect  = require('connect')
var httpProxy = require('http-proxy')
var config = { "proxy":{} }; // will be filled by conf.d/*
var proxy = {}

// Load configurations in conf.d/*
require('fs').readdirSync( 'conf.d/' ).forEach(function(file) {
  if (file.match(/.+\.js/g) !== null) {
    var name = file.replace('.js', '');
    exports[name] = require('./conf.d/' + file);
    config.proxy = exports[name].proxy(config.proxy);
  }
});

// initialize proxies
for( var p in config.proxy ){
  if( proxy[p] == undefined ) proxy[p] = [];
  for( var target in config.proxy[p] ){
    proxy[p].push( httpProxy.createProxyServer({target: config.proxy[p][target] }) );
    console.log("adding proxy %s => %s", p, config.proxy[p][target] );
  }
}

var sub = Queue("request_web", 6379, '127.0.0.1');

// And receive as well
sub.process(function(msg, msgDone){
  console.log('Received message: %s', msg.data.url);
  msgDone();
});

// we can send any JSON stringfiable data
var pub = Queue("request_web", 6379, '127.0.0.1');
setTimeout( function(){
  pub.add({url: '/foo/bar?123'});
},100 );


connect.createServer(
  function (req, res, next) {
    var _write = res.write;
    //res.write = function (data) {
    //  _write.call(res, data.toString().replace("Ruby", "nodejitsu"));
    //}
    next();
  },
  function (req, res) {
    try{
      var host = req.headers.host;
      if( proxy[host] == undefined ){
        res.setHeader("Context-Type: text/plain");
        res.end("bullmq: error 500");
      }else{
        var p = proxy[host][ Math.floor(Math.random() * proxy[host].length) ];
        p.web(req, res);
      }
    }catch (e){ console.log("catch"); console.log(e); }
  }
).listen( process.env.PORT || 8080 );

function log(msg){
  console.log((new Date()) + '> ' + msg );
}

log("proxyServer listening at port "+ (process.env.PORT || 8080) );
log("config:");
console.log("%j", config );
console.log("%j", proxy );
