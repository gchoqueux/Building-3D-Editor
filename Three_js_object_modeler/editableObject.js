import * as THREE from 'three';
import * as utils from'./utils.js';
import { Float32ArrayDynamicBufferAttribute, UInt16ArrayDynamicBufferAttribute } from './dynamicBufferArrays.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import {GeometricalModel} from './GeometricalModel.js';
import { GraphicalModel } from './graphicalModels.js';

//TODO : créer la classe EditableObject et migrer dedans le code du constructeur
class EditableMesh{



    constructor(threeObject){


        if (!threeObject.isMesh){
            threeObject.traverse( function ( child ) {
                if ( child.isMesh ){
                    threeObject = child;
                } 
            } );
        }

        this.indexed = threeObject.geometry.index!= null;
        let positions = threeObject.geometry.getAttribute('position');
        let coords = new Float32ArrayDynamicBufferAttribute(positions.array, positions.itemSize, positions.normalized);

        if(threeObject.geometry.index!= null){
            this.geometricalModel = new GeometricalModel(coords, threeObject.geometry.index);
        }
        else{
            this.geometricalModel = new GeometricalModel(coords);
        }

        this.threeObject = new GraphicalModel(threeObject, this.geometricalModel);

        
        
    }

    addToScene(scene, objects){

        scene.add(this.threeObject);
        objects.push(this.threeObject);
    }

    translate(dx,dy,dz){

        this.geometricalModel.pointsIndex.forEach(
            p=>{
                p.coord.x += dx;
                p.coord.y += dy;
                p.coord.z += dz;
                p.index.forEach(
                    i=>{
                        this.threeObject.geometry.getAttribute( 'position' ).setXYZ( i, p.coord.x, p.coord.y, p.coord.z );
                    }
                )
            }
        )
            
        this.threeObject.geometry.getAttribute( 'position' ).needsUpdate = true;
        this.threeObject.geometry.computeBoundingBox();
        this.threeObject.geometry.computeBoundingSphere();
    }

    translatePoint(index,dx,dy,dz){

        var point = this.geometricalModel.pointsIndex[index];

        point.coord.x += dx;
        point.coord.y += dy;
        point.coord.z += dz;

        for (var i=0; i<point.index.length; i++){

            this.threeObject.geometry.getAttribute( 'position' ).setXYZ( point.index[i], point.coord.x, point.coord.y, point.coord.z );
        }

        
        
        this.threeObject.geometry.getAttribute( 'position' ).needsUpdate = true;
        this.threeObject.geometry.computeBoundingBox();
        this.threeObject.geometry.computeBoundingSphere();
    }

    static async createFromFile(file, material){
        const loader = new OBJLoader();

        function onsuccess(object){
            var ll = new THREE.Vector3();
            var ur = new THREE.Vector3();
            object.traverse( function ( child ) {
                if ( child.isMesh ){
                    child.material = material;
                    child.geometry.computeBoundingBox();
                } 
            } );
            console.log("loaded");

        }

        function onload( xhr ) {

            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

        }

        function onfail ( error ) {
            console.log(error);
            console.log( 'An error happened' );

        }

        //return await loader.load(file, onsuccess, onload, onfail);
        var loading = loader.loadAsync(file,  onload);

        return loading.then(function(response){
            onsuccess(response);
            return new EditableMesh(response);
        })
    }

    addVertex(i,x,y,z){
        
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }

        for (var j=this.usedSize; j>i; j--){
            const x1 = this.coordinates.getX(j-1);
            const y1 = this.coordinates.getY(j-1);
            const z1 = this.coordinates.getZ(j-1);
            this.coordinates.setXYZ(j, x1, y1, z1);
        }
        
        this.coordinates.setXYZ(i, x, y, z);

        this.usedSize += 1;
        this.threeObject.geometry.setDrawRange( 0, this.usedSize );
        this.coordinates.needsUpdate = true;
        this.threeObject.geometry.computeBoundingBox();
        this.threeObject.geometry.computeBoundingSphere();

    }

    pushVertex(x,y,z){


        this.threeObject.geometry.getAttribute('position').pushValue(x,y,z);
        //console.log(this.threeObject.geometry.getAttribute('position'));

        this.usedSize += 1;
        
        //ajout à l'index des points
        this.geometricalModel.addVertex([x,y,z], this.usedSize-1)


        this.threeObject.geometry.setDrawRange( 0, this.usedSize );
        this.threeObject.geometry.computeBoundingBox();
        this.threeObject.geometry.computeBoundingSphere();

    }

    splitFace(index, x,y,z){

        var positions = this.threeObject.geometry.getAttribute('position');
        
        if (this.indexed){

            this.pushVertex(x,y,z);


            var v1 = this.threeObject.geometry.index.getX(3*index);
            var v2 = this.threeObject.geometry.index.getY(3*index);
            var v3 = this.threeObject.geometry.index.getZ(3*index);

            console.log(v1)
            console.log(v2)
            console.log(v3)

            //On mets à jour la normale et les uv comme une moyenne de celle des autres points
            const uvs = this.threeObject.geometry.getAttribute('uv');
            if (uvs!=null){
                const uv1 = [uvs.getX(v1), uvs.getY(v1)];
                const uv2 = [uvs.getX(v2), uvs.getY(v2)];
                const uv3 = [uvs.getX(v3), uvs.getY(v3)];
                const uv = utils.meanVectors([uv1, uv2, uv3]);
                //console.log(uv);    
                this.threeObject.geometry.getAttribute('uv').push2Value(uv[0], uv[1]);
            }

            this.threeObject.geometry.getAttribute('normal').pushValue(0,0,0);

            //Modification de la face initiale pour créer le 1er nouveau triangle
            this.threeObject.geometry.index.setZ(3*index, this.usedSize);

            //puis on crée les 2 nouveaux triangles
            this.threeObject.geometry.index.pushValues(v2,v3, this.usedSize);
            this.threeObject.geometry.index.pushValues(v3,v1, this.usedSize);
        }
        else{
            
            var v1 = [positions.getX(3*index), positions.getY(3*index), positions.getZ(3*index)];
            var v2 = [positions.getX(3*index+1), positions.getY(3*index+1), positions.getZ(3*index+1)];
            var v3 = [positions.getX(3*index+2), positions.getY(3*index+2), positions.getZ(3*index+2)];

            /*console.log(v1)
            console.log(v2)
            console.log(v3)*/


            //On récupère les coordonnées textures et normales de la face
            const uvs = this.threeObject.geometry.getAttribute('uv');
            if (uvs!=null){
                const uv1 = [uvs.getX(3*index), uvs.getY(3*index)];
                const uv2 = [uvs.getX(3*index+1), uvs.getY(3*index+1)];
                const uv3 = [uvs.getX(3*index+2), uvs.getY(3*index+2)];
                const uv = utils.meanVectors([uv1, uv2, uv3]);
                //console.log(uv);    
                this.threeObject.geometry.getAttribute('uv').push2Value(uv2[0], uv2[1]);
                this.threeObject.geometry.getAttribute('uv').push2Value(uv3[0], uv3[1]);
                this.threeObject.geometry.getAttribute('uv').push2Value(uv[0], uv[1]);

                this.threeObject.geometry.getAttribute('uv').push2Value(uv3[0], uv3[1]);
                this.threeObject.geometry.getAttribute('uv').push2Value(uv1[0], uv1[1]);
                this.threeObject.geometry.getAttribute('uv').push2Value(uv[0], uv[1]);
            }

            for (let i=0; i<6; i++){
                this.threeObject.geometry.getAttribute('normal').pushValue(0,0,0);
            }
            

            //Modification de la face initiale pour créer le 1er nouveau triangle
            this.updateVertex(3*index+2, x,y,z);

            //puis on crée les 2 nouveaux triangles
            this.pushVertex(v2[0],v2[1],v2[2]);
            this.pushVertex(v3[0],v3[1],v3[2]);
            this.pushVertex(x,y,z);

            this.pushVertex(v3[0],v3[1],v3[2]);
            this.pushVertex(v1[0],v1[1],v1[2]);
            this.pushVertex(x,y,z);

        }

        //On mets à jour la normale des faces comme le produit vectoriel des vecteurs entre les points.
        

        
        this.computeNormals(index);
        this.computeNormals(this.usedSize/3 -1);
        this.computeNormals(this.usedSize/3 -2);

        
        this.threeObject.geometry.setDrawRange(0, this.usedSize);
        console.log(this.threeObject);
        
        /*const geometry = new THREE.BufferGeometry();
        var positions = this.threeObject.geometry.getAttribute('position');
        geometry.setAttribute('position',new Float32ArrayDynamicBufferAttribute(positions.array, positions.itemSize, positions.normalized));
        const material = new THREE.MeshBasicMaterial( {color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000} );
        this.threeObject = new THREE.Mesh( geometry, material );*/
        


    }

    increaseSize(){
        const newGeometry = new THREE.BufferGeometry();
        const newPositions = new Float32Array( 2*this.allocatedSize * 3 );
        newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions,3));
        /*newGeometry.setAttribute('normal', new THREE.BufferAttribute(newPositions,3));
        newGeometry.setAttribute('uv', new THREE.BufferAttribute(newPositions,3));*/

        for (var i=0; i<this.allocatedSize; i++){
            const x = this.coordinates.getX(i);
            const y = this.coordinates.getY(i);
            const z = this.coordinates.getZ(i);
            newGeometry.getAttribute( 'position' ).setXYZ(i, x, y, z);
        }

        
        this.allocatedSize *= 2;
        this.threeObject.geometry.setDrawRange( 0, this.usedSize );
        this.coordinates = newGeometry.getAttribute( 'position' );
        this.threeObject.geometry = newGeometry;
    }

    

    updateVertex(index, nx, ny, nz){
        const x = this.threeObject.geometry.getAttribute('position').getX(index);
        const y = this.threeObject.geometry.getAttribute('position').getY(index);
        const z = this.threeObject.geometry.getAttribute('position').getZ(index);
        //D'abord on retire le point modifié de l'index
        this.geometricalModel.pointsIndex.forEach(
            p=>{
                if (p.coord.x==x && p.coord.y==y && p.coord.z==z){
                    const i = p.index.indexOf(index);
                    p.index.splice(i, 1);
                }
            }
        )

        //Ensuite on modifie le point
        this.threeObject.geometry.getAttribute('position').setXYZ(index, nx,ny,nz);

        //Puis on update l'index
        var known = false;
        this.geometricalModel.pointsIndex.forEach(
            p=>{
                if(p.coord.x==nx && p.coord.y==ny && p.coord.z==nz){
        
                    known = true;
                    p.index.push(index);
                }
            }
        )
        if(!known){
            this.geometricalModel.pointsIndex.push({'coord':{'x':x, 'y':y, 'z':z}, index:[this.usedSize-1]});
        }

    }

    updateIndexedVertex(){
        //TODO : coder cette fonction ? I guess
    }

    computeNormals(faceIndex){
        var positions = this.threeObject.geometry.getAttribute('position');
        var v1,v2,v3;
        if (this.indexed){
            var indexV1 = this.threeObject.geometry.index.getX(3*faceIndex);
            var indexV2 = this.threeObject.geometry.index.getY(3*faceIndex);
            var indexV3 = this.threeObject.geometry.index.getZ(3*faceIndex);

            v1 = positions.getXYZ(indexV1);
            v2 = positions.getXYZ(indexV2);
            v3 = positions.getXYZ(indexV3);
        }else{
            v1 = positions.getXYZ(3*faceIndex);
            v2 = positions.getXYZ(3*faceIndex+1);
            v3 = positions.getXYZ(3*faceIndex+2);
        }
        
        var vec3_1 = [v1[0]-v3[0],v1[1]-v3[1],v1[2]-v3[2]];
        var vec3_2 = [v2[0]-v3[0],v2[1]-v3[1],v2[2]-v3[2]];

        var n = utils.normalize(utils.crossProduct(vec3_1, vec3_2));

        


        var normals = this.threeObject.geometry.getAttribute('normal');

        if (this.indexed){
            var indexV1 = this.threeObject.geometry.index.getX(3*faceIndex);
            var indexV2 = this.threeObject.geometry.index.getY(3*faceIndex);
            var indexV3 = this.threeObject.geometry.index.getZ(3*faceIndex);

            normals.setXYZ(indexV1, n[0], n[1], n[2]);
            normals.setXYZ(indexV2, n[0], n[1], n[2]);
            normals.setXYZ(indexV2, n[0], n[1], n[2]);

            
        }else{
            normals.setXYZ(3*faceIndex, n[0], n[1], n[2]);
            normals.setXYZ(3*faceIndex+1, n[0], n[1], n[2]);
            normals.setXYZ(3*faceIndex+2, n[0], n[1], n[2]);
        }


    }

    useRandomColoration(){
        //Création d'un attribut dotant chaque triangle d'une couleur aléatoire
        this.computeRandomColoration();
        /*const materialRandomColoration = new THREE.MeshBasicMaterial({
            vertexColors: true
        });*/
        const materialRandomColoration = new THREE.MeshPhongMaterial({vertexColors: true, color : 0xffffff, reflectivity:0.8, shininess : 40, specular : 0xffffff});
        this.threeObject.material = materialRandomColoration;
    }

    computeRandomColoration(){
        if(this.trianglesColorArray==null){
            this.trianglesColorArray = [];
            var r, g, b;
            for(let i=0; i < this.usedSize; i++){
                if (i%3==0){
                    r=Math.random();
                    g=Math.random();
                    b=Math.random();
                }
                this.trianglesColorArray.push(r,g,b);
            }
        }
        const color_attribute = new Float32ArrayDynamicBufferAttribute(new Float32Array(this.trianglesColorArray), 3);
        this.threeObject.geometry.setAttribute('color', color_attribute);
    }

    useRandomFaceColoration(){
        //Création d'un attribut dotant chaque triangle d'une couleur aléatoire
        this.computeRandomFaceColoration();
        /*const materialRandomColoration = new THREE.MeshBasicMaterial({
            vertexColors: true
        });*/
        const materialRandomColoration = new THREE.MeshPhongMaterial({vertexColors: true, color : 0xffffff, reflectivity:0.8, shininess : 40, specular : 0xffffff});
        this.threeObject.material = materialRandomColoration;
    }

    computeRandomFaceColoration(){
        if(this.faceColorArray==null){
            this.faceColorArray = new Float32Array(this.usedSize*3);
            var r, g, b;
            for(let i=0; i < this.geometricalModel.faces.length; i++){
                r=Math.random();
                g=Math.random();
                b=Math.random();
                this.geometricalModel.faces[i].trianglesIndices.forEach (
                    t_i=>{
                        const vertex_index = 3*t_i;
                        this.faceColorArray[3*vertex_index]=r;
                        this.faceColorArray[3*vertex_index+1]=g;
                        this.faceColorArray[3*vertex_index+2]=b;
                        this.faceColorArray[3*vertex_index+3]=r;
                        this.faceColorArray[3*vertex_index+4]=g;
                        this.faceColorArray[3*vertex_index+5]=b;
                        this.faceColorArray[3*vertex_index+6]=r;
                        this.faceColorArray[3*vertex_index+7]=g;
                        this.faceColorArray[3*vertex_index+8]=b;
                    }
                )
                
            }
        }
        
        const color_attribute = new Float32ArrayDynamicBufferAttribute(new Float32Array(this.faceColorArray), 3);
        this.threeObject.geometry.setAttribute('color', color_attribute);
    }

    useMaterial(material){
        this.threeObject.material = material;
    }

    changeSelectedFace(newSelectedFaceIndex){
        this.threeObject.changeSelectedFace(newSelectedFaceIndex);
    }



}

export {EditableMesh}