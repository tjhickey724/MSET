import {DDLLstring, TextView} from "./TextView.js"
export {TextWindow}

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
