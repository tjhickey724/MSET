/*
  start thie collabed editor with
  % npm start
  and access it on port 4000
  localhost:4000

  6/15/2019 5pm
  I've modified the code so that one user can type a single
  line with no backspace or newlines and it wraps the text
  and puts a red line at the far right for wrapped lines.
  

  6/15/2019 noon
  I'm starting with a version in which the users can type at the end
  of the edit but can't backspace or use the mouse.

  5/29/2019
  I've removed the code to handle anything except character key presses.
  My plan is to implement a minimal version which only keeps track of the
  firstCharOffset, currCharOffset, visRows, visCols, mousePos and uses these 4 values
  to redraw the screen and update the state after every keypress/mouseclick.

*/
import {DDLL} from '../mset/DDLL.js'
/*
  I need to revise the redraw Canvas to use the FontMetrics
  and draw all of the lines. This should be pretty easy to do!
*/
console.log("In editor.js!!!!!")
let Zthis='zzz' // I could use the bind method to avoid this approach ...

class DDLLstring{
  /* This class implements the internal representation of the collaboratively
   * edited string. Currently we have two representations
   * this.ddll  which is our true, efficient rep
   * this.string which is a debugging rep, that will be eliminated
   *
   * Remote Operations result in operations on the textWin
   *  which is of type CanvasEditorWrapping
   */
  constructor(textWin){
    this.string = ""
    this.ddll = new DDLL([],editorCallbacks(this,textWin),io('/demo2'), 'doc0')
    this.textWin = textWin
  }

  getChars(rowCharOffset,visCols){
    // get the next row starting at rowCharOffset
    // and ending with a end-of-line or visCols characters
    // This needs to return both the string of characters
    // and a boolean indicating if the line is longer that visCols characters
    console.log("in getChars "+rowCharOffset+" "+visCols)
    let nextNewline = this.string.indexOf('\n',rowCharOffset)
    let longLine=false
    if (nextNewline == -1) {
      nextNewline = this.string.length - rowCharOffset
    } else {
      nextNewline = nextNewline-rowCharOffset
    }


    let lineLength = Math.min(nextNewline,visCols)

    console.log('nextNewline='+nextNewline)
    console.log('lineLength = '+lineLength)
    console.log('this.string= "'+this.string+'"')
    const result= this.string.substring(rowCharOffset,lineLength+rowCharOffset)
    console.log("==>"+ result)
    return {chars:result, eol:nextNewline<=visCols}
  }

  insertAtPos(char,pos){
    // this.string is a local representation which we
    // are keeping only for debugging while we develop
    // it will be removed in the final version
    this.string = this.string.substring(0,pos)+char+this.string.substring(pos)
    //console.log(JSON.stringify(['local',this.string]))
    //console.log('this.ddll.insert('+char+','+pos+')')

    // here we are applying the operation on our local ddll representation
    this.ddll.insert(pos,char)

  }

  insertAtPosRemote(char,pos){

    // this is our temporary debugging representation of the
    // local string
    this.string = this.string.substring(0,pos)+char+this.string.substring(pos)
    //console.log(JSON.stringify(this.string))

    // here is where we update the local view
    // this will change in the wrapped-text version


    let rc = this.getRowCol(pos)
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


    //console.log(JSON.stringify(["in deleteFromPos",pos]))
    //console.log(this.string.substring(0,pos))
    //console.log(this.string.substring(pos+1))
    this.string = this.string.substring(0,pos)+this.string.substring(pos+1)
    //console.log(JSON.stringify(this.string))
    //console.log(rc)

    // here we apply the remote operation locally
    // but this will change in our wrapped-text version
    const char=this.string[pos]
    let rc = this.getRowCol(pos)
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
    // this is for debugging only ....
    // this should be updated to get the string from the DDLL object
    return this.string
  }

  getRowCol(pos){
    // this will not be needed in our wrapped-text version
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

/*
* This is called by the DDLL editor when ever an edit operation is processed
* Remote edits received from other users are converted into the XRemote ops
* Local edits are ignored as they have already been processed.
*/
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

class TextWindowWrappingNEW{

    constructor(){
      this.string = new DDLLstring(this)
      this.visRowData=[{offset:0,eol:true}]
      this.visCharOffset=0
      this.visCursorPos={offset:0,row:0,col:0}
      this.visRows = 10
      this.visCols = 80
    }


    setVisRowsCols(visRows,visCols){
      this.visRows = visRows
      this.visCols = visCols
    }


    getDDLLString(){
      // this returns DDLLstring object
      return this.string
    }

    getNumVisRows(){
      return this.visRows
    }

    getNumVisCols(){
      return this.visCols
    }

    getRowChars(rowCharOffset){
      // get the next row starting at rowCharOffset
      // and ending with a end-of-line or visCols characters
      //console.log("in getRowChars: "+rowCharOffset)
      return this.string.getChars(rowCharOffset,this.visCols)

    }




}

class TextWindowWrapping{
  /**
    This class will represent a text object and a window onto that text object.
    The model will be with text wrapped from one line to the next if it is too long.
    We'll add some graphical objects at the start and end to indicate line wrapping...
    but not at first...

    We will keep track of the rowoffset and coloffset as it is useful for the user.
    The only really important value is the firstCharOffset as we can redraw the window
    using only that ...
    I will also create a this.visText field to represent the visible rows of text
    and this will be used to redraw the screen. We will also update it when local or
    remote operations are performed. Likewise, the this.visCursor will represent the cursor
    position relative to the window.
  **/

  constructor(){
    this.string = new DDLLstring(this)
    this.visRowData=[{offset:0,eol:true}]
    this.visCharOffset=0
    this.numVisChars=0
    this.visCursorPos={offset:0,row:0,col:0}
    this.visRows = 10
    this.visCols = 80

    this.text = [""]
    this.visText = [""]

    // we keep track of the char offsets
    // that describe the visible text
    this.firstCharOffset = 0  // position of 1st visible character
    this.lastCharOffset = 0 // position of the last visible character

    this.cursor = [0,0]
    this.visCursor = [0,0]
    this.rowOffset=0
    this.colOffset=0

  }

  setVisRowsCols(visRows,visCols){
    this.visRows = visRows
    this.visCols = visCols
  }


  getDDLLString(){
    // this returns DDLLstring object
    return this.string
  }

  getNumVisRows(){
    return this.visRows
  }

  getNumVisCols(){
    return this.visCols
  }


  getRowChars(rowCharOffset){
    // get the next row starting at rowCharOffset
    // and ending with a end-of-line or visCols characters
    console.log("in getRowChars: "+rowCharOffset+ ' vc:'+this.visCols)
    console.log(this.string.string)
    const result = this.string.getChars(rowCharOffset,this.visCols)
    console.log('chars => ')
    console.dir(result)
    return result
  }

  insertAtPosRemote(char,charOffset){
    // all we need to do here is to adjust
    // adjust the values of
    // this.visCharOffset,
    // this.visCursor.offset, and
    // this.numVisChars
    // and this.visRowData

    if (charOffset <= this.visCursor.offset){
      this.visCursor.offset++
    }
    if (charOffset<this.visCharOffset){
      this.visCharOffset++
    } else if (charOffset <this.visCharOffset+this.numVisChars){
      this.numVisChars ++;
      updateVisRowData(charOffset)
    }
  }

  updateVisRowData(charOffset){
    // visRowData has an element {offset:K, eol:B}
    // which gives the offset of the character at the
    // beginning of the line, and a boolean value B
    // indicating whether the line ends in a CRLF or not
    // but we can do this when we draw the screen ...
  }


  // deprecated
  getRowOffset(){
    return this.rowOffset
  }

  // deprecated
  setRowOffset(row){
    // we need to update the firstCharOffset and lastCharOffset
    // for the visible window ...

    // but we don't allow setting the row to a negative
    // or after the end of the text...
    let lastRow = this.getRowTotal()-1
    this.rowOffset = Math.max(0,Math.min(row,lastRow))

    this.updateCharOffsetAfterMove(row)
  }

  // deprecated
  getColOffset(){
    return this.colOffset
  }

  // deprecated
  setColOffset(col){
    this.colOffset = col
  }

  // deprecated
  getLastRow(){
    return this.text.length-1
  }

  // deprecated
  getRowLength(row){
    return this.text[row].length
  }

  // deprecated
  setCursor(row,col){
    this.cursor = [row,col]
  }

  // deprecated
  getCurrentRow(){
    return this.cursor[0]
  }

  // deprecated
  setCurrentRow(row){
    this.cursor[0] = row
  }

  // deprecated
  getCurrentCol(){
    return this.cursor[1]
  }

  // deprecated
  setCurrentCol(col){
    this.cursor[1]= col
  }

  // deprecated
  setFirstCharOffset(a){
    this.firstCharOffset = a
    //console.log('firstCharOffset = '+a)
  }

  // deprecated
  setLastCharOffset(a){
    this.lastCharOffset = a
    //console.log('lastCharOffset = '+a)
  }

  // deprecated
  updateFirstCharOffset(delta){
    this.setFirstCharOffset(this.firstCharOffset+delta)
  }

  // deprecated
  updateLastCharOffset(delta){
    this.setLastCharOffset(this.lastCharOffset+delta)
  }

  // deprecated
  updateCharOffset(row,delta){
    //console.dir(['updateCharOffset',row,delta,this])
    // update the charOffset of the visible window
    // when the length of the specified row has changed by delta
    if (row<this.getRowOffset()){
      this.updateFirstCharOffset(delta)
    } else if (row <= this.getRowOffset()+this.getNumVisRows()){
      this.updateLastCharOffset(delta)
    }
  }

  // deprecated
  getRowTotal(){
    return this.text.length
  }

  // deprecated
  updateCharOffsetCR(row,delta){
    //console.dir(['updateCharOffsetCR',row,delta,this])
    // update the charOffset of the visible window
    // when the specified row has been changed by
    // adding a CR in the row (delta=1)
    // or removing the CR at the end of the row (delta=-1)
    let rowOffset = this.getRowOffset()
    let numVisRows = this.getNumVisRows()

    if (delta>0) { // inserting a CR on specified row
      if (row<rowOffset){
        this.updateFirstCharOffset(delta)
      } else {
        let lastRow = rowOffset+numVisRows-1;
        let lastRealRow = this.getRowTotal()-1
        //console.log(JSON.stringify([row,delta,lastRow,rowOffset,numvisRows,lastRealRow,this.getRowTotal()]))
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
      } else if (row <= rowOffset+numVisRows){
        // adding a new line to end of visible range
        let firstHiddenRow = rowOffset+numVisRows+1
        if (firstHiddenRow > this.getRowTotal()){
          this.updateLastCharOffset(-1)
        } else {
          let nextLine = this.getLine(rowOffset+numVisRows+1)
          this.updateLastCharOffset(nextLine.length-1)
        }
      }
    }
  }

  // deprecated
  updateCharOffsetAfterMove(row) {
    //console.dir(['updateCharOffsetAfterMove',row,this])
    let rowOffset = this.getRowOffset()
    let numVisRows = this.getNumVisRows()
    if (row < rowOffset) {
      let a = this.getCharPos(row,0)
      let b = this.getCharPos(row+numVisRows+1,0)
      this.setFirstCharOffset(a)
      this.setLastCharOffset(b)
    }
  }



  // deprecated
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

  // deprecated
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

  // deprecated
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

  // deprecated
  joinWithNextLine(row,remote){ // remove CR
    const charPos = this.getCharPos(row+1,0)-1
    const rowLength = this.text[row].length
    this.text.splice(row,2,
      this.text[row]+ this.text[row+1])
    if (!remote){
      this.string.deleteFromPos(charPos)
    } else {
      this.updateCursor('joinWithNextLine',row,rowLength)
    }
    this.updateCharOffsetCR(row,-1)

  }

  // deprecated
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
          } else if (row==curRow){
            if (col<=curCol){
              this.cursor[0]++;
              this.cursor[1] -= col
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
          if (row <curRow-1){
            this.cursor[0]--
            if (row<this.rowOffset){
              this.rowOffset--
            }
          } else if (row== curRow-1){
            this.cursor[0]--
            this.cursor[1]+= col
          }
          break;
        }

  }



  // deprecated
  getCharPos(row,col){
    let sum=0

    for(let i=0; i<row; i++){
      sum += this.text[i].length+1  // have to add 1 for the CR at the end of the line ...
    }
    sum += col
    return sum
  }

  // deprecated
  getLine(row){
    if (row >=0 && row < this.text.length)
      return this.text[row]
    else return ""
  }

  // deprecated
  getCurrentLine() {
    return this.text[this.cursor[0]]
  }

  // deprecated
  getCurrentLineLength(){
    return this.text[this.cursor[0]].length
  }

}
//================

//================
/*
*/
class CanvasEditorWrapping{

  constructor(mset,textWindow){
    this.msetCanvas = mset
    this.textWindow = textWindow

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


    let msetCE = this    // I can git rid of this using "bind"

    this.fontSize = this.getFontSize()



    this.msetCanvas.width = window.innerWidth*0.9;
    this.msetCanvas.height = window.innerHeight*0.9;
    let numVisRows = Math.floor(this.msetCanvas.height/this.lineHeight);
    let numVisCols = Math.floor(this.msetCanvas.width/(this.charWidth))

    this.textWindow.setVisRowsCols(numVisRows,numVisCols);

    // this.state =
    //    {text:[""],
    //     cursor:[0,0],
    //     rowOffset:0,
    //     colOffset:0,
    //     VisRows:numVisRows,visCols:numVisCols}

    let theState = this.state  // again, use "bind" to get rid of the hack




    // here is how we can get the key which is pressed
    this.msetCanvas.addEventListener('keydown', function(event) {
        console.log("handline keydown event")
        msetCE.addKeyPress(event);
        msetCE.redrawmsetCanvas();
            });

    // here is how we can get the position of the mouseclick
    /*
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
    */

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
      let numVisRows = Math.floor(this.msetCanvas.height/this.lineHeight);
      let numVisCols = Math.floor(this.msetCanvas.width/(this.charWidth))

      // this.state.visCols = numVisCols
      // this.state.VisRows = numVisRows
      //let state = this.state
    //  console.dir(state)
      this.textWindow.setVisRowsCols(numVisRows,numVisCols)

      return this.ctx.measureText(this.letters);
  }


    clearmsetCanvas(){
      const ctx = this.msetCanvas.getContext('2d')
      ctx.fillStyle='white'
      ctx.fillRect(0,0,window.innerWidth,window.innerHeight)
    }



    /*
    CURRENTLY WORKING ON THIS METHOD!
    */
    addKeyPress(event){
      const key = event.key
      let state = this.state
      console.log('calling addKeyPress '+key)
      if (event.ctrlKey){
        return
        // process ^F ^B ^N ^P to move cursor ...
        // ^A beginning of line ^E end of line
        // ^D delete next character
      } /** else if (key=='ArrowLeft'){
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
      } **/ else if (key=='Enter'){
        this.insertCRLF()
        return
      } else if (this.allLetters.indexOf(key)<0) {
        return
      } else {
        this.insertKey(key)
      }
    }

    // REWRITE THIS FROM SCRATCH
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

    // REWRITE FROM SCRATCH
    insertCRLF(){
      const row =this.state.getCurrentRow()
      const pos = this.state.getCurrentCol()

      this.state.splitRow(row,pos)
      this.state.setCursor(row+1,0)
    }

    //REWRITE FROM SCRATCH
    /* insert the character at the cursor
       use offset of the cursor to updated the
       DDLL list
       then update the visCursorPos data
       If the column goes beyond the width, then
       the visRowData will need to insert a new row
       As a first step we'll just insert the char at
       the current position, update the cursor,
       and rewrite the redrawmsetCanvas
       and see if it works on one line!
    */
    insertKey(key){
      const cursorPos = this.textWindow.visCursorPos
      console.log('insertKey. cursorPos=')
      console.dir(cursorPos)
      this.textWindow.string.insertAtPos(key,cursorPos.offset)
      cursorPos.offset++;
      cursorPos.col++;
      console.dir(cursorPos)


    }

    insertKeyOLD(key){
      const row = this.state.getCurrentRow()
      const col = this.state.getCurrentCol()

      this.state.insertChar(row,col,key)
      this.state.setCursor(row,col+1)
    }

    //=============

    /*
    this should look at the firstCharOffset, the numRows and numCols fields,
    and use them to draw the lines on the screen...
    */


    redrawmsetCanvas(){
      this.getFontSize()
      this.clearmsetCanvas()
      let textWindow = this.textWindow


      // start at the visCharOffset
      let visRow=0
      let visCol=0
      let rowCharOffset = textWindow.visCharOffset
      console.log("visRows="+textWindow.visRows)
      while(visRow < textWindow.visRows) {

        let row = textWindow.getRowChars(rowCharOffset)

        textWindow.visRowData[visRow]=
           {offset:rowCharOffset,eol:row.eol}

        this.drawRow(row.chars,visRow,row.eol)
        rowCharOffset += row.chars.length


        visRow++
      }
      textWindow.numVisChars = rowCharOffset - this.textWindow.visCharOffset
    }

    drawRow(line,visRow,eol){
      const ctx = this.msetCanvas.getContext('2d')
      ctx.fillStyle='black'
      const text = ctx.measureText(line)
      const start = 0
      const baseline = (1+visRow)*this.lineHeight+this.lineDescent
      const topline = this.lineHeight
      ctx.fillText(line,start,baseline)
      ctx.fillStyle='red'
      if (!eol) {
        ctx.fillRect(this.msetCanvas.width-5,baseline-this.lineHeight,1,this.lineHeight)
      }
      console.log('done drawing)')
    }

    // REWRITE THIS FROM SCRATCH
    redrawmsetCanvasOLD(){
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
      console.log('firstCharOffset='+theState.firstCharOffset)
      console.log('visRows = '+theState.visRows)
      console.log('visCol = '+theState.visCols)
      console.log('\n*******************\n')


      if ((theState.getCurrentRow()<theState.getRowOffset())  ) {
        theState.setRowOffset(Math.max(0,theState.getCurrentRow()-5))
      } else if (theState.getCurrentRow() >=
                   theState.getRowOffset()+theState.getNumVisRows()){
        theState.setRowOffset(theState.getRowOffset()+5)
      }

      let col = theState.getCurrentCol()
      let colOffset = theState.getColOffset()
      let numVisCols = theState.getNumVisCols()
      if ((col<colOffset)  ) {
        theState.setColOffset(Math.max(0,col-5))
      } else if (col>= colOffset+numVisCols){
        theState.setColOffset(Math.max(0,colOffset + numVisCols-5));
      }
      colOffset = theState.getColOffset()

      let rowOffset = theState.getRowOffset()
      let numVisRows = theState.getNumVisRows()
      let rowEnd = Math.min(theState.getLastRow(),numVisRows+rowOffset)
      numVisCols = theState.getNumVisCols()


      for(let i=rowOffset; i<= rowEnd ; i++){
        const line =theState.getLine(i).substring(colOffset,colOffset+numVisCols+5)
        const text = ctx.measureText(line)
        const start = 0
        const baseline = (1+i-rowOffset)*this.lineHeight+this.lineDescent
        const topline = this.lineHeight
        ctx.fillText(line,start,baseline)
      }

      this.drawCursor()
    }

    // REMOVE THIS
    printState(){
      console.log(JSON.stringify(this.state))
    }


    // REWRITE THIS FROM SCRATCH
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

const tw = new TextWindowWrapping()
//const st = tw.getString();
const ed1 = new CanvasEditorWrapping(mset,tw)
tw.canvasEditor=ed1
