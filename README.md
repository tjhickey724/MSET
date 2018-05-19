# MSET

This is initial work on building an optimally efficient real-time fully distributed non-locking collaborative editor. 
It is based on the MSET approach developed by Tim Hickey and Kenroy Granville for use in the GrewpEdit application
in 2005.

This repository has several very useful Javascript modules

# class DLLindexed
This is a class which implements a doubly linked list of Javascript objects in which you can access the nth element in time O(log(N)) where N is the size of the list .. you can also add new elements before or after any listnode in constant time. This is an optimally efficient algorithm, no algorithm can take less than O(log(N)) and still implement the addBefore, addAfter, and nth methods. 

I'll eventually write some real documentation, but for now here are some code snippets showing how to use the DLLindexed class
```javascript
const dll = new DLLindexed()
```
creates a new indexed doubly link list.

The nodes in the DLL are of type ListNode and the actual elements of the list are in the value field of those nodes.
There are special marker nodes at the beginning and end of the list which you can access with the fields first and last

You can add elements before or after any DLL node using the insertBefore and insertAfter methods
```javascript
dll.first.insertAfter(7).insertAfter([1,2,3])
         .insertAfter({a:1,b:2}).insertBefore('penultimate')
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
for(let i=0; i<dll.size(); i++) console.log(dll.nth(i).val)
```
or more efficiently as
```javascript
for(let n=dll.first.next; n!=dll.last; n=n.next) console.log(n.val)
```

You can also find the index of a ListNode in the DLL with the indexOf() method
```javascript
for(let i=0;i<10;i++){dll.last.insertBefore(i)}
let listnode = dll.nth(5)
for(let i=0;i<10;i++){dll.first.insertAfter(-i)}
let index = listnode.indexOf()
console.log(dll.nth(index)) // should be the listnode!
```


This current implementation creates an AVL tree over the DLL where each TreeNode stores the number

Additional features:
* weighted nodes -- you can provide a feature vector for each element which specifies its size for each feature
  the nth and indexOf methods can then take a feature as a parameter and return values based on weighted indices
  the default is that all nodes have size 1


# class MSETtree
This is a class which implements an optimally efficient non-blocking fully distributed version of the DLLindexed class in which any number of clients can simultaneously edit a DLLindexed list while broadcasting their operations to all other clients and receiving operations from all other clients. If everyone stops editing the system rapidly converges to a DLL which is exactly the same on all clients. 

The current implementation requires a central server, but it will be fairly easy to modify this so that it works in a fully peer-to-peer environment. Each operation requires time at most O(log(N)) assuming the operations where N is the total number of operations that have been applied to the DLL so far and this is optimal.  In a peer-to-peer topology, some operations need to be cached until the operations they depend on have been received, but each individual operation still requires only log(N) time to complete and the cached operations can be stored in a hashtable where the key is the operation they are waiting for.
This minimizes the time required to process the cache when new operations arrive.

Deleting is implemented by "hiding" an element so it is still available using a different view, but is removed from the main view. I'll write more about this later ...


# class MSETsocket
This is a class which provides the client side code needed to collaboratively edit a textarea. It requires a simple server that will broadcast operations to all clients and which will assign a unique userid to each client who joins the editing session. 

I'll write more about this later ...
