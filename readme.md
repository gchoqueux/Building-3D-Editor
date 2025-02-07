## Structure de donnees:

* CityGml : Geometrie et sementique

* hEdge

* three.js

### hEdge data

 * GeometricalProxy.js : point, edge et face
 
### Three data

 * GraphicalModel.js avec DynamicBuffer

### hEdge.js data => Three data

 * Builder.js


## Process 

CityJSONObjectLoader (loader.js) => Builder.js => geometryBuilder  => sceneBuilder

		citygml						format pivot          hEdge			three.js

* Dual builder => vers THREE.js (visualisation des données en mode dual) 


## Manipulation des hEdges

 => tools.js appelé par la ToolsBar
 => shiftTools.js : projection deplacement souris vers espace 3D
 => geometrical controller
 => hEdge Editor

 * Controller edite la structure hEdge
 * 1 controller par Objet

ToolsGui  =>  Controler    =>   SceneBuilder
			 ↳update hEdges    ↳ update THREE.js 
			 					 (creer from scrath à chaque fois) => use BatchedMesh

### Controller collection 

il contient plusieurs instance de controllers 

Le selectedController est le controller courant


## Structure hEdge

faces[index de faces] => attention pas reference sur instance de face
hEdges[index de point] => attention pas reference sur instance de point


## Material

SelectedMaterial 

Mock : format interne pour les exemples


Idée avoir une structure pour l'affichage de l'edition et une pour ce qui n'est pas modifier