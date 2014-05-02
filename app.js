var Queue = require('bull');

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

