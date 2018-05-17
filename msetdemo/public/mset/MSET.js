import MSETtree from './MSETtree.js'
export {MSETsocket as default}

console.log("MSET module loading!");


// this creates the socket to the server and the MSET tree
// and add listeners to the textareas ...

class MSETsocket{

  constructor(namespace, taId, fileId){
    this.socket = io(namespace)
    this.taId = taId
    this.fileId = (fileId || 'default')
    this.ta = document.getElementById(taId)
    console.log('in MSETsocket')
    console.dir(this)
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
    console.log('in initSocket')
    console.dir(this)
    const thisMset = this;


    this.socket.on('msetId', function(msg){
      // here we listen to the server to get our msetId
      thisMset.msetId=parseInt(msg.msetId);
      thisMset.msetTree = new MSETtree(thisMset.msetId,thisMset,new Network(thisMset));
      //this.Mset.ta.value=""
      //thisMset.applyRemoteOps(msg.oplist)
      console.log('in msetId listener, this.ta = ')
      console.log(thisMset.taId)
      thisMset.ta.readOnly = false;
      console.dir(thisMset)
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

      // this should also be handled by callbacks ..
      /*
      document.getElementById('estring1').value = msetTree.strings.printList('edit');
      document.getElementById('rstring1').value = msetTree.strings.printList('rev');

      document.getElementById('sstring1').value = newString;
      document.getElementById('ta').value = newString;
      */

    })

      //document.getElementById('msetId').innerHTML = "msetId="+msetId;


  }

  applyRemoteOps(oplist){
    console.log("in applyRemoteOps with oplist: \n"+JSON.stringify(oplist))
    for(let i=0; i<oplist.length;i++){
      this.applyRemoteOp(oplist[i]);
    }
    console.log("All "+oplist.length+" remote Ops have been loaded!")

    this.ta.value = this.msetTree.strings.printList('std')
  }

  applyRemoteOp(msg){
    if ((msg.taId!=this.taId) || (msg.fileId!=this.fileId)){
      return // filter out msgs to other tas
    }
    console.log(this.taId+'::received remoteOp: '+JSON.stringify(msg));
    msg = msg.op
    let z = ""
    console.log('in applyRemoteOp: '+JSON.stringify(msg))
    console.dir(msg)
    console.log(this.taId+'::msetId='+this.msetId+" msg.nodeid[0]="+msg.nodeid[0])
    // ignore messages from self
    if (((msg.op=='extend'))&&(msg.nodeid[0]==this.msetId)){
      return;
    } else if ((msg.op=='insert') && (msg.un[0]==this.msetId)){
      return;
    }

    this.remoteOp=true; // temporarily ignore changes to the textarea as remote ops are processed
    switch (msg.op){
      case 'insert':
         z = `REMOTE treeinsert([${msg.nodeid}],${msg.q},[${msg.un}],'${msg.c}')`
         console.log(this.taId+z)
         this.msetTree.treeinsert(msg.nodeid,msg.q,msg.un,msg.c)
         break;
       case 'extend':
          z = `REMOTE treeextend([${msg.nodeid}],'${msg.c}')`
          console.log(this.taId+z)
          this.msetTree.treeextend(msg.nodeid,msg.c)
          break;
      case 'delete':
         z = `REMOTE treehide([${msg.nodeid}],${msg.q})`
         console.log(this.taId+z)
         this.msetTree.treehide(msg.nodeid,msg.q)
         break;
      default: console.log(this.taId+'::something else')
    }
    const newString = this.msetTree.strings.printList('std')
    this.ta.value = newString
    this.lastValue = newString;
    console.log('ta_'+this.taId+' = ...\n'+newString+"\n");
    this.remoteOp=false;
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
         this.msetTree.stringinsert(offset+i,text[i])
      }
  }

  delete2(offset,text){
      for(let i=0; i<text.length; i++){
        this.msetTree.stringdelete(offset);
      }
  }


  addTAlisteners(ta){
    const theMset = this;

    ta.addEventListener('input',function(e){
        if (this.remoteOp) return;
        console.log('ta listener on input'); console.dir(e)
        const start = e.target.selectionStart
        const finish = e.target.selectionEnd
        const result = e.target.value
        const lenDif = (result.length-theMset.lastValue.length)

      //    console.log("<"+e.data+"> "+start+","+finish+","+lenDif)
      //    console.log("last   = '"+lastValue+"'")
      //    console.log("result = '"+result)

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
         console.log("Change Event")
         console.dir(e)
         //console.log("defaultvalue = '"+e.target.defaultValue+"'")
         //console.log("value = '"+e.target.value+"'")
      })
     ta.addEventListener('cut', function(e){

         console.log('cut')
         console.dir(e)
         if (theMset.remoteOp) return;
         e.preventDefault()
     })

     ta.addEventListener('copy', function(e){

         console.log('copy')
         console.dir(e)
     })

     ta.addEventListener('undo', function(e){

         console.log('undo')
         console.dir(e)
         if (theMset.remoteOp) return;
         e.preventDefault()
     })

     ta.addEventListener('paste', function(e){

         console.log('paste')
         console.dir(e)
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
 * This simulates a network with a queue of treeedit operations
 * that can be performed by the clients ....
 * We may eventually add a queue here and allow operations to be
 * queued rather than sent immediately ..
 * Perhaps the incoming operations should be processed here too...
 */
class Network{
  constructor(msetSocket) {
    this.msetSocket = msetSocket
  }

  broadcast(op,un){
    var i;
    console.log("broadcast: "+JSON.stringify(op) +", "+un[0]);
    console.dir(this)
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

}
