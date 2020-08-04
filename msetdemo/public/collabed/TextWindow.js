//import {DDLLstring} from "./DDLLstring.js"
import {DDLL} from '../mset/DDLL.js'
export {TextWindow}



class TextWindow{
  /**
    This class will represent a text object and a window onto that text object.
    Its methods are called by the CanvasEditor class which responds to user input
    It maintain the state of the underlying document (a string) as well as the
    cursor.  The user interactions (arrow keys, inserting, deleting, mouse clicks)
    introduce changes in the cursor position which are detected in CanvasEditor
    and handled in TextWindow. This class does need to call the redraw() method
    when remote operations are processed!

    This class processes insertion and deletion operations from the
    local user and from remote users.  It applies the operations to the
    underlying MSET data structure and it keeps track of a few key values
    that allow it to draw the relevant part of the document on the string.
    The nine operations are:
      remoteRemoveCharBeforePos(p)
      removeInsertCharAtPos(char,pos)
      insertCharAtCursorPos(char)
      removeCharBeforeCursorPos()
      move cursor forward, backward, up, down
      move cursor to where mouse clicked
    When necessary we can pull in a new line using the method
      this.getLineContainingPosFAST(pos)
    which returns the line containing that position
    as well as where it starts and ends:
       [line,startPos,endPos]

    In particular it keeps track of
    this.lines = the list of lines which are (at least partly) visible on the screen
    this.windowOffset = the position before the first character of the first "visible" line
    this.lastWindowOffsetPos = the position after the last visible character
    this.docSize = the total number of characters in the document
    this.cursorPos = the position right before the cursor
    this.rows = the number of visible rows
    this.cols = the number of visible columns

    With these seven values it can accurately draw the visible part of
    the document on the screen...

  **/

  constructor(ddllSpec){

    // these are the necessary state variables
    this.windowOffset = 0  // the position of 1st visible character in the windowOffset
    this.lastWindowOffsetPos = 0
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
        //this.printState()
        switch(op){
          case "init":
            break
          case "insert":
            //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
            if (user==me) {
              console.log("skipping my own op")
              return
            }
            // adjust the windowOffset and cursorPos and docSize
            this.docSize++
            if (pos<this.windowOffset){
              this.windowOffset++
              this.lastWindowOffsetPos++
              this.cursorPos++
            } else if (pos <= this.cursorPos){
              this.cursorPos++
              this.lastWindowOffsetPos++
              this.reloadLinesFAST()
              this.redraw()
            }else if (pos <= this.lastWindowOffsetPos){
              this.lastWindowOffsetPos++
              this.reloadLinesFAST()
              this.redraw()
            }
            break
          case "delete":
            //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
            if (user==me) {
              console.log("skipping my own op")
              return
            }
            // adjust the windowOffset and cursorPos and docSize
            this.docSize--
            if (pos<this.windowOffset){
              this.windowOffset--
              this.cursorPos--
              this.lastWindowOffsetPos--
            } else if (pos <= this.cursorPos){
              this.cursorPos--
              this.lastWindowOffsetPos--
              this.reloadLinesFAST()
              this.redraw()
            }else if (pos <= this.lastWindowOffsetPos){
              this.lastWindowOffsetPos--
              this.reloadLinesFAST()
              this.redraw()
            }

            break
        }
        console.log("Just processed a remote operation "+op+" "+pos)

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
windowOffset=${this.windowOffset} lastWindowOffset=${this.lastWindowOffsetPos} this=${this}
lastRow = ${this.lastRow}
lines = ${JSON.stringify(this.lines,null,2)}
ddl_lines = ${JSON.stringify(this.ddll_lines(),null,2)}
cursor=${JSON.stringify(this.cursor,null,2)}
cursorPos = ${this.cursorPos}
docSize = ${this.docSize}
**********************\n`)

    let lines0 = this.reloadLinesFAST(this.windowOffset,this.lastWindowOffset)
    console.log(`lines0 = ${JSON.stringify(lines0,null,2)}`)
  }

  printOffsetData(){
    console.log(`wo=${this.windowOffset} lwo=${this.lastWindowOffsetPos} cursorPos=${this.cursorPos}
ds=${this.docSize} rows=${this.rows} cols=${this.cols}
rowOffset=${this.rowOffset} colOffset=${this.colOffset}`)
  }
/*
  moveCursor(k){
    // this advances the cursor forward or backward in the viewing region
    console.log(`moveCursor(${k})`)
    this.printOffsetData()
    this.cursorPos += k
    this.cursorPos = Math.max(0,Math.min(this.cursorPos,this.docSize))
    this.centerView()
    this.printOffsetData()
  }
*/
  moveCursorRight(){
    // this advances the cursor forward or backward in the viewing region
    console.log(`moveCursorRight()`)
    this.printOffsetData()
    if (this.cursorPos==this.docSize){
      //console.log("can't move past end of document")
      return
    }
    this.cursorPos += 1
    const [row,col] = this.getVisRowColFAST(this.cursorPos)
    console.log(`[r,c]=${JSON.stringify([row,col],null,2)}`)
    if (col > this.colOffset+this.cols){
      this.colOffset+=1
    } else if (col < this.colOffset){
      // when we go past a CR to the next line
      this.colOffset=0
    }
    //this.cursorPos = Math.max(0,Math.min(this.cursorPos,this.docSize))
    if (this.cursorPos > this.lastWindowOffsetPos) {
      // pull in new line ... make sure this works when lastWindowOffsetPos=docSize
      const [line] = this.getLineContainingPosFAST(this.lastWindowOffsetPos+1)
      console.log(`new line is ${JSON.stringify(line,null,2)}`)
      // move the windowOffset to the beginning of the previous line
      //this.windowOffset += this.lines[0].length + 1


      this.lastWindowOffsetPos += line.length+1
      this.lines = this.lines.concat(line)
      this.colOffset=0
      this.printOffsetData()

      if (this.lines.length==this.rows){
        // if the view is full, then move the windowOffset up
        // to the end of the 2nd to the last line
        const firstLine = this.lines[0]
        this.windowOffset += firstLine.length+1
        this.lines = this.lines.slice(1)
      }
      //console.log(`wo=${this.windowOffset} lwo=${this.lastWindowOffsetPos}`)
      // add the new line to the front

      this.printOffsetData()
      console.log(`lines=${JSON.stringify(this.lines,null,2)}`)

      // if this.lines.length > this.rows, then slice off 1st row
      // and adjust window settings accordingly


    }
    //this.centerView()
    //this.printOffsetData()
  }

  moveCursorLeft(){
    // this advances the cursor forward or backward in the viewing region
    //console.log(`moveCursorLeft()`)
    //this.printOffsetData()
    this.cursorPos -= 1
    this.cursorPos = Math.max(0,Math.min(this.cursorPos,this.docSize))
    if (this.cursorPos < this.windowOffset){
      // pull in new line
      const [line] = this.getLineContainingPosFAST(this.windowOffset-2)
      //console.log(`new line is ${JSON.stringify(line,null,2)}`)
      // move the windowOffset to the beginning of the previous line
      this.windowOffset -= line.length + 1

      if (this.lines.length==this.rows){
        // if the view is full, then move the lastWindowOffsetPos up
        // to the end of the 2nd to the last line
        const lastLine = this.lines[this.lines.length-1]
        this.lastWindowOffsetPos -= lastLine.length+1
      }
      //console.log(`wo=${this.windowOffset} lwo=${this.lastWindowOffsetPos}`)
      // add the new line to the front
      this.lines = line.concat(this.lines)
      // possibly remove the last line
      this.lines = this.lines.slice(0,this.rows)

      // if lines.length>rows, then slice off the last line and
      // update coordinates
    }
    const [row,col] = this.getVisRowColFAST(this.cursorPos)
    console.log(`[r,c]=${JSON.stringify([row,col],null,2)}`)
    if (col > this.colOffset+this.cols){
      // this happens if we move to the end of the previous line
      this.colOffset = Math.max(0,col-this.cols)
    } else if (col < this.colOffset){

      // when we go past a CR to the next line
      this.colOffset = col
    }
    //this.centerView()
    //this.printOffsetData()
  }



  moveCursorUp(){
    /*
      This is an optimally efficient implementation of the moveCursorUp
      operation. It only goes back to the document if it has to.
      moveCursorDown is very similar...
    */
    console.log(`moveCursorUp()`)
    this.printOffsetData()
    //console.log("moveCursorUp")
    console.log(JSON.stringify(this.lines,null,2))
    if (this.windowOffset==0 && this.cursorPos<this.lines[0].length){
      console.log("can't move up from first line")
      return
    }
    if (this.cursorPos-this.windowOffset>this.lines[0].length){
      console.log("moving within the window)")
      // here we move up without changing the windowOffset
      const [row,col] = this.getVisRowColFAST(this.cursorPos)
      console.log(`grcFast => row col = ${row} ${col}`)
      const prevLineLen = this.lines[row-1].length
      console.log(`previous line length = ${prevLineLen}`)
      const newRow = row-1 + this.rowOffset
      const newCol = Math.min(col,prevLineLen)
      this.cursorPos =
           this.cursorPos - col - (prevLineLen+1)
           + newCol
      console.log(`new cursorPos=${this.cursorPos}`)
      console.log(`new cursor = ${newRow} ${newCol}`)
      this.cursor = [newRow,newCol]
      return
    } else {
      console.log("pulling in a new line")
      const [row,col] = this.getVisRowColFAST(this.cursorPos)
      console.log(`row col = ${row} ${col}`)
      if (this.windowOffset==0){
        console.log("can't move up from first line")
        return
      }
      // here we change the window offset
      // pull in the previous line
      const [line] = this.getLineContainingPosFAST(this.windowOffset-2)
      console.log(`new line is ${JSON.stringify(line,null,2)}`)
      // move the windowOffset to the beginning of the previous line
      this.windowOffset -= line.length + 1

      if (this.lines.length>=this.rows){
        // if the view is full, then move the lastWindowOffsetPos up
        // to the end of the 2nd to the last line
        this.lastWindowOffsetPos -= this.lines[this.rows-1].length+1
      }
      console.log(`wo=${this.windowOffset} lwo=${this.lastWindowOffsetPos}`)
      // add the new line to the front
      this.lines = line.concat(this.lines)
      // possibly remove the last line
      this.lines = this.lines.slice(0,this.rows)
      // adjust the cursor position
      const firstLineLen = line.length+1
      console.log(`lines=${JSON.stringify(this.lines,null,2)}`)

      this.cursorPos =
          this.cursorPos - col - (line.length+1)
          + Math.min(col,line.length)
      console.log(`cp=${this.cursorPos}`)
    }
    this.printOffsetData()
    this.reloadLinesFAST()
    this.printOffsetData()
  }
/*
  moveCursorUpOLD(){
    console.log(`moveCursorUp()`)
    this.printOffsetData()
    //console.log("moveCursorUp")
    //console.log(`cursorPos=${this.cursorPos}`)
    const [row,col] = this.getCursorRowColSLOW()
    //console.log(`rc = [${row},${col}]`)
    if (row==0) {
      this.printOffsetData()
      return
    }
    const newPos = this.getPosSLOW(row-1,col)
    //console.log('newCursorPos = '+newPos)
    this.cursorPos = newPos
    this.printOffsetData()
  }
*/

  moveCursorDown(){
    /*
      This is an optimally efficient implementation of the moveCursorUp
      operation. It only goes back to the document if it has to.
      moveCursorDown is very similar...
    */
    console.log(`moveCursorDown()`)
    this.printOffsetData()
    console.log("moveCursorDown")
    console.log(JSON.stringify(this.lines,null,2))
    const lastLine = this.lines[this.lines.length-1]
    if (this.lastWindowOffsetPos==this.docSize
        &&
        this.docSize <= this.cursorPos + lastLine.length) {
      console.log("can't move below the last line")
      return
    }
    const [row,col] = this.getVisRowColFAST(this.cursorPos)
    console.log(`grcFast => row col = ${row} ${col}`)
    if (row<this.lines.length-1){
      console.log("moving within the window)")
      // here we move up without changing the windowOffset
      const nextLineLen = this.lines[row+1].length
      console.log(`next line length = ${nextLineLen}`)
      const newRow = row+1 + this.rowOffset
      const newCol = Math.min(col,nextLineLen)
      this.cursorPos =
           this.cursorPos - col + (this.lines[row].length+1)
           + newCol
      console.log(`new cursorPos=${this.cursorPos}`)
      console.log(`new cursor = ${newRow} ${newCol}`)
      if (this.cursorPos<this.windowOffset
          ||
          this.cursorPos > this.lastWindowOffsetPos)
      {
            alert("ERROR in move cursor down.. cursor out of range")
      }
      this.cursor = [newRow,newCol]

    } else {
      console.log("pulling in a new line from last line")
      const curLine = this.lines[row]
      const [line] = this.getLineContainingPosFAST(this.lastWindowOffsetPos+1)
      console.log(`new line is ${JSON.stringify(line,null,2)}`)
      // move the windowOffset to the beginning of the previous line
      //this.windowOffset += this.lines[0].length + 1


      this.lastWindowOffsetPos += line.length+1
      // add the new line to the front
      this.lines = this.lines.concat(line)

      if (this.lines.length==this.rows){
        // if the view is full, then move the windowOffsetPos up
        // to the beginning of the 2nd line
        this.windowOffset += this.lines[0].length+1
        this.lines = this.lines.slice(1,this.rows)
      }
      console.log(`wo=${this.windowOffset} lwo=${this.lastWindowOffsetPos}`)


      // adjust the cursor position
      const lastLineLen = line.length+1
      console.log(`lines=${JSON.stringify(this.lines,null,2)}`)

      this.cursorPos =
          this.cursorPos - col + (curLine.length+1)
          + Math.min(col,line.length)
      console.log(`cp=${this.cursorPos}`)

      if (this.cursorPos<this.windowOffset
          ||
          this.cursorPos > this.lastWindowOffsetPos)
      {
            alert("ERROR in move cursor down")
      }

    }
    //this.printOffsetData()
    this.reloadLinesFAST()
    //this.printOffsetData()
  }

/*
  moveCursorDown(){
    console.log(`moveCursorDown()`)
    this.printOffsetData()
    //console.log(`moveCursorDown`)
    const [row,col] = this.getCursorRowColSLOW()
    //console.log(`rc=[${row},${col}]`)
    const newPos = this.getPosSLOW(row+1,col)
    //console.log(`pos=${newPos}`)
    this.cursorPos = newPos
    this.printOffsetData()
  }
  */

/*
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

*/

getPosFAST(row,col) {
  const lines = this.lines
  //console.log(`getPosSLOW(${row},${col})`)
  //console.log(`lines=${JSON.stringify(lines,null,2)}`)
  let pos = this.windowOffset
  row = Math.min(row,lines.length)
  for(let i=0; i<row; i++){
    pos += lines[i].length+1
  }
  if (row==lines.length){
    return pos
  } else {
    pos += Math.min(lines[row].length,col)
    return pos
  }


}

  getCursorRowCol(){
    // we assume this is only called when the cursor is in the view

    if (this.cursorPos < this.windowOffset || this.cursorPos > this.lastWindowOffsetPos){
      console.log(`ERROR: in getCursorRowCol(${this.cursorPos})`)
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

  getVisRowColFAST(pos){
    // this returns the row and col in the viewing window for a cursorPos
    // so anything in the first row of the window has row=0
    console.log(`grcF(${pos})`)
    this.printOffsetData()
    if (pos < 0) {
      pos=0
    } else if (pos > this.docSize){
      pos=this.docSize
      //console.log(`ERROR: in getCursorRowCol(${this.cursorPos})`)
      //throw new Error("gcrSLOW")
    }
    if (pos<this.windowOffset || pos>this.lastWindowOffsetPos){
      console.log(`calling grcSLOW(${pos}) wo=${this.windowOffset} lwo=${this.lastWindowOffsetPos}`)
      throw new Error("getRowColSLOW should not ever be called!")
    }
    pos = pos - this.windowOffset
    let lines = this.lines
    let p=0
    let prevOffset=0
    let row = 0

    while (p <= pos && row<lines.length){
      //console.log(`p=${p} prev=${prevOffset} row=${row}`)
      prevOffset = p
      p+= lines[row].length+1
      row += 1
    }
    //console.log(`p=${p} prev=${prevOffset} row=${row}`)
    if (row==lines.length){
      //console.log('lastline')
      return [row-1,pos-prevOffset] // this shouldn't happen!!
    }

    let cursorRow = row-1
    let cursorCol = pos - prevOffset
    console.log(`=> ${cursorRow} ${cursorCol}`)
    return [cursorRow,cursorCol]
  }

/*
  getCursorRowColSLOW(){
    return this.getRowColSLOW(this.cursorPos)
  }
*/
/*
  getRowColSLOW(pos){
    console.log(`grcSLOW(${pos})`)
    alert("We shouldn't be calling this!!")
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
    let cursor = [cursorRow-this.rowOffset,cursorCol]
    console.log(`=>${JSON.stringify(cursor,null,2)}`)
    return cursor
  }
  */

/*
  lastWindowOffset(){
    //console.log(`lastWindowOffset`)
    let pos = this.windowOffset
    for (let line of this.lines) {
      pos += line.length + 1
    }
    //console.log("="+pos)
    return pos -1
  }
  */

  updateLinesAroundCursorPosSLOW(){ //  SLOW
    // this will set the cursor pos to the first line of the window
    //console.log("updateLinesAroundCursorPos")
    this.printState()

    let allLines = this.ddll_lines()
    if (this.windowOffset <= this.cursorPos && this.cursorPos<=this.lastWindowOffsetPos){
      this.reloadLinesFAST()
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
    this.reloadLinesFAST()
  }


/*
  reloadLinesSLOW(){  // SLOW
    //console.log("in reloadLinesSLOW")
    let allLines = this.ddll_lines()
    this.lines = allLines.slice(this.rowOffset,this.rowOffset+this.rows)
    //console.log(`realoadLines() => ${JSON.stringify(this.lines,null,2)}`)
  }

  getReloadLinesSLOW(){
    return this.ddll_lines().slice(this.rowOffset,this.rowOffset+this.rows)
  }
  */

  reloadLinesFAST(startPos,endPos){  // SLOW
    startPos = startPos || this.windowOffset
    endPos = endPos || this.lastWindowOffsetPos
    //console.log(`reloadLinesFAST(${startPos},${endPos})`)
    //console.log(JSON.stringify(this.ddll_lines(),null,2))
     // here we make sure this.lines is correct

    if (this.docSize==0){
      this.lines = [""]
      return [""]
    }
    let lines =[]
    let line=""
    let p = startPos

    while (p<Math.min(endPos,this.docSize)){
      //console.log(`accessing nth(${p})`)
      const listNode = this.ddll.msetTree.strings.nth(p,'std')
      const eltsBeforeNode = listNode.indexOf("std")
      const subNode = listNode.data
      const userData = subNode.userData()
      const first = subNode.first
      const offset = (p - eltsBeforeNode + subNode.first)
      const pos = p-eltsBeforeNode
      const char = userData[pos]
      //console.log(JSON.stringify([p,userData,first,offset,pos,char]))

      for (let q=pos; q<userData.length; q++){
        let c = userData[q]
        if (c=='\n'){
          lines = lines.concat(line)
          line=""
        } else {
          line += c
        }
        p++
      }
    }

    //console.log("before:" +JSON.stringify(this.lines,null,2))
    lines = lines.concat(line)
    line=[]
    lines = lines.slice(0,this.rows)
    //console.log("after:" +JSON.stringify(this.lines,null,2))
    this.lines=lines
    return this.lines
  }

  getNthElement(p){
    // THIS HAS A BUG AT THE END...
    // when called for p beyond the end ..
    console.log(`getNthElement(${p})`)
    const listNode = this.ddll.msetTree.strings.nth(p,'std')
    const eltsBeforeNode = listNode.indexOf("std")
    const subNode = listNode.data
    const userData = subNode.userData()
    const first = subNode.first
    const offset = (p - eltsBeforeNode + subNode.first)
    const pos = p-eltsBeforeNode
    const char = userData[pos]
    console.log(`==> ${JSON.stringify(char,null,2)}`)
    return char
  }



  getLineContainingPosFAST(pos){
    // this returns a list [line,startPos,endPos]
    if (this.docSize==0) {
      return ["",0,0]
    }
    if (pos >= this.docSize || pos<0){
      return ["",pos,pos]
    }
    let char = this.getNthElement(pos)
    if (char=='\n'){
      return ["",pos,pos]
    }
    let line = [char]

    // get all characters on the line before p
    let p = pos-1
    if (p > 0) {
      char = this.getNthElement(p)
      while (char != '\n' && p>0){
        line = [char]+line
        p = p-1
        char = this.getNthElement(p)
      }
    }

    let startPos=p+1
    if (p==0) {
      startPos=0
      line = [char]+line
    }
    // get all characters on the line after p
    p = pos+1
    if (p<this.docSize){
      char = this.getNthElement(p)
      while (char != '\n' && p<this.docSize){
        line = line + [char]
        p = p+1
        char = this.getNthElement(p)
      }
    }
    let endPos=p-1
    if (false && p==this.docSize){
      endPos=p
      line = line + [char]
    }

    return [line,startPos,endPos]

  }



/*
  centerView(){
    // first we make sure the row containing the cursor is visible
    if (this.cursorPos < this.windowOffset ||
        this.cursorPos > this.lastWindowOffset()) {
      this.updateLinesAroundCursorPosSLOW()
    }
    this.cursor = this.getCursorRowCol()
    if (this.cursor[1]<this.colOffset) {
      this.colOffset = Math.max(0,this.cursor[1]-this.scrollOffset)
    } else if (this.cursor[1]>=this.colOffset+this.cols){
      this.colOffset = Math.max(0,this.cursor[1]-this.scrollOffset)
    }
  }
*/


  insertCharAtCursorPos(char){
    console.log(`insertCharAtCursorPos(${JSON.stringify(char,null,2)})`)
    this.printOffsetData()
    this.ddll.msetTree.insert(this.cursorPos,char)
    this.docSize+=1
    if (char != '\n'
          ||
        this.lines.length < this.rows
       )
    {
      this.lastWindowOffsetPos += 1
      //this.lines = this.lines.slice(0,this.rows)
    } else // char=='\n' and this.lines.length == this.rows
      if (
       this.cursorPos < this.lastWindowOffsetPos-this.lines[this.rows-1].length
     ){ // this is the case that the CR pushes the last line off the screen
       this.lastWindowOffsetPos -= this.lines[this.rows-1].length + 1
    } else {
      // in this case, the user is inserting a CR on the last line in the
      // viewing window and we will need to split the last line into two
      // and remove the first line
      this.lastWindowOffsetPos  += 1
      this.windowOffset += this.lines[0].length+1
    }


    this.printOffsetData()
    this.reloadLinesFAST()
    this.moveCursorRight()
    console.log("character has been inserted!")
    this.printState()
  }

  removeCharBeforeCursorPos(){
    console.log('rCBCP')
    this.printOffsetData()
    if (this.cursorPos==0){
      return
    }
    let char = this.getNthElement(this.cursorPos-1)
    console.log("before:\n"+JSON.stringify(this.ddll_lines(),null,2))
    this.ddll.msetTree.delete(this.cursorPos-1)
    console.log("after:\n"+JSON.stringify(this.ddll_lines(),null,2))
    this.docSize-=1
    this.cursorPos -= 1
    this.lastWindowOffsetPos -= 1
    this.printOffsetData()

    if (this.cursorPos < this.windowOffset){
      // the cursor is at the end of what was the previous line
      // we have deleted the CR between the lines ...
      console.log("We are pulling in a new line!")
      const [line,startPos,endPos]
          = this.getLineContainingPosFAST(this.cursorPos)
      this.windowOffset = startPos
      if (this.lines.length == this.rows){
        // remove the last line in the buffer
        this.lastWindowOffsetPos -= this.lines[this.rows-1].length+1
      }
      this.printOffsetData()
    } else if (char=='\n'){
      if (this.lines.length == this.rows && this.docSize>this.lastWindowOffsetPos){
        // pull in another line into the buffer and adjust lastWindowOffsetPos
        const [lastline,startP,endP]
            = this.getLineContainingPosFAST(this.lastWindowOffsetPos+1)

        this.lastWindowOffsetPos = endP
      }
      this.printOffsetData()
    }
    console.log("before rlFast")
    this.printState()
    this.reloadLinesFAST()
    console.log("after_rlF_returning from rCBCP")
    this.printState()
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
