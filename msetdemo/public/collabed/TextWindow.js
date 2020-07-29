//import {DDLLstring} from "./DDLLstring.js"
import {DDLL} from '../mset/DDLL.js'
export {TextWindow}

const namespace = "/demo2"
const documentId = "default"

//console.log("loading TextWindow.js")

// here is the function which is called by the DDLL server
// when it processes insert and delete operations on the string
// either by the user or remotely



class TextWindow{
  /**
    This class will represent a text object and a window onto that text object.
    Its methods are called by the CanvasEditor class which responds to user input
    It maintain the state of the underlying document (a string) as well as the
    cursor.  The user interactions (arrow keys, inserting, deleting, mouse clicks)
    introduce changes in the cursor position which are handled in CanvasEditor.

  **/

  constructor(ddllSpec){

    // these are the necessary state variables
    this.windowOffset = 0  // the position of 1st visible character in the windowOffset
    this.cursorPos = 0 //
    this.rows = 10
    this.cols = 80
    this.colOffset=0
    this.docSize=0

    // these are all computed state variables
    this.lines=[""] // cached text!

    this.lastRow = 0
    this.cursor = [0,0]
    this.rowOffset=0

    this.scrollOffset = 2 // this is for how much you want to scroll when recentering...

    this.redrawCanvas = ()=> {console.log("redrawing not initialized yet")}

    this.debugging=true

    this.editorCallbacks =
      (op,pos,elt,user,me) =>{
        // first we do some local processing
        console.log(`\nZZZ editorCallback(${op},${pos},${elt},${user},${me})`)
        const theLines = this.ddll.toString('','std')
        //console.log(`theLines=${JSON.stringify(theLines,null,2)}`)
        this.printState()
        switch(op){
          case "init":
            break
          case "insert":
            //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
            if (user==me) return
            // adjust the windowOffset and cursorPos and docSize
            this.docSize++
            if (pos<this.windowOffset){
              this.windowOffset++
              this.cursorPos++
            } else if (pos <= this.cursorPos){
              this.cursorPos++
              this.reloadLines()
              this.redraw()
            }else if (pos <= this.lastWindowOffset()){
              this.reloadLines()
              this.redraw()
            }
            break
          case "delete":
            //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
            if (user==me) return
            // adjust the windowOffset and cursorPos and docSize
            this.docSize--
            if (pos<this.windowOffset){
              this.windowOffset--
              this.cursorPos--
            } else if (pos <= this.cursorPos){
              this.cursorPos--
              this.reloadLines()
              this.redraw()
            }else if (pos <= this.lastWindowOffset()){
              this.reloadLines()
              this.redraw()
            }

            break
        }
        console.log("Just processed a remote operation "+op+" "+pos)
        this.printState()
      }

      this.ddll =
          new DDLL([],
                   this.editorCallbacks,
                   io(ddllSpec.namespace),
                   ddllSpec.documentId)

      //console.log(`this.ddll=${this.ddll}`)
      //console.dir(this.ddll)

      this.ddll_lines =
         () => this.ddll.msetTree.toList2('std').join('').split("\n")

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
ddl_lines = ${JSON.stringify(this.ddll_lines(),null,2)}
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
    const lines = this.ddll_lines()
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
    let lines = this.ddll_lines()
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
    let allLines = this.ddll_lines()
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
    let allLines = this.ddll_lines()
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
    this.ddll.msetTree.insert(this.cursorPos,char)
    this.reloadLines()
    this.docSize+=1
    this.moveCursor(1)
  }

  removeCharBeforeCursorPos(){
    if (this.cursorPos>=1){
      this.ddll.msetTree.delete(this.cursorPos-1)
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


}
