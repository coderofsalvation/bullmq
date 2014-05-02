exports.proxy = function(config){  
  // multiple arrayvalues will result in random round-ruby clusterbehaviour
  config["mydomain.org:8080"]     = ["http://127.0.0.1:80"];
  config["www.mydomain.org:8080"] = ["http://127.0.0.1:8080"];
  config["ws.mydomain.org:8080"]  = ["http://127.0.0.1:8111"];
  return config;
}
