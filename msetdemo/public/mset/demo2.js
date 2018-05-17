import MSETsocket from './MSET.js'

// create mset sockets for the two textareas
// they will now be collaboratively editable by
// anyone who visits the page, and the edits stay
// until the server is shut down...
let mset1 = new MSETsocket('/demo2','ta1','default');
const mset2 = new MSETsocket('/demo2','ta2','default');
console.log('in demo2.js')
console.dir([mset1,mset2])

const button1TF = document.getElementById('b1')
const file1TF = document.getElementById('f1')
const text1TA = document.getElementById('ta1')
button1TF.addEventListener('click',function(event){
  console.log('fileId is '+file1TF.value)
  mset1.exit();
  text1TA.value=""
  console.log('text1TA value = '+ text1TA.value)
  mset1 = new MSETsocket('/demo2','ta1',file1TF.value)
  console.log('text1TA value = '+ text1TA.value)
})

//and we're done
