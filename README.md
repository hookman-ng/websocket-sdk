## Installation
### Install in the browser
``` <script src="https://unpkg.com/hookman-sdk@0.1.1/dist/hookman.min.js"></script>```

### Usage in NodeJS
``` npm install hookman-sdk```
The browser WebSocket class is not available in NodeJS by default.

So we would need to make it available in order for Hookman to work in NodeJS
```
    const ws = require('websocket');
    global.WebSocket = ws.w3cwebsocket;

    const Hookman = require('hookman-sdk');
```

### Clone this Repo
```
    git clone <repo>
    copy hookman.min.js from the dist folder into your project
    <script src="hookman.min.js"></script>
```

## Connecting
```
    const hookman = new Hookman("YOUR HOOKMAN PUBLIC KEY");
    hookman.addEventListener(hookman.EVENTS.CONNECT, client_token => {
        hookman.send("Hello world", client_token);
    });
    hookman.addEventListener(hookman.EVENTS.MESSAGE, message => {
        console.log(message);
    })
    hookman.init();
```
## Client token
When you connect to Hookman, a session scoped client token is returned to the Hookman client. This uniqiely identifies the client and can be used to send message payloads directly to another client.
## Sending a message
```
    ...
    hookman.send('Hello world');

    // echo my message back to me
    hookman.send('Hello world', my_client_token);
```
## Receiving messages
```
    hookman.addEventListener(hookman.EVENTS.MESSAGE, message => {
        console.log(message);
    })

    // shorthand .on()
    hookman.on(hookman.EVENTS.MESSAGE, message => {
        console.log(message);
    })
```
## Broadcasts
### What are Broadcasts
A broadcast is a message payload that is sent to all project clients that are currently online.
### Sending a Broadcast message
```
    hookman.send('this is a broadcast');
    hookman.send('by default, sent messages are broadcast');
```
### Receiving a broadcast message
```
    // broadcast and direct messages are received here
    hookman.on(hookman.EVENTS.MESSAGE, message => {
        console.log(message);
    })

    // messages published to a topic can be received through subscriptions
    hookman.subscribe('topic', (message) => {
        console.log(message);
    });
```
### Enable/Disable receiving broadcast messages
```
    // Disable receiving broadcast messages
    hookman.receiveBroadcastOff();

    // Re-enable receiving broadcast messages
    hookman.receiveBroadcastOn();
```

## PubSub

### Publish a message to a topic
```
    const payload = {
        score: 5,
        level: 2,
        difficulty: 'hard'
    };
    hookman.publish('topic', payload);
```

### Subscribe to a topic
```
    hookman.subscribe('topic', (payload) => {
        console.log(payload)
    });
```