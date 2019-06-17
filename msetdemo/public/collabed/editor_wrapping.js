/*
  start thie collabed editor with
  % npm start
  and access it on port 4000
  localhost:4000

  6/15/2019 5pm
  I've modified the code so that one user can type a single
  line with no backspace and it wraps the text
  and puts a red line at the far right for wrapped lines.
  Next we should scroll the window up when they type off the bottom
  of the screen...



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
    //console.log("in getChars "+rowCharOffset+" "+visCols)
    let nextNewline = this.string.indexOf('\n',rowCharOffset)
    let longLine=false
    if (nextNewline == -1) {
      nextNewline = this.string.length - rowCharOffset
    } else {
      nextNewline = nextNewline-rowCharOffset
    }


    let lineLength = Math.min(nextNewline,visCols)


    const result= this.string.substring(rowCharOffset,lineLength+rowCharOffset)
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

    this.textWin.insertAtPosRemote(char,pos)

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

}

/*
* This is called by the DDLL editor when ever an edit operation is processed
* Remote edits received from other users are converted into the XRemote ops
* Local edits are ignored as they have already been processed.
*/
function editorCallbacks(ddllString,textWin){
  return (op,pos,elt,user,me) => {
  console.log('editorCallbacks:'+JSON.stringify([op,pos,elt,user,me]))
  switch(op){
    case "init": /* maybe block input on the canvas?? */  break;
    case "insert":
      //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
      if (user==me) return
      ddllString.insertAtPosRemote(elt,pos)
      // I need to update the cursor position in the textWin ... on remote ops....
      textWin.redrawScreen()
      break
    case "delete":
      //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
      if (user==me) return
      ddllString.deleteFromPosRemote(pos)
      textWin.redrawScreen()
      break
  }
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
    this.redrawScreen = () => false;  // we need this to redraw the screen after remote ops

    this.visRowData=[{offset:0,eol:true}]
    this.visCharOffset=0
    this.numVisChars=0
    this.visCursorPos={offset:0,row:0,col:0}
    this.visRows = 10
    this.visCols = 80

  }

  printState(){
    console.log('**************************\n'+
    'TWW\n')
    console.dir(
      {string:this.string.string,
       cursor:this.visCursorPos,
       rowData:this.visRowData,
       visCharOffset:this.visCharOffset,
       numVisChars:this.numVisChars,
       visRowsCols:[this.visRows,this.visCols]
     })

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
    const result = this.string.getChars(rowCharOffset,this.visCols)
    return result
  }

  insertAtPosRemote(char,charOffset){
    // all we need to do here is to adjust
    // adjust the values of
    // this.visCharOffset,
    // this.visCursor.offset, and
    // this.numVisChars
    // and this.visRowData

    if (charOffset <= this.visCursorPos.offset){
      this.visCursorPos.offset++
    }
    if (charOffset<this.visCharOffset){
      this.visCharOffset++
    } else if (charOffset <this.visCharOffset+this.numVisChars){
      this.numVisChars ++;
    }
    this.redrawScreen();
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
    this.textWindow.redrawScreen = () => this.redrawmsetCanvas();

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
      }  else if (key=='ArrowLeft'){
          const cursor = this.textWindow.visCursorPos;
          cursor.offset = Math.max(0,cursor.offset-1);
          this.redrawmsetCanvas();
        return
      } else if (key=='ArrowRight'){
          const cursor = this.textWindow.visCursorPos;
          const stringLength = this.textWindow.string.string.length
          cursor.offset = Math.min(stringLength,cursor.offset+1);
          this.redrawmsetCanvas();
        return
      } /* else if (key=='ArrowUp'){
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
        console.log("PRINT STATE!!")
        this.textWindow.printState()
        this.insertKey(key)
        console.log("inserted "+key)
        this.textWindow.printState()
      }
    }

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

    insertCRLF() {
      this.insertKey('\n')
    }


    //=============

    /*
    this should look at the firstCharOffset, the numRows and numCols fields,
    and use them to draw the lines on the screen...
    */


    /*
    this should update visRowData and visCursorPos
    as the row and column may change
    */
    redrawmsetCanvas(){
      this.getFontSize()
      this.clearmsetCanvas()
      let textWindow = this.textWindow


      // start at the visCharOffset
      let visRow=0
      let visCol=0
      let rowCharOffset = textWindow.visCharOffset
      //console.log("visRows="+textWindow.visRows)
      while(visRow < textWindow.visRows) {

        let row = textWindow.getRowChars(rowCharOffset)
        let cursorPos = this.textWindow.visCursorPos;

        textWindow.visRowData[visRow]=
           {offset:rowCharOffset,eol:row.eol}

        this.drawRow(row.chars,visRow,row.eol)
        if ((rowCharOffset<=cursorPos.offset)
            &&
             (cursorPos.offset<= rowCharOffset+row.chars.length))
          {
            cursorPos.row = visRow
            cursorPos.col = cursorPos.offset-rowCharOffset ;
          }
        rowCharOffset += row.chars.length +(row.eol?1:0)


        visRow++
      }
      textWindow.numVisChars = rowCharOffset - this.textWindow.visCharOffset
      this.drawCursor()
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
        ctx.fillRect(this.msetCanvas.width-5,baseline-this.lineHeight+this.lineDescent,1,this.lineHeight)
      }
      //console.log('done drawing)')
    }

    // REMOVE THIS
    printState(){
      console.log(JSON.stringify(this.state))
    }


    // REWRITE THIS FROM SCRATCH
    drawCursor(){
      const cursor = this.textWindow.visCursorPos;
      const visibleColumn = cursor.col;
      const visibleRow = cursor.row;

      const start = visibleColumn*this.charWidth
      const baseline = visibleRow*this.lineHeight+this.lineSep+this.lineDescent
      const topline = this.lineHeight-this.lineSep+this.lineDescent+1

      const ctx = this.msetCanvas.getContext('2d')
      ctx.fillStyle='black'
      ctx.fillRect(start,baseline, 1,topline)
      console.log(JSON.stringify([cursor,start,baseline,topline]))
    }

}

const tw = new TextWindowWrapping()
//const st = tw.getString();
const ed1 = new CanvasEditorWrapping(mset,tw)
tw.canvasEditor=ed1
