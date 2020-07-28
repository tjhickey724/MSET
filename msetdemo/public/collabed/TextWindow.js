import {DDLLstring} from "./DDLLstring.js"
export {TextWindow}


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
    introduce changes in the cursor position which are handled in CanvasEditor
    Remote operations however can also change the row/col/position of the cursor
    and are handled here.

    The viewing window is represented by
    * its size in rows and cols
    * its upper left corner (in rowOffset and charOffset and colOffset)
    We also keep track of the lastCharOffset for the window which
    is the number of characters before the first line not in the window.
    Note, we store the entire lines with the interval [rowOffset, rowOffset+rows]
    The cursor is represented by [row,col]

    Most of the time, the user will be interacting with only those rows in the window,
    but when they move the arrow above the top line or below the bottom line,
    the system will pull in some number of new rows and the offsets will be
    recalculated. This is the only time it needs to get data from the DDLL server.

    Eventually, we will add a slider which can affect the cursor
    position globally, but not in this iteration.

    This class calls methods in the DDLLstring class to update the underlying
    document by the following two actions
      insertAtPos(char,pos)
      deleteFromPos(pos)
    I think we should also define the remote editor callback here in this package
    and have it passed into the DDLLstring which can either use DDLL or a simple
    String.  We can then have DDLLstring implement the methods to pull in new lines,
    e.g.
      getLineInfo(pos) ==> [startOfLine,chars]
    this method finds the beginning of the line containing the character
    at the specified position and it returns the string of all characters in that line
    The newline character is considered to be the character at the end of the line.

    The remote operations are all insertCharAtPos or removeCharFromPos
    and these are handled by the usual DDLLstring operations but they
    also affect the cursor, charOffset, lastCharOffset, and rowOffset if they appear
    before the window, and the effets on the cursor can be subtle.
    When we refactor, we will move the cursor change code into TextWindow
    and have the CanvasEditor call methods to move the cursor. Perhaps if
    we keep track of the charOffset of each line, then we can represent the
    cursor position simply by its offset position in the entire document
    and rapidly calculate the row/col as needed...



  **/

  constructor(ddll){


    this.windowOffset = 0  // the position of 1st visible character in the windowOffset
    this.lastWindowOffset = 0
    this.lastRow = 0
    this.cursor = [0,0]
    this.cursorPos = 0 //
    this.rowOffset=0
    this.colOffset=0
    this.rows = 10
    this.cols = 80

    //this.text = [""]
    //this.view = new TextView(this.rows,this.cols,ddll)
    this.lines=[""] // cached text!

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

    this.string =
      new DDLLstring(this)

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
    return this.lines[row-this.rowOffset].length
    // return this.view.getRowLength(row)
    // this is efficient if row is in the current CACHE
  }

  /* Cursor manipulation */

  setCursor(row,col){
    this.cursor = [row,col]
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
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
      const viewOffset = Math.min(5,this.rows-1)
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

      if (row<this.rowOffset || row>=this.rowOffset+this.rows){
        //console.log("updating!")
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
    //console.log(`in updateCacheExact row=${row}, this.rows=${this.rows} rowOffset=${this.rowOffset}`)
    // sets the rowOffset to row exactly

    const firstRow = row
    const lastRow = Math.min(firstRow+this.rows,this.lastRow+1)
    //console.log('before slice: '+JSON.stringify(this.lines,null,2))
    this.lines = this.lines.slice(firstRow-this.rowOffset,lastRow-this.rowOffset)
    if (this.lines.length==0) {
      this.lines = [""]
    }
    //console.log('after slice: '+JSON.stringify(this.lines,null,2))

    if (row<this.rowOffset || row>=this.rowOffset+this.rows){
      //console.log("Updating!")
      this.rowOffset = firstRow
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

  insertChar(row,col,key,remote){ // for a non CR key
    //console.log(`insertChar(${row},${col},${key},${remote})`)
    const charPos = this.getCharPos(row,col)
    const line = this.getLine(row)
    const first = line.substring(0,col) // first part
    const rest = line.substring(col)
    const newline = first+key+rest
    //this.text[row]=newline
    //console.log(`before insertion: ${JSON.stringify(this.lines,null,2)}`)
    this.lines[row-this.rowOffset] = newline
    //console.log(` after insertion:${JSON.stringify(this.lines,null,2)}`)
    if (!remote){
      this.string.insertAtPos(key,charPos)
    }
    // this changes one character in one line of the CACHE
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
    this.lastRow += 1
    if (!remote){
      this.string.insertAtPos('\n',charPos)
    }
    // this replace one line of the cache with two new ones
    // and removes the last line of the cache
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

  }

  joinWithNextLine(row,remote){ // remove CR
    //<this.textView.joinWithNextLine(row,remote)
    //console.log(`joinWithNextLine(${row},${remote})`)
    const charPos = this.getCharPos(row+1,0)-1
    //this.text.splice(row,2,
    //  this.text[row]+ this.text[row+1])
    const localRow = row - this.rowOffset
    this.lines.splice(localRow,2,
      this.lines[localRow]+ this.lines[localRow+1])
    // this.view.joinWithNextLine(row)
    this.lastRow -= 1
    if (!remote){
      this.string.deleteFromPos(charPos)
    }
    //this replaces two lines of the cache with a new joined one
    // and potentially pulls in a new line into the cache

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
