import {DDLL} from '../mset/DDLL.js'
export {DDLLstring}

console.log("In DDLLstring.js!!!!!")
console.log(`io=${io}`)



const namespace="/demo2"
const documentId = "default"

//this.mset.msetTree.insert(offset+i,text[i])

/*
  This class represents the underlying document.

  For now it represents the document as a single string.

  Next I will replace the underlying string with the DDLL object.

*/
class DDLLstring{
  constructor(textWin){

    this.string = ""
    this.textWin = textWin


    this.localInsert =
      (pos,char) =>
          {//console.log(`in localInsert(${char},${pos})`)
           this.string = this.string.substring(0,pos)+char+this.string.substring(pos)
           this.ddll.msetTree.insert(pos,char)
           /*
           console.dir(this.ddll.msetTree)
           console.log(this.ddll.msetTree.toString('','std'))
           console.log(this.ddll.msetTree.toString())
           console.log(this.ddll.msetTree.toList('std'))
           console.log(this.ddll.msetTree.toList2('std'))
           console.log(this.ddll.msetTree.toList2('std').join(''))
           */
           //console.log(JSON.stringify(this.ddll_lines(),null,2))

          }
          //{this.ddll.msetTree.insert(offset,char)}

    this.localDelete =
      (pos) =>
          {console.log(`in localDelete(${pos})`)
           this.string = this.string.substring(0,pos)+this.string.substring(pos+1)
           this.ddll.msetTree.delete(pos)}
          //{}

    this.editorCallbacks =
      (op,pos,elt,user,me) =>{
        // first we do some local processing
        console.log(`\nZZZ editorCallback(${op},${pos},${elt},${user},${me})`)
        const theLines = this.ddll.toString('','std')
        console.log(`theLines=${JSON.stringify(theLines,null,2)}`)
        switch(op){
          case "init":
            break
          case "insert":
            //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
            if (user==me) return
            console.log(`calling this.insertAtPosRemote(${elt},${pos})`)
            this.insertAtPosRemote(elt,pos)
            break
          case "delete":
            //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
            if (user==me) return
            console.log(`calling this.deleteFromPosRemote(${pos})`)
            this.deleteFromPosRemote(pos)
            break
        }
      }

      this.ddll = new DDLL([],this.editorCallbacks,io(namespace),documentId)

      console.log(`this.ddll=${this.ddll}`)
      console.dir(this.ddll)

      this.ddll_lines =
         () => this.ddll.msetTree.toList2('std').join('').split("\n")


  }



  insertAtPos(char,pos){

    //this.string = this.string.substring(0,pos)+char+this.string.substring(pos)
    this.localInsert(pos,char)
    //console.log(JSON.stringify(['local-pre',this.string,this.textWin.cursorPos,this.textWin.cursor]))

    if (pos<=this.textWin.cursorPos) {
      //console.log(`before incrementing ${this.textWin.cursorPos}`)
      this.textWin.cursorPos += 1
      //console.log(`after incrementing ${this.textWin.cursorPos}`)
      this.textWin.setCursorRC(this.getRowCol(this.textWin.cursorPos))
    }

    //console.log(JSON.stringify(['local-post',this.string,this.textWin.cursorPos,this.textWin.cursor]))

  }

  insertAtPosRemote(char,pos){
    let rc = this.getRowCol(pos)

    if (pos < this.textWin.windowOffset) {
        this.textWin.windowOffset += 1
        if (char=='\n'){
          this.textWin.rowOffset++
          this.textWin.lastRow++
        }
        return
    } else if (pos > this.textWin.lastWindowOffset){
        if (char=='\n'){
          this.textWin.lastRow++
        }
        return
    } // from here on we know that the edit was with the lines in the cache ...
    //this.string = this.string.substring(0,pos)+char+this.string.substring(pos)

    //console.log(JSON.stringify(this.string))

    if (char=='\n'){
      this.textWin.splitRow(rc[0],rc[1],'remote')
    } else {
      this.textWin.insertChar(rc[0],rc[1],char,'remote')
    }
    //console.log(JSON.stringify(['remote',this.string]))


    const cursorPos = this.textWin.getPos(this.textWin.cursor)
    if (pos<this.textWin.getPos(this.textWin.cursor)) {
      this.textWin.cursorPos = cursorPos+1
      // optimize this!!
      this.textWin.cursor = this.getRowCol(this.textWin.cursorPos)
    }
    console.log("redrawing the screen")
    this.textWin.redraw()  // modify so that it only redraws if rc is in visible range

  }

  deleteFromPos(pos){
    //console.log(JSON.stringify(["in deleteFromPos",pos]))
    //console.log(this.string.substring(0,pos))
    //console.log(this.string.substring(pos+1))

    //this.string = this.string.substring(0,pos)+this.string.substring(pos+1)
    this.localDelete(pos)
    //console.log(JSON.stringify(['local',this.string]))

    if (pos<this.textWin.cursorPos) {
      this.textWin.cursorPos--
      this.textWin.setCursorRC(this.getRowCol(this.textWin.cursorPos))
    }
  }

  deleteFromPosRemote(pos){
    const char=this.string[pos]
    let rc = this.getRowCol(pos)

    if (pos < this.textWin.windowOffset){
      this.textWin.windowOffset -=1
      if (char=='\n') {
        this.rowOffset --
        this.lastRow --
        this.lastWindowOffset --
      }
      return
    } else if (pos > this.textWin.lastWindowOffset){
      if (char=='\n'){
        this.lastRow --
      }
      return
    }

    //console.log(JSON.stringify(["in deleteFromPos",pos]))
    //console.log(this.string.substring(0,pos))
    //console.log(this.string.substring(pos+1))

    //this.string = this.string.substring(0,pos)+this.string.substring(pos+1)

    //console.log(JSON.stringify(this.string))
    //console.log(rc)

    if (char=='\n'){
      //console.dir(['joinWithNextLine',rc[0]])
      this.textWin.joinWithNextLine(rc[0],'remote')
    }else {
      //console.dir(['removePrevChar',rc[0],rc[1]+1])
      this.textWin.removePrevChar(rc[0],rc[1]+1,'remote')
    }
    //console.log(JSON.stringify(['remote',this.string]))

    if (pos<this.textWin.cursorPos) {
      this.textWin.cursorPos--
      this.textWin.setCursorRC(this.getRowCol(this.textWin.cursorPos))
    }
    console.log("redrawing the screen")
    this.textWin.redraw()

  }

  getString(){
    return "not implemented" //this.string
  }

  /*


  */
  getRowCol(pos){
    let row=0;
    let col=0;
    let p = 0;
    while(p<pos){
      if (this.string[p]=='\n'){
        row += 1; col=0;
      } else{
        col+=1;
      }
      p++;
    }
    return [row,col]

  }

  getPos(r,c){
    let row=0;
    let col=0;
    let p = 0;
    while(row<r || (row==r && col<c)){
      if (this.string[p]=='\n'){
        row += 1; col=0;
      } else{
        col+=1;
      }
      p++;
    }
    return p
  }

  getStringSlice(startLine,endLine){
    console.log(`getStringSlice(${startLine},${endLine})`)

    const lines = this.ddll_lines()
    return lines.slice(startLine,endLine)
  }
}
