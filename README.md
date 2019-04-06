# MSET: Optimal Collaborative Editing in Javascript

This is initial work on building an optimally efficient real-time fully distributed non-locking collaborative editor. 
It is based on the MSET approach developed by Tim Hickey and Kenroy Granville for use in the GrewpEdit application
in 2005. MSET stands for Monotone Shared Edit Trees.

This repository has several very useful Javascript modules which can be found in the msetdemo/public/mset folder

* CollabEd - the client side for collaboratively editing a textarea with any number of clients 
* DDLLmset distributed doubly linked lists with weights and indexing and log(k) time per each edit operation
* DLLmset doubly linked lists with weights and indexing and execution time independent of the list size
* DLLwi  doubly linked lists with weights and indexing
* BSTwi  binary search trees with weights and fast indexing and DLL access 

The DLLmset module is very useful as a single user implementation of Doubly Linked Lists as it allows one initialize a DLL in one step using a (potentially very large) array. The execution time for each edit operation (insertion or deletion at an arbitrary position in the list) takes time O(log(k)), where k is the number k of edit operations performed so far since the last garbage collection and is independent of the size of the list. The DLLmset garbage collection operation takes time proportional to the size of the list but makes the editing operations as efficient as array operations again (and they slowly degrade as O(log(k)) after k edit operations). This same implementation easily extends to a thread-safe multi-threaded implementation as well as a fully distributed p2p implementation, with the same performance guarantees.

The msetdemo folder is a nodejs app for the CollabEd demo. You can run the demo (assuming node is installed by)
```shell
cd msetdemo
npm install
npm start
```
then open several browser windows (on one or more machines) to the page http://localhost:4000/mset2 and you can test the Collaborative Editor. 

We have a new experimental Canvas-based editor using DDLL which you can access via http://HOSTSITE:4000/collabed  Visit this page with multiple browsers on localhost and you will be able to all edit a single document. We are working on expanding this to include the ability to create multiple editing sessiona and invite others to join in editing these documents. This is all on the collabed branch.

# class CollabEd
### -- Colloboratively Editable Textareas with local editing and provably correct convergence
This provides the client side code needed to collaboratively edit a textarea. It requires a simple server that will broadcast operations to all clients and which will assign a unique userid to each client who joins the editing session. 


# class DDLLmset  
### -- Distributed Doubly Linked Lists with log(k)-time indexing after O(N) time garbage collections)
This class implements an optimally efficient non-blocking fully distributed version of the DLL API in which any number of clients can simultaneously edit a DLL while broadcasting their operations all other clients and receiving operations from all other clients. If everyone stops editing the system rapidly converges to a DLL which is exactly the same on all clients. This class can also be used to implement a non-blocking thread-safe DLL where all threads can insert and delete at will and their local copies will all converge if editing stops for long enough to let all message that are in transit be delivered.

If a central server is used then DDLL can efficiently implement a synchronized garbage colletion which takes time O(n) but which reduces the edit operation time to O(k) where k is the number of edit operations after the garbage colletion. In the central server model, the server simply assigns unique IDs to clients when they join and  sends them the sequence of editing operations generated so far on the document. It then receives editing operations from clients and broadcasts them to all clients (while pushing them onto a list).


# class DLLmset
### -- Doubly Linked Lists of size N with log(k)-time indexing independent of the list size, after O(N) garbage collection
This is another implementation of doubly linked lists, but this one can be initialized in time O(1) with an array of data objects and the complexity of O(log(k)) where k is the number of edit operations performed and is independent of the size of the list. 

More precisely, the complexity is as follows where dll is a DLLmset object, array is a list of objects, node is a DLLmset node

* O(1)  dll = new DLLmset(array)
* O(1)  dll.first, dll.last,  node.next(), node.prev()
* O(k)  node.insertAfter(e), node.insertBefore(e), node.delete()
* O(k)  node = dll.nth(m)  where k is the number of edit operations performed on the dll since the last garbage collection
* O(k)  node.index()
* O(n)  node.garbageCollect()  where n is the number of non-deleted objects in the list

If we assume that the size of the list remains bounded by N and that garbage collections are done after every A editing steps, then the complexity of the nth and index operations is bounded by k =log(N)-log(log(N)) if A is chosen to be N/k

The API for DLLmset is identical to that of DLLwi. The only difference is the performance.




# class DLLwi  
### -- Doubly Linked Lists os size N with weights and log(N) indexing 
This is a class which implements a doubly linked list of Javascript objects in which you can access the nth element in time O(log(N)) where N is the size of the list .. you can also add new elements before or after any listnode in constant time. This is an optimally efficient algorithm, no algorithm can take less than O(log(N)) and still implement the addBefore, addAfter, and nth methods. It also allows you to define a family of size functions on the list elements and to use this function to find the nth element.

Here is the complexity of the operations where node is a DLL node 
and k is the number of single element editing operations performed so far. Inserting a list of elements or deleting a range of elements takes time proportional to the number of elements inserted or deleted.

* O(1)  dll = new DLLwi()
* O(1)  dll.first, dll.last,  node.next(), node.prev()
* O(k)  node.insertAfter(e), node.insertBefore(e), node.delete()
* O(k)  node = dll.nth(m)  where k is the number of edit operations performed on the dll
* O(k)  node.index()

constructor
In the simplest case we just create an empty doubly linked list with the default constructor
```javascript
> dll = new DLLwi()
> console.log("The DLL has size "+dll.size()+" and its elements are ("+dll.toString()+")")
The DLL has size 0 and its elements are ()
```
The DLL is comprised of ListNode objects, n, which store the elements that are inserted into this list in their n.data field
The first and last ListNodes are accessible as fields of dll and you can move forward and backward in the
list using the next and prev properties of the ListNode elements
```javascript
> console.log(dll.first.data)
startmarker
```
The nodes in the DLL are of type ListNode and the actual elements of the list are in the value field of those nodes.
There are special marker nodes at the beginning and end of the list which you can access with the fields first and last

You can add elements before or after any DLL node using the insertBefore and insertAfter methods
```javascript
> dll.first.insertAfter(7)
           .insertAfter([1,2,3])
           .insertAfter({a:1,b:2})
           .insertBefore('penultimate')
> console.log(JSON.stringify(dll.toList()))
[7,[1,2,3],"penultimate",{"a":1,"b":2}]
```
You can also add elements at a position in the list
```javascript
> dll = new DLLwi()
> dll.insert(0,'alpha')
> dll.insertList(1,[1,2,3,4,5,6])
> console.log(JSON.stringify(dll.toList()))
["alpha",1,2,3,4,5,6]
```
You can delete an element using its ListNode or its position
```javascript
> dll.first.next.delete()
> dll.delete(3)
> dll.delete(4,2)
```
You can get the size of a DLLindexed object with the size function
```javascript
dll.size()
```
and you can access the nth element of the list in time O(log(N)) where N is the size of the DLL with
```javascript
const a = dll.nth(5).val
```
So you can easily print the elements of a DLL with
```javascript
> dll.toList().forEach(console.log)
```

You can also find the index of a ListNode in the DLL with the indexOf() method in O(log(N)) time
```javascript
for(let i=0;i<10;i++){dll.last.insertBefore(i)}
let listnode = dll.nth(5)
for(let i=0;i<10;i++){dll.first.insertAfter(-i)}
let index = listnode.indexOf()
console.log(dll.nth(index)) // should be the listnode!
```

This current implementation creates an AVL tree over the DLL where each TreeNode stores the number

## weighted elements 
You can provide a feature vector for each element which specifies its size for each feature
  the nth and indexOf methods can then take a feature as a parameter and return values based on weighted indices
  the default is that all nodes have size 1.
The following example shows that it can be used to maintain partial sums of a list of numbers in O(log(N)) time
  
```javascript
> sizefn = (x)=>({count:1,val:Math.abs(x)})
> dll = new DLLwi(sizefn)
> dll.insertList(0,[0,1,2,3,4,5,6,7,8,9,10])
> a = dll.nth(5)
> b = dll.nth(3)
> a.indexOf('val')
10
> b.data=1003
> a.indexOf('val')
1010
```
We use this in the MSET code to simultaneously store the current list of objects, the list of objects and deleted objects, and a list of objects, deleted objects, and marker elements, and to quickly index elements in these lists.

# class BSTwi  
### -- Binary Search trees with weight-based indexing

This class extends DLLwi and allows one to maintain a sorted list of elements which one can access the kth element in time O(log(N)) and one can find the index of an element in O(log(N)) steps. This allows one to use weighted elements.


