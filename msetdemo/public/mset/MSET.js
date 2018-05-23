import msetDLL from './msetDLL.js'
export {MSET as default}


console.log("loading MSET")
// this creates the socket to the server and the MSET tree
// and add listeners to the textareas ...

class MSET {
  constructor(namespace,documentId,callback){
    this.socket = io(namespace)
    this.documentId = documentId
    this.msetId=-1;
    this.msetTree={};
    this.initSocket();
    this.callback = callback
  }

  exit() {
    this.socket.close()
  }

  initSocket(){
    const thisMSET = this;
    this.socket.on('msetId', function(msg){
      // here we listen to the server to get our msetId
      thisMSET.msetId=parseInt(msg.msetId);
      thisMSET.msetTree = new msetDLL(thisMSET.msetId,new Network(thisMSET));
      thisMSET.callback('init')
      thisMSET.msetTree.insertCallback =
          function(pos,elt,user){
              return thisMSET.callback('insert',pos,elt,user,thisMSET.msetId)
            }
      thisMSET.msetTree.deleteCallback =
          function(pos,elt,user){
              return thisMSET.callback('delete',pos,elt,user,thisMSET.msetId)
            }
      thisMSET.socket.emit('reset',{msetId:thisMSET.msetId,documentId:thisMSET.documentId})
    });

    this.socket.on('reset', function(msg){
      thisMSET.applyRemoteOps(msg.oplist)
    })

    this.socket.on('remoteOperation', function(msg){
      thisMSET.applyRemoteOp(msg);

    })
  }


    applyRemoteOps(oplist){
      for(let i = 0; i<oplist.length;i++){
        this.applyRemoteOp(oplist[i])
      }
    }

    applyRemoteOp(msg){
      if (msg.documentId!=this.documentId) return
      msg = msg.op
      // ignore insert and extend messages from self
      if (((msg.op=='extend'))&&(msg.nodeid[0]==this.msetId)){
        return;
      } else if ((msg.op=='insert') && (msg.un[0]==this.msetId)){
        return;
      }
      this.remoteOp=true; // temporarily ignore changes to the textarea as remote ops are processed
      this.msetTree.network.processRemoteOp(msg)
      //const newString = this.msetTree.strings.toString('','std')
      //this.ta.value = newString
      //this.lastValue = newString;
      this.remoteOp=false;

      return

    }

    sendOperationToServer(op){
      this.socket.emit('operation',
        {taId:this.taId,documentId:this.documentId, op:op});
    }

}



/* ************************************************************
 * This implements a network with a queue of incoming and outgoing
 * treeedit operations that can be performed by the clients ....
 * it creates a socket.io socket, and intializes it
 * When the server responds it creates an MSETtree to manage the list
 *
 */
class Network{
  constructor(msetSocket) {
    this.msetSocket = msetSocket
    this.allowIncoming=true
    this.allowOutgoing=true
    this.incomingQueue = []
    this.outgoingQueue = []
  }


  broadcast(op,un){
    this.outgoingQueue.push({op:op,un:un})
    this.broadcastAll()
  }


  broadcastAll(){

    if (this.allowOutgoing){
      for(let i=0;i<this.outgoingQueue.length;i++){

        this.broadcastOne(this.outgoingQueue[i])
      }
      this.outgoingQueue = []
    } else {
      document.getElementById("outgoingOps").innerHTML =
          JSON.stringify(this.outgoingQueue)
    }
  }

  broadcastOne(msg){
    const op=msg.op
    const un=msg.un  //we don't need this parameter, refactor ...
    var i;

    this.msetSocket.sendOperationToServer(op);
  }

  insert(vm,q,un,c) {
    var op = {op:"insert", nodeid:vm, q:q, un:un, c:c};
    this.broadcast(op,un);
  }

  extend(un,c) {
    var op = {op:"extend", nodeid:un, c:c};
    this.broadcast(op,un);
  }

  hide(vm,q,u) {
    var op = {op:"delete", nodeid:vm, q:q, u:u};  // refactor ... change this to hide
    this.broadcast(op,u);
  }


  processRemoteOp(msg){
    this.incomingQueue.push(msg)
    this.processAllRemoteOps()
  }

  processAllRemoteOps(){

    if (this.allowIncoming){
      for(let i=0;i<this.incomingQueue.length;i++){

        this.processOneRemoteOp(this.incomingQueue[i])
      }
      this.incomingQueue = []
    }else {
      document.getElementById("incomingOps").innerHTML =
          JSON.stringify(this.incomingQueue)
    }
  }

  processOneRemoteOp(msg){

    let z = ""
    const msetTree = this.msetSocket.msetTree;
        switch (msg.op){
      case 'insert':
         z = `REMOTE treeinsert([${msg.nodeid}],${msg.q},[${msg.un}],'${msg.c}')`
         msetTree.treeinsert(msg.nodeid,msg.q,msg.un,msg.c)
         break;
       case 'extend':
          z = `REMOTE treeextend([${msg.nodeid}],'${msg.c}')`
          msetTree.treeextend(msg.nodeid,msg.c)
          break;
      case 'delete':
         z = `REMOTE treehide([${msg.nodeid}],${msg.q},${msg.u})`
         msetTree.treehide(msg.nodeid,msg.q,msg.u)
         break;
      default: throw new Error("unknown remote op: "+JSON.stringify(msg))
    }

  }

}


window.MSET=MSET
window.Network = Network
