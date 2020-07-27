import {DDLLstring, TextView} from "./TextView.js"
export {TextWindow}


// here is the function which is called by the DDLL server
// when it processes insert and delete operations on the string
// either by the user or remotely


function OLDeditorCallbacks(op,pos,elt,user,me){
  /* This is called whenever a local or remote operation is performed
     on the underlying mset tree
  */


  console.log(`editorCallbacks(${op},${pos},${elt},${user},${me})`)

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
    recalculated.  Eventually, we will add a slider which can affect the cursor
    position globally, but not in this iteration.

    This method calls methods in the DDLLstring class to update the underlying
    document by the following two actions
      insertAtPos(char,pos)
      deleteFromPos(pos)
    I think we should also define the remote editor callback here in this package
    and have it passed into the DDLLstring which can either use DDLL or a simple
    String.  We can then have DDLLstring implement the methods to pull in new lines,
    e.g.
      getLineInfo(pos) ==> [startOfLine,chars]
    this method find the beginning of the line containing the character
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

    Also, I need to replace all operations on this.text with a method call
    to this.textView this will allow us to maintain the list of strings
    in the window without having to worry about all of the other lines.
    As it is we need a an array whose length is up to the size of the document
    which can be inefficient...

    The assumption is that this.textView will only operate on text which is in
    the window.  If we need to move the window, then we will update the textView
    Perhaps the textView needs to have access to the DDLLstring
    (or maybe we can push the entire DDLLstring code and the editorCallbacks
    into TextView....)

    Also the ddll parameter of the constructor should be used to connect
    the TextView to a particular document on a particular DDLL server.

    So the TextWindow class serves as a link between the CanvasEditor class
    and the TextView class, the latter maintains a cache of data from the
    DDLL server which is accessed from the DDLLstring class.

    Lets first just have TextView store all of the rows of data!
    Then we can optimize it to hold only a cached subset.
    Then we can switch DDLLstring to a mode using the DDLL itself.

    Maybe I should just create new a variable:
    localRow  = row-rowOffset
    and always index into that ...
    Then I don't need the TextView at all...

    I think I'll try that and I'll go one step
    by letting localText[] be the array of cached text!
    So I can just git rid of TextWindow entirely...

    I will do this this afternoon.
  **/

  constructor(ddll){


    this.windowOffset = 0  // the position of 1st visible character in the windowOffset
    this.lastWindowOffset = 0
    this.cursor = [0,0]
    this.cursorPos = 0 //
    this.rowOffset=0
    this.colOffset=0
    this.rows = 10
    this.cols = 80

    this.text = [""]
    this.view = new TextView(this.rows,this.cols,ddll)

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

    this.string = new DDLLstring(this)

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
    return this.text.length-1
    //return this.view.getLastRow()

    // we need to keep track of this dynamically by
    // counting the number of newlines inserted and deleted in the text
    // the first time through will require a scan of the entire document
  }

  getRowLength(row){
    return this.text[row].length
    // return this.view.getRowLength(row)
    // this is efficient if row is in the current CACHE
  }

  /* Cursor manipulation */

  setCursor(row,col){
    this.cursor = [row,col]
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
    // we may need to update the CACHE when the cursor is moved...
  }

  setCursorRC(rc){
    this.cursor = rc
    // we may need to update the CACHE when the cursor is moved...
  }

  getCurrentRow(){
    return this.cursor[0]
  }

  setCurrentRow(row){
    this.cursor[0] = row
    this.cursorPos = this.getCharPos(this.cursor[0],this.cursor[1])
    // we may need to update the CACHE when the cursor is moved...
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
    // this changes one character in one line of the CACHE
  }

  splitRow(row,pos,remote){ // insert CR
    // this.textView.splitRow(row,pos,remote)
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

  removePrevChar(row,col,remote){ // for a non CR key
    // this.textView.removePrevChar(row,col,remote)
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

  joinWithNextLine(row,remote){ // remove CR
    this.textView.joinWithNextLine(row,remote)
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



  getCharPos(row,col){
    /*
      this is only called from inside this class
      if row is within the cache it is very efficient
      if row is above or below the cache it requires linear time
    */
    let sum=0

    for(let i=0; i<row; i++){
      sum += this.text[i].length+1  // have to add 1 for the CR at the end of the line ...
    }
    sum += col
    return sum
  }

  getLine(row){
    // if row is in the cache this is efficient, else it takes linear time
    // we should start searching from the top or bottom of the cache
    return this.text[row]
  }

  getCurrentLine() {
    // this is very efficient as long as we update the cache when setting the cursor
    return this.text[this.cursor[0]]
  }

  getCurrentLineLength(){
    // very efficient
    return this.text[this.cursor[0]].length
  }

}
