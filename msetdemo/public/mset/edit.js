
let lastValue = ""

function insert2(offset,text){
    const v = ta2.value;
    ta2.value = v.substring(0,offset)+text+v.substring(offset)
    for(let i=0; i<text.length; i++){
	stringinsert(mset1,offset+i,text[i])
    }
    console.dir(mset1)
    document.getElementById('estring1').innerHTML = mset1.strings.printList('edit');
    document.getElementById('rstring1').innerHTML = mset1.strings.printList('rev');
    document.getElementById('sstring1').innerHTML = mset1.strings.printList('std');

}

function delete2(offset,text){
    const v = ta2.value;
    ta2.value = v.substring(0,offset)+v.substring(offset+text.length);
    for(let i=0; i<text.length; i++){
	stringdelete(mset1,offset);
    }
    document.getElementById('estring1').innerHTML = mset1.strings.printList('edit');
    document.getElementById('rstring1').innerHTML = mset1.strings.printList('rev');
    document.getElementById('sstring1').innerHTML = mset1.strings.printList('std');

}

ta.addEventListener('input',function(e){
    console.dir(e)
    start = e.srcElement.selectionStart
    finish = e.srcElement.selectionEnd
    result = e.srcElement.value
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
         console.log("<"+e.srcElement.value.substring(0,e.srcElement.selectionStart)+">")

    }
    //    console.log("\n\n")
    lastValue = e.srcElement.value

  })

 ta.addEventListener('change',function(e){
     console.log("Change Event")
     console.dir(e)
     console.log("defaultvalue = '"+e.srcElement.defaultValue+"'")
     console.log("value = '"+e.srcElement.value+"'")
  })
 ta.addEventListener('cut', function(e){
     console.log('cut')
     console.dir(e)
     e.preventDefault()
 })

 ta.addEventListener('copy', function(e){
     console.log('copy')
     console.dir(e)
 })

 ta.addEventListener('undo', function(e){
     console.log('undo')
     console.dir(e)
     e.preventDefault()
 })

 ta.addEventListener('paste', function(e){
     console.log('paste')
     console.dir(e)
     e.preventDefault()

 })


// prevent CTRL-Z undo operation
document.onkeydown = function(e) {
    if (e.metaKey && e.key === 'z') {
	e.preventDefault();
	alert("Undo is not allowed for this editor");
    }
}
