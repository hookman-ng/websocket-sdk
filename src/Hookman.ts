export enum HOOKMAN_EVENTS {
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    MESSAGE = 'message',
    ERROR = 'error'
};

export class WSError extends Error{
    event:Event;
    constructor(event: Event){
        super();
        this.event = event;
    }
}

type SendPayload = {
    id: Number,
    type: String,
    payload: any
    client_token?: String,
    channel?: String;
}
export class Hookman{
    private _api_key: string;
    private base_url = "ws://websocket.hookman.ng";
    private _socket: WebSocket;
    private _topicHandlers: Map<string, Set<Function>>;
    public _generalHandlers: Map<string, Set<Function>>;

    EVENTS = HOOKMAN_EVENTS;

    constructor(api_key: string){
        this._api_key = api_key;
        this._topicHandlers = new Map();
        this._generalHandlers = new Map();
    }

    init(){
        this._socket = new WebSocket(this.base_url);
        this._socket.onopen = () => {
            const authMessage = {
                id: 'auth',
                type: "auth",
                key: this._api_key
            };
            this._socket.send(JSON.stringify(authMessage));
        };

        this._socket.onclose = (event) => {
            this.dispatchEvent(HOOKMAN_EVENTS.DISCONNECT, event);
        };

        this._socket.onerror = (error: Event) => {
            this.dispatchError(new WSError(error));
        };

        this._socket.onmessage = (message) => {
            try{
                const json = JSON.parse(String(message.data));
                const type = json.type;

                switch(type){
                    case "auth":
                        if(json.ack === false && json.error === true){
                            this.dispatchError( new Error(json.error_message) );
                        }
                        else {
                            const client_token = json.client_token;
                            this.dispatchEvent(HOOKMAN_EVENTS.CONNECT, {client_token});
                        }
                    break;
                    case "event": {
                        const payload = json.payload;
                        if(json.channel){
                            const topic = json.channel;
                            if(this._topicHandlers.has(topic)){
                                const _topicHandlers = this._topicHandlers.get(topic);
                                if(!_topicHandlers){
                                    this.dispatchError(new Error('internal: undefined topichandlerSet'));
                                    return;
                                }
                                this.processSetOfhandlers(_topicHandlers, payload);
                                return;
                            }
                        }

                        this.dispatchEvent(HOOKMAN_EVENTS.MESSAGE, payload);
                    }
                    break;
                    case "broadcast": {
                        const broadcast = json.broadcast;
                        if(broadcast === true) console.log('broadcasts enabled');
                        else console.log('boradcasts disabled');
                    }
                    break;
                }
            }
            catch(e){
                this.dispatchError(e);
            }
        };
    }

    addEventListener(event: HOOKMAN_EVENTS, callback: Function){

        if(this._generalHandlers.has(event)){
            const handlers = this._generalHandlers.get(event);
            if(!handlers) return;

            if(handlers.has(callback)) return;

            handlers.add(callback);
            return;
        }

        const handlers: Set<Function> = new Set();
        handlers.add(callback);
        this._generalHandlers.set(event, handlers);
    }

    removeEventListener(event: HOOKMAN_EVENTS, callback: Function){
        if(this._generalHandlers.has(event)){
            const handlers = this._generalHandlers.get(event);
            if(!handlers) return;

            if(handlers.has(callback)) handlers.delete(callback);
        }
    }

    on(event: HOOKMAN_EVENTS, callback: Function){
        this.addEventListener(event, callback);
    }

    off(event: HOOKMAN_EVENTS, callback: Function){
        this.removeEventListener(event, callback);
    }

    publish(topic: string, message: any){
        // publish message to a channel
        this.send(message, undefined, topic);
    }

    subscribe(topic: string, topicHandler: Function){
        // subscribe to a channel
        if(this._topicHandlers.has(topic)){
            const topicHandlerSet = this._topicHandlers.get(topic);
            if(!topicHandlerSet){
                this.dispatchError(new Error('internal: undefined topichandlerSet'));
                return
            }
            if(topicHandlerSet.has(topicHandler)) return; // idempotent
            topicHandlerSet.add(topicHandler);
            return;
        }

        const topicHandlerSet: Set<Function> = new Set();
        topicHandlerSet.add(topicHandler);
        this._topicHandlers.set(topic, topicHandlerSet);

        const listenCommand = {
            id: Math.random() * 1000,
            type: "listen",
            channel: topic
        };

        this._socket.send(JSON.stringify(listenCommand));
    }

    unsubscribe(topic: string, topicHandler: Function){
        if(this._topicHandlers.has(topic)){
            const topicHandlerSet = this._topicHandlers.get(topic);
            if(!topicHandlerSet){
                this.dispatchError(new Error('internal: undefined topichandlerSet'));
                return
            }

            if(topicHandlerSet.has(topicHandler)) topicHandlerSet.delete(topicHandler);

            if(topicHandlerSet.size === 0){
                const unlistenCommand = {
                    id: Math.random() * 1000,
                    type: "unlisten",
                    channel: topic
                };
        
                this._socket.send(JSON.stringify(unlistenCommand));
            }
        }
    }

    broadcast(message: any){
        // broadcast a message to all connected clients
        this.send(message);
    }

    receiveBroadcastOn(){
        const broadcastCommand = {
            id: Math.random() * 1000,
            type: 'broadcast',
            broadcast: true
        };

        this._socket.send(JSON.stringify(broadcastCommand));
    }

    receiveBroadcastOff(){
        const broadcastCommand = {
            id: Math.random() * 1000,
            type: 'broadcast',
            broadcast: false
        };

        this._socket.send(JSON.stringify(broadcastCommand));
    }

    private dispatchEvent(event: HOOKMAN_EVENTS, ...parameters: any[]){
        const handlers = this._generalHandlers.get(event);
        if(!handlers) return;

        this.processSetOfhandlers(handlers, ...parameters);
    }

    private dispatchError(error: Error){
        const handlers = this._generalHandlers.get(HOOKMAN_EVENTS.ERROR);
        if(!handlers) return;

        this.processSetOfhandlers(handlers, error);
    }

    private async processSetOfhandlers(handlers: Set<Function>, ...parameters: any[]){
        for(let handler of handlers){
            await handler(...parameters);
        }
    }

    sendToClientToken(message: any, client_token: string){
        // verify client token
        this.send(message, client_token);
    }

    close(){
        this._socket.close();
    }

    send(message: any, client_token?: string, channel?: string){
        const payload: SendPayload = {
            id: Math.random() * 1000, // unused
            type: 'ccast',
            payload: message,
        };
        
        if(client_token){
            payload.client_token = client_token;
        }

        if(channel){
            payload.channel = channel;
        }

        try{
            const _payload = JSON.stringify(payload);
            this._socket.send(_payload);
        }
        catch(e){
            this.dispatchError(e);
        }
    }
}