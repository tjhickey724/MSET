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
  constructor(socket,documentId,callback,initElements){
    this.initElements = initElements || []
    this.socket = socket
    this.documentId = documentId
    this.msetId=-1;
    this.msetTree={};
    this.initSocket();
    this.callback = callback

    //this is needed for garbage collection
    this.gcThreshold = 10000
    this.gcThresholdMin = 10000
    this.gcMode = false
    this.gcRequest = false
    this.gcCounter=0
    this.numPeers = 0

  }

  insert(pos,c){
    return this.msetTree.insert(pos,c)
  }

  delete(pos){
    return this.msetTree.delete(pos)
  }

  size(feature){
    return this.msetTree.size(feature)
  }

  get info(){
    return {treeHeight:this.msetTree.strings.tln.height}
  }

  toString(a,b){
    return this.msetTree.toString(a,b)
  }

  toList(feature){
    feature = feature || 'std'
    let z =  this.msetTree.strings.toList(feature)
    let result=[]
    for(let i=0; i<z.length;i++){
      result=result.concat(z[i].toList())
    }
    return result
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
      thisDDLL.msetTree = new DLLmset(thisDDLL.msetId,new Network(thisDDLL),thisDDLL.initElements);
      thisDDLL.callback('init')
      //console.log('initial tree is '+thisDDLL.msetTree.strings.toList('std'))
      //console.log('elements = '+JSON.stringify(this.initElements))
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
      //console.log(`\n\n${thisDDLL.msetId} applying remote op ${JSON.stringify(msg)}`)
      thisDDLL.applyRemoteOp(msg);

    })
  }


    applyRemoteOps(oplist){
      for(let i = 0; i<oplist.length;i++){
        this.applyRemoteOp(oplist[i])
      }
    }

    applyRemoteOp(msg){
      //console.log('applyRemoteOp(msg),this->'+JSON.stringify(msg))
      if ((msg.op=='gc')&& !this.gcMode) {
        // ignore all but the first gc requests .
        //console.log('applyRemoteOp(gc),this->'+JSON.stringify(msg))
        //console.dir(['applyRemoteOp(gc)->',msg,this])
        this.enterGCmode(msg.numPeers)
        return
      } else if (msg.op=='gcAck'){
        //console.log(`${this.msetId} applyRemoteOp(gcAck),this->`+JSON.stringify(msg))
        //console.dir(['applyRemoteOp(gcAck)->',msg,this])
        this.enterGCmode(msg.numPeers)
        this.countGC(msg.numPeers)
      }
      //console.log("in applyRemote Op "+msg); console.dir(msg)
      if (msg.documentId!=this.documentId) return
      msg = msg.op

      // ignore insert and extend messages from self
      /*
      if (((msg.op=='extend'))&&(msg.nodeid[0]==this.msetId)){
        return;
      } else if ((msg.op=='insert') && (msg.un[0]==this.msetId)){
        return;
      }
      */
      this.remoteOp=true; // temporarily ignore changes to the textarea as remote ops are processed
      this.msetTree.network.processRemoteOp(msg)
      //const newString = this.msetTree.strings.toString('','std')
      //this.ta.value = newString
      //this.lastValue = newString;
      this.remoteOp=false;

      return

    }

    sendOperationToServer(op){
      //console.log(`DDLL: ${this.msetId} sendOptoServer:${JSON.stringify(op)}`)
      this.socket.emit('operation',
        {taId:this.taId,documentId:this.documentId, op:op});
      if (!this.gcMode && !this.gcRequest&& (this.msetTree.size('edit')>this.gcThreshold)){
        //console.log('********** GARBAGE COLLECTION!********')
        //console.log(`${this.msetId} is initiating gc`)
        //console.log(`${this.msetTree.size('edit')}>${this.gcThreshold}`)
        let N=this.size('std')
        let W = Math.log(N)-Math.log(Math.log(N)) + Math.log(Math.log(N))/Math.log(N)
        let A = N/W
        console.log(`gcThreshold was ${this.gcThreshold} and is now N/W =min(${A},${this.gcThresholdMin} where `+
            `W=${W} log(N/W)=${Math.log(N/W)}`)
        //this.gcThreshold = Math.min(A,this.gcThresholdMin)
        this.gcRequest = true
        this.sendOperationToServer('gc')
      }
    }

    gcWait(){
      //console.log("DDLL: gcWait")
      //this.sendOperationToServer('gcWait')
    }

    countGC(numPeers){
      this.gcCounter += 1
      this.numPeers = numPeers
      //console.log(`DDLL: ${this.msetId} in gcMode`+` counter=${this.gcCounter}`+` numPeers=${this.numPeers}`)

      if (this.gcCounter >= this.numPeers) {
        // everything has syncrhonized
        //console.dir(this)
        //console.log(`DDLL: ${this.msetId} is synchronized ${this.gcCounter} ${this.numPeers} .. gcing`)
        this.msetTree = this.msetTree.copy()
        this.gcMode=false
        this.gcAck=false
        this.gcRequest=false
        this.msetTree.gcMode = false
        this.gcCounter = 0
        //console.log('oplist = \n'+JSON.stringify(this.socket.server.delayList))

        window.debugging.ddll = window.debugging.ddll || []
        window.debugging.ddll[this.msetId]=this
      }
    }

    enterGCmode(numPeers){
      if (!this.gcMode){
        //console.log(`DDLL: ${this.msetId} Entering gcMode numPeers=${numPeers}`)
        this.gcMode = true
        this.msetTree.gcMode = true
        this.numPeers = numPeers
        //console.log(`${this.msetId} sending gcAck`)
        this.sendOperationToServer('gcAck')
      }
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
    this.inTransitQueue = []
    this.userid = this.msetSocket.msetId

    this.incomingOps = []
    this.outgoingOps = []
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
    this.inTransitQueue.push(op)
    this.outgoingOps.push(op)
/*
    if (this.userid==1){
      console.log(`${this.userid} pushing \n${JSON.stringify(op)}`)
    }
    */
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

  gcWait(){
    this.msetSocket.gcWait()
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
    /*
    if (this.userid==1){
      console.log('REMOTE\n'+JSON.stringify(msg));
    }*/
    this.incomingOps.push(msg)
    /*
    console.log('just pushed in pro')
    console.dir([msg, this,this.incomingOps])

    //console.dir(msg)
    //console.dir(this)
    */
    if (isOwner(msg,this.userid)) {
      this.inTransitQueue = removeOp(msg,this.inTransitQueue)
      //if (this.userid==1){
      //  console.log('removing\n'+JSON.stringify(msg)+' from itq for '+this.userid)
      //}
      return // don't handle our own ops ..
    }


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

function isOwner(op,user){
  // this tests if the user owns the Edit op
  //console.log('in isOwner '+user+" "+JSON.stringify(op))
  const result =
     ( ((op.op == 'insert') &&  (op.un[0]==user))
       ||
       ((op.op == 'extend') && (op.nodeid[0]==user))
       ||
       ((op.op == 'delete') && (op.u == user)) )
  //if (user==1){
  //  console.log('in isOwner: '+result+' '+user+" "+JSON.stringify(op))
  //}
  return result
}

function removeOp(op,oplist){

  let newList = []
  let found = false
  const opString = JSON.stringify(op)
  for(let i=0; i<oplist.length; i++){
    if (opString!=JSON.stringify(oplist[i])) {
      newList.push(oplist[i])
    } else {
      found=true
    }
  }
  if (!found){
    console.log('bug in remove Op')
    console.log(JSON.stringify([op,oplist]))
  }
  return newList

}

window.DDLL=DDLL
window.Network = Network
