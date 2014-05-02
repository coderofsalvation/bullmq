// here you can define proxy routings to other destinations
// multiple arrayvalues will result in random round-robin behaviour (quickndirty scalable)
exports.proxy = function(config){  
  config["localhost:8080"]        = ["http://127.0.0.1:80"];
  config["mydomain.org:8080"]     = ["http://127.0.0.1:80"];
  config["www.mydomain.org:8080"] = ["http://127.0.0.1:80"];
  config["ws.mydomain.org:8080"]  = ["http://127.0.0.1:8111"];
  return config;
}


// here you can limit per domain and even url
// units: day,hour,minute,second
exports.limiters = function(config){
  config["localhost:8080"]     = { unit: "minute", rate:90 };  // 90 requests per minute 
  config["localhost:8080/foo"] = { unit: "minute", rate:20 };  // overrides 90 with 20 
  return config;
}

// here you can queue a request for later processing using nodejs bull (b2b apis/messaging)
// units: day,hour,minute,second
exports.queue = function(config){  
  config["localhost:8080"]    = {
    "/foo": { 
      queue: "/request_web",       // put '/foo' in queue 'request_web'
      timeout: 500                 // generate timeout if no redis subscribers respond within 500 milliseconds
    }      
  };
  return config;
}
