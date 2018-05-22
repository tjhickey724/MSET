import MSETtree from './MSETtree.js'
export {MSETsocket as default}


console.log("loading MSETsocket")
// this creates the socket to the server and the MSET tree
// and add listeners to the textareas ...

class MSETsocket{

  constructor(namespace, taId, fileId){
    this.socket = io(namespace)
    this.taId = taId
    this.fileId = (fileId || 'default')
    this.ta = document.getElementById(taId)
    this.msetId=-1;
    this.msetTree={};
    this.lastValue = ""
    this.remoteOp = false;
    this.initSocket();
    this.ta.readOnly = true;
    this.addTAlisteners(this.ta);
  }

  exit(){
    this.socket.close()
    let old_element = document.getElementById(this.taId);
    const new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);
  }

  initSocket(){

    const thisMset = this;


    this.socket.on('msetId', function(msg){
      // here we listen to the server to get our msetId
      thisMset.msetId=parseInt(msg.msetId);
      thisMset.msetTree = new MSETtree(thisMset.msetId,new Network(thisMset));
      thisMset.msetTree.insertCallback = function(pos,elt,user){
        console.log(JSON.stringify(['insert',pos,elt,user]))
        const theString = thisMset.msetTree.strings.toString("",'std')
        //thisMset.ta.value = theString
        document.getElementById('ta2').value = theString
        this.lastValue = theString
      }
      thisMset.msetTree.deleteCallback = function(pos,elt,user){
        console.log(JSON.stringify(['delete',pos,elt,user]))
        const theString = thisMset.msetTree.strings.toString("",'std')
        //thisMset.ta.value = theString
        document.getElementById('ta2').value = theString
        this.lastValue = theString
      }
      //this.Mset.ta.value=""
      //thisMset.applyRemoteOps(msg.oplist)

      thisMset.ta.readOnly = false;

      thisMset.socket.emit('reset',{msetId:thisMset.msetId,fileId:thisMset.fileId})
      // this ought to be handle by a callback, why get the document involved!
      //document.getElementById('msetId').innerHTML = "msetId="+msetId;
    });

    this.socket.on('reset', function(msg){
      //thisMset.msetTree = new MSET(thisMset.msetId,thisMset);
      thisMset.applyRemoteOps(msg.oplist)
    })

    this.socket.on('remoteOperation', function(msg){


      thisMset.applyRemoteOp(msg);

    })

      //document.getElementById('msetId').innerHTML = "msetId="+msetId;


  }

  applyRemoteOps(oplist){

    for(let i=0; i<oplist.length;i++){
      this.applyRemoteOp(oplist[i]);
    }


    //this.ta.value = this.msetTree.strings.toString("",'std')
  }

  applyRemoteOp(msg){
    if ((msg.taId!=this.taId) || (msg.fileId!=this.fileId)){
      return // filter out msgs to other tas
    }

    msg = msg.op



    // ignore messages from self
    if (((msg.op=='extend'))&&(msg.nodeid[0]==this.msetId)){
      return;
    } else if ((msg.op=='insert') && (msg.un[0]==this.msetId)){
      return;
    }
    this.remoteOp=true; // temporarily ignore changes to the textarea as remote ops are processed
    this.msetTree.network.processRemoteOp(msg)
    const newString = this.msetTree.strings.toString('','std')
    this.ta.value = newString
    this.lastValue = newString;
    this.remoteOp=false;

    return

  }


  sendOperationToServer(op){
    this.socket.emit('operation',
      {taId:this.taId,fileId:this.fileId, op:op});
  }



  /*
    Setup event listeners for the textarea
  */






  insert2(offset,text){
      for(let i=0; i<text.length; i++){
         this.msetTree.insert(offset+i,text[i])
      }
  }

  delete2(offset,text){
      for(let i=0; i<text.length; i++){
        this.msetTree.delete(offset);
      }
  }


  addTAlisteners(ta){
    const theMset = this;

    ta.addEventListener('input',function(e){
        if (this.remoteOp) return;

        const start = e.target.selectionStart
        const finish = e.target.selectionEnd
        const result = e.target.value
        const lenDif = (result.length-theMset.lastValue.length)



        switch (e.inputType){
         case "insertText":
             theMset.insert2(start-lenDif,result.substring(start-lenDif,start))
             break;

         case "insertLineBreak":
             theMset.insert2(start-lenDif,result.substring(start-lenDif,start))
             break;

         case "insertFromPaste":
             theMset.insert2(start-lenDif,result.substring(start-lenDif,start))
             break;

         case "deleteByCut":
             theMset.delete2(start,theMset.lastValue.substring(start,start-lenDif))
             break;

         case "deleteContentForward":
             theMset.delete2(start,theMset.lastValue.substring(start,start-lenDif))
             break;

         case "deleteContentBackward":
             theMset.delete2(start,theMset.lastValue.substring(start,start-lenDif))
             break;

         default:
             console.log('UNKNOWN OP -- just id '+e.inputType)
             console.log("<"+e.target.value.substring(0,e.target.selectionStart)+">")

        }

        theMset.lastValue = e.target.value

      })

     ta.addEventListener('change',function(e){

         //console.log("defaultvalue = '"+e.target.defaultValue+"'")
         //console.log("value = '"+e.target.value+"'")
      })
     ta.addEventListener('cut', function(e){

         if (theMset.remoteOp) return;
         e.preventDefault()
     })

     ta.addEventListener('copy', function(e){

     })

     ta.addEventListener('undo', function(e){


         if (theMset.remoteOp) return;
         e.preventDefault()
     })

     ta.addEventListener('paste', function(e){

         if (theMset.remoteOp) return;
         e.preventDefault()

     })


    // prevent CTRL-Z undo operation
    ta.onkeydown = function(e) {
        if (e.metaKey && e.key === 'z') {
      e.preventDefault();
      alert("Undo is not allowed for this textarea");
        }
    }
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
    const un=msg.un
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

  hide(vm,q,un) {
    var op = {op:"delete", nodeid:vm, q:q};
    this.broadcast(op,un);
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
         z = `REMOTE treehide([${msg.nodeid}],${msg.q})`
         msetTree.treehide(msg.nodeid,msg.q)
         break;
      default: throw new Error("unknown remote op: "+JSON.stringify(msg))
    }

  }

}
