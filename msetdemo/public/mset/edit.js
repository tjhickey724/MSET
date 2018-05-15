
let lastValue = ""

let remoteOp = false;


function insert2(offset,text){
    const v = ta2.value;
    ta2.value = v.substring(0,offset)+text+v.substring(offset)
    for(let i=0; i<text.length; i++){
       mset1.stringinsert(offset+i,text[i])
    }
    console.dir(mset1)
    document.getElementById('estring1').value = mset1.strings.printList('edit');
    document.getElementById('rstring1').value = mset1.strings.printList('rev');
    document.getElementById('sstring1').value = mset1.strings.printList('std');

}

function delete2(offset,text){
    const v = ta2.value;
    ta2.value = v.substring(0,offset)+v.substring(offset+text.length);
    for(let i=0; i<text.length; i++){
      mset1.stringdelete(offset);
    }
    document.getElementById('estring1').value = mset1.strings.printList('edit');
    document.getElementById('rstring1').value = mset1.strings.printList('rev');
    document.getElementById('sstring1').value = mset1.strings.printList('std');

}

ta.addEventListener('input',function(e){
    if (remoteOp) return;
    console.dir(e)
    start = e.target.selectionStart
    finish = e.target.selectionEnd
    result = e.target.value
    lenDif = (result.length-lastValue.length)

  //    console.log("<"+e.data+"> "+start+","+finish+","+lenDif)
  //    console.log("last   = '"+lastValue+"'")
  //    console.log("result = '"+result)

    switch (e.inputType){
     case "insertText":
         console.log('just inserted '+"<"+result.substring(start-lenDif,start)+">")
         operations.innerHTML +=
           "<br>insert("+(start-lenDif)+","+result.substring(start-lenDif,start)+")"
         insert2(start-lenDif,result.substring(start-lenDif,start))
         break;
     case "insertLineBreak":
         console.log('just inserted '+"<"+result.substring(start-lenDif,start)+">")
         operations.innerHTML +=
           "<br>insert("+(start-lenDif)+",\n)"
         insert2(start-lenDif,result.substring(start-lenDif,start))
         break;
     case "insertFromPaste":
         console.log('just inserted from paste '+"<"+result.substring(start-lenDif,start)+">");
     console.log("start:"+start+" finish:"+finish
           +" lenDif:"+lenDif+" result.len:"+result.length+" last.len:"+lastValue.length);
         operations.innerHTML +=
           "<br>insert("+(start-lenDif)+","+result.substring(start-lenDif,start)+")"

         insert2(start-lenDif,result.substring(start-lenDif,start))
         break;
     case "deleteByCut":
         console.log('just deleted by cut')
         console.log("deletion = <"+lastValue.substring(start,start-lenDif)+">")
         operations.innerHTML +=
           "<br>delete("+start+","+lastValue.substring(start,start-lenDif)+")"
   delete2(start,lastValue.substring(start,start-lenDif))
         break;
     case "deleteContentForward":
         console.log('just deleted forward');
         console.log("deletion = <"+lastValue.substring(start,start-lenDif)+">")
         operations.innerHTML +=
           "<br>delete("+start+","+lastValue.substring(start,start-lenDif)+")"

   delete2(start,lastValue.substring(start,start-lenDif))
         break;
     case "deleteContentBackward":
         console.log('just deleted backward');
         console.log("deletion = <"+lastValue.substring(start,start-lenDif)+">")
         operations.innerHTML +=
           "<br>delete("+start+","+lastValue.substring(start,start-lenDif)+")"
   delete2(start,lastValue.substring(start,start-lenDif))
         break;
     default:
         console.log('UNKNOWN OP -- just id '+e.inputType)
         console.log("<"+e.target.value.substring(0,e.target.selectionStart)+">")

    }
    //    console.log("\n\n")
    lastValue = e.target.value

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
     if (remoteOp) return;
     e.preventDefault()
 })

 ta.addEventListener('copy', function(e){

     console.log('copy')
     console.dir(e)
 })

 ta.addEventListener('undo', function(e){

     console.log('undo')
     console.dir(e)
     if (remoteOp) return;
     e.preventDefault()
 })

 ta.addEventListener('paste', function(e){

     console.log('paste')
     console.dir(e)
     if (remoteOp) return;
     e.preventDefault()

 })


// prevent CTRL-Z undo operation
document.onkeydown = function(e) {
    if (e.metaKey && e.key === 'z') {
  e.preventDefault();
  alert("Undo is not allowed for this editor");
    }
}
