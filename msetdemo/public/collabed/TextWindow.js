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

  lastWindowOffset(){
    //console.log(`lastWindowOffset`)
    let pos = this.windowOffset
    for (let line of this.lines) {
      pos += line.length + 1
    }
    //console.log("="+pos)
    return pos
  }

  getCursorRowCol(){
    // we assume this is only called when the cursor is in the view

    if (this.cursorPos < this.windowOffset || this.cursorPos > this.lastWindowOffset()){
      console.log(`ERROR: in getCursorRowCol(${this.cursorPos})`)
      throw new Error("in getCursorRowCol")
    }
    let p=this.windowOffset
    let prevOffset=0
    let row = 0
    console.log(`this.lines = ${JSON.stringify(this.lines,null,2)} row=${row}`)
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

  updateLinesAroundCursorPos(){
    // this will set the cursor pos to the first line of the window
    console.log("updateLinesAroundCursorPos")
    this.printState()
    console.log("after printState")
    /*
    if (this.windowOffset <= this.cursorPos
        &&
        this.cursorPos <= this.lastWindowOffset()){
      console.log("reloading lines in the window")
      this.reloadLines()
      return
    }
    */
    console.log("shifting the window")
    let allLines = this.string.ddll_lines()
    if (this.windowOffset <= this.cursorPos && this.cursorPos<=this.lastWindowOffset()){
      this.reloadLines()
      return
    }
    console.log("find the new rowOffset")
    let p=0
    let lastp=0
    let i=0
    while (p <= this.cursorPos && i < allLines.length) {
      lastp = p
      p += allLines[i].length+1
      i=i+1
    }
    console.log(`p=${p}  lastp=${lastp} i=${i}`)
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
    console.log(`insertCharAtCursorPos(${JSON.stringify(char,null,2)})`)
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
    console.log(`grl(${row})  lines=${JSON.stringify(this.lines,null,2)} offset=${this.rowOffset}`)
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
    this.cursorPos = this.string.getPos(this.cursor[0],this.cursor[1])
    if (row < this.rowOffset ||row >= this.rowOffset+this.rows) {
      this.updateCache(row)
    }
  }

  setCursorRC(rc){
    this.cursor = rc
    this.updateCache(rc[0])
    // we may need to update the CACHE when the cursor is moved...
  }

  getCurrentRow(){
    return this.cursor[0]
  }

  setCurrentRow(row){
    // if the row is outside of the cached region
    // we need to pull in new rows!

    this.cursor[0] = row
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
    this.updateCache(row)
  }

  updateCache(row){
    // I think this should only is called if you use the slider
    // which isn't implemented yet!
    //return
    //console.log(`*******\n*******\nin updateCache row=${row}, this.rows=${this.rows} rowOffset=${this.rowOffset}`)
    if (row >= this.rowOffset && row < this.rowOffset+this.rows) {
      return
    } else {
      //console.log("RESHAPING WINDOW ********")
      const viewOffset = Math.min(this.scrollOffset,this.rows-1)
      const firstRow = Math.max(0,row-viewOffset)
      const lastRow = Math.min(firstRow+this.rows,this.lastRow+1)
      //console.log('before slice: '+JSON.stringify(this.lines,null,2))
      //console.log(`firstRow=${firstRow} lastRow=${lastRow}`)
      //console.log(`this.text=${JSON.stringify(this.text,null,2)}`)

      this.lines = this.getStringSlice(firstRow,lastRow) // replace with call to DLL

      if (this.lines.length==0) {
        this.lines = [""]
      }
      //console.log('after slice: '+JSON.stringify(this.lines,null,2))
      //console.log(`lines=\n${this.lines}`)
      this.rowOffset = firstRow
      this.windowOffset = this.string.getPos(firstRow,0)


      if (row<this.rowOffset || row>=this.rowOffset+this.rows){
        console.log("\n RRRRRR\nupdating???")
        //this.rowOffset = firstRow
      }
    }


  }

  getStringSlice(start, end){
    return this.string.getStringSlice(start,end)
    /*
    const a = this.string.getStringSlice(start,end)
    const b = this.text.slice(start,end)
    console.log(`a: ${JSON.stringify(a,null,2)}`)
    console.log(`b: ${JSON.stringify(b,null,2)}`)
    console.log(`a==b: ${JSON.stringify(a)== JSON.stringify(b)}`)

    return this.text.slice(start,end)
    */
  }

  updateCacheExact(row){
    // this will only be called when we add a slider to jump to an arbitrary pos
    // in the file. It is not called when the window is moved by key presses and
    // mouse clicks
    console.log(`\nQQQQQ  in updateCacheExact row=${row}, this.rows=${this.rows} rowOffset=${this.rowOffset}`)
    // sets the rowOffset to row exactly

    const firstRow = row
    const lastRow = Math.min(firstRow+this.rows,this.lastRow+1)
    //console.log('before slice: '+JSON.stringify(this.lines,null,2))
    this.lines = this.string.getStringSlice(firstRow,lastRow)
      //this.lines.slice(firstRow-this.rowOffset,lastRow-this.rowOffset)
    if (this.lines.length==0) {
      this.lines = [""]
    }
    //console.log('after slice: '+JSON.stringify(this.lines,null,2))

    if (row<this.rowOffset || row>=this.rowOffset+this.rows){
      console.log("QQQQQ Updating!")
      this.rowOffset = firstRow
      this.windowOffset = this.string.getPos(firstRow,0)
    }
    //console.log(`lines=\n${this.lines}`)

  }




  getCurrentCol(){
    return this.cursor[1]
  }

  setCurrentCol(col){
    this.cursor[1]= col
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
  }




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


  getPos(cursor){
    return this.getCharPos(cursor[0],cursor[1])
  }

  getCharPos(row,col){
    /*
      this is only called from inside this class
      if row is within the cache it is very efficient
      if row is above or below the cache it requires linear time
    */
    return this.string.getPos(row,col)
    /*
    let sum=0

    for(let i=0; i<row; i++){
      sum += this.text[i].length+1  // have to add 1 for the CR at the end of the line ...
    }
    sum += col
    return sum
    */
  }

  getLine(row){
    const theLines = this.string.getStringSlice(row,row+1)
    console.log(`getLine(${row}) = ${JSON.stringify(theLines,null,2)}`)
    return theLines.length>0?theLines[0]:""
  }

  getLocalLine(row){
    // this is only called with the row is in the cache
    theLine = this.lines[row-this.rowOffset]
    console.log(`getLocalLine(${row}) = ${JSON.stringify(theLine,null,2)}`)
    return theLine
  }

  oldGetLine(row){
    // this is junk!

    // if row is in the cache this is efficient, else it takes linear time
    // we should start searching from the top or bottom of the cache
/*
    console.log("\n\nIN GETLINE")
    console.log(`row=${row} rowOffset=${this.rowOffset} local=${row-this.rowOffset}`)
    console.log(`this.lines.length=${this.lines.length}`)
    console.log(JSON.stringify(this.lines,null,2))

    console.log(this.lines[row-this.rowOffset])
    console.log(JSON.stringify(this.lines,null,2))
    console.log(JSON.stringify(this.text,null,2))
    */

    //return this.text[row]
    //console.log(`getLine(${row})=> ${JSON.stringify(this.lines[row-this.rowOffset])}`)
    //console.log(`row-this.rowOffset=${row-this.rowOffset}`)
    //console.log("in getLine "+row)
    const theLines = this.string.getStringSlice(row,row+1)
    //console.log(`getLine(${row}) = ${JSON.stringify(theLines,null,2)}`)
    return theLines.length>0?theLines[0]:""

    if (row<this.rowOffset || row >= this.rowOffset + this.lines.length) {
      return this.string.getStringSlice(row,row+1)
    } else {
      const line = this.lines[row-this.rowOffset]
      if (typeof(line)=='string') {
        return this.lines[row-this.rowOffset]
      }
      else {
      //console.log(`ERROR row=${row} lines=${JSON.stringify(this.lines,null,2)} rowOffset=${this.rowOffset}`)
      //console.log(`line=${JSON.stringify(line,null,2)}`)
        return ""
      }
    }

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
