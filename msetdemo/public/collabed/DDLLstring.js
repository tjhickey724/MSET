import {DDLL} from '../mset/DDLL.js'
export {DDLLstring}

//console.log("In DDLLstring.js!!!!!")
//console.log(`io=${io}`)



const namespace="/demo2"
const documentId = "default"

//this.mset.msetTree.insert(offset+i,text[i])

/*
  This class represents the underlying document.

  For now it represents the document as a single string.

  Next I will replace the underlying string with the DDLL object.

*/
class DDLLstring{
  constructor(textWin){

    this.string = ""
    this.textWin = textWin

    this.editorCallbacks =
      (op,pos,elt,user,me) =>{
        // first we do some local processing
        console.log(`\nZZZ editorCallback(${op},${pos},${elt},${user},${me})`)
        const theLines = this.ddll.toString('','std')
        //console.log(`theLines=${JSON.stringify(theLines,null,2)}`)
        this.textWin.printState()
        switch(op){
          case "init":
            break
          case "insert":
            //console.log("insert callback\n"+JSON.stringify([ta1.readOnly,'insert',pos,elt,user,me]))
            if (user==me) return
            // adjust the windowOffset and cursorPos and docSize
            this.textWin.docSize++
            if (pos<this.textWin.windowOffset){
              this.textWin.windowOffset++
              this.textWin.cursorPos++
            } else if (pos <= this.textWin.cursorPos){
              this.textWin.cursorPos++
              this.textWin.reloadLines()
              this.textWin.redraw()
            }else if (pos <= this.textWin.lastWindowOffset()){
              this.textWin.reloadLines()
              this.textWin.redraw()
            }
            break
          case "delete":
            //console.log("in delete callback\n"+JSON.stringify([ta1.readOnly,'delete',pos,elt,user,me]))
            if (user==me) return
            // adjust the windowOffset and cursorPos and docSize
            this.textWin.docSize--
            if (pos<this.textWin.windowOffset){
              this.textWin.windowOffset--
              this.textWin.cursorPos--
            } else if (pos <= this.textWin.cursorPos){
              this.textWin.cursorPos--
              this.textWin.reloadLines()
              this.textWin.redraw()
            }else if (pos <= this.textWin.lastWindowOffset()){
              this.textWin.reloadLines()
              this.textWin.redraw()
            }

            break
        }
        console.log("Just processed a remote operation "+op+" "+pos)
        this.textWin.printState()
      }

      this.ddll = new DDLL([],this.editorCallbacks,io(namespace),documentId)

      //console.log(`this.ddll=${this.ddll}`)
      //console.dir(this.ddll)

      this.ddll_lines =
         () => this.ddll.msetTree.toList2('std').join('').split("\n")


  }


  update_the_lines(){
    this.textWin.lines = this.ddll_lines().slice(this.textWin.rowOffset,this.textWin.rowOffset+this.textWin.rows)
  }



  /*


  */
  getRowColOLD(pos){
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

  getPos(r,c){
    let row=0;
    let col=0;
    let p = 0;
    while(row<r || (row==r && col<c)){
      if (this.string[p]=='\n'){
        row += 1; col=0;
      } else{
        col+=1;
      }
      p++;
    }
    return p
  }

  getStringSliceOLD(startLine,endLine){
    //console.log(`getStringSlice(${startLine},${endLine})`)

    const lines = this.ddll_lines()
    return lines.slice(startLine,endLine)
  }
}
