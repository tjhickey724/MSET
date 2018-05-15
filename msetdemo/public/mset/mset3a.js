/* ***********************************************************************
 * MSET Demo Implementation in JavaScript
 *
 * We define the Element, ListNode, Node, DLL, and MSET types
 * and then define Network to simulate three users inserting locally and processing remote ops
 * The purpose of this demo is to allow us to try out different cases of the
 * algorithm to illustrate how the MSET algorithm works...
 *
 * In this demo we allow the user to type into a textfield and
 * we construct the MSET tree in real time .
 */

/* ***********************************************************************
 * Here is an implementation of Elements for the MSET data type
 */

class Element{

 constructor (sym,vis,marker) {
    this.sym = sym;
    this.vis=vis;
    this.marker=marker;
    this.treeNode=null;
    this.nodeid=null;
    this.offset=null;
    this.listNode=null;
  }

  toString() {
    return "{"+this.sym+","+this.vis+","+this.marker+","+this.nodeid+","+this.offset+"}";
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
    this.iset[0]=[];
  }
}



/* ************************************************************
 * Here is an implementation of MSET
 */

class MSET{
  constructor(u){
    this.user = u;
    this.count = 0;
    this.size=0;
    this.root = new Node(0,0);
    this.strings = new DLL();
    this.nodes = {};
    this.nodes[[0,0]] = this.root;
    this.opqueue = [];  // dequeue of ops that haven't been applied
    this.waitqueue=[];  // hashtable from targets to list of ops
    this.network = new Network()


    // the rest of this constructor initializes the
    // instance variables defined above ...
    var n = this.strings.first;
    var e1,e2;
    e1 = Element.createStart(this.root);
    e2 = Element.createEnd(this.root);
    n = n.insertAfter(e1);
    n = n.insertAfter(e2);
    this.root.start = e1;
    this.root.end = e2;
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
          n = this.treehide(treeOp.nodeid, treeOp.q);
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
      var m = MSET.createCharNode(un,c);  // O(1)
      var e = m.elt[0];
      var f = n.start;
      var k = MSET.insertNode(m,s);  // O(log(N))

      // now we sew m into the doubly linked lists!!!
      if (k==0){
        if (q==0) {
            f=n.start;
        } else { // q>0
            f=n.elt[q-1];
        }
      } else { // k>0
        f = s[k-1].end; // O(log(N))
      }

      // next we insert the three new elements into the list
      f.listNode.insertAfter(m.start).insertAfter(m.elt[0]).insertAfter(m.end); // O(log(N))
      // and insert the new node into the hashtable
      this.nodes[un]=m;

      this.size++;
      //alert("treeinsert q="+q+" c="+c);
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
      e.offset = d;
      n.elt[d]=e;
      n.iset[d+1]=[];
      f.listNode.insertBefore(e); // O(log(N))
      this.size++;
      return n;
  }

  /* treehide(M,nodeid,q)
   *  this hides the character c with offset q in the node with the specified nodeid
   *  and it updates M to reflect this change ...
   */
  treehide(nodeid,q) {
      var n = this.nodes[nodeid]; // O(log(N))
      var e = n.elt[q];
      e.vis=false;
      e.sym = "["+e.sym+"]";
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
      n.iset[0] = [];
      n.iset[1] = [];
      return n;
  }

  /* insertNode(m,s) inserts the node m into an ordered set s of nodes
   * (ordered by userid). This is called to create a child object of a node
   * and we insert the new node in the appropriate iset.
   * This needs to be reimplemented as a O(log(N)) operation ...
   */
  static insertNode(m,s) {
      var i=0, n=s.length, k=-1;
      var u = m.user;
      while(i<n) {
    if (u< s[i].user) {
        s.splice(i,0,m);
        k=i;
        break;
    }
    else i = i+1;
      }
      if (i==n) {s[n]=m; k=n;}
      //alert("insertnode:  k="+k+" s="+s+ " n="+n+" c="+m.elt[0].sym);
      return k;
  }



  /********************************************************
   * String Operations
   * Here is where we convert string operations (insert, delete) into tree ops
   * following the algorithm in the paper
   */

  stringdelete(k) {
      var e = this.strings.nth(k,"std").val;  // O(log(N))

      console.log("stringdelete: e="+e.toString());
      e.vis=false;
      e.sym = "["+e.sym+"]";
      var un = [this.user,0];
      this.network.hide(e.nodeid,e.offset,un); // un is used to prevent broadcast from going back to user
  }

  stringinsert(k,c) {
      var un;
      console.log("inserting "+k+","+c)
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
                fcell = this.strings.nextNonMarker(fcell); // O(log(N))

                this.network.insert(fcell.val.nodeid,0,un,c);
                this.treeinsert(fcell.val.nodeid,0,un,c);
          }
      }
  }

}





/* ************************************************************
 * This simulates a network with a queue of treeedit operations
 * that can be performed by the clients ....
 */
class Network{
  constructor() {
  }

  broadcast(op,un){
    var i;
    console.log("broadcast: "+JSON.stringify(op) +", "+un[0]);
    sendOperationToServer(op);
  }

  insert(vm,q,un,c) {
    var op = {op:"insert", nodeid:vm, q:q, un:un, c:c};
    this.broadcast(op,un);
  }

  extend(un,c) {
    var op = {op:"extend", nodeid:un, c:c};
    this.broadcast(op,un);
  }

  hide(vm,q,un) {
    var op = {op:"delete", nodeid:vm, q:q};
    this.broadcast(op,un);
  }

}




/********************************************************
 * Here is an implementation of linked list nodes
 */
class ListNode{
  constructor(v){
    this.prev = null,
    this.next =null,
    this.val = v;
  }

  insertBefore(a){
      var x = new ListNode(a);
      a.listNode = x;
      var tmp = this.prev;
      this.prev=x;
      x.next = this;
      x.prev = tmp;
      x.prev.next = x;
      return x;
    }

    insertAfter(a){
      var x = new ListNode(a);
      var tmp = this.next;
      this.next=x;
      x.prev = this;
      x.next = tmp;
      x.next.prev = x;
      a.listNode=x;
      return x;
    }

}

/********************************************************
 * Here is an implementation of a doubly linked list of elements
 * which has three views std, rev, and edit.
 */
class DLL {
  constructor(){
    this.first = new ListNode("startmarker");
    this.last = new ListNode("endmarker");
    this.first.nodeid=-1;
    this.last.nodeid=-1;
    this.first.next = this.last;
    this.last.prev = this.first;

    this.printList = function(vis) {
      var d,s;

      s="";
      for(d = this.first.next; d != this.last; d=d.next) {
          if  ((vis=="std") && d.val.vis) {
      s = s + "" + d.val.sym;
          }
          else if ((vis=="rev") && !(d.val.marker)){
      s = s + "|" + d.val.sym;
          }
          else if ((vis=="edit") || (vis==undefined) ) {
      s = s + " " + d.val.sym;
      }
      }
      if (vis=="std") return s;
      else return ("[\n "+s+" \n]");
        }
        this.toString = this.printList;
  }


  nthSTD(n){
      var k=this.first.next;
      while ((n>0 || !k.val.vis)  && (k!= this.last) ) {
          if ( k.val.vis)  {
            n = n-1;
          }
          k=k.next;
        }
      return k;
    }

  nthREV(n){
      var k=this.first.next;
      while ((n>0 || k.val.marker)  && (k!= this.last) ) {
          if ( !k.val.marker)  {
            n = n-1;
          }
          k=k.next;
        }
      return k;
    }

  nthEDIT(n){
      var k=this.first.next;
      while ((n>0)  && (k!= this.last) ) {
          n = n-1;
          k=k.next;
      }
      return k;
    }

  nth(n,vis){
      switch(vis){
        case 'std': return this.nthSTD(n);
        case 'rev': return this.nthREV(n);
        case 'edit': return this.nthEDIT(n);
        default: return undefined;
      }
    }



  nextNonMarker(e) {
      // this can be implemented as O(log(N)) but here is O(N)
      while ((e!== null) && e.val.marker){
          e=e.next;
      }
      return e;
    }

}
