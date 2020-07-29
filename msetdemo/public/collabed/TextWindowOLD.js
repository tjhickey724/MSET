import {DDLLstring} from "./DDLLstring.js"
export {TextWindow}

//console.log("loading TextWindow.js")

// here is the function which is called by the DDLL server
// when it processes insert and delete operations on the string
// either by the user or remotely


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
    This class will represent a text object and a window onto that text object.
    Its methods are called by the CanvasEditor class which responds to user input
    It maintain the state of the underlying document (a string) as well as the
    cursor.  The user interactions (arrow keys, inserting, deleting, mouse clicks)
    introduce changes in the cursor position which are handled in CanvasEditor.

  **/

  constructor(ddll){

    // these are the necessary state variables
    this.windowOffset = 0  // the position of 1st visible character in the windowOffset
    this.cursorPos = 0 //
    this.rows = 10
    this.cols = 80
    this.colOffset=0
    this.string =  new DDLLstring(this)
    this.docSize=0

    // these are all computed state variables
    this.lines=[""] // cached text!

    this.lastRow = 0
    this.cursor = [0,0]
    this.rowOffset=0

    this.scrollOffset = 2 // this is for how much you want to scroll when recentering...

    this.redrawCanvas = ()=> {console.log("redrawing not initialized yet")}

    this.debugging=true
  }

  printState(){
    if (!this.debugging){
      return
    }

    // print the current state of the editor
    console.log(`\n********************
EDITOR STATE: "+new Date()
rows=${this.rows} cols=${this.cols}
rowOffset=${this.rowOffset} numRows=${this.lines.length}
colOffset = ${this.colOffset}
windowOffset=${this.windowOffset} lastWindowOffset=${this.lastWindowOffset()} this=${this}
lastRow = ${this.lastRow}
lines = ${JSON.stringify(this.lines,null,2)}
ddl_lines = ${JSON.stringify(this.string.ddll_lines(),null,2)}
cursor=${JSON.stringify(this.cursor,null,2)}
cursorPos = ${this.cursorPos}
docSize = ${this.docSize}
**********************\n`)
  }

  moveCursor(k){
    // this advances the cursor forward or backward in the viewing region
    this.cursorPos += k
    this.cursorPos = Math.max(0,Math.min(this.cursorPos,this.docSize))
    this.centerView()
  }

  moveCursorUp(){
    //console.log("moveCursorUp")
    //console.log(`cursorPos=${this.cursorPos}`)
    const [row,col] = this.getCursorRowColSLOW()
    //console.log(`rc = [${row},${col}]`)
    if (row==0) {
      return
    }
    const newPos = this.getPosSLOW(row-1,col)
    //console.log('newCursorPos = '+newPos)
    this.cursorPos = newPos
  }

  moveCursorDown(){
    //console.log(`moveCursorDown`)
    const [row,col] = this.getCursorRowColSLOW()
    //console.log(`rc=[${row},${col}]`)
    const newPos = this.getPosSLOW(row+1,col)
    //console.log(`pos=${newPos}`)
    this.cursorPos = newPos
  }

  getPosSLOW(row,col) {
    const lines = this.string.ddll_lines()
    //console.log(`getPosSLOW(${row},${col})`)
    //console.log(`lines=${JSON.stringify(lines,null,2)}`)
    let pos = 0
    for(let i=0; i<Math.min(row,lines.length); i++){
      pos += lines[i].length+1
    }
    if (row>=lines.length){
      return pos-1
    } else if (row<0){
      return 0
    } else {
      pos += Math.min(lines[row].length,col)
      return pos
    }

  }



  getCursorRowCol(){
    // we assume this is only called when the cursor is in the view

    if (this.cursorPos < this.windowOffset || this.cursorPos > this.lastWindowOffset()){
      //console.log(`ERROR: in getCursorRowCol(${this.cursorPos})`)
      return this.getCursorRowColSLOW()
    }
    let p=this.windowOffset
    let prevOffset=0
    let row = 0
    //console.log(`this.lines = ${JSON.stringify(this.lines,null,2)} row=${row}`)
    while (p <= this.cursorPos && row<this.lines.length){
      prevOffset = p
      p+= this.lines[row].length+1
      row += 1
    }
    if (row>this.lines.length){
      //at end of last line with a CR
      row++
      prevOffset=p
    }
    let cursorRow = row-1
    let cursorCol = this.cursorPos - prevOffset
    this.cursor = [cursorRow,cursorCol]
    return this.cursor
  }


  getCursorRowColSLOW(){
    return this.getRowColSLOW(this.cursorPos)
  }


  getRowColSLOW(pos){
    // this returns the row and col for a general cursorPos
    if (pos < 0 || pos > this.docSize){
      //console.log(`ERROR: in getCursorRowCol(${this.cursorPos})`)
      throw new Error("gcrSLOW")
    }
    let lines = this.string.ddll_lines()
    let p=0
    let prevOffset=0
    let row = 0

    while (p <= pos && row<lines.length){
      prevOffset = p
      p+= lines[row].length+1
      row += 1
    }
    if (row>lines.length){
      //at end of last line with a CR
      row++
      prevOffset=p
    }
    let cursorRow = row-1
    let cursorCol = pos - prevOffset
    return [cursorRow,cursorCol]
  }

  lastWindowOffset(){
    //console.log(`lastWindowOffset`)
    let pos = this.windowOffset
    for (let line of this.lines) {
      pos += line.length + 1
    }
    //console.log("="+pos)
    return pos
  }

  updateLinesAroundCursorPos(){
    // this will set the cursor pos to the first line of the window
    //console.log("updateLinesAroundCursorPos")
    this.printState()
    //console.log("after printState")
    /*
    if (this.windowOffset <= this.cursorPos
        &&
        this.cursorPos <= this.lastWindowOffset()){
      //console.log("reloading lines in the window")
      this.reloadLines()
      return
    }
    */
    //console.log("shifting the window")
    let allLines = this.string.ddll_lines()
    if (this.windowOffset <= this.cursorPos && this.cursorPos<=this.lastWindowOffset()){
      this.reloadLines()
      return
    }
    //console.log("find the new rowOffset")
    let p=0
    let lastp=0
    let i=0
    while (p <= this.cursorPos && i < allLines.length) {
      lastp = p
      p += allLines[i].length+1
      i=i+1
    }
    //console.log(`p=${p}  lastp=${lastp} i=${i}`)
    let cursorRowOffset = lastp
    let cursorRow = i-1
    let cursorCol = this.cursorPos - cursorRowOffset
    this.cursor = [cursorRow,cursorCol]
    this.rowOffset = cursorRow
    this.windowOffset = cursorRowOffset
    this.reloadLines()
  }

  reloadLines(){
    //console.log("in reloadlines")
    let allLines = this.string.ddll_lines()
    this.lines = allLines.slice(this.rowOffset,this.rowOffset+this.rows)
    //console.log(`realoadLines() => ${JSON.stringify(this.lines,null,2)}`)
  }




  centerView(){
    // first we make sure the row containing the cursor is visible
    if (this.cursorPos < this.windowOffset ||
        this.cursorPos > this.lastWindowOffset()) {
      this.updateLinesAroundCursorPos()
    }
    this.cursor = this.getCursorRowCol()
    if (this.cursor[1]<this.colOffset) {
      this.colOffset = Math.max(0,this.cursor[1]-this.scrollOffset)
    } else if (this.cursor[1]>=this.colOffset+this.cols){
      this.colOffset = Math.max(0,this.cursor[1]-this.scrollOffset)
    }
  }

  insertCharAtCursorPos(char){
    //console.log(`insertCharAtCursorPos(${JSON.stringify(char,null,2)})`)
    this.string.ddll.msetTree.insert(this.cursorPos,char)
    this.reloadLines()
    this.docSize+=1
    this.moveCursor(1)
  }

  removeCharBeforeCursorPos(){
    if (this.cursorPos>=1){
      this.string.ddll.msetTree.delete(this.cursorPos-1)
      this.reloadLines()
      this.docSize-=1
      this.cursorPos -= 1

    }
  }

  setRedrawCanvas(redraw){
    this.redrawCanvas = redraw
  }



  redraw(){
    this.redrawCanvas()
  }

  setRowsCols(rows,cols){
    this.rows = rows
    this.cols = cols
    //this.view.setRowsCols(rows,cols)
  }


  getNumRows(){
    // returns the height of the viewing window in rows
    // whether or not all rows are full
    return this.rows
  }

  getNumCols(){
    // gets the width of the viewing window
    return this.cols
  }

  getRowOffset(){
    return this.rowOffset
  }

  setRowOffset(row){
    this.updateCacheExact(row) //
    this.rowOffset = row
    this.windowOffset = this.string.getPos(row,0)
    // here we need to update the CACHE
  }

  getColOffset(){
    return this.colOffset
  }

  setColOffset(col){
    this.colOffset = col
  }

  getLastRow(){
    return this.lastRow
    //return this.view.getLastRow()

    // we need to keep track of this dynamically by
    // counting the number of newlines inserted and deleted in the text
    // the first time through will require a scan of the entire document
  }

  getRowLength(row){
    //return this.text[row].length
    //console.log(`grl(${row})  lines=${JSON.stringify(this.lines,null,2)} offset=${this.rowOffset}`)
    let localRow = row-this.rowOffset
    if (localRow<0 || localRow>=this.lines.length){
      const allLines = this.string.ddll_lines()
      if (row<0 || row>=allLines.length){
        throw("Error in grl")
      }
      return allLines[row].length
    }
    return this.lines[row-this.rowOffset].length
    // return this.view.getRowLength(row)
    // this is efficient if row is in the current CACHE
  }

  /* Cursor manipulation */

  setCursor(row,col){
    this.cursor = [row,col]
    this.cursorPos = this.getPosSLOW(this.cursor[0],this.cursor[1])

  }

  setCursorRC(rc){
    this.cursor = rc
    this.cursorPos = this.getPosSLOW(this.cursor[0],this.cursor[1])
    // we may need to update the CACHE when the cursor is moved...
  }

  getCurrentRow(){
    return this.cursor[0]
  }

  setCurrentRow(row){
    // if the row is outside of the cached region
    // we need to pull in new rows!
    this.cursor = this.getCursorRowColSLOW()
    this.cursor[0] = row
    this.cursorPos = the.getPosSLOW(row,this.cursor[1])
  }


  getCurrentCol(){
    return this.cursor[1]
  }

  setCurrentCol(col){
    this.cursor[1]= col
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
  }

/*

  splitRow(row,pos,remote){ // insert CR
    // this.textView.splitRow(row,pos,remote)
    //console.log(`splitRow(${row},${pos},${remote})`)
    const charPos = this.getCharPos(row,pos)
    //let line = this.text[row]
    //this.text.splice(row,1,
    //  line.substring(0,pos),line.substring(pos))

    let line = this.lines[row-this.rowOffset]
    this.lines.splice(row-this.rowOffset,1,
        line.substring(0,pos),line.substring(pos))
    const removedText = this.lines.slice(this.rows)
    this.lines = this.lines.slice(0,this.rows)

    this.lastRow += 1
    if (!remote){
      this.string.insertAtPos('\n',charPos)
    }
    // this replace one line of the cache with two new ones
    // and removes the last line of the cache
    this.printState()
  }

  removePrevChar(row,col,remote){ // for a non CR key
    // this.textView.removePrevChar(row,col,remote)
    //console.log(`removePrevChar(${row},${col},${remote})`)
    const charPos = this.getCharPos(row,col)
    //let line = this.text[row]
    //this.text.splice(row,1,
    //  line.substring(0,col-1)+line.substring(col))

    let line = this.lines[row-this.rowOffset]
    this.lines.splice(row-this.rowOffset,1,
      line.substring(0,col-1)+line.substring(col))
      // this.view.removePrevChar(row,col)
    if (!remote){
      this.string.deleteFromPos(charPos-1)
    }

    // this changes one line in the cache
    this.printState()
  }

  joinWithNextLine(row,remote){ // remove CR and pull another line into buffer
    //console.log(`joinWithNextLine(${row},${remote})`)
    const charPos = this.getCharPos(row+1,0)-1
    //this.text.splice(row,2,
    //  this.text[row]+ this.text[row+1])
    const localRow = row - this.rowOffset
    this.lines.splice(localRow,2,
      this.lines[localRow]+ this.lines[localRow+1])

    // this.view.joinWithNextLine(row)
    this.lastRow -= 1
    //console.log(`r=${this.rows} o=${this.rowOffset} lr=${this.lastRow}`)
    if (this.rowOffset+this.rows <= this.lastRow) {
      const nextRow = this.getLine(this.rowOffset+this.rows)
      //console.log(`nextRow=${nextRow}`)
      this.lines[this.rows-1] = nextRow

    } else {

    }
    if (!remote){
      this.string.deleteFromPos(charPos)
    }
    //this replaces two lines of the cache with a new joined one
    // and potentially pulls in a new line into the cache
    this.printState()
  }

*/

  getPos(cursor){
    return this.getCharPos(cursor[0],cursor[1])
  }

  getCharPos(row,col){
    return this.string.getPos(row,col)
  }

  getLine(row){
    const theLines = this.string.getStringSlice(row,row+1)
    //console.log(`getLine(${row}) = ${JSON.stringify(theLines,null,2)}`)
    return theLines.length>0?theLines[0]:""
  }

  getLocalLine(row){
    // this is only called with the row is in the cache
    theLine = this.lines[row-this.rowOffset]
    //console.log(`getLocalLine(${row}) = ${JSON.stringify(theLine,null,2)}`)
    return theLine
  }

  getCurrentLine() {
    // this is very efficient as long as we update the cache when setting the cursor
    //return this.text[this.cursor[0]]
    return this.lines[this.cursor[0]-this.rowOffset]
  }

  getCurrentLineLength(){
    // very efficient
    //return this.text[this.cursor[0]].length
    return this.lines[this.cursor[0]-this.rowOffset].length
  }

}
