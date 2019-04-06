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
// It also passes the callback into DLLmset so that whenever a local (insert) is processed
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
  constructor(initElements,callback,socket,documentId){
    this.initElements = initElements || []
    const socketStub = {close:()=>('nosocket'),on:()=>('nosocket'),emit:()=>('nosocket')}
    this.socket = socket || socketStub
    this.documentId = documentId || 'doc0'
    this.msetId=-1;
    this.msetTree={};
    this.initSocket();
    this.callback = callback

    //this is needed for garbage collection
    this.gcType = 'serialized'  // none, p2p, or serialized
    this.gcThreshold = 10000
    this.gcThresholdMin = 10000
    this.gcMode = false
    this.gcRequest = false
    this.gcCounter=0
    this.numGCs = 0
    this.numPeers = 0



    this.generation=0

    window.ddll = window.ddll || {}
    window.ddll['a']=this
    window.debugthis = this


  }

  insert(pos,c){
    console.log('in ddll.insert('+pos+','+c+')')
    console.dir(this)
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
      //console.log('\n\n'+this.msetId+'applyRemoteOp(msg),this->'+JSON.stringify(msg))
      //console.log('current string:\n'+JSON.stringify(this.toList('std')))
      //console.log(`current generation = ${this.generation}`)
      if (msg.generation < this.generation) {
        //console.log("Skipping old generation remote op")
        //console.log(JSON.stringify(msg))
        return
      }
      //console.log("in applyRemote Op "+msg); console.dir(msg)
      if (msg.documentId!=this.documentId) return

      if (msg.op=='gc'){
        //console.dir([msg,this])
        if ((this.gcType=='p2p')&& !this.gcMode) {
          // ignore all but the first gc requests .
          //console.log('applyRemoteOp(gc),this->'+JSON.stringify(msg))
          //console.dir(['applyRemoteOp(gc)->',msg,this])
          this.enterGCmode(msg.numPeers)
          return
        } else {
          // serialized case
          //console.dir([msg,this])
          //console.log(this.msetId+' -- SAW a gc ... start the Serialized GC process!')
          if ((this.gcType=='serialized') && (this.generation==msg.generation)){
            this.serializedGC()
          }
          return
        }
      } else if (msg.op=='gcAck'){
          //console.dir([msg,this])
          if ((this.gcType=='p2p')) {
            //console.log(`${this.msetId} applyRemoteOp(gcAck),this->`+JSON.stringify(msg))
            //console.dir(['applyRemoteOp(gcAck)->',msg,this])
            this.enterGCmode(msg.numPeers)
            this.countGC(msg.numPeers)
            return
          }else {
            return
          }

      }



      this.remoteOp=true; // temporarily ignore changes to the textarea as remote ops are processed
      this.msetTree.network.processRemoteOp(msg)
      this.remoteOp=false;
      //console.log('After applying remote opcurrent string:\n'+JSON.stringify(this.toList('std')))

      return
    }

    serializedGC(){
      let inTransitOps = this.msetTree.network.inTransitQueue;
      console.log(`itq size: ${inTransitOps.length}`)
      this.msetTree.network.inTransitQueue = []

      //console.log("ito=\n"+JSON.stringify(inTransitOps))
      for(let i=0; i<inTransitOps.length; i++){
        //console.log(`op[${i}] = ${this.visualizeEditOp(inTransitOps[i])}`)
      }
      //console.log('current string:\n'+JSON.stringify(this.toList('std')))
      //console.log('current edit tree:\n'+JSON.stringify(this.toList('edit')))
      window.debugging={ddll:this}
      const numOps = inTransitOps.length
      let stringOps=[]
      for (let i=0; i<numOps; i++){
        //console.log(`i=${i} L=${inTransitOps.length}`)
        stringOps.push(this.undoEditOp(inTransitOps[numOps-1-i]))
        //console.log('current string:\n'+JSON.stringify(this.toList('std')))
        //console.log('current edit tree:\n'+JSON.stringify(this.toList('edit')))
        //console.log(`end of loop body ${i} L=${inTransitOps.length}\n\n\n`)
      }
      this.oldTree = this.msetTree
      this.msetTree = this.msetTree.copy()
      this.gcMode=false
      this.gcAck=false
      this.gcRequest=false
      //console.log('setting gcRequest to false:'+this.gcRequest)
      this.msetTree.gcMode = false
      this.gcCounter = 0
      this.numGCs++
      //console.log('Synchronized String ...')
      //console.log('current string:\n'+JSON.stringify(this.toList('std')))

      //console.log("String Ops:")
      //console.dir(stringOps)
      this.generation++
      for (let i=stringOps.length-1; i>=0; i--) {
        //console.log(`op[${i}] = ${JSON.stringify(stringOps[i])}`+` -- ${this.visualizeEditOp( inTransitOps[numOps-1-i])}`)
        this.applyStringOp(stringOps[i])
      }
      //console.log('After applying StringOps to Synchronized String ...')
      //console.log('current string:\n'+JSON.stringify(this.toList('std')))
      //console.log('\n\n\n\n')


      //throw new Error("time to debug!")
    }

    applyStringOp(e){
      //console.log('reapplying '+JSON.stringify(e)+' to ')
      //console.log('current string:\n'+JSON.stringify(this.toList('std')))
      switch(e.op){
        case 'delete':
            this.msetTree.delete(e.offset)
            //applyDelete(e);
            break;
        case 'insert':
            this.msetTree.insertList(e.offset,e.chars)
            //applyInsert(e);
            break;
        case 'noop':
            // this corresponds to a deletion collision which is ignored
            break;
        default: console.dir(e);
          throw new Error(`unknown stringop ${e}`)
      }
      //console.log('to get:\n'+JSON.stringify(this.toList('std')))
    }

    undoEditOp(e){
      //console.log('undoing '+this.visualizeEditOp(e))
      //console.dir(e)
      //console.log(`listsize before undoing op ${this.size('std')}`)
      let stringOp=null
      switch(e.op){
        case 'delete': stringOp = this.undoDelete(e); break;
        case 'extend': stringOp =  this.undoExtend(e); break;
        case 'insert': stringOp =  this.undoInsert(e); break;
      }
      //console.log(JSON.stringify(stringOp))
      //console.log(`listsize after undoing op ${this.size('std')}`)
      return stringOp
    }

    undoDelete(e){
      //console.log(`undoing delete: `+this.visualizeEditOp(e))
      const element = this.msetTree.nodes[e.nodeid].subnodes.nth(e.q,'rev').hiddenData
      //console.log(`element = ${element} listsize = ${this.size('std')}`)
      //console.dir(element)
      const offset = element.listNode.indexOf('std')
      const chars = element.userData()
      const op = 'delete'
      let stringOp = {}
      if (element.deletedBy==this.msetId){
        element.vis = true
        element.rebalance()
        stringOp = {op,offset,chars}
      } else {
        //console.log(`not undoing a collision delete!`)
        stringOp = {op:'noop'}
        // another user also deleted this before the gc marker!
      }
      //console.log(`after delete -- listsize = ${this.size('std')}`)
      return stringOp

    }
    undoExtend(e){
      //console.log(`undoing extend: `+this.visualizeEditOp(e))
      //console.dir(e)
      const element = this.msetTree.nodes[e.nodeid].subnodes.last.prev.hiddenData
      element.size = element.size - e.c.length
      element.treeNode.elts
        = element.treeNode.elts.slice(0,element.treeNode.elts.length-e.c.length)
      element.rebalance()
      const offset = element.listNode.indexOf("std")+element.size
      const chars = e.c
      const op = 'insert'
      const stringOp = {op,offset,chars}
      //console.dir(element)
      if ((element.size==0) && (element.iset==null)) {
        //console.log('removing subnode from subnodes and strings')
        element.listNode.delete()
        element.listSubnode.delete()
      }
      return stringOp
    }
    undoInsert(e){
      //console.log(`undoing insert: `+this.visualizeEditOp(e))
      // first find the isetListNode to remove it from the iset tree

      const parentNode = this.msetTree.nodes[e.nodeid]
      let parent = null
      if (parentNode.elts.length == e.q) {
        // this is the case where we are inserting at the end of a node we don't own
        parent = parentNode.subnodes.last.prev.hiddenData
      } else {
        parent = parentNode.subnodes.nth(e.q,'rev').hiddenData
      }

      const target = this.msetTree.nodes[e.un]
      const isetListNode = parent.iset.bst.tln.binarySearch(target,parent.iset.bst.comparator)
      const offset = target.start.listNode.indexOf('std')
      const chars = target.elts
      const op = 'insert'
      const stringOp = {op,offset,chars}
      isetListNode.delete()
      if (parent.iset.bst.size()==0) {
        //console.log(`iset is empty so we are setting it to null`)
        parent.iset = null
        if (parent.size==0) {
          //console.log(`parent is empty, so we are deleting it`)
          //console.dir(parent)
          parent.delete()
        }
      }

      //console.dir(target)
      //console.log(`removing the start and end markers`)
      target.start.delete()
      target.end.delete()
      //console.log(`removing the targets subnode from the msetTree`)
      let pos = target.subnodes.first.next
      while (pos!=target.subnodes.last){
        pos.hiddenData.delete()
        pos = pos.next
      }
      //console.log(`insert has been undone!`)
      return stringOp
    }

    visualizeEditOp(e){
      if (e=='noop'){
        return 'noop'
      } else if (e.op=='insert'){
        return `U${e.un[0]}: I${e.nodeid[0]}:${e.nodeid[1]}(${e.q},<${e.un[0]}:${e.un[1]} ${e.c} ${e.un[0]}:${e.un[1]} >)`
      } else if (e.op=='delete'){
        return `U${e.u}: D${e.nodeid[0]}:${e.nodeid[1]}(${e.q})`
      } else if (e.op=='extend'){
        return `U${e.nodeid[0]}: E${e.nodeid[0]}:${e.nodeid[1]}(${e.q}, ${e.c})`
      } else {
        return 'Unknown edit op:\n'+JSON.stringify(e)
      }
    }

    sendOperationToServer(op){
      /*
        This wraps up an op in a larger object containing the documentId property
        This allows one socket to handle multiple DDLL's

      */
    //  console.log(`DDLL: ${this.msetId} sendOptoServer:${JSON.stringify(op)}`)
      op.documentId = this.documentId // add the documentId to the op
      op.generation = this.generation
      this.socket.emit('operation',op)

      const garbage  = this.msetTree.size('edit')-this.msetTree.size('rev')

      if ((this.gcType!='none')&&
          !this.gcMode &&
          !this.gcRequest&&
          (garbage>this.gcThreshold)){
        console.log('********** GARBAGE COLLECTION!********')
        console.log(window.performance.memory)
        //console.log(`${this.msetId} is initiating gc`)
        //console.log(`${garbage}>${this.gcThreshold}`)
        let N=this.size('std')
        let W = Math.log(N)-Math.log(Math.log(N)) + Math.log(Math.log(N))/Math.log(N)
        let A = N/W
        //console.log(`gcThreshold was ${this.gcThreshold} and is now N/W =min(${A},${this.gcThresholdMin} where `+`W=${W} log(N/W)=${Math.log(N/W)}`)
        //this.gcThreshold = Math.min(A,this.gcThresholdMin)
        this.gcRequest = true
        //console.log('setting gcRequest to true:'+this.gcRequest)
        this.sendOperationToServer({op:'gc',documentId:this.documentId, generation:this.generation})
      } else if (this.msetTree.size('edit')>this.gcThreshold) {
        //console.log(`gc triggered: ${this.msetTree.size('edit')}`)
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
        //console.log('setting gcRequest to false:'+this.gcRequest)
        this.msetTree.gcMode = false
        this.gcCounter = 0
        this.numGCs++
        this.generation++
        //console.log('oplist = \n'+JSON.stringify(this.socket.server.delayList))


        //console.dir(this)
      }
    }

    enterGCmode(numPeers){
      if (!this.gcMode){
        //console.log(`DDLL: ${this.msetId} Entering gcMode numPeers=${numPeers}`)
        this.gcMode = true
        this.msetTree.gcMode = true
        this.numPeers = numPeers
        //console.log(`${this.msetId} sending gcAck`)
        this.sendOperationToServer({op:'gcAck'})
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
      //document.getElementById("outgoingOps").innerHTML =JSON.stringify(this.outgoingQueue)
    }
  }

  broadcastOne(msg){
    const op=msg.op
    const un=msg.un  //we don't need this parameter, refactor ...
    var i;
    //console.log(`${this.userid} is pushing ${JSON.stringify(op)} onto inTransitQ`)
    this.inTransitQueue.push(op)
    //this.outgoingOps.push(op)
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
    //this.incomingOps.push(msg)
    /*
    console.log('just pushed in pro')
    console.dir([msg, this,this.incomingOps])

    //console.dir(msg)
    //console.dir(this)
    */
    if (isOwner(msg,this.userid)) {
      //console.log(`${this.userid} is popping ${JSON.stringify(msg)} from inTransitQueue`)
      this.inTransitQueue = removeOp(msg,this.inTransitQueue)
      //if (this.userid==1){
      //  console.log('removing\n'+JSON.stringify(msg)+' from itq for '+this.userid)
      //}
      return // don't handle our own ops ..
    }


    msetTree.processRemoteOp(msg); return


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
