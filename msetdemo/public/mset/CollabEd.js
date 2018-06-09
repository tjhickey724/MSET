import {DDLL} from './DDLL.js'
export {CollabEd}


class CollabEd {

  constructor(namespace, taId, taId2, documentId){
    this.documentId = (documentId || 'default')
    this.mset = new DDLL([],editorCallbacks,io(namespace),documentId)
    this.taId = taId
    console.log("Inside the new MSET texteditor!!")
    this.ta = document.getElementById(taId)
    this.ta2 = document.getElementById(taId2)
    this.lastValue = ""
    this.ta.lastValue = ""
    this.remoteOp = false;
    this.ta.readOnly = true;
    this.addTAlisteners(this.ta);
  }

  exit(){
    this.mset.exit()
    let old_element = document.getElementById(this.taId);
    const new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);
  }





  /*
    Setup event listeners for the textarea
  */






  insertChars(offset,text){
      for(let i=0; i<text.length; i++){
         this.mset.msetTree.insert(offset+i,text[i])
      }
  }

  deleteChars(offset,text){
      for(let i=0; i<text.length; i++){
        this.mset.msetTree.delete(offset);
      }
  }


  addTAlisteners(ta){
    const theMset = this.mset;
    const theEditor = this;

    ta.addEventListener('input',function(e){

        if (theEditor.mset.remoteOp) return;
        if (ta.readOnly) return;
        const lastValue = ta.lastValue;

        const start = e.target.selectionStart
        const finish = e.target.selectionEnd
        const result = e.target.value
        const lenDif = (result.length-lastValue.length)
        const edit = result.substring(start-lenDif,start)

        //console.log("in editor:"+JSON.stringify([ta.readOnly,e.inputType,start,finish,result,lenDif,edit,lastValue]))
        //console.log(e.inputType+JSON.stringify([start-lenDif,result.substring(start-lenDif,start)]))


        switch (e.inputType){
         case "insertText":
             theEditor.insertChars(start-lenDif,result.substring(start-lenDif,start))
             break;

         case "insertLineBreak":
             theEditor.insertChars(start-lenDif,result.substring(start-lenDif,start))
             break;

         case "insertFromPaste":
             theEditor.insertChars(start-lenDif,result.substring(start-lenDif,start))
             break;

         case "deleteByCut":
             theEditor.deleteChars(start,lastValue.substring(start,start-lenDif))
             break;

         case "deleteContentForward":
             theEditor.deleteChars(start,lastValue.substring(start,start-lenDif))
             break;

         case "deleteContentBackward":
             theEditor.deleteChars(start,lastValue.substring(start,start-lenDif))
             break;

         default:
             console.log('UNKNOWN OP -- just id '+e.inputType)
             console.log("<"+e.target.value.substring(0,e.target.selectionStart)+">")

        }

        ta.lastValue = e.target.value
        //console.log('ta.lastValue changed to :\n'+ta.lastValue)

      })

     ta.addEventListener('change',function(e){

         //console.log("defaultvalue = '"+e.target.defaultValue+"'")
         //console.log("value = '"+e.target.value+"'")
      })
     ta.addEventListener('cut', function(e){

         if (theEditor.remoteOp) return;
         e.preventDefault()
     })

     ta.addEventListener('copy', function(e){

     })

     ta.addEventListener('undo', function(e){


         if (theEditor.remoteOp) return;
         e.preventDefault()
     })

     ta.addEventListener('paste', function(e){

         if (theEditor.remoteOp) return;
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



function editorCallbacks(op,pos,elt,user,me){
  //console.log('editorCallbacks:'+JSON.stringify([op,pos,elt,user,me]))
  let theString = ""
  const ta1 = document.getElementById('ta1')
  const ta2 = document.getElementById('ta2')
  switch(op){
    case "init": document.getElementById('ta1').readOnly = false;  break;
    case "insert":
      //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
      if (user==me) return
      ta1.readOnly=true
      theString = ta1.value
      //console.log("s="+theString)
      theString = theString.substring(0,pos)+elt+theString.substring(pos)
      //console.log("t="+theString)
      this.lastValue = theString
      ta2.value = theString
      ta1.value = theString
      ta1.lastValue = theString
      //console.log('ta.lastValue changed to :\n'+ta1.lastValue)
      ta1.readOnly = false
      break
    case "delete":
      //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
      if (user==me) return
      ta1.readOnly=true
      //console.log(JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))

      theString = document.getElementById('ta1').value
      theString = theString.substring(0,pos)+theString.substring(pos+1)
      this.lastValue = theString
      ta1.value = theString
      ta2.value = theString
      ta1.lastValue = theString
      //console.log('ta.lastValue changed to :\n'+ta1.lastValue)
      ta1.readOnly = false
      break
  }
}

window.CollabEd = CollabEd
