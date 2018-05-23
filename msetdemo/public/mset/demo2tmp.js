import MSETtexteditor from './MSETtexteditor.js'

// create mset sockets for the two textareas
// they will now be collaboratively editable by
// anyone who visits the page, and the edits stay
// until the server is shut down...
let mset1 = new MSETtexteditor('/demo2','ta1','ta2','default');

console.log('in demo2.js')
console.dir(mset1)

const button1TF = document.getElementById('b1')
const file1TF = document.getElementById('f1')
const text1TA = document.getElementById('ta1')
const selectIn = document.getElementById('incoming')
const selectOut = document.getElementById('outgoing')
const opsIn = document.getElementById('incomingOps')
const opsOut = document.getElementById('outgoingOps')

button1TF.addEventListener('click',function(event){
  console.log('fileId is '+file1TF.value)
  mset1.exit();
  text1TA.value=""
  console.log('text1TA value = '+ text1TA.value)
  mset1 = new MSETtexteditor('/demo2','ta1','ta2',file1TF.value)
  console.log('text1TA value = '+ text1TA.value)
})

selectIn.addEventListener('change',function(event){
  console.log("incoming "+event.target.value)
  switch(event.target.value){
    case "allowIncoming":
        mset1.msetTree.network.allowIncoming=true
        mset1.msetTree.network.processAllRemoteOps()
        document.getElementById("incomingOps").innerHTML=""
        break;
    case "queueIncoming":
        mset1.msetTree.network.allowIncoming=false
        break;
  }
})

selectOut.addEventListener('change',function(event){
  console.log("outgoing "+event.target.value)
  switch(event.target.value){
    case "allowOutgoing":
        mset1.msetTree.network.allowOutgoing=true;
        mset1.msetTree.network.broadcastAll()
        document.getElementById("outgoingOps").innerHTML=""
        break;
    case "queueOutgoing":mset1.msetTree.network.allowOutgoing=false;break;
  }
})



//and we're done
