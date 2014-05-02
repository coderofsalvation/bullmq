bullmq
======
<img alt="" src="doc/bullmq.png"/>

a httpproxythrottlingmessagejobqueuedomainrouter.

### What is it?

Its a enormous pillow to put in front of your webserver.
Prevent server/application-panic by limiting and rerouting webrequests to different areas/servers.

### Isnt there already software for this?

There are many enterprise-ish packages out there, but I wanted something deadsimple to configure.
Next to that AMQP will be able to scale out to big servicebusses like RabbitMQ e.g.

### Concepts

Here's a sequencediagram because sequencediagrams are cool :) (hope it makes sense though)

<img src="doc/seqdiagram1.png"/>
