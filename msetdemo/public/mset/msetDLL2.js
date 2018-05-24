export {msetDLL2}
import {wiDLL} from "./wiDLL.js"
import {wiBST} from "./wiBST.js"

/* ***********************************************************************
 * CORE MSET Demo Implementation in JavaScript
 *
 * This is an implementation of lists with insertion and deletion
 * which is fully distributive and in which all operations can be performed
 * in time O(log(n)) where n is the total number of operations applied to
 * the list so far. This is asymptotically optimal.
 *
 * This version uses "Subnodes" instead of single object Elements in the
 * underlying DLL, because of this it has the same efficiency as an array
 * initially and degrades by O(log(k)) where k is the number of insertions
 * and deletions performed on the DLL. It can be initialized with an array
 * of any size containing any kind of javascript objects!
 *
 * The main applications this was built for was
 *  -- a collaborative text editor
 * but we also have a demo of a collaborative JSON list editor
 * which allows any number of people to insert and remove JSON elements
 * from a shared list.
 *
 * The msetDLL2 has four main methods
 *  insert(pos,element)
 *  delete(pos)
 *  nth(pos)  -- return the nth element in the
 *  copy() -- return a copy of the DLL backed by a single array
 *            this is a kind of garbage collection...
 *
 * This can be used by a single user, or by multiple users on multiple computers
 * or in multiple threads. To use it with multiple users you need the MSET class
 * It also receives remote operations from the network and applies it to the tree
 * It requires a Network object and a Socket object,
 * which afre passed in when the tree is created...
 *
 */


class msetDLL2{
  constructor(u,network,elements){
    elements = elements || []
    this.user = u;
    this.count = 0;
    this.size=0;
    this.root = new Node(0,0,elements);

    this.strings = new wiDLL(Element.sizefn);
    this.nodes = {};
    this.nodes[[0,0]] = this.root;
    this.opqueue = [];  // dequeue of ops that haven't been applied
    this.waitqueue=[];  // hashtable from targets to list of ops
    this.emptyNetwork = {hide:(x)=>null,insert:(x)=>null,extend:(x)=>null}
    this.network = network || this.emptyNetwork

    this.insertCallback = function(k,elt,user){console.log("insert("+k+","+elt+","+user+")")}
    this.deleteCallback = function(k,elt,user){console.log("delete("+k+","+elt+","+user+")")}


    // the rest of this constructor initializes the
    // instance variables defined above ...
    // We add the three elements to the main DLL list
    const start = this.root.start
    const elts = this.root.subnodes.first.next.data
    const end = this.root.end
    console.dir([start,elts,end])
    start.listNode = this.strings.first.insertAfter(start)
    elts.listNode = start.listNode.insertAfter(elts)
    elts.listSubnode = this.root.subnodes.first.next
    end.listNode = elts.listNode.insertAfter(end)
    console.dir(this.root)


  }

  treeHeight(){
    return this.strings.tln.height
  }

  copy(){
    const elts = this.toList()
    const newMSET = new msetDLL()
    newMSET.insertAll(i,elts) // have to write insertALL
    return newMSET
  }


  toString(separator,feature){
    separator = separator || ''
    return this.strings.toString(separator,'std')
  }

  nth(n,feature){
    return this.strings.nth(n,'std').data.userData
  }

  toList(feature){
    return this.strings.toList('std')
  }
    /*
     * This method takes a tree op from the queue, checks to see if it can be applied
     * If its target is not there, it adds it to a wait queue on that target
     * If the target is in the tree, it applies to tree op, which generates a new node n
     * and the editops waiting on n are then added to the opqueue. It returns true if an operator
     * was processed, false otherwise.
     *
     * This method will only be necessary when not using a central server
     * because the central server serializes all of the calls. In this model,
     * when we get an op from the network we just enqueue it and then
     * periodically call processNetOp to handle those ops...
     */
  processNetOp(){
      if (this.opqueue.length == 0) // check to see that the queue is not empty, return else
          return false;

      var op=this.opqueue.shift(); // take from the head of the queue!
      var target=this.nodes[op.nodeid]; // make sure the target is in the tree

      if (target===undefined) {  // if not, then push onto the wait queue
          this.waitqueue[op.nodeid] = this.waitqueue[op.nodeid] || []; // make waitqueue empty if undefined
          this.waitqueue[op.nodeid].push(op);
      }else {                    // if so, then apply, and enqueue ops waiting for the created result

          var result = this.applyTreeOp(op); // returns new node it creates or extends
          var waiting = this.waitqueue[result.nodeid];
          this.waitqueue[result.nodeid]=null;
          if ((waiting !==undefined) && (waiting !== null)) {  // if something is waiting, add it to front of the opqueue
      this.opqueue = waiting.concat(this.opqueue);
          }
      }
      return true;
  }

  enqueue(op) {
    this.opqueue.push(op);
  }


    /* this method take a tree edit operation object
     which it obtains from the network and applies it to the tree
     returning the result. We assume that the target is in the tree!
     in this case the insert and extend can insert a list of characters
     we should also modify delete to delete a set of characters ..
    */
  applyTreeOp(treeOp){
      var n;
      if (treeOp.op == "insert") {
          n = this.treeinsert(treeOp.nodeid, treeOp.q, treeOp.un, treeOp.c);
      } else if (treeOp.op == "extend") {
          n = this.treeextend(treeOp.nodeid, treeOp.c);
      } else if (treeOp.op == "delete") {
          n = this.treehide(treeOp.nodeid, treeOp.q, treeOp.u, treeOp.size);
      }
      return n; // this has yet to be written ...
  }

  /* **************************************
   *  MSET DATA TYPE OPERATIONS
   */

  /* treeinsert(M,vm,q,un,c)
   *  this inserts the new node with id un and which contains c
   *  into the node with id vm at offset q
   *  and it updates M to reflect this change ...
   */

  treeinsert(vm,q,un,c){
      console.log('in treeinsert:'+JSON.stringify([vm,q,un,c]))
      console.dir(this)
      console.log(this.strings.tln.toStringIndent(5))
      const n = this.nodes[vm] // O(1) with a hashtable Implementation
      let s= null
      if ((q==n.elts.length) && (q>0)) {
        // we are inserting at the end of a node we don't own (else it would be tree extend)
        // we will make a new subnode and insert at the beginning of that
          s = n.subnodes.nth(q-1,'std')  // this returns a listNode, we may want elements instead
          console.dir(s)
          let e = s.data.split(s.size)
          console.dir(e)
          s = e.listNode
          console.log("just split s")
          console.dir(s)
      } else {
          s = n.subnodes.nth(q,'std') // return subnode containing offset q
          console.log('looking up subnode containing the qth element')
          console.dir(s)
      }
      console.dir([s,q,s.indexOf('std')])
      const s_offset = q - s.indexOf('std')
      const s_size = s.data.size;
      console.log(JSON.stringify([s_offset,s_size]))


      // in this conditional, we create the node m = (un,c)
      // and find insert it into the appropriate iset
      // after the conditional we see the node m in where we sew it in after
      let m = msetDLL2.createCharNode(un,c);  // O(1)
      console.log("***** m=")
      console.dir(m)
      let f=null
      let k=null

      if (s_offset==0){
        // then we need to insert in the InsertionSet at the left of this node
        // and we may need to create it
        if (!s.data.iset){
          s.data.iset = new InsertionSet()
          console.log("creating new iset")
        }
        k = s.data.iset.insertNode(m)
        console.log("k= "+k)
        if (k>0){
          f = s.data.iset.get(k-1).end.listNode
          console.log('f is end of previous iset entry')
          console.dir(f)
        } else if (q==0) {
              // here the node is inserted at pos q=0 in the parent node
              f=n.start.listNode;
              console.log('f is start of the whole dll')
              console.dir(f)
        } else { // q>0
              // if the node is not inserted at the beginning of the parent node
              // so there is a subnode that preceeds it
              f=n.subnodes.nth(q-1,'std');
              console.log('f is the previous subnode')
              console.dir(f)
        }
      } else { // (s_offset <= s_size){
        // we are inserting in the middle of the subnode and need to split it
        console.dir(s)
        let t = s.data.split(s_offset) // split subnode s and return the right half
        k = t.iset.insertNode(m)  // get its empty iset (which is created by split)
        console.log("just inserted the right half of split node:")
        console.dir(t)
        f = s // sew it in after the subnode on the left (which remains s)
        console.log('f is left half of the split subnode')
        console.dir(f)

      }


      // next we insert the three new elements into the main list
      console.dir(f)
      console.log(this.strings.tln.toStringIndent(5))

      window.debugging=true
      const node1 = f.insertAfter(m.start);


      m.start.listNode=node1
      console.dir(m)

      console.log(this.strings.tln.toStringIndent(5))

      const node2 = node1.insertAfter(m.subnodes.first.next.data);
      m.subnodes.first.next.data.listNode = node2
      const node3 = node2.insertAfter(m.end); // O(log(N))
      m.end.listNode = node3
      console.dir(m)
      console.log(this.strings.tln.toStringIndent(5))
      // and insert the new node into the hashtable
      this.nodes[un]=m; // add the new node to the hash table
      this.size++;
      this.insertCallback(node2.indexOf("std"),c,un[0]) // ILL HAVE TO CHECK WHAT INDEXOF RETURNS
      return m;


  }


  /* treeextend(M,nodeid,c)
   *  this inserts the character c at the end of the node with the specified nodeid
   *  and it updates M to reflect this change ...
   */
  treeextend(nodeid,c){
      console.log("inside treeextend: "+JSON.stringify([nodeid,c]))
      var n = this.nodes[nodeid];
      console.dir(n)
      console.dir(c)
      n.elts = n.elts.concat(c)
      //console.dir(['te1',n])
      const f = n.end;



      console.dir(f)
      const insertionPos = f.listNode.indexOf('std')
      var g = f.listNode.prev.data; // this is the previous subnode, which we will extend!

      console.dir(g)
      g.size = g.size+c.length
      g.listNode.size = {std:g.size,rev:g.size,edit:g.size,count:g.size}
      g.userData = g.treeNode.elts.slice(g.first,g.first+g.size)
      g.listNode.tln.rebalance()
      // I need to update the listnode in the AVL tree
      console.log('at the end of treeextend')
      console.dir(g)
      this.insertCallback(insertionPos,c,n.user)
      return n;
  }

  /* treehide(M,nodeid,q)
   *  this hides the character c with offset q in the node with the specified nodeid
   *  and it updates M to reflect this change ...
   */
  treehide(nodeid,q,u) {
      var n = this.nodes[nodeid] // O(log(N))
      var e = n.elt[q]
      var offset = e.listNode.indexOf("std")
      e.vis=false
      e.userData = e.userData
      e.listNode.size.std = 0  // it is not longer visible
      e.listNode.tln.rebalance()
      this.deleteCallback(offset,e.userData,u) // u is the one who deleted e.userData
      return n;
  }


  /* Create a node to in inserted in the mset tree given the nodeid and the character
   * this requires creating the 3 corresponding elements and settingup the node.
   */
  static createCharNode(nodeid,c){
      var n = new Node(nodeid[0],nodeid[1],c);
      return n;
  }

  nextNonMarker(listnode){
    // we can assume that listnode is a marker cell
    // and we should return the index of the next nonmarker in the string....
    const index = listnode.indexOf("rev")
    const result= this.strings.nth(index,"rev")
    return result
  }





  /********************************************************
   * List Operations
   * Here is where we convert string operations (insert, delete) into tree ops
   * following the algorithm in the paper
   */

  delete(k) {
      var listNode = this.strings.nth(k,"std")
      var e = listNode.data
      //var e = this.strings.nth(k,"std").data;  // O(log(N))

      e.vis=false;
      listNode.size.std = 0  // it is not longer visible
      listNode.tln.rebalance()
      this.network.hide(e.nodeid,e.offset,this.user); // un is used to prevent broadcast from going back to user
  }

  insert(k,c) {
      // the goal of this method is to make the appropriate call to treeinsert or treeextend
      // but not to actually modify the tree...
      let un=null
      if (this.size==0) {
        un = [this.user,this.count++]
        // CASE 0:  no-nonmarkers in the list, so tree must be empty

        // insert new node into the root of the empty tree
        this.treeinsert([0,0],0,un,c)
        this.network.insert([0,0],0,un,c)
      }
      else if (k==0) {

        // CASE 1: inserting at the beginning of the string

        //  strategy - insert before the first non-marker character
        un = [this.user,this.count++]
        const e = this.strings.nth(0,"rev").data; //O(log(N))
        this.network.insert(e.nodeid,0,un,c);
        this.treeinsert(e.nodeid,0,un,c);

      } else { // k>0
          // in the remaining cases we're inserting after a visible character
          // so, get the visible, non-marker elt e at position k-1
          const ecell=this.strings.nth(k-1,"std") //O(log(N))
          const ecellOffset = ecell.indexOf("std")
          const offsetInCell = k-ecellOffset
          // if offsetInCell<cellsize then we insert between 2 characters
          // if it == cellSize, then we either extend
          // and get the element after the ecell
          // here we need to check to see if we should split the node...
          // we need many more cases here ... or maybe not,
          // maybe the splitting happens in treeinsert ....
          var fcell=ecell.next;
          if ((offsetInCell<ecell.data.size) || (!fcell.data.marker)){
              // CASE 2a: inserting between two non-marker elements
              // here is the case where we insert between two characters in a Subnode
              un = [this.user,this.count++];
              this.network.insert(ecell.data.nodeid, ecell.data.first+offsetInCell,un,c);
              this.treeinsert(ecell.data.nodeid, ecell.data.first+offsetInCell,un,c);
          } else if (fcell.data.marker && (fcell.data == fcell.data.treeNode.end)) {
              // CASE 3: the next element is an end marker
              if (fcell.data.treeNode.user==this.user) {
                  // case 3a: it the user owns the node then extend
                  this.network.extend(fcell.data.nodeid, c);
                  this.treeextend(fcell.data.nodeid,c);
              }
              else {
                un = [this.user, this.count++];
                // case 3b: otherwise insert a new node here
                console.dir(fcell)
                this.network.insert(fcell.data.nodeid, fcell.data.treeNode.elts.length, un, c);
                this.treeinsert(    fcell.data.nodeid, fcell.data.treeNode.elts.length, un, c);
              }
          } else {

                // CASE 4: the cell must be a start marker

                // in this case, find the next non-marker f (which must exist) and insert before f
                un = [this.user,this.count++];
                fcell = this.nextNonMarker(fcell); // O(log(N))

                this.network.insert(fcell.data.nodeid,0,un,c);
                this.treeinsert(fcell.data.nodeid,0,un,c);
          }
      }
  }

}



/* ***********************************************************************
 * Here is an implementation of Elements for the MSET data type
 * The elements are the core objects that wrap the values stored in our DLL
 * An element is a subsequence of objects in the DLL which have the same visibility
 * and in which insertions are only allowed at the left. An insertion at the right
 * will be done in the node to the right (and if this Element is the last in the node,
 * then we will need to create a new last node (or maybe not ...)
 * When inserting into the middle of an element, the element must be split
 * Likewise when deleting a subrange of an element, the element must be split unless
 * the entire element will be deleted in which case the flag is just changed.
 */

class Element{

 constructor (first,size,vis,marker,treeNode,isLast) {
    this.first = first
    this.size = size
    this.iset = null // we create an InsertionSet at the left if needed ...
    this.vis=vis;  // boolean -- true if it is visible, false if hidden
    this.marker=marker; // boolean -- true if it is a marker symbol, false otherwise
    this.treeNode=treeNode; // link to the treeNode containing this element
    //this.nodeid=null; // id of this.treeNode, this is redundant as treeNode has it
    this.listNode=null; // link to the Doubly Linked List element containing this element
    this.isLast = isLast // true when the element is the last in the node,  we don't need this..
    this.userData = treeNode.elts.slice(first,first+size)  // DEBUGGING!!
    this.nodeid = [treeNode.user,treeNode.count]
  }

  split(p){

    console.log("splitting "+JSON.stringify([p,this.first+p,this.size-p,true, false,]))
    console.dir(this)
    let t = new Element(this.first+p,this.size-p,true, false, this.treeNode,this.isLast)
    t.iset = new InsertionSet()  // we always insert at the left of new split subnodes
    //we sew the new node into the subnode DLL and the mainnode DLL

    this.size = p
    this.userData = this.treeNode.elts.slice(this.first,this.first+this.size)
    console.dir(['lefthalf',this])
    this.listNode.tln.rebalance() // since we are changing the size of this node, we need to rebalance

    let subNode1 = this.listSubnode.insertAfter(t)
    t.listSubnode = subNode1
    console.dir([this,t,p])

    let mainNode1 = this.listNode.insertAfter(t)
    t.listNode = mainNode1


    console.dir(['right half',t])
    return t
  }



  // REWRITE THIS AS toString() ...
  toString(){
    //onsole.log("inside toString of Element")
    //console.dir(this)
    if (this.marker){
      //console.dir(['a',this.userData])
      return this.userData
    } else if (this.vis) {
      //console.dir(['b',this.first,this.size,this.treeNode.elts.slice(this.first,this.first+this.size)])
      return this.treeNode.elts.slice(this.first,this.first+this.size)+" :: "
    } else {
      //console.dir(['c',this.first,this.size,"{"+this.treeNode.elts.slice(this.first,this.first+this.size)+"}"])
      return "{"+this.treeNode.elts.slice(this.first,this.first+this.size)+"}"+" :: "
    }

  }

  // REWRITE THIS
  toStringLong2() {
    return "{"+this.userData+","+this.vis+","+this.marker+","+this.nodeid+","+this.offset+"}";
  }


  eltSize(){
    const std = (this.vis)?this.size:0  // markers are not visible!
    const rev = (this.marker)?0:this.size
    const edit = this.size
    return {std,rev:rev,edit:edit,count:1}
  }

  static sizefn(element){
    return element?element.eltSize():{count:0,std:0,rev:0,edit:0}
  }

  static createStart(n){
      var startsym = "<"+n.user+":"+n.count
      var e = new Element('start',0,false,true,n,false)
      e.userData = startsym
      e.treeNode = n
      e.nodeid = [n.user, n.count]
      return e
  }

  static createEnd(n){
      var endsym = n.user+":"+n.count+">"
      var e = new Element('end',0,false,true,n,false)
      e.userData = endsym
      e.treeNode = n
      e.nodeid = [n.user, n.count]
      e.offset = "end"
      return e
  }

} // end of Element class






/* ************************************************************
 * Here is an implementation of a Node in the MSET tree
 * It represnet
 */



class Node{
  constructor(u,n,elements) {
    this.user=u;
    this.count=n;
    this.elts= elements || [];
    this.subnodes = new wiDLL(Element.sizefn)
    this.start = Element.createStart(this)
    let subnode = new Element(0,this.elts.length,true,false,this,true)
    subnode.listSubnode = this.subnodes.first.insertAfter(subnode)
    this.end = Element.createEnd(this)
  }

  toString(){
    return "node("+this.subnodes.toString("|",'count')+","+")"
  }

}


class InsertionSet{
  // this is a O(log(N)) implementation of the insertion set
  // data structure which stores all of the nodes inserted at
  // a particular position k in a parent node
  // they are ordered by their owner and each owner
  // can insert at most one element into an insertion block
  // we also may need to access the previous element in the insertion set
  // so we need either indexing or a LL restructure
  // the first step is to move all iset related code into this class

  constructor(){
    this.bst = new wiBST((x,y)=>(x.user-y.user))
  }

  /* insertNode(m,s) inserts the node m into an ordered set s of nodes
   * (ordered by userid). This is called to create a child object of a node
   * and we insert the new node in the appropriate iset.
   * This needs to be reimplemented as a O(log(N)) operation ...
   */
  insertNode(m) {
    return this.bst.insert(m)
  }

  get(k){
    return this.bst.get(k)
  }
}

// these allow me access to the class from the Javascript console
window.msetDLL2 = msetDLL2
window.Element = Element
window.Node = Node
window.InsertionSet = InsertionSet
