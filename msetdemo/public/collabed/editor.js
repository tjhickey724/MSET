/*
  start thie collabed editor with
  % npm start
  and access it on port 4000
  localhost:4000
*/
import {DDLL} from '../mset/DDLL.js'
/*
  I need to revise the redraw Canvas to use the FontMetrics
  and draw all of the lines. This should be pretty easy to do!
*/
console.log("In editor.js!!!!!")
let Zthis='zzz'

class DDLLstring{
  constructor(textWin){
    this.string = ""
    this.ddll = new DDLL([],editorCallbacks(this,textWin),io('/demo2'), 'doc0')
    this.textWin = textWin
  }

  insertAtPos(char,pos){
    this.string = this.string.substring(0,pos)+char+this.string.substring(pos)
    //console.log(JSON.stringify(['local',this.string]))
    //console.log('this.ddll.insert('+char+','+pos+')')
    this.ddll.insert(pos,char)

  }

  insertAtPosRemote(char,pos){
    let rc = this.getRowCol(pos)

    this.string = this.string.substring(0,pos)+char+this.string.substring(pos)
    //console.log(JSON.stringify(this.string))

    if (char=='\n'){
      this.textWin.splitRow(rc[0],rc[1],'remote')
    } else {
      this.textWin.insertChar(rc[0],rc[1],char,'remote')
    }
    //console.log(JSON.stringify(['remote',this.string]))
  }

  deleteFromPos(pos){
    //console.log(JSON.stringify(["in deleteFromPos",pos]))
    //console.log(this.string.substring(0,pos))
    //console.log(this.string.substring(pos+1))
    this.string = this.string.substring(0,pos)+this.string.substring(pos+1)
    //console.log(JSON.stringify(['local',this.string]))
    this.ddll.delete(pos)
  }

  deleteFromPosRemote(pos){
    const char=this.string[pos]
    let rc = this.getRowCol(pos)

    //console.log(JSON.stringify(["in deleteFromPos",pos]))
    //console.log(this.string.substring(0,pos))
    //console.log(this.string.substring(pos+1))
    this.string = this.string.substring(0,pos)+this.string.substring(pos+1)
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
  }

  getString(){
    return this.string
  }

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


function editorCallbacks(ddllString,textWin){
  return (op,pos,elt,user,me) => {
  //console.log('editorCallbacks:'+JSON.stringify([op,pos,elt,user,me]))
  switch(op){
    case "init": /* maybe block input on the canvas?? */  break;
    case "insert":
      //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
      if (user==me) return
      ddllString.insertAtPosRemote(elt,pos)
      // I need to update the cursor position in the textWin ... on remote ops....
      textWin.canvasEditor.redrawmsetCanvas()
      break
    case "delete":
      //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
      if (user==me) return
      ddllString.deleteFromPosRemote(pos)
      textWin.canvasEditor.redrawmsetCanvas()
      break
  }
 }
}


class TextWindow{
  /**
    This class will represent a text object and a window onto that text object
  **/

  constructor(ddll){
    this.string = new DDLLstring(this)
    this.text = [""]

    // we keep track of the char offsets
    // that describe the visible text
    this.firstCharOffset = 0  // position of 1st visible character
    this.lastCharOffset = 0 // position of the last visible character

    this.cursor = [0,0]
    this.rowOffset=0
    this.colOffset=0
    this.rows = 10
    this.cols = 80
  }

  setRowsCols(rows,cols){
    this.rows = rows
    this.cols = cols
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
    // we need to update the firstCharOffset and lastCharOffset
    // for the visible window ...

    // but we don't allow setting the row to a negative
    // or after the end of the text...
    let lastRow = this.getRowTotal()-1
    this.rowOffset = Math.max(0,Math.min(row,lastRow))

    this.updateCharOffsetAfterMove(row)
  }

  getColOffset(){
    return this.colOffset
  }

  setColOffset(col){
    this.colOffset = col
  }

  getLastRow(){
    return this.text.length-1
  }

  getRowLength(row){
    return this.text[row].length
  }

  setCursor(row,col){
    this.cursor = [row,col]
  }

  getCurrentRow(){
    return this.cursor[0]
  }

  setCurrentRow(row){
    this.cursor[0] = row
  }

  getCurrentCol(){
    return this.cursor[1]
  }

  setCurrentCol(col){
    this.cursor[1]= col
  }

  setFirstCharOffset(a){
    this.firstCharOffset = a
    //console.log('firstCharOffset = '+a)
  }

  setLastCharOffset(a){
    this.lastCharOffset = a
    //console.log('lastCharOffset = '+a)
  }

  updateFirstCharOffset(delta){
    this.setFirstCharOffset(this.firstCharOffset+delta)
  }

  updateLastCharOffset(delta){
    this.setLastCharOffset(this.lastCharOffset+delta)
  }

  updateCharOffset(row,delta){
    //console.dir(['updateCharOffset',row,delta,this])
    // update the charOffset of the visible window
    // when the length of the specified row has changed by delta
    if (row<this.getRowOffset()){
      this.updateFirstCharOffset(delta)
    } else if (row <= this.getRowOffset()+this.getNumRows()){
      this.updateLastCharOffset(delta)
    }
  }

  getRowTotal(){
    return this.text.length
  }

  updateCharOffsetCR(row,delta){
    //console.dir(['updateCharOffsetCR',row,delta,this])
    // update the charOffset of the visible window
    // when the specified row has been changed by
    // adding a CR in the row (delta=1)
    // or removing the CR at the end of the row (delta=-1)
    let rowOffset = this.getRowOffset()
    let numRows = this.getNumRows()

    if (delta>0) { // inserting a CR on specified row
      if (row<rowOffset){
        this.updateFirstCharOffset(delta)
      } else {
        let lastRow = rowOffset+numRows-1;
        let lastRealRow = this.getRowTotal()-1
        //console.log(JSON.stringify([row,delta,lastRow,rowOffset,numRows,lastRealRow,this.getRowTotal()]))
        if (lastRow > lastRealRow){
          //console.log(JSON.stringify(['a',lastRow,lastRealRow]))
          // true when the end of the file is in the buffer
          this.updateLastCharOffset(1) // add a CR
        } else if (row < lastRow){
          let lastLine = this.getLine(lastRow)
          //console.log(JSON.stringify(['b',row,lastRow,lastLine,-lastLine.length]))
          this.updateLastCharOffset(-lastLine.length)
        }
      }
    } else { // removing CR at end of the specified row

      if (row<rowOffset-1){
        this.updateFirstCharOffset(-1)
      } else if (row == rowOffset-1){
        // joining first row with previous unseen row
        let prevLine = this.getLine(rowOffset-1)
        this.updateFirstCharOffset(-prevLine.length-1)
      } else if (row <= rowOffset+numRows){
        // adding a new line to end of visible range
        let firstHiddenRow = rowOffset+numRows+1
        if (firstHiddenRow > this.getRowTotal()){
          this.updateLastCharOffset(-1)
        } else {
          let nextLine = this.getLine(rowOffset+numRows+1)
          this.updateLastCharOffset(nextLine.length-1)
        }
      }
    }
  }

  updateCharOffsetAfterMove(row) {
    //console.dir(['updateCharOffsetAfterMove',row,this])
    let rowOffset = this.getRowOffset()
    let numRows = this.getNumRows()
    if (row < rowOffset) {
      let a = this.getCharPos(row,0)
      let b = this.getCharPos(row+numRows+1,0)
      this.setFirstCharOffset(a)
      this.setLastCharOffset(b)
    }
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
    } else {
      this.updateCursor('insertChar',row,col)
    }

    this.updateCharOffset(row,1)

  }

  splitRow(row,pos,remote){ // insert CR
    const charPos = this.getCharPos(row,pos)
    const line = this.getLine(row)
    this.text.splice(row,1,
      line.substring(0,pos),line.substring(pos))
    if (!remote){
      this.string.insertAtPos('\n',charPos)
    } else {
      this.updateCursor('splitRow',row,pos)
    }
    this.updateCharOffsetCR(row,1)
  }

  removePrevChar(row,col,remote){ // for a non CR key
    const charPos = this.getCharPos(row,col)
    const line = this.text[row]
    this.text.splice(row,1,
      line.substring(0,col-1)+line.substring(col))
    if (!remote){
      this.string.deleteFromPos(charPos-1)
    } else {
      this.updateCursor('removePrevChar',row,col)
    }
    this.updateCharOffset(row,-1)
  }

  joinWithNextLine(row,remote){ // remove CR
    const charPos = this.getCharPos(row+1,0)-1
    this.text.splice(row,2,
      this.text[row]+ this.text[row+1])
    if (!remote){
      this.string.deleteFromPos(charPos)
    } else {
      this.updateCursor('joinWithNextLine',row)
    }
    this.updateCharOffsetCR(row,-1)

  }

  updateCursor(op,row,col){
    let curRow = this.cursor[0]
    let curCol = this.cursor[1]
    if (row>curRow) {return}

    switch(op){
      case "insertChar":
          if ((row==curRow) && (col<=curCol)){
            this.cursor[1]++
            if (col<this.colOffset){
              this.colOffset++
            }
          }
          break;
      case "splitRow":
          if (row <curRow){
            this.cursor[0]++
            if (row<this.rowOffset){
              this.rowOffset++;
            }
          }
          break;
      case "removePrevChar":
          if ((row==curRow) && (col<=curCol)){
            this.cursor[1]--
            if (col<this.colOffset){
              this.colOffset--
            }
          }
          break;
      case "joinWithNextLine":
          if (row <curRow){
            this.cursor[0]--
            if (row<this.rowOffset){
              this.rowOffset--
            }
          }
          break;
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
    if (row >=0 && row < this.text.length)
      return this.text[row]
    else return ""
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
tw.canvasEditor=ed1
