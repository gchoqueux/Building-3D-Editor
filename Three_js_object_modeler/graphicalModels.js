import * as THREE from 'three';
import { Float32ArrayDynamicBufferAttribute, UInt16ArrayDynamicBufferAttribute, Int16ArrayDynamicBufferAttribute } from './dynamicBufferArrays.js';


// Ne pas Heriter de mesh mais de THREE.BufferGeometry()
// Pourquoi les donnees sont poussees dans des buffers ??
class VertexData extends THREE.Mesh{
    constructor(vertices, normals, uvs, fIndex, pIndex, objIndex, faceBorder, material){

        super(new THREE.BufferGeometry() , material);

        this.coords   = new Float32ArrayDynamicBufferAttribute(new Float32Array(vertices), 3, false);
        this.normal   = new Float32ArrayDynamicBufferAttribute(new Float32Array(normals), 3, false);
        this.uv       = new Float32ArrayDynamicBufferAttribute(new Float32Array(uvs), 2, false);
        //ToDo : passer le fIndex en int
        this.fIndex   = new Float32ArrayDynamicBufferAttribute(new Float32Array(fIndex), 1, false);
        this.pIndex   = new Float32ArrayDynamicBufferAttribute(new Float32Array(pIndex), 1, false);
        //this.objIndex = new Float32ArrayDynamicBufferAttribute(new Float32Array(objIndex), 1, false);
        /*this.vIndex   = new Int16ArrayDynamicBufferAttribute(new Int16Array(vIndex), 2, false);
        this.eIndex1   = new Float32ArrayDynamicBufferAttribute(new Float32Array(eIndex1), 1, false);
        this.eIndex2   = new Float32ArrayDynamicBufferAttribute(new Float32Array(eIndex2), 1, false);
        */

        this.objectId = objIndex;

        this.geometry.setAttribute('position', this.coords);
        this.geometry.setAttribute('normal', this.normal);
        this.geometry.setAttribute('uv', this.uv);

        const vectors = [
            new THREE.Vector3( 1, 0, 0 ),
            new THREE.Vector3( 0, 1, 0 ),
            new THREE.Vector3( 0, 0, 1 )
        ];
        const centers = new Float32Array( this.coords.count * 3 );
        for ( let i = 0; i < this.coords.count; i ++ ) {
            vectors[ i % 3 ].toArray( centers, i * 3 );
            let j = i-(i%3);
            centers[ i * 3 + 0 ] += 2*faceBorder[j+0];
            centers[ i * 3 + 1 ] += 2*faceBorder[j+1];
            centers[ i * 3 + 2 ] += 2*faceBorder[j+2];
        }

        this.geometry.setAttribute( 'center', new THREE.BufferAttribute( centers, 3 ) );

        this.geometry.setAttribute('fIndex', this.fIndex);
        this.geometry.setAttribute('pIndex', this.pIndex);
        //this.geometry.setAttribute('oIndex', this.objIndex);

        this.count    = fIndex.length; 
    }

    update(vertices, normals, uvs, fIndex, pIndex, faceBorder){
        this.coords   = new Float32ArrayDynamicBufferAttribute(new Float32Array(vertices), 3, false);
        this.normal   = new Float32ArrayDynamicBufferAttribute(new Float32Array(normals), 3, false);
        this.uv       = new Float32ArrayDynamicBufferAttribute(new Float32Array(uvs), 2, false);
        //ToDo : passer le fIndex en int
        this.fIndex   = new Float32ArrayDynamicBufferAttribute(new Float32Array(fIndex), 1, false);
        this.pIndex   = new Float32ArrayDynamicBufferAttribute(new Float32Array(pIndex), 1, false);
        //this.objIndex = new Float32ArrayDynamicBufferAttribute(new Float32Array(objIndex), 1, false);
        /*this.vIndex   = new Int16ArrayDynamicBufferAttribute(new Int16Array(vIndex), 2, false);
        this.eIndex1   = new Float32ArrayDynamicBufferAttribute(new Float32Array(eIndex1), 1, false);
        this.eIndex2   = new Float32ArrayDynamicBufferAttribute(new Float32Array(eIndex2), 1, false);
        */

        const centers = new Float32Array( this.coords.count * 3 );
        const vectors = [
            new THREE.Vector3( 1, 0, 0 ),
            new THREE.Vector3( 0, 1, 0 ),
            new THREE.Vector3( 0, 0, 1 )
        ];
        for ( let i = 0; i < this.coords.count; i ++ ) {
            vectors[ i % 3 ].toArray( centers, i * 3 );
            let j = i-(i%3);
            centers[ i * 3 + 0 ] += 2*faceBorder[j+0];
            centers[ i * 3 + 1 ] += 2*faceBorder[j+1];
            centers[ i * 3 + 2 ] += 2*faceBorder[j+2];
        }

        this.geometry.setAttribute( 'center', new THREE.BufferAttribute( centers, 3 ) );

        this.count    = fIndex.length; 
        this.applyChanges();
    }

    applyChanges(){
        this.geometry.setAttribute('position', this.coords);
        this.geometry.setAttribute('normal', this.normal);
        
        this.geometry.setAttribute('fIndex', this.fIndex);
        this.geometry.setAttribute('pIndex', this.pIndex);
        //this.geometry.setAttribute('oIndex', this.objIndex);
        /*this.geometry.setAttribute('eIndex1', this.eIndex1);
        this.geometry.setAttribute('eIndex2', this.eIndex2);*/

        this.geometry.getAttribute("position").needsUpdate = true;
        this.geometry.getAttribute("normal").needsUpdate = true;
        this.geometry.getAttribute("fIndex").needsUpdate = true;
        this.geometry.getAttribute("pIndex").needsUpdate = true;
        //this.geometry.getAttribute("oIndex").needsUpdate = true;
        this.geometry.getAttribute("center").needsUpdate = true;
        /*this.geometry.getAttribute("eIndex1").needsUpdate = true;
        this.geometry.getAttribute("eIndex2").needsUpdate = true;*/
        this.updateMatrixWorld();
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
    }

    add(vertex, normal, uv, face, point3D){
        this.coords.pushValue(vertex);
        this.normal.pushValue(normal);
        //this.uv.push2Value(uv[0], uv[1]);
        this.fIndex.pushValue([face]);
        this.pIndex.pushValue([point3D]);

        this.count+=1;
        this.applyChanges();
    }

    remove(v_id){
        if(v_id>this.count){
            console.error("Indice de vertex trop grand");
        }
        this.coords.removeValue(v_id);
        this.normal.removeValue(v_id);
        //this.uv.removeValue(v_id);
        this.fIndex.removeValue(v_id);
        this.pIndex.removeValue(v_id);
        /*this.vIndex.removeValue(v_id);
        this.eIndex1.removeValue(v_id);
        this.eIndex2.removeValue(v_id);*/
        this.count-=1;
        //console.log(v_id, this.count);
        for(let i=0; i<this.count; i++){
            if(this.vIndex.getX(i)==v_id){
                this.vIndex.setX(i, -1);
            }
            if(this.vIndex.getX(i)>v_id){
                this.vIndex.setX(i, this.vIndex.getX(i)-1);
            }

            if(this.vIndex.getY(i)==v_id){
                this.vIndex.setY(i, -1);
            }
            if(this.vIndex.getY(i)>v_id){
                this.vIndex.setY(i, this.vIndex.getY(i)-1);
            }
        }
        this.applyChanges();
    }
}


class TriangleData{
    constructor(fIndex, pIndex){
        this.fIndex   = fIndex;
        this.pIndex   = pIndex;
        this.count    = fIndex.length; 
    }

}


export {/*GraphicalModel,*/ TriangleData, VertexData}