export {TestServer,TestSocket}

/*
This file is to test the correctness of the DDLLmset Implementation
We create our own TestSocket and TestServer objects which simulate
a broadcast network...

the socket is an object with three methods called by the DDLLmset object
// socket.close()
// socket.emit(obj)
// socket.on('msetId',function(msetId){....})
// socket.on('reset',function({oplist:[....]}){....})
// socket.on('remoteOperation',function(op){....})
the DDLL broadcasts messages by calling emit.
It also provides callbacks for the three other messages

*/
console.log("loading the TestServer and TestSocket classes")

class TestServer{
  constructor(){
    this.socketList = []
    this.oplist=[]
    this.delayFlag = true
    this.delayList=[]
    this.delaySteps=0
  }

  setDelay(k){
    this.delaySteps=k
  }

  shuffle(){
    shuffleList(this.delayList)
  }

  delay(){
    //console.log('delaying ops')
    this.delayFlag = true
  }

  release(k){

    //console.log(`sending ${k} delayed ops`)
    //console.log(`delayList has ${this.delayList.length} elements`)
    //this.delayFlag = false
    let maxListSize = this.delaySteps*this.socketList.length
    let gap =  (maxListSize - this.delayList.length)
    while (gap>0) {
      this.delayList.push('noop')
      gap--
    }
    //console.log(`gap=${gap} k=${k} ${this.delayList.length}`)
    //this.visualizeDelayList(k)
    //console.log('server emitting')
    if(!k) {
      maxListSize=0
    }
    while (this.delayList.length > maxListSize){
          const op = this.delayList.shift()
          if (op!='noop'){
            this.emitNow(op)
          }
    }
  }

  visualizeDelayList(k){
    console.log("\n*****\nDelay List:\n")
    for(let i=0;i<this.delayList.length;i++){
      console.log(`${i} -- ${this.visualizeEditOp(this.delayList[i])}`)
      if (i==k-1){
        console.log("still in transit")
      }
    }
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

  connect(socket){
    this.socketList.push(socket)
    //console.log('this.socketList= ')
    //console.dir(this.socketList)
    let newId = this.socketList.length
    //  console.log('sending msetId message with value '+newId)
    socket.callbacks.msetId({msetId:newId})
    socket.id = newId
    socket.callbacks.reset({oplist:this.oplist})

  }

  disconnect(socket){
    const i = this.socketList.indexOf(socket)
    this.socketList = this.socketList.splice(i,1)
  }

  emit(obj){
    //console.log("Server is emitting the object "+JSON.stringify(obj))
    if (this.delayFlag){
      this.delayList.push(obj)
      //console.log(`server delaying ${JSON.stringify(obj)}`)
    } else {
      this.emitNow(obj)
    }

  }

  emitNow(obj){
    if (!obj){

      throw new Error("trouble in emit")
    } else if (obj=='noop'){
      //console.log(`server ignoring 'noop'`)
    } else {
      //console.log(`server broadcasting ${JSON.stringify(obj)}`)
      this.socketList.forEach((s)=>(s.callbacks.remoteOperation(obj)))
      this.oplist.push(obj)
    }
  }

}

class TestSocket{
  constructor(){
    this.server = null
    this.generation = 0
    let socket = this

    this.callbacks= // these are the default callbacks ..
    {
      msetId:function(msg){
        socket.id=msg.msetId
        //console.log("just got an init message: "+msg.msetId)
      },
      reset:function(ops){
        //console.log(socket.id+ " received reset with \n"+JSON.stringify(ops))
      },
      remoteOperation: function(op){
        //console.log(socket.id+ " received remoteOperation with \n"+JSON.stringify(op))
      }
    }


  }

  connect(server){
    //console.log("connecting to server")
    this.server = server
    server.connect(this)
  }

  close(){
    //console.log("socket is closed")
    this.server.disconnect(this)
  }

  on(msg,callback){
    //console.log("client "+this.id+" storing callback for "+msg);console.dir([this,callback])

    this.callbacks[msg] = callback
  }

  emit(op,obj){

    //console.log(arguments)
     if (op=="operation"){
       if (obj.op=="gcWait"){
         //console.log(`SOCKET: client ${this.id} reseting with oplistlength= ${JSON.stringify(this.server.oplist.length)} with op=${op}`)
         this.server.emit('noop')
       } else if (obj.op=="gc"){
         //console.log("SOCKET: just got a gc message!")
         obj.numPeers = this.server.socketList.length
         this.server.emit(obj)
         // I really should move this to the server and make the TestSocket truly local....
       } else if (obj.op=="gcAck"){
         //console.log("SOCKET: just got a gcAck message!")
         obj.numPeers = this.server.socketList.length
         this.server.emit(obj)
         // I really should move this to the server and make the TestSocket truly local....
       } else {
         //console.log(`SOCKET: client ${this.id} emitting obj= ${JSON.stringify(obj)} with op=${op}`)
         this.server.emit(obj)
       }

    } else if (op=="reset"){
      //console.log(`client ${this.id} reseting with oplist= ${JSON.stringify(this.oplist)} with op=${op}`)
      this.callbacks.reset({oplist:this.server.oplist})
    } else  if (op=="gcAck"){
      //console.log("SOCKET: just got a gcAck message!")
      this.server.emit({op:"gcAck",numPeers:this.server.socketList.length})
      this.gcCounter++
      throw new Error("in Socket.emit(gcAck,obj)")
      if (this.gcCounter==this.server.socketList.length){
        this.generation++
        //console.log("SOCKET:: all clients have acknowledged receiving gc. Gen="+this.generation)

        this.gcCounter=0
      }
    } else {
      console.log("unknown message: "+JSON.stringify([op,obj]))
    }
  }
  // socket.on('msetId',function(msetId){....})
  // socket.on('reset',function({oplist:[....]}){....})
  // socket.on('remoteOperation',function(op){....})

}

function shuffleList(a,b,c,d){//array,placeholder,placeholder,placeholder
 c=a.length;while(c)b=Math.random()*(--c+1)|0,d=a[c],a[c]=a[b],a[b]=d
}


window.TestSocket = TestSocket
window.TestServer = TestServer
