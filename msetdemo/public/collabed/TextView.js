import {DDLL} from '../mset/DDLL.js'
export {DDLLstring,TextView}

console.log("In TextView.js!!!!!")
console.log(`io=${io}`)



const namespace="canvasdemo"
const documentId = "test1"

//this.mset.msetTree.insert(offset+i,text[i])

/*
  This class represents the underlying document.
  For now it represents the document as a single string.
  Next I will add another representation as an array of strings
  in the viewing window, which will be updated when the window scrolls
  Finally we will replace the underlying string with the DDLL object.
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
    I'm not sure how we are going to do this....

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
}







class TextView{
  /*
    TextView represents the characters which are visible on the screen
  */
  constructor(rows,cols,ddll){
    this.text=[""]
    this.numLines = 1  // keep track of number of lines in the file
    this.rows = rows
    this.cols = cols

    this.charOffset=0
    this.rowOffset=0
    this.colOffset=0
    this.numRows = 1 // length of this.lines
    this.numChars = 0 // sum of lengths of rows in this.lines

    this.editorCallbacks =
      (op,pos,elt,user,me) =>{
        switch(op){
          case "init":
            break
          case "insert":
            //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
            if (user==me) return
            this.string.insertAtPosRemote(elt,pos)
            break
          case "delete":
            //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
            if (user==me) return
            this.string.deleteFromPosRemote(pos)
            break
        }
      }

    this.string = new DDLLstring(ddll)
  }

  insertChar(row,col,key,remote){
    const charPos = this.getCharPos(row,col)
    const line = this.getLine(row)
    const first = line.substring(0,col) // first part
    const rest = line.substring(col)
    const newline = first+key+rest
    this.text[row]=newline
    if (!remote){
      this.string.insertAtPos(key,charPos)
    }
  }

  getCharPos(row,col){
    // return char position
    // assuming row/col are cached
  }

  getLine(row){
    // return string at specified row
    // assuming it is cached
  }

  splitRow(row,pos,remote){
    const charPos = this.getCharPos(row,pos)
    const line = this.text[row]
    this.text.splice(row,1,
      line.substring(0,pos),line.substring(pos))
    // this.view.splitRow(row,pos)
    if (!remote){
      this.string.insertAtPos('\n',charPos)
    }
    // this replace one line of the cache with two new ones
    // and removes the last line of the cache

  }

  removePrevChar(row,col,remote){
    const charPos = this.getCharPos(row,col)
    const line = this.text[row]
    this.text.splice(row,1,
      line.substring(0,col-1)+line.substring(col))
    // this.view.removePrevChar(row,col)
    if (!remote){
      this.string.deleteFromPos(charPos-1)
    }
    // this changes one line in the cache

  }

  joinWithNextLine(row,remote){
    const charPos = this.getCharPos(row+1,0)-1
    this.text.splice(row,2,
      this.text[row]+ this.text[row+1])
    // this.view.joinWithNextLine(row)

    if (!remote){
      this.string.deleteFromPos(charPos)
    }
    //this replaces two lines of the cache with a new joined one
    // and potentially pulls in a new line into the cache

  }

  getLastRow(){
    return this.numLines-1
  }

  _setRowsCols(rows,cols){
    // sets the size of the viewing window ...
    // if rows > this.rows we need to add more rows to this.lines
    // if rows < this.rows, we need to remove rows from this.lines
    if (rows< this.rows){
      this.lines = this.lines.slice(0,rows)
      this.rows = rows
    } else if (rows > this.rows){
      const numNewRows = rows-this.rows
      this.lines = this.lines + this.getNewRows(this.offset+this.numChars,numNewRows)
      this.rows = rows
    }
    this.cols = cols
  }

  _getNewRows(pos,numNewRows){
    // this returns numNewRows in the string starting at pos
    // but this should be in DDLLstring ....
    return
    let newRows=[]
    for(let i=0; i<numNewRows; i++){
      let p = this.string.indexOf("\n",pos)
      if (p==-1){
        newRows[i] = this.string.slice(pos)
        break
      } else {
        newRows[i] = this.string.slice(pos,p+1)
        pos = p+1
      }
    }
  }

  getRowLength(row){
    if (this.rowOffset <= row && row <= this.rowOffset+this.rows){
      return this.text[row-this.rowOffset].length
    } else {
      throw(new Error())
    }
  }

  _splitRow(row,pos){
    // this splits the specified row at the specified position
    const r = row -this.rowOffset // position of row in this.lines
    const line = this.lines[r]
    const L = this.lines
    this.lines = L.slice(0,r)+[line.slice(0,pos),line.slice(pos)]+L.slice(r+1)
    this.lines = L.slice(0,this.rows)
  }

  _joinWithNextLine(row){
    const r = row -this.rowOffset // position of row in this.lines
    const line = this.lines[r]
    const L = this.lines
    this.lines = L.slice(0,r)+[L[r]+L[r+1]]+L.slice(r+2)
    // FIX -- read in the next line and store it at end of array...
    // if there is a next line...
  }

  _removePrevChar(row,col){
    const line = this.lines[row-this.rowOffset]
    const L = this.lines
    this.lines =
        L.slice(0,row)
        +[line.substring(0,col-1)+line.substring(col)]
        + L.slice(row+1)
    // this doesn't change the number of rows
  }



}
