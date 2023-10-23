import * as THREE from 'three';
import { Float32ArrayDynamicBufferAttribute, UInt16ArrayDynamicBufferAttribute, Int16ArrayDynamicBufferAttribute } from './dynamicBufferArrays.js';

class GraphicalModel extends THREE.Mesh{
    constructor(threeObject, geometricalModel){

        super(threeObject.geometry, threeObject.material);

        this.geometricalModel = geometricalModel;

        var positions  = this.geometry.getAttribute( 'position' );
        var normals    = this.geometry.getAttribute( 'normal' );
        var uv         = this.geometry.getAttribute( 'uv' );


        this.coords   = new Float32ArrayDynamicBufferAttribute(positions.array, positions.itemSize, positions.normalized);
        this.normals  = new Float32ArrayDynamicBufferAttribute(normals.array, normals.itemSize, normals.normalized);

        if(this.uv){
            this.uvCoords = new Float32ArrayDynamicBufferAttribute(uv.array, uv.itemSize, uv.normalized);
        }
        

        var vIndicesArray = [];
        var fIndicesArray = [];

        var selected = [];

        for (let i=0; i<this.coords.count; i++){
            let v = this.coords.getXYZ(i);
            vIndicesArray.push(geometricalModel.getPointIndex(v));
            selected.push(0);
            selected.push(0);
        }

        for(let i=0; i<this.coords.count/3; i++){
            let f_index = geometricalModel.getFaceFromGLTriangle(i);
            fIndicesArray.push(f_index);
            fIndicesArray.push(f_index);
            fIndicesArray.push(f_index);
        }

        



        this.vertexIndices = new UInt16ArrayDynamicBufferAttribute(new Uint16Array(vIndicesArray), 1, false);
        this.faceIndices   = new UInt16ArrayDynamicBufferAttribute(new Uint16Array(fIndicesArray), 1, false);
        this.selected = new Int16ArrayDynamicBufferAttribute(new Int16Array(selected),2,false);


        
        this.geometry.setAttribute('position', this.coords);
        this.geometry.setAttribute('normal', this.normals);
        if(uv!=null){
            this.geometry.setAttribute('uv', this.uvCoords);
        }
        this.geometry.setAttribute('vIndex', new Float32ArrayDynamicBufferAttribute(this.vertexIndices.array, this.vertexIndices.itemSize, this.vertexIndices.normalized));
        this.geometry.setAttribute('fIndex', new Float32ArrayDynamicBufferAttribute(this.faceIndices.array, this.faceIndices.itemSize, this.faceIndices.normalized));
        
        this.geometry.setAttribute('selected', this.selected);
        this.selectedFace = -1;



        this.usedSize = this.geometry.getAttribute('position').count;

        this.indexed = false;
        if (threeObject.geometry.index!= null){
            var index = this.threeObject.geometry.index;
            this.indexed = true;
            this.threeObject.geometry.index =  new UInt16ArrayDynamicBufferAttribute(index.array, index.itemSize, index.normalized);
        }


        
    }

    changeSelectedFace(newFaceIndex){
        if (this.selectedFace!=newFaceIndex){
            for(let i=0; i<this.selected.count; i++){
                if(this.faceIndices.getX(i)==newFaceIndex){
                    this.geometry.getAttribute("selected").setX(i,1);
                }
                else{
                    this.geometry.getAttribute("selected").setX(i,0);
                }
            }
            this.selectedFace = newFaceIndex;
            this.selected = this.geometry.getAttribute("selected");
            this.selected.needsUpdate = true;
        }
        

    }


    
}








class VertexData extends THREE.Mesh{
    constructor(vertices, normals, uvs, fIndex, pIndex, vIndex, material){

        super(new THREE.BufferGeometry() , material);

        this.coords   = new Float32ArrayDynamicBufferAttribute(new Float32Array(vertices), 3, false);
        this.normal   = new Float32ArrayDynamicBufferAttribute(new Float32Array(normals), 3, false);
        this.uv       = new Float32ArrayDynamicBufferAttribute(new Float32Array(uvs), 2, false);
        //ToDo : passer le fIndex en int
        this.fIndex   = new Float32ArrayDynamicBufferAttribute(new Float32Array(fIndex), 1, false);
        this.pIndex   = new UInt16ArrayDynamicBufferAttribute(new Uint16Array(pIndex), 1, false);
        this.vIndex   = new UInt16ArrayDynamicBufferAttribute(new Uint16Array(vIndex), 2, false);

        this.geometry.setAttribute('position', this.coords);
        this.geometry.setAttribute('normal', this.normal);
        
        this.geometry.setAttribute('fIndex', this.fIndex);
        this.geometry.setAttribute('pIndex', this.pIndex);

        this.count    = vertices.length; 
    }

    applyChanges(){
        this.geometry.setAttribute('position', this.coords);
        this.geometry.setAttribute('normal', this.normal);
        
        this.geometry.setAttribute('fIndex', this.fIndex);
        this.geometry.setAttribute('pIndex', this.pIndex);

        this.geometry.getAttribute("position").needsUpdate = true;
        this.geometry.getAttribute("normal").needsUpdate = true;
        this.geometry.getAttribute("fIndex").needsUpdate = true;
        this.geometry.getAttribute("pIndex").needsUpdate = true;
    }

    add(vertex, normal, uv, face, point3D, neighbours){
        this.coords.pushValue(vertex[0], vertex[1], vertex[2]);

        this.normal.pushValue(normal[0],normal[1],normal[2]);

        this.uv.push2Value(uv[0], uv[1]);

        this.fIndex.pushValue(face);

        this.fIndex.pushValue(point3D);

        this.fIndex.push2Values(neighbours[0], neighbours[1]);

        this.count+=1;
    }
}


class TriangleData{
    constructor(fIndex, vIndex, tIndex){
        this.fIndex   = fIndex;
        this.vIndex   = vIndex;
        this.tIndex   = tIndex;
        this.count    = fIndex.length; 
    }
    add(vId1, vId2, vId3, fId){

        count += 1;
    }
    findNeighbours(t){
        let [v1,v2,v3] = t;
        let neighbours = [];
        for(let i=0; i<this.count; i++){

        }
    }

}


export {GraphicalModel, TriangleData, VertexData}