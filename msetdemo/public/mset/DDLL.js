import {DLLmset} from './DLLmset.js'
export {DDLL,Network}


console.log("loading MSET")
// this creates an io socket on a namespace
// and creates a new DLLmset object when it gets an 'init' message on the socket
// The server sends an 'init' message to every new connection, followed by a
// 'reset' message with a list of all treeops generates so far.
// It then simply broadcasts all ops it receives from any client to all other clients.
// and saves a copy in the list that it uses to bring late joiners up to date.
//
// The socket can be sending information about many different documents
// and this only listens to the messages about the one specified by documentId
//
// It is also passed a callback function callback
// When the io socket receives an 'init' message it calls
//     callback('init')
// It also passes the callback into DLLmset so that whenever a local insert is processed
// DLLmset will call
//     callback('insert',pos,elt,user,thisDDLL.msetId)
// and when a local delete is processed it will call
//     callback('delete',pos,elt,user,thisDDLL.msetId)
// This callback is used to appropriately handle local inserts and deletes
// Note that inserts and deletes from the user themself are ignored when they
// return from the server.
//
// the socket is an object with three methods
// socket.close()
// socket.emit(obj)
// socket.on('msetId',function(msetId){....})
// socket.on('reset',function({oplist:[....]}){....})
// socket.on('remoteOperation',function(op){....})
// where it will call the appropriate function when it receives the specified message


class DDLL {
  constructor(socket,documentId,callback){
    this.socket = socket
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
    const thisDDLL = this;
    //console.log("initializing the socket")
    this.socket.on('msetId', function(msg){
      // here we listen to the server to get our msetId
      thisDDLL.msetId=parseInt(msg.msetId);
      //console.log("responding to msetId message: "+msg.msetId+" type is "+typeof(msg.msetId))
      //console.dir(arguments)
      thisDDLL.msetTree = new DLLmset(thisDDLL.msetId,new Network(thisDDLL));
      thisDDLL.callback('init')
      thisDDLL.msetTree.insertCallback =
          function(pos,elt,user){
              return thisDDLL.callback('insert',pos,elt,user,thisDDLL.msetId)
            }
      thisDDLL.msetTree.deleteCallback =
          function(pos,elt,user){
              return thisDDLL.callback('delete',pos,elt,user,thisDDLL.msetId)
            }
      thisDDLL.socket.emit('reset',{msetId:thisDDLL.msetId,documentId:thisDDLL.documentId})
    });

    this.socket.on('reset', function(msg){
      //console.log("applying Remote Ops of a reset!")
      //console.dir(msg)
      thisDDLL.applyRemoteOps(msg.oplist)
    })

    this.socket.on('remoteOperation', function(msg){
      thisDDLL.applyRemoteOp(msg);

    })
  }


    applyRemoteOps(oplist){
      for(let i = 0; i<oplist.length;i++){
        this.applyRemoteOp(oplist[i])
      }
    }

    applyRemoteOp(msg){
      //console.log("in applyRemote Op "+msg); console.dir(msg)
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
 * It is passed an msetSocket object s which
 *     1) has a DLLmset object called s.msetTree
 *     2) has a method s.sendOperationToServer(op)
 * where the op is a JSON object taking one of the following three forms
 *    {op:"insert", nodeid:vm, q:q, un:un, c:c};
 *    {op:"extend", nodeid:un, c:c};
 *    {op:"delete", nodeid:vm, q:q, u:u};
 * where vm = [v,m] is a userid v and a node count m
 *       un = [u,n] is the owners user id u and a node count n
 *        q = a position in the node with id vm
 *        c = a character to insert into the node
 *
 * It is called by DDLL which creates a socket.io socket, and intializes it
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

  extend(un,q,c) {
    var op = {op:"extend", nodeid:un, q:q, c:c};
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
    msetTree.processRemoteOp(msg); return
        switch (msg.op){
      case 'insert':
         z = `REMOTE treeinsert([${msg.nodeid}],${msg.q},[${msg.un}],'${msg.c}')`
         msetTree.treeinsert(msg.nodeid,msg.q,msg.un,msg.c)
         break;
       case 'extend':
          z = `REMOTE treeextend([${msg.nodeid}],${msg.q},'${msg.c}')`
          msetTree.treeextend(msg.nodeid,msg.q,msg.c)
          break;
      case 'delete':
         z = `REMOTE treehide([${msg.nodeid}],${msg.q},${msg.u})`
         msetTree.treehide(msg.nodeid,msg.q,msg.u)
         break;
      default: throw new Error("unknown remote op: "+JSON.stringify(msg))
    }


  }

}


window.DDLL=DDLL
window.Network = Network
