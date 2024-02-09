import * as Utils from './utils/utils';
import * as GeomUtils from './utils/3DGeometricComputes';
import * as THREE from 'three';
import { DebugFlipMaterial, BuildingMaterial, FacePointMaterial, FlipEdgeMaterial, SplitPointMaterial } from './materials.js';
import { Float32ArrayDynamicBufferAttribute } from './dynamicBufferArrays.js';

class ToolBar{
    constructor(camera, geometricalController, controls, scene){
        this.tools = {
            "Navigation":new NavigationTool(), 
            "Shift":new ShiftTool(camera, geometricalController, controls, scene),
            "SplitPoint":new SplitPointTool(geometricalController, scene),
            "FlipEdge":new FlipEdgeTool(geometricalController, scene)
        };
        this.selectedTool = new NavigationTool();
        this.selectedTool.onSelect();
    }

    /**
     * 
     * @param {string} newTool : the string corresponding to the new selected tool
     */
    changeTool(newTool){
        this.selectedTool.onUnselect();
        this.selectedTool = this.tools[newTool];
        this.selectedTool.onSelect();
    }

    onMove(event){
        this.selectedTool.onMove(event);
    }

    onMouseDown(event){
        this.selectedTool.onMouseDown(event);
    }

    onMouseUp(event){
        this.selectedTool.onMouseUp(event);
    }

    onClick(event){
        this.selectedTool.onClick(event);
    }

}



class Tool{
    constructor(){
        this.intersectionPoint = new THREE.Vector3(0,0,0);
        this.clicked = false;
        this.selected = false;

    }

    onMove(event){

    }

    onMouseDown(event){

    }

    onMouseUp(event){

    }

    onClick(event){

    }

    onRender(raycaster, objects, material){

    }

    onSelect(){
        this.selected = true;
    }
    onUnselect(){
        this.selected = false;
    }

}


class NavigationTool extends Tool{
    constructor(){
        super();
        this.intersectionPoint = new THREE.Vector3(0,0,0);

    }

    onMove(event){

    }

    onMouseDown(event){

    }

    onMouseUp(event){

    }
}


class ShiftTool extends Tool{
    constructor(camera, geometricalController, controls, scene){
        super();
        this.globalDelta = 0;
        this.camera = camera;
        this.geometricalController = geometricalController;
        this.controls = controls;
        this.lastPos = new THREE.Vector2();
        this.lastPicked = new THREE.Vector3();

        this.last_intersected = [];


        this.verticesPPT = [];
        this.geometryPPT = new THREE.BufferGeometry();
        this.materialPPT = new THREE.PointsMaterial( { color: 0x00FF00 , size: 0.5} );
        this.projectedPointThree = new THREE.Points(this.geometryPPT, this.materialPPT);
        scene.add(this.projectedPointThree);

        

        let faceArrity = [];
        for(let i=0; i<this.geometricalController.vertexData.count; i++){
            let pt_index = this.geometricalController.vertexData.pIndex.getX(i);
            faceArrity.push(this.geometricalController.pointData.nbAdjacentFaces[pt_index]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', this.geometricalController.vertexData.coords);
        geometry.setAttribute( 'fIndex', this.geometricalController.vertexData.fIndex);
        geometry.setAttribute( 'faceArrity', new THREE.Float32BufferAttribute(faceArrity,1));
        this.faceVerticesMaterial = new FacePointMaterial( { color: 0x00BB00 } );
        this.faceVertices = new THREE.Points( geometry, this.faceVerticesMaterial );
        scene.add( this.faceVertices );


    }

    onMove(event){
        if(this.clicked){
            let faceId = this.geometricalController.faceData.selectedFace;
            if(faceId!=-1){
                let debugInfo = {};
                let x = ( event.clientX / window.innerWidth ) * 2 - 1;
                let y = - ( event.clientY / window.innerHeight ) * 2 + 1;
                let z = 1;

                debugInfo["screen coords"] = [x,y,z];

                //To Do passer en view proj 3*3
                let m = new THREE.Vector3(x,y,z);
                m.unproject(this.camera);
                debugInfo["world pointer coords"] = [m.x, m.y, m.z];
                debugInfo["world camera coords"] = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
                m.sub(this.camera.position);
                /*let m = new THREE.Vector3();
                m.copy(pickedPoint);
                m.sub(this.camera.position);*/
                m.normalize();
                debugInfo["picking line vector"] = [m.x, m.y, m.z];


                let n = this.geometricalController.faceData.planeEquation[faceId].slice(0,3);
                n = Utils.normalize(n);

                debugInfo["normale"] = n;
                
                /*let cx = this.geometricalController.faceData.center[3*faceId];
                let cy = this.geometricalController.faceData.center[3*faceId+1];
                let cz = this.geometricalController.faceData.center[3*faceId+2];*/
                let cx = this.intersectionPoint.x;
                let cy = this.intersectionPoint.y;
                let cz = this.intersectionPoint.z;
                debugInfo["face center"] = [cx,cy,cz];

                let pickingLine = [[this.camera.position.x,this.camera.position.y,this.camera.position.z],[m.x,m.y,m.z]];
                
                let faceLine    = [[cx,cy,cz],[n[0],n[1],n[2]]];

                let closestPoint = GeomUtils.findClosestPointToNLines(pickingLine, faceLine);
                let projectedPoint = GeomUtils.projectPointOnLine(closestPoint, faceLine);

                debugInfo["P*"] = closestPoint;
                debugInfo["P* projete"] = projectedPoint;


                let shiftVect = [projectedPoint[0]-cx,projectedPoint[1]-cy, projectedPoint[2]-cz];
                let orientation = Utils.dotProduct(shiftVect, n);
                let delta = Utils.norme(shiftVect);
                if(orientation<0){
                    delta*=-1;
                }
                

                debugInfo["delta"] = delta;


                
                

                this.geometricalController.faceShift2(faceId, delta-this.globalDelta);
                this.geometricalController.onChange();
                //this.lastPicked.copy(pickedPoint);
                this.globalDelta = delta;

                this.geometricalController.updateScene();

                this.verticesPPT.push(projectedPoint[0], projectedPoint[1], projectedPoint[2]);

                this.geometryPPT.setAttribute( 'position', new THREE.Float32BufferAttribute( this.verticesPPT, 3 ) );
                
                this.geometryPPT.getAttribute("position").needsUpdate = true;


                this.recomputeFacePoints();


            }
            
        }
    }

    onMouseDown(event){
        if(this.geometricalController.faceData.selectedFace != -1){
            this.clicked = true;
            this.controls.enabled = false;
            this.globalDelta = 0;
            this.verticesPPT = [];
            this.geometryPPT.setAttribute( 'position', new THREE.Float32BufferAttribute( this.verticesPPT, 3 ) );
            this.geometryPPT.getAttribute("position").needsUpdate = true;
        }
    }

    onMouseUp(event){
        this.clicked = false;
        this.controls.enabled = true;
    }

    onRender(raycaster, objects, material){
        //reset the color of last intersected objects
        /*const material = new BuildingMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
    
        for (var i=0; i<this.last_intersected.length; i++){
            this.last_intersected[i].object.material = material;
        }*/


        // calculate objects intersecting the picking ray
        //const intersects = raycaster.intersectObjects( scene.children );
        const intersects = raycaster.intersectObject( objects[0] );
        this.last_intersected = intersects;
        


        if(!this.clicked){
            this.geometricalController.changeSelectedFace(-1, material);
            this.geometricalController.changeSelectedFace(-1, this.faceVerticesMaterial);

            if(intersects.length!=0){
                this.intersectionPoint.copy(intersects[0].point);
                let triangleIndex = intersects[0].face.a/3;
                this.geometricalController.changeSelectedFace(triangleIndex, material);
                this.geometricalController.changeSelectedFace(triangleIndex, this.faceVerticesMaterial);
            }
        }
    }

    recomputeFacePoints(){
        let faceArrity = [];
        for(let i=0; i<this.geometricalController.vertexData.count; i++){
            let pt_index = this.geometricalController.vertexData.pIndex.getX(i);
            faceArrity.push(this.geometricalController.pointData.nbAdjacentFaces[pt_index]);
        }
        this.faceVertices.geometry.setAttribute( 'position', this.geometricalController.vertexData.coords);
        this.faceVertices.geometry.setAttribute( 'fIndex', this.geometricalController.vertexData.fIndex);
        this.faceVertices.geometry.setAttribute( 'faceArrity', new THREE.Float32BufferAttribute(faceArrity,1));
        
        this.faceVertices.geometry.getAttribute('position').needsUpdate = true;
        this.faceVertices.geometry.getAttribute('fIndex').needsUpdate = true;
        this.faceVertices.geometry.getAttribute('faceArrity').needsUpdate = true;
    }

    onSelect(){
        super.onSelect();
        this.recomputeFacePoints();
    }
}

class SplitPointTool extends Tool{
    constructor(geometricalController, scene){
        super();
        this.distThreshold = 1;
        this.geometricalController = geometricalController;

        this.scene = scene;


        let faceArrity = [];
        for(let i=0; i<this.geometricalController.vertexData.count; i++){
            let pt_index = this.geometricalController.vertexData.pIndex.getX(i);
            faceArrity.push(this.geometricalController.pointData.nbAdjacentFaces[pt_index]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', this.geometricalController.vertexData.coords);
        geometry.setAttribute( 'pIndex', this.geometricalController.vertexData.pIndex);
        geometry.setAttribute( 'faceArrity', new THREE.Float32BufferAttribute(faceArrity,1));
        this.splitPointMaterial = new SplitPointMaterial( { color: 0x00BB00 } );
        this.vertices = new THREE.Points( geometry, this.splitPointMaterial );
        

        console.log(this.geometricalController.vertexData.pIndex);

    }
    onMove(event){
        
    }
    onMouseDown(event){

    }
    onMouseUp(event){

    }
    onRender(raycaster, objects){

        
        let selectedPointId = -1;
        let distMin = Infinity;
        for(let i=0; i<this.geometricalController.pointData.vIndex.length; i++){
            let vId = this.geometricalController.pointData.vIndex[i];
            let [x,y,z] = this.geometricalController.vertexData.coords.getXYZ(vId);
            let d = raycaster.ray.distanceSqToPoint(new THREE.Vector3(x,y,z));
            if(d<distMin){
                selectedPointId = i;
                distMin = d;
            }
        }
        if(distMin<this.distThreshold){
            this.geometricalController.changeSelectedPoint(selectedPointId, this.splitPointMaterial);
        }
        else{
            this.geometricalController.changeSelectedPoint(-1, this.splitPointMaterial);
        }
        
    }

    onSelect(){
        super.onSelect();
        this.scene.add( this.vertices );
    }
    onUnselect(){
        super.onUnselect();
        this.scene.remove(this.vertices);
    }
}

class FlipEdgeTool extends Tool{
    constructor(geometricalController, scene){
        super();
        this.distThreshold = 10;
        this.geometricalController = geometricalController;

        this.scene = scene;

       


        let faceArrity = [];
        for(let i=0; i<this.geometricalController.vertexData.count; i++){
            let pt_index = this.geometricalController.vertexData.pIndex.getX(i);
            faceArrity.push(this.geometricalController.pointData.nbAdjacentFaces[pt_index]);
        }
        const geometry = this.createLines(geometricalController);

        console.log(geometry);


        
        this.flipEdgeMaterial = new FlipEdgeMaterial( { color: 0x00BB00, linewidth: 10 } );
        this.edges = new THREE.LineSegments( geometry, this.flipEdgeMaterial );
        
        this.selectedEdge = -1;

        console.log(this.flipEdgeMaterial);


    }
    onMove(event){
        
    }
    onMouseDown(event){

    }
    onMouseUp(event){

    }
    onClick(event){
        if(this.selectedEdge!=-1&&this.geometricalController.edgeData.flipable[this.selectedEdge]){

            this.geometricalController.edgeFlip(this.selectedEdge);
            
            
            this.geometricalController.onChange();
            this.updateLines();
            
        }

        
    }
    onRender(raycaster, objects, material){

        
        let selectedEdge = -1;
        let distMin = Infinity;

        const intersects = raycaster.intersectObject( objects[0] );
        if(intersects.length!=0){
            let faceId = this.geometricalController.vertexData.fIndex.getX(intersects[0].face.a);
            
            for(let i=0; i<this.geometricalController.edgeData.count; i++){
                let he1_id = this.geometricalController.edgeData.heIndex[i];
                let he2_id = this.geometricalController.halfEdgeData.opposite(he1_id);
                if(this.geometricalController.halfEdgeData.fIndex[he1_id]==faceId || this.geometricalController.halfEdgeData.fIndex[he2_id]==faceId){
                    //console.log(i);
                    let p1_id = this.geometricalController.halfEdgeData.pIndex[he1_id];
                    let p2_id = this.geometricalController.halfEdgeData.pIndex[he2_id];
                    
    
                    let [x1,y1,z1] = this.geometricalController.computeCoords(p1_id);
                    let [x2,y2,z2] = this.geometricalController.computeCoords(p2_id);
                    
                    let d = raycaster.ray.distanceSqToSegment(new THREE.Vector3(x1,y1,z1), new THREE.Vector3(x2,y2,z2));
                    if(d<distMin){
                        selectedEdge = i;
                        distMin = d;
                    }
                }
            }
        }
        if(distMin<this.distThreshold){
            this.geometricalController.changeSelectedEdge(selectedEdge, this.flipEdgeMaterial);
            this.selectedEdge = selectedEdge;
        }
        else{
            this.geometricalController.changeSelectedEdge(-1, this.flipEdgeMaterial);
            this.selectedEdge = -1;
        }

        
        //console.log(this.flipEdgeMaterial.uniforms.selectedEdgeId.value);
        
    }

    onSelect(){
        super.onSelect();
        this.updateLines();
        this.scene.add( this.edges );
    }
    onUnselect(){
        super.onUnselect();
        this.scene.remove(this.edges);
    }

    createLines(geometricalController){
        let vertices = [];
        let pIndex = [];
        let eIndex = [];
        let flipable = [];

        let n = geometricalController.edgeData.count;
        for(let i=0; i<n; i++){
            let he_id = geometricalController.edgeData.heIndex[i];
            let he_next_id = geometricalController.halfEdgeData.next(he_id);
            let p1Id = geometricalController.halfEdgeData.pIndex[he_id];
            let p2Id = geometricalController.halfEdgeData.pIndex[he_next_id];
    
            let coord1 = geometricalController.computeCoords(p1Id);
            let coord2 = geometricalController.computeCoords(p2Id);


            
            vertices.push(...coord1);
            vertices.push(...coord2);

            pIndex.push(p1Id, p2Id);

            eIndex.push(i,i);

            flipable.push(geometricalController.edgeData.flipable[i],geometricalController.edgeData.flipable[i]);
        
            }
        
        vertices = new Float32Array(vertices);
        pIndex = new Float32Array(pIndex);
        flipable = new Float32Array(flipable);
        eIndex = new Float32Array(eIndex);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new Float32ArrayDynamicBufferAttribute(vertices, 3, false));
        geometry.setAttribute( 'pIndex',   new Float32ArrayDynamicBufferAttribute(pIndex, 1, false));
        geometry.setAttribute( 'flipable', new Float32ArrayDynamicBufferAttribute(flipable, 1, false));
        geometry.setAttribute( 'eIndex', new Float32ArrayDynamicBufferAttribute(eIndex, 1, false));
        return geometry;
        
    }

    updateLines(){
        let vertices = [];
        let pIndex = [];
        let eIndex = [];
        let flipable = [];
        let n = this.geometricalController.edgeData.count;
        for(let i=0; i<n; i++){
            let he_id = this.geometricalController.edgeData.heIndex[i];
            let he_next_id = this.geometricalController.halfEdgeData.next(he_id);
            let p1Id = this.geometricalController.halfEdgeData.pIndex[he_id];
            let p2Id = this.geometricalController.halfEdgeData.pIndex[he_next_id];
    
            let coord1 = this.geometricalController.computeCoords(p1Id);
            let coord2 = this.geometricalController.computeCoords(p2Id);


            
            vertices.push(...coord1);
            vertices.push(...coord2);

            pIndex.push(p1Id, p2Id);

            eIndex.push(i,i);

            flipable.push(this.geometricalController.edgeData.flipable[i],this.geometricalController.edgeData.flipable[i]);
        
        }
        vertices = new Float32Array(vertices);
        pIndex = new Float32Array(pIndex);
        flipable = new Float32Array(flipable);
        eIndex = new Float32Array(eIndex);

        
        
        this.edges.geometry.setAttribute( 'position', new Float32ArrayDynamicBufferAttribute(vertices, 3, false));
        this.edges.geometry.setAttribute( 'pIndex',   new Float32ArrayDynamicBufferAttribute(pIndex, 1, false));
        this.edges.geometry.setAttribute( 'flipable', new Float32ArrayDynamicBufferAttribute(flipable, 1, false));
        this.edges.geometry.setAttribute( 'eIndex', new Float32ArrayDynamicBufferAttribute(eIndex, 1, false));
        
        
        this.edges.geometry.getAttribute( 'position').needsUpdate = true;
        this.edges.geometry.getAttribute( 'pIndex').needsUpdate = true;
        this.edges.geometry.getAttribute( 'flipable').needsUpdate = true;
        this.edges.geometry.getAttribute( 'eIndex').needsUpdate = true;

        this.edges.updateMatrixWorld();
        this.edges.geometry.computeBoundingBox();
        this.edges.geometry.computeBoundingSphere();

        //console.log(this.edges);
        

    }

}

export{ToolBar, ShiftTool}