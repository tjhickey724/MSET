import {TextWindow} from './TextWindow.js'
export {CanvasEditor}
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
const ed1 = new CanvasEditor(mset,tw)
