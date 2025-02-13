# ARCHITECTURE.md

A central part of the architecture is a hierarchy of classes whose members represent various components on a canvas. The base class is `Item`:

### 1. Item

- **Location**: `src/app/components/client/items/Item.tsx`
- **Description**: 
  - The `Item` class represents a component located on the canvas that is either selectable or contributes to TeXdraw code. It is an abstract class, meaning it cannot be instantiated directly.
  - It contains properties and methods that are common to all items, such as `id`, `group`, and methods for handling editing and rendering.

### 2. Node

- **Location**: `src/app/components/client/items/Node.tsx`
- **Description**: 
  - The `Node` class extends `Item`. 
  - Nodes serve as anchors for connector end points and ornaments (such as labels). 
  - Each node has a radius and coordinates.

### 3. ENode

- **Location**: `src/app/components/client/items/ENode.tsx`
- **Description**: 
  - The `ENode` class extends `Node`. 
  - Together with `CNodeGroup`s, `ENode`s are elements of the all-important `list` state variable that is managed by the `MainPanel`.
  
### 4. SNode

- **Location**: `src/app/components/client/items/SNode.tsx`
- **Description**: 
  - The `SNode` class extends `ENode` and represents state nodes that depict states and relationships through lines and arrows on the canvas.
  - It introduces properties and methods related to connectors, such as `involutes`, `conLinewidth`, and methods for managing the visual representation of connectors and arrowheads.
  - It is an abstract class, requiring subclasses to implement specific methods like `getDefaultW0()`, `getDefaultW1()`, and `getDefaultWC()`.

### 5. Adjunction, Order, Identity (and future classes)

- **Location**: `src/app/components/client/items/snodes/*.tsx`
- **Description**: 
  - These classes implement particular kinds of `SNode`. They provide the concrete shape of an arrow, as well as functionality for parsing the corresponding TeXdraw code and displaying related information in the `ItemEditor`.

### 6. GNode

- **Location**: `src/app/components/client/items/GNode.tsx`
- **Description**: 
  - The `GNode` class extends `ENode` and represents 'ghost nodes' that transfer their group membership, ornaments, and connector endpoints to other nodes when dragged onto them.

### 7. CNode

- **Location**: `src/app/components/client/items/CNode.tsx`
- **Description**: 
  - The `CNode` class extends `Node`.
  - An array of `CNodes`, managed by a `CNodeGroup` object, defines a `Contour` (i.e., splinegon component).
|
### 8. Ornament

- **Location**: `src/app/components/client/items/Ornament.tsx`
- **Description**: 
  - The `Ornament` class extends `Item` and represents an object that is attached to a `Node`, such as a label. `Ornament`s do not have their own Z-indices.
  - It provides properties and methods for managing the visual representation of ornaments on the canvas.

### 9. Label

- **Location**: `src/app/components/client/items/ornaments/Label.tsx`
- **Description**: 
  - The `Label` class extends `Ornament` and represents a specific type of ornament that can display text on the canvas.
  - It includes properties for text formatting, positioning, and rendering.

## Summary of Class Relationships

```
Item (abstract)
|_ Node (abstract)
|  |_ ENode
|  |  |_ SNode (abstract)
|  |  |  |_ Adjunction
|  |  |  |_ Identity
|  |  |  |_ Order
|  |  |_ GNode
|  |_ CNode
|_ Ornament (abstract)
   |_ Label

```


