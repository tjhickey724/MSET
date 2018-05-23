export {msetDLL as default}
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
 * The main applications this was built for was
 *  -- a collaborative text editor
 * but we also have a demo of a collaborative JSON list editor
 * which allows any number of people to insert and remove JSON elements
 * from a shared list.
 *
 * The msetDLL has two main methods
 *  insert(pos,element)
 *  delete(pos)
 *  which can be called by the client
 *  they use the network to send messages to the peers
 * It also receives remote operations from the network and applies it to the tree
 * It requires a Network object and a Socket object,
 * which afre passed in when the tree is created...
 *
 */


class msetDLL{
  constructor(u,network){
    this.user = u;
    this.count = 0;
    this.size=0;
    this.root = new Node(0,0);
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
    var n = this.strings.first;
    var e1,e2;
    e1 = Element.createStart(this.root);
    e2 = Element.createEnd(this.root);
    n = n.insertAfter(e1,this.strings);
    e1.listNode=n
    n = n.insertAfter(e2,this.strings);
    e2.listNode=n
    this.root.start = e1;
    this.root.end = e2;
  }

  treeHeight(){
    return this.strings.tln.height
  }

  copy(){
    const elts = this.toList()
    const newMSET = new msetDLL()
    for(let i in elts){
      newMSET.insert(i,elts[i])
    }
    return newMSET
  }


  toString(separator,feature){
    separator = separator || ''
    return this.strings.toString(separator,'std')
  }

  nth(n,feature){
    return this.strings.nth(n,'std').val.sym
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
    */
  applyTreeOp(treeOp){
      var n;
      if (treeOp.op == "insert") {
          n = this.treeinsert(treeOp.nodeid, treeOp.q, treeOp.un, treeOp.c);
      } else if (treeOp.op == "extend") {
          n = this.treeextend(treeOp.nodeid, treeOp.c);
      } else if (treeOp.op == "delete") {
          n = this.treehide(treeOp.nodeid, treeOp.q, treeOp.u);
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

      var n = this.nodes[vm]; // O(log(N))
      var s = n.iset[q];
      var m = msetDLL.createCharNode(un,c);  // O(1)
      var e = m.elt[0];
      var f = n.start;
      //var k = msetDLL.insertNode(m,s);  // O(log(N))
      var k = s.insertNode(m);

      // now we sew m into the doubly linked lists!!!
      if (k==0){
        // this is the case where the node is at the front of the iset
        if (q==0) {
            // here the node is inserted at pos q=0 in the parent node
            f=n.start;
        } else { // q>0
            // if the node is not inserted at the beginning of the parent node
            f=n.elt[q-1];
        }
      } else { // here the node is not the first in its iset
        //f = s[k-1].end; // O(log(N))
        f = s.get(k-1).end
      }

      // next we insert the three new elements into the list
      const node1 = f.listNode.insertAfter(m.start);
      m.start.listNode=node1
      const node2 = node1.insertAfter(m.elt[0]);
      m.elt[0].listNode = node2
      const node3 = node2.insertAfter(m.end); // O(log(N))
      m.end.listNode = node3
      // and insert the new node into the hashtable
      this.nodes[un]=m;
      this.size++;
      this.insertCallback(node2.indexOf("std"),c,un[0])
      return m;
  }


  /* treeextend(M,nodeid,c)
   *  this inserts the character c at the end of the node with the specified nodeid
   *  and it updates M to reflect this change ...
   */
  treeextend(nodeid,c){
      var n = this.nodes[nodeid];  // O(log(N))
      var e = Element.createChar(c,n);  // O(1)
      var d = n.elt.length;
      var f = n.end;
      var insertionPos = f.listNode.indexOf("std")
      //console.log("in treeextend:"+JSON.stringify([d,insertionPos]))
      //console.dir([n,this])
      //console.log(this.strings.tln.toStringIndent(5))
      this.strings.toString(' ','count')
      e.offset = d;
      n.elt[d]=e;
      n.iset[d+1]= new InsertionSet();;
      e.listNode = f.listNode.insertBefore(e); // O(log(N))
      this.size++;
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
      e.sym = e.sym
      e.listNode.size.std = 0  // it is not longer visible
      e.listNode.tln.rebalance()
      this.deleteCallback(offset,e.sym,u) // u is the one who deleted e.sym
      return n;
  }


  /* Create a node to in inserted in the mset tree given the nodeid and the character
   * this requires creating the 3 corresponding elements and settingup the node.
   */
  static createCharNode(nodeid,c){
      var n = new Node(nodeid[0],nodeid[1]);
      var e1 = Element.createStart(n);
      var e2 = Element.createChar(c,n);
      var e3 = Element.createEnd(n);
      n.start   = e1;
      n.elt[0] = e2;
      n.end     = e3;
      n.iset[0] =  new InsertionSet()
      n.iset[1] =  new InsertionSet()
      return n;
  }

  nextNonMarker(listnode){
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
      var e = listNode.val
      //var e = this.strings.nth(k,"std").val;  // O(log(N))

      e.vis=false;
      listNode.size.std = 0  // it is not longer visible
      listNode.tln.rebalance()
      this.network.hide(e.nodeid,e.offset,this.user); // un is used to prevent broadcast from going back to user
  }

  insert(k,c) {
      var un;
      if (this.size==0) {
        un = [this.user,this.count++];
        // CASE 0:  no-nonmarkers in the list, so tree must be empty

        // insert new node into the root of the empty tree
        this.treeinsert([0,0],0,un,c);
        this.network.insert([0,0],0,un,c);
      }
      else if (k==0) {

        // CASE 1: inserting at the beginning of the string

        //  strategy - insert before the first non-marker character
        un = [this.user,this.count++];
        var e = this.strings.nth(0,"rev").val; //O(log(N))
        this.network.insert(e.nodeid,0,un,c);
        this.treeinsert(e.nodeid,0,un,c);

      } else { // k>0
          // in the remaining cases we're inserting after a visible character
          // so, get the visible, non-marker elt e at position k-1
          var ecell=this.strings.nth(k-1,"std"); //O(log(N))
          // and get the element after the ecell
          var fcell=ecell.next;
          if (!fcell.val.marker) {

              // CASE 2: inserting between two non-marker elements

              // if the next elt is a non-marker insert there
              var un = [this.user,this.count++];

              this.network.insert(fcell.val.nodeid, fcell.val.offset,un,c);
              this.treeinsert(fcell.val.nodeid,fcell.val.offset,un,c);

          } else if (fcell.val.marker && (fcell.val == fcell.val.treeNode.end)) {

              // CASE 3: the next element is an end marker

              if (fcell.val.treeNode.user==this.user) {
                  // case 3a: it the user owns the node then extend
                  this.network.extend(fcell.val.nodeid, c);
                  this.treeextend(fcell.val.nodeid,c);
              }
              else {
                un = [this.user, this.count++];
                // case 3b: otherwise insert a new node here

                this.network.insert(fcell.val.nodeid, fcell.val.treeNode.elt.length, un, c);
                this.treeinsert(fcell.val.nodeid,fcell.val.treeNode.elt.length,un,c);
              }
          } else {

                // CASE 4: the cell must be a start marker

                // in this case, find the next non-marker f (which must exist) and insert before f
                un = [this.user,this.count++];
                fcell = this.nextNonMarker(fcell); // O(log(N))

                this.network.insert(fcell.val.nodeid,0,un,c);
                this.treeinsert(fcell.val.nodeid,0,un,c);
          }
      }
  }

}



/* ***********************************************************************
 * Here is an implementation of Elements for the MSET data type
 * The elements are the core objects that wrap the values stored in our DLL
 * Eventually, we will allow this.sym to be a list of "values" sharing the same visibility
 */

class Element{

 constructor (sym,vis,marker) {
    this.sym = sym; // this is the value of the element which can be any Javascript object
    this.vis=vis;  // boolean -- true if it is visible, false if hidden
    this.marker=marker; // boolean -- true if it is a marker symbol, false otherwise
    this.treeNode=null; // link to the treeNode containing this element
    this.nodeid=null; // id of this.treeNode
    this.offset=null; // offset of the element in this.treeNode
    this.listNode=null; // link to the Doubly Linked List element containing this element
  }

  toString(){
    if (this.vis || this.marker) {
      return this.sym
    } {
      return "["+this.sym+"]"
    }

  }

  toStringLong() {
    return "{"+this.sym+","+this.vis+","+this.marker+","+this.nodeid+","+this.offset+"}";
  }

  eltSize(){
    const std = (this.vis)?1:0
    const rev = (this.marker)?0:1
    const edit = 1
    return {std,rev:rev,edit:edit,count:1}
  }

  static sizefn(element){
    return element?element.eltSize():{count:0,std:0,rev:0,edit:0}
  }

  static createChar(c,n){
      var e = new Element(c,true,false);
      e.treeNode=n;
      e.nodeid=[n.user, n.count];
      e.offset = 0;
      return e;
  }

  static createStart(n){
      var startsym = "<"+n.user+":"+n.count;

      var e = new Element(startsym,false,true);
      e.treeNode = n;
      e.nodeid = [n.user, n.count];
      e.offset = "start";
      return e;
  }

  static createEnd(n){
      var endsym = n.user+":"+n.count+">";
      var e = new Element(endsym,false,true);
      e.treeNode = n;
      e.nodeid = [n.user, n.count];
      e.offset = "end";
      return e;
  }

} // end of Element class






/* ************************************************************
 * Here is an implementation of a Node in the MSET tree
 */

class Node{
  constructor(u,n) {
    this.user=u;
    this.count=n;
    this.elt=[];
    this.iset=[];
    this.iset[0]= new InsertionSet();
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
window.msetDLL = msetDLL
window.Element = Element
window.Node = Node
window.InsertionSet = InsertionSet
