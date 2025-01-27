import Peer, {DataConnection} from "peerjs";
import {message} from "antd";

export enum DataType {
    FILE = 'FILE',
    OTHER = 'OTHER'

}
export interface Data {
    totalSize: number;
    dataType: DataType
    file?: Blob
    fileName?: string
    fileType?: string
    message?: string
}

let peer: Peer | undefined
let connectionMap: Map<string, DataConnection> = new Map<string, DataConnection>()

export const PeerConnection = {
    getPeer: () => peer,
    startPeerSession: () => new Promise<string>((resolve, reject) => {
        try {
            peer = new Peer()
            peer.on('open', (id) => {
                console.log('My ID: ' + id)
                resolve(id)
            }).on('error', (err) => {
                console.log(err)
                message.error(err.message)
            })
        } catch (err) {
            console.log(err)
            reject(err)
        }
    }),
    closePeerSession: () => new Promise<void>((resolve, reject) => {
        try {
            if (peer) {
                peer.destroy()
                peer = undefined
            }
            resolve()
        } catch (err) {
            console.log(err)
            reject(err)
        }
    }),
    connectPeer: (id: string) => new Promise<void>((resolve, reject) => {
        if (!peer) {
            reject(new Error("Peer doesn't start yet"))
            return
        }
        if (connectionMap.has(id)) {
            reject(new Error("Connection existed"))
            return
        }
        try {
            let conn = peer.connect(id, {reliable: true})
            if (!conn) {
                reject(new Error("Connection can't be established"))
            } else {
                conn.on('open', function() {
                    console.log("Connect to: " + id)
                    connectionMap.set(id, conn)
                    resolve()
                }).on('error', function(err) {
                    console.log(err)
                    reject(err)
                })
            }
        } catch (err) {
            reject(err)
        }
    }),
    onIncomingConnection: (callback: (conn: DataConnection) => void) => {
        peer?.on('connection', function (conn) {
            console.log("Incoming connection: " + conn.peer)
            connectionMap.set(conn.peer, conn)
            callback(conn)
        });
    },
    onConnectionDisconnected: (id: string, callback: () => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet")
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist")
        }
        let conn = connectionMap.get(id);
        if (conn) {
            conn.on('close', function () {
                console.log("Connection closed: " + id)
                connectionMap.delete(id)
                callback()
            });
        }
    },
    sendConnection: (id: string, data: Data): Promise<void> => new Promise((resolve, reject) => {
        if (!connectionMap.has(id)) {
            reject(new Error("Connection didn't exist"))
        }
        try {
            let conn = connectionMap.get(id);
            if (conn) {
                conn.send(data)
            }
        } catch (err) {
            reject(err)
        }
        resolve()
    }),
    onConnectionReceiveData: (id: string, callback: (data: Data, progress: ProgressEvent<EventTarget> | null) => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet");
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist");
        }
        let conn = connectionMap.get(id);
        if (conn) {
            conn.on('data', function (receivedData: unknown) {
                // Use a type assertion to tell TypeScript that receivedData is of type Data
                const data = receivedData as Data;
                console.log("Receiving data from " + id);
                // Assuming 'progress' is not part of the 'Data' type and needs to be handled separately
                // You might need to adjust this part based on how you're tracking progress
                // For example, if progress is tracked separately, you might not need to pass it to the callback
                callback(data, null); // Pass null or a default ProgressEvent if progress is not applicable here
            });
        }
    }
    
}