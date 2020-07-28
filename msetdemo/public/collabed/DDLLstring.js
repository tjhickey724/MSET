import {DDLL} from '../mset/DDLL.js'
export {DDLLstring}

console.log("In DDLLstring.js!!!!!")
console.log(`io=${io}`)



const namespace="canvasdemo"
const documentId = "test1"

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
    this.ddll = null //new DDLL([],this.textWin.editorCallbacks,io(namespace),documentId)


    this.localInsert =
      (pos,char) =>
          {this.string = this.string.substring(0,pos)+char+this.string.substring(pos)}
          //{this.ddll.msetTree.insert(offset,char)}

    this.localDelete =
      (pos) =>
          {this.string = this.string.substring(0,pos)+this.string.substring(pos+1)}
          //{this.ddll.msetTree.delete(offset)}



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


    //this.string = this.string.substring(0,pos)+char+this.string.substring(pos)

    //console.log(JSON.stringify(this.string))

    if (char=='\n'){
      this.textWin.splitRow(rc[0],rc[1],'remote')
      if (rc[0] < this.textWin.rowOffset){
        this.textWin.rowOffset++
      }
    } else {
      this.textWin.insertChar(rc[0],rc[1],char,'remote')
    }
    //console.log(JSON.stringify(['remote',this.string]))


    if (pos<this.textWin.cursorPos) {
      this.textWin.cursorPos++
      this.textWin.setCursorRC(this.getRowCol(this.textWin.cursorPos))
    }
    if (pos<=this.textWin.windowOffset){
      this.textWin.windowOffset += 1
    }

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

    //console.log(JSON.stringify(["in deleteFromPos",pos]))
    //console.log(this.string.substring(0,pos))
    //console.log(this.string.substring(pos+1))

    //this.string = this.string.substring(0,pos)+this.string.substring(pos+1)

    //console.log(JSON.stringify(this.string))
    //console.log(rc)

    if (char=='\n'){
      //console.dir(['joinWithNextLine',rc[0]])
      this.textWin.joinWithNextLine(rc[0],'remote')
      if (rc[0] < this.textWin.rowOffset){
        this.textWin.rowOffset--
      }
    }else {
      //console.dir(['removePrevChar',rc[0],rc[1]+1])
      this.textWin.removePrevChar(rc[0],rc[1]+1,'remote')
    }
    //console.log(JSON.stringify(['remote',this.string]))

    if (pos<this.textWin.cursorPos) {
      this.textWin.cursorPos--
      this.textWin.setCursorRC(this.getRowCol(this.textWin.cursorPos))
    }
    if (pos<=this.textWin.windowOffset){
      this.textWin.windowOffset -= 1
    }
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
    const lines = this.string.split("\n")
    return lines.slice(startLine,endLine)
  }
}
