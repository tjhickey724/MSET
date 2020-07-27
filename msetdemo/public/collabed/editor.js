import {DDLL} from '../mset/DDLL.js'
export {DDLLstring,TextWindow,CanvasEditor}

console.log("In editor.js!!!!!")
console.log(`io=${io}`)

let Zthis='zzz'

function editorCallbacks(op,pos,elt,user,me){
  /* This is called whenever a local or remote operation is performed
     on the underlying mset tree
  */

  switch(op){
    case "init":   break;
    case "insert":
      //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
      if (user==me) return

      break
    case "delete":
      //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
      if (user==me) return

      break
  }
}
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
    this.ddll = new DDLL([],this.editorCallbacks,io(namespace),documentId)
    this.textWin = textWin

    this.localInsert =
      (pos,char) =>
          {this.string = this.string.substring(0,pos)+char+this.string.substring(pos)}
          //{this.ddll.msetTree.insert(offset,char)}

    this.localDelete =
      (pos) =>
          {this.string = this.string.substring(0,pos)+this.string.substring(pos+1)}
          //{this.ddll.msetTree.delete(offset)}

    this.editorCallBacks =
      (op,pos,elt,user,me) =>{
          switch(op){
            case "init":
              break
            case "insert":
              //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
              if (user==me) return
              this.insertAtPosRemote(elt,pos)
              break
            case "delete":
              //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
              if (user==me) return
              this.deleteFromPosRemote(pos)
              break
          }
        }
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
  constructor(rows,cols){
    this.lines=[""]
    this.numLines = 1  // keep track of number of lines in the file
    this.rows = rows
    this.cols = cols

    this.charOffset=0
    this.rowOffset=0
    this.colOffset=0
    this.numRows = 1 // length of this.lines
    this.numChars = 0 // sum of lengths of rows in this.lines
  }

  getLastRow(){
    return this.numLines-1
  }

  setRowsCols(rows,cols){
    // sets the size of the viewing window ...
    // if rows > this.rows we need to add more rows to this.lines
    // if rows < this.rows, we need to remove rows from this.lines
    return
    if (rows< this.rows){
      this.lines = this.lines.slice(0,rows)
      this.rows = rows
    } else if (rows > this.rows){
      const numNewRows = rows-this.rows
      this.lines =
           this.lines +
           this.getNewRows(this.offset+this.numChars,numNewRows)
      this.rows = rows
    }
    this.cols = cols
  }

  getNewRows(pos,numNewRows){
    // this returns numNewRows in the string starting at pos
    // but this should be in DDLLstring ....
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
      return this.lines[row-this.rowOffset].length
    } else {
      throw(new Error())
    }
  }

  splitRow(row,pos){
    // this splits the specified row at the specified position
    const r = row -this.rowOffset // position of row in this.lines
    const line = this.lines[r]
    const L = this.lines
    this.lines = L.slice(0,r)+[line.slice(0,pos),line.slice(pos)]+L.slice(r+1)
    this.lines = L.slice(0,this.rows)
  }

  joinWithNextLine(row){
    const r = row -this.rowOffset // position of row in this.lines
    const line = this.lines[r]
    const L = this.lines
    this.lines = L.slice(0,r)+[L[r]+L[r+1]]+L.slice(r+2)
    // FIX -- read in the next line and store it at end of array...
    // if there is a next line...
  }

  removePrevChar(row,col){
    const line = this.lines[row-this.rowOffset]
    const L = this.lines
    this.lines =
        L.slice(0,row)
        +[line.substring(0,col-1)+line.substring(col)]
        + L.slice(row+1)
    // this doesn't change the number of rows
  }



}

/*
TextWindow models the state of the document.
It receives calls from the Editor using row/col coordinates
for inserting and deleting characters. It translates these into
position based calls and in turn makes calls to the DDLLstring object
which updates the MSET representation of the document and sends MSET
transformations corresponding to the inserts or deletes to the network.

Likewise, when the DDLLstring object receives an insert or delete operation
from the network, it makes calls to this TextWindow object to update the
state and to redraw the canvas.  Note that the DDLLstring object and the
TextWindow object both have links to each other.
*/
class TextWindow{
  /**
    This class will represent a text object and a window onto that text object
  **/

  constructor(ddll){
    this.string = new DDLLstring(this)

    this.windowOffset = 0  // the position of 1st visible character in the windowOffset
    this.lastWindowOffset = 0
    this.cursor = [0,0]
    this.cursorPos = 0 //
    this.rowOffset=0
    this.colOffset=0
    this.rows = 10
    this.cols = 80

    this.text = [""]
    this.view = new TextView(this.rows,this.cols)
  }

  setRedrawCanvas(redraw){
    this.redrawCanvas = redraw
  }

  updateCursorPos(){
    this.cursor = getRowCol(this.cursorPos)
  }

  redraw(operation,char,rowCol){
    this.redrawCanvas()
  }

  setRowsCols(rows,cols){
    this.rows = rows
    this.cols = cols
    this.view.setRowsCols(rows,cols)
  }

  getString(){
    return this.string
  }

  getNumRows(){
    return this.rows
  }

  getNumCols(){
    return this.cols
  }

  getRowOffset(){
    return this.rowOffset
  }

  setRowOffset(row){
    this.rowOffset = row
  }

  getColOffset(){
    return this.colOffset
  }

  setColOffset(col){
    this.colOffset = col
  }

  getLastRow(){
    return this.text.length-1
    //return this.view.getLastRow()
  }

  getRowLength(row){
    return this.text[row].length
    // return this.view.getRowLength(row)
  }

  setCursor(row,col){
    this.cursor = [row,col]
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
  }

  setCursorRC(rc){
    this.cursor = rc
  }

  getCurrentRow(){
    return this.cursor[0]
  }

  setCurrentRow(row){
    this.cursor[0] = row
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
  }

  getCurrentCol(){
    return this.cursor[1]
  }

  setCurrentCol(col){
    this.cursor[1]= col
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
  }

  insertChar(row,col,key,remote){ // for a non CR key
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

  splitRow(row,pos,remote){ // insert CR
    const charPos = this.getCharPos(row,pos)
    const line = this.text[row]
    this.text.splice(row,1,
      line.substring(0,pos),line.substring(pos))
    // this.view.splitRow(row,pos)
    if (!remote){
      this.string.insertAtPos('\n',charPos)
    }
  }

  removePrevChar(row,col,remote){ // for a non CR key
    const charPos = this.getCharPos(row,col)
    const line = this.text[row]
    this.text.splice(row,1,
      line.substring(0,col-1)+line.substring(col))
    // this.view.removePrevChar(row,col)
    if (!remote){
      this.string.deleteFromPos(charPos-1)
    }

  }

  joinWithNextLine(row,remote){ // remove CR
    const charPos = this.getCharPos(row+1,0)-1
    this.text.splice(row,2,
      this.text[row]+ this.text[row+1])
    // this.view.joinWithNextLine(row)

    if (!remote){
      this.string.deleteFromPos(charPos)
    }

  }



  getCharPos(row,col){
    let sum=0

    for(let i=0; i<row; i++){
      sum += this.text[i].length+1  // have to add 1 for the CR at the end of the line ...
    }
    sum += col
    return sum
  }

  getLine(row){
    return this.text[row]
  }

  getCurrentLine() {
    return this.text[this.cursor[0]]
  }

  getCurrentLineLength(){
    return this.text[this.cursor[0]].length
  }

}
//================

//================
/*
The Canvas Editor takes a canvas DOM objects, mset,
and a TextWindow object representing the state of the document.
It responds to canvas events by calling methods on the TextWindow
object to update its state, and it redraws the screen using data
from the TextWindow object.

When the TextWindow object is updated remotely, it will also redraw
the screen. This is done by passing the redraw method into the TextWindow
object.
*/
class CanvasEditor{

  constructor(mset,textWindow){
    this.msetCanvas = mset
    this.state = textWindow

    this.fontColor = "black"
    this.fonttype = "32pt Courier"
    this.fontNumericSize = "32"

    this.allLetters = "!@#{$%^&*()_+-={}|[]\\:\";'<>?,./~`}abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789"
    this.letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789"

    this.msetCanvas.style["font-size"]="40"

    this.ctx = null;
    this.charWidth = 100;
    this.lineSep = 10
    this.lineHeight=20
    this.lineDescent = 2


    let msetCE = this

    this.fontSize = this.getFontSize()



    this.msetCanvas.width = window.innerWidth*0.9;
    this.msetCanvas.height = window.innerHeight*0.9;
    let numRows = Math.floor(this.msetCanvas.height/this.lineHeight);
    let numCols = Math.floor(this.msetCanvas.width/(this.charWidth))

    this.state.setRowsCols(numRows,numCols);

    // this.state =
    //    {text:[""],
    //     cursor:[0,0],
    //     rowOffset:0,
    //     colOffset:0,
    //     rows:numRows,cols:numCols}

    let theState = this.state


    // here is how we can get the key which is pressed
    this.msetCanvas.addEventListener('keydown', function(event) {
        msetCE.addKeyPress(event);
        msetCE.redrawmsetCanvas();
            });

    // here is how we can get the position of the mouseclick
    this.msetCanvas.addEventListener('mousedown', function(event){
        let row = Math.floor(event.offsetY/msetCE.lineHeight)+
                            msetCE.state.getRowOffset()
        let col = Math.round(event.offsetX/(msetCE.charWidth)) +
                msetCE.state.getColOffset()
        row = Math.min(row,msetCE.state.getLastRow())
        col = Math.min(col,msetCE.state.getRowLength(row))
        msetCE.state.setCursor(row,col)
        msetCE.redrawmsetCanvas()
    });

    // When the window is resized it changes the size of the canvas to fit the window
    window.addEventListener('resize', function(event){
      msetCE.msetCanvas.width = window.innerWidth*0.9;
      msetCE.msetCanvas.height = window.innerHeight*0.9;
      msetCE.getFontSize();
      msetCE.redrawmsetCanvas();

    });

    const redrawCanvas = this.redrawmsetCanvas.bind(this)
    this.state.setRedrawCanvas(redrawCanvas)

  }

  getFontSize(){

      this.ctx = this.msetCanvas.getContext('2d')
      this.charWidth = this.ctx.measureTextWidth(this.letters).width/this.letters.length
      this.fontName = this.fontNumericSize+"px courier"
      this.ctx.font = this.fontName
      this.msetCanvas.style["font-size"]=this.fontNumericSize
      this.ctx.fillStyle='black'
      this.fontSize = this.ctx.measureText(this.letters)
      this.lineSep = Math.round(this.fontSize.height*0.5) // additional distance between lines ...
      this.lineHeight = this.fontSize.height+this.lineSep //
      this.lineDescent = this.fontSize.descent
      let numRows = Math.floor(this.msetCanvas.height/this.lineHeight);
      let numCols = Math.floor(this.msetCanvas.width/(this.charWidth))

      // this.state.cols = numCols
      // this.state.rows = numRows
      //let state = this.state
    //  console.dir(state)
      this.state.setRowsCols(numRows,numCols)

      return this.ctx.measureText(this.letters);
  }


    clearmsetCanvas(){
      const ctx = this.msetCanvas.getContext('2d')
      ctx.fillStyle='white'
      ctx.fillRect(0,0,window.innerWidth,window.innerHeight)
    }




    addKeyPress(event){
      const key = event.key
      let state = this.state
      if (event.ctrlKey){
        return
        // process ^F ^B ^N ^P to move cursor ...
        // ^A beginning of line ^E end of line
        // ^D delete next character
      } else if (key=='ArrowLeft'){
        let ccol = state.getCurrentCol()
        if (ccol>0){
          const lineLen = state.getCurrentLineLength() //state.text[state.cursor[0]].length
          if (ccol>lineLen){
             state.setCurrentCol(lineLen) //state.cursor[1] = lineLen
          }
          state.setCurrentCol(ccol-1)
          //state.cursor[1]--;
        } else {
          let crow = state.getCurrentRow()
          if (crow>0) {
            state.setCurrentRow(crow-1)
            state.setCurrentCol(state.getRowLength(crow-1))
            // state.cursor[0]--
            // state.cursor[1] = state.text[state.cursor[0]].length
          }
        }
        return
      } else if (key=='ArrowRight'){
          let ccol = state.getCurrentCol()
          if (ccol< state.getCurrentLineLength()){
             state.setCurrentCol(state.getCurrentCol()+1)
          } else {
             let crow = state.getCurrentRow()
             if (crow<state.getLastRow()) {
                state.setCursor(crow+1,0)
             }
          }

        return
      } else if (key=='ArrowUp'){
        let crow = state.getCurrentRow()
        if (crow>0){
          state.setCurrentRow(crow-1)
          let ccol = state.getCurrentCol()
          let linelen = state.getRowLength(crow-1)
          state.setCurrentCol(Math.min(ccol,linelen))
        }
        return
      } else if (key=='ArrowDown'){
        let crow = state.getCurrentRow()
        let lastRow = state.getLastRow()

        if (crow<lastRow){
          state.setCurrentRow(crow+1)
          let ccol = state.getCurrentCol()
          let linelen = state.getRowLength(crow+1)
          state.setCurrentCol(Math.min(ccol,linelen))
        }

        return
      } else if (key=='Backspace'){
        this.removePrevChar()
        // remove the character at the current position!!!
        return
      } else if (key=='Enter'){
        this.insertCRLF()
        return
      } else if (this.allLetters.indexOf(key)<0) {
        return
      } else {

      this.insertKey(key)
      }
    }

    removePrevChar(){
      const row = this.state.getCurrentRow()
      const col = this.state.getCurrentCol()
      const line = this.state.getCurrentLine()
      const lineLen = line.length
      if (col>lineLen){
        col = lineLen
        this.state.setCurrentCol(col)
      }
      if (col>0){
        this.state.removePrevChar(row,col)
        this.state.setCursor(row,col-1)
      } else if(row>0){
        const prevLine = this.state.getLine(row-1)
        this.state.joinWithNextLine(row-1)
        this.state.setCursor(row-1,prevLine.length)
      }
    }


    insertCRLF(){
      const row =this.state.getCurrentRow()
      const pos = this.state.getCurrentCol()

      this.state.splitRow(row,pos)
      this.state.setCursor(row+1,0)
    }

    insertKey(key){
      const row = this.state.getCurrentRow()
      const col = this.state.getCurrentCol()

      this.state.insertChar(row,col,key)
      this.state.setCursor(row,col+1)
    }

    //=============


    redrawmsetCanvas(){
      this.getFontSize()
      this.clearmsetCanvas()
      let theState = this.state
      const ctx = this.msetCanvas.getContext('2d')
      //ctx.font = fonttype
      //===============
      //context.strokeStyle = 'blue';
      //context.lineWidth = '5';
      //context.strokeRect(0, 0, window.innerWidth, window.innerHeight);
      //===============
      ctx.fillStyle='black'

      if ((theState.getCurrentRow()<theState.getRowOffset())  ) {
        theState.setRowOffset(Math.max(0,theState.getCurrentRow()-5))
      } else if (theState.getCurrentRow() >=
                   theState.getRowOffset()+theState.getNumRows()){
        theState.setRowOffset(theState.getRowOffset()+5)
      }

      let col = theState.getCurrentCol()
      let colOffset = theState.getColOffset()
      let numCols = theState.getNumCols()
      if ((col<colOffset)  ) {
        theState.setColOffset(Math.max(0,col-5))
      } else if (col>= colOffset+numCols){
        theState.setColOffset(Math.max(0,colOffset + numCols-5));
      }
      colOffset = theState.getColOffset()

      let rowOffset = theState.getRowOffset()
      let numRows = theState.getNumRows()
      let rowEnd = Math.min(theState.getLastRow(),numRows+rowOffset)
      numCols = theState.getNumCols()


      for(let i=rowOffset; i<= rowEnd ; i++){
        const line =theState.getLine(i).substring(colOffset,colOffset+numCols+5)
        const text = ctx.measureText(line)
        const start = 0
        const baseline = (1+i-rowOffset)*this.lineHeight+this.lineDescent
        const topline = this.lineHeight
        ctx.fillText(line,start,baseline)
      }

      this.drawCursor()
    }

    printState(){
      console.log(JSON.stringify(this.state))
    }


    drawCursor(){

      const line =this.state.getCurrentLine()
      const col = this.state.getCurrentCol()
      const row = this.state.getCurrentRow()
      const colOffset = this.state.getColOffset()
      const rowOffset = this.state.getRowOffset()
      const visibleColumn = (col-colOffset)
      const visibleRow = (row-rowOffset)

      const start = visibleColumn*this.charWidth
      const baseline = visibleRow*this.lineHeight+this.lineSep+this.lineDescent
      const topline = this.lineHeight-this.lineSep+this.lineDescent+1

      const ctx = this.msetCanvas.getContext('2d')
      ctx.fillStyle='black'
      ctx.fillRect(start,baseline, 1,topline)
    }

}

const tw = new TextWindow("dummy DDLL")
const st = tw.getString();
const ed1 = new CanvasEditor(mset,tw)
