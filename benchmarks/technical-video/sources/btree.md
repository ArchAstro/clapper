# Original curated classic B-tree example; not a B+ tree implementation

Source: https://opendsa-server.cs.vt.edu/ODSA/Books/Everything/html/BTree.html

Pack type: curator-written reference notes, not a verbatim copy of the primary publication. Freeze/approve these notes before confirmatory evaluation.

A B-tree maintains sorted keys and separates child key ranges. All leaves have equal depth. Nonroot occupancy bounds and root exceptions must be specified for the chosen convention.
For this fixture use minimum degree t=2: at most3 keys per node, at least1 in a nonroot node, at most4 children. Search compares separators to choose a child or finds a key in the current node.
Split a full node by promoting its median to the parent; keep the lower and upper keys in the two child nodes. A full root is split under a new root. No key is lost or duplicated as a data key in a classic B-tree.
Illustrate inserting10,20,5,6,12,30,7,17 in that order using top-down splitting before descent. Separate the logical operation count from disk IO: disk reads depend on storage layout and caching and are not measured here.
