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
  }

  connect(socket){
    this.socketList.push(socket)
    console.log('this.socketList= ')
    console.dir(this.socketList)
    let newId = this.socketList.length
    console.log('sending msetId message with value '+newId)
    socket.callbacks.msetId({msetId:newId})
    socket.id = newId
    socket.callbacks.reset({oplist:this.oplist})

  }

  disconnect(socket){
    const i = this.socketList.indexOf(socket)
    this.socketList = this.socketList.splice(i,1)
  }

  emit(obj){
    console.log("Server is broadcasting the object "+JSON.stringify(obj))
    this.socketList.forEach((s)=>(s.callbacks.remoteOperation(obj)))
    this.oplist.push(obj)
  }

}

class TestSocket{
  constructor(){

    let socket = this
    this.callbacks= // these are the default callbacks ..
    {
      msetId:function(msg){
        socket.id=msg.msetId
        console.log("just got an init message: "+msg.msetId)
      },
      reset:function(ops){
        console.log(socket.id+ " received reset with \n"+JSON.stringify(ops))
      },
      remoteOperation: function(op){
        console.log(socket.id+ " received remoteOperation with \n"+JSON.stringify(op))
      }
    }


  }

  connect(server){
    console.log("connecting to server")
    this.server = server
    server.connect(this)
  }

  close(){
    console.log("socket is closed")
    this.server.disconnect(this)
  }

  on(msg,callback){
    console.log("client "+this.id+" storing callback for "+msg);console.dir([this,callback])

    this.callbacks[msg] = callback
  }

  emit(op,obj){

    console.log(arguments)
    if (op=="operation"){
      console.log(`client ${this.id} emitting obj= ${JSON.stringify(obj)} with op=${op}`)
      this.server.emit(obj)
    } else if (op=="reset"){
      console.log(`client ${this.id} reseting with oplist= ${JSON.stringify(this.oplist)} with op=${op}`)
      this.callbacks.reset({oplist:this.server.oplist})
    } else {
      console.log("unknown message: "+JSON.stringify([op,obj]))
    }


  }



  // socket.on('msetId',function(msetId){....})
  // socket.on('reset',function({oplist:[....]}){....})
  // socket.on('remoteOperation',function(op){....})

}



window.TestSocket = TestSocket
window.TestServer = TestServer
