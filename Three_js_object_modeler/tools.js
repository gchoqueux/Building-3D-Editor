import * as Utils from './utils/utils';
import * as GeomUtils from './utils/3DGeometricComputes';
import * as THREE from 'three';
import { DebugFlipMaterial, BuildingMaterial, FacePointMaterial, FlipEdgeMaterial, SplitPointMaterial } from './materials.js';
import { Float32ArrayDynamicBufferAttribute } from './dynamicBufferArrays.js';

class ToolBar{
    constructor(camera, graphicalController, controls, scene){
        this.tools = {
            "Navigation":new NavigationTool(), 
            "Shift":new ShiftTool(camera, graphicalController, controls, scene),
            "SplitPoint":new SplitPointTool(graphicalController, scene),
            "FlipEdge":new FlipEdgeTool(graphicalController, scene)
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
    constructor(camera, graphicalController, controls, scene){
        super();
        this.globalDelta = 0;
        this.camera = camera;
        this.graphicalController = graphicalController;
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
        for(let i=0; i<this.graphicalController.vertexData.count; i++){
            let pt_index = this.graphicalController.vertexData.pIndex.getX(i);
            faceArrity.push(this.graphicalController.pointData.nbAdjacentFaces[pt_index]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', this.graphicalController.vertexData.coords);
        geometry.setAttribute( 'fIndex', this.graphicalController.vertexData.fIndex);
        geometry.setAttribute( 'faceArrity', new THREE.Float32BufferAttribute(faceArrity,1));
        this.faceVerticesMaterial = new FacePointMaterial( { color: 0x00BB00 } );
        this.faceVertices = new THREE.Points( geometry, this.faceVerticesMaterial );
        scene.add( this.faceVertices );


    }

    onMove(event){
        if(this.clicked){
            let faceId = this.graphicalController.faceData.selectedFace;
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


                let n = this.graphicalController.faceData.planeEquation[faceId].slice(0,3);
                n = Utils.normalize(n);

                debugInfo["normale"] = n;
                
                /*let cx = this.graphicalController.faceData.center[3*faceId];
                let cy = this.graphicalController.faceData.center[3*faceId+1];
                let cz = this.graphicalController.faceData.center[3*faceId+2];*/
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


                
                

                this.graphicalController.faceShift2(faceId, delta-this.globalDelta);
                //this.lastPicked.copy(pickedPoint);
                this.globalDelta = delta;

                this.verticesPPT.push(projectedPoint[0], projectedPoint[1], projectedPoint[2]);

                this.geometryPPT.setAttribute( 'position', new THREE.Float32BufferAttribute( this.verticesPPT, 3 ) );
                
                this.geometryPPT.getAttribute("position").needsUpdate = true;
            }
            
        }
    }

    onMouseDown(event){
        if(this.graphicalController.faceData.selectedFace != -1){
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
            this.graphicalController.changeSelectedFace(-1, material);
            this.graphicalController.changeSelectedFace(-1, this.faceVerticesMaterial);

            if(intersects.length!=0){
                this.intersectionPoint.copy(intersects[0].point);
                let triangleIndex = intersects[0].face.a/3;
                this.graphicalController.changeSelectedFace(triangleIndex, material);
                this.graphicalController.changeSelectedFace(triangleIndex, this.faceVerticesMaterial);
            }
        }
    }
}

class SplitPointTool extends Tool{
    constructor(graphicalController, scene){
        super();
        this.distThreshold = 1;
        this.graphicalController = graphicalController;

        this.scene = scene;


        let faceArrity = [];
        for(let i=0; i<this.graphicalController.vertexData.count; i++){
            let pt_index = this.graphicalController.vertexData.pIndex.getX(i);
            faceArrity.push(this.graphicalController.pointData.nbAdjacentFaces[pt_index]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', this.graphicalController.vertexData.coords);
        geometry.setAttribute( 'pIndex', this.graphicalController.vertexData.pIndex);
        geometry.setAttribute( 'faceArrity', new THREE.Float32BufferAttribute(faceArrity,1));
        this.splitPointMaterial = new SplitPointMaterial( { color: 0x00BB00 } );
        this.vertices = new THREE.Points( geometry, this.splitPointMaterial );
        

        console.log(this.graphicalController.vertexData.pIndex);

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
        for(let i=0; i<this.graphicalController.pointData.vIndex.length; i++){
            let vId = this.graphicalController.pointData.vIndex[i];
            let [x,y,z] = this.graphicalController.vertexData.coords.getXYZ(vId);
            let d = raycaster.ray.distanceSqToPoint(new THREE.Vector3(x,y,z));
            if(d<distMin){
                selectedPointId = i;
                distMin = d;
            }
        }
        if(distMin<this.distThreshold){
            this.graphicalController.changeSelectedPoint(selectedPointId, this.splitPointMaterial);
        }
        else{
            this.graphicalController.changeSelectedPoint(-1, this.splitPointMaterial);
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
    constructor(graphicalController, scene){
        super();
        this.distThreshold = 10;
        this.graphicalController = graphicalController;

        this.scene = scene;

       


        let faceArrity = [];
        for(let i=0; i<this.graphicalController.vertexData.count; i++){
            let pt_index = this.graphicalController.vertexData.pIndex.getX(i);
            faceArrity.push(this.graphicalController.pointData.nbAdjacentFaces[pt_index]);
        }
        const geometry = this.createLines(graphicalController);

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
        if(this.selectedEdge!=-1){
            let he = this.graphicalController.edgeData.halfEdgeIndex[2*this.selectedEdge];
            let v1 = this.graphicalController.halfEdgeData.vIndex[2*he];
            let v2 = this.graphicalController.halfEdgeData.vIndex[2*he+1];
            let p1 = this.graphicalController.vertexData.pIndex.getX(v1);
            let p2 = this.graphicalController.vertexData.pIndex.getX(v2);

            let fArrity1 = this.graphicalController.pointData.nbAdjacentFaces[p1];
            let fArrity2 = this.graphicalController.pointData.nbAdjacentFaces[p2];
            
            if(fArrity1==3 && fArrity2==3){
                this.graphicalController.edgeFlip(this.selectedEdge);
            }
            
            this.graphicalController.onChange();
            this.updateLines();
            
        }

        
    }
    onRender(raycaster, objects, material){

        
        let selectedPointId1 = -1;
        let selectedPointId2 = -1;
        let distMin = Infinity;

        const intersects = raycaster.intersectObject( objects[0] );
        if(intersects.length!=0){
            let faceId = this.graphicalController.vertexData.fIndex.getX(intersects[0].face.a);
            
            for(let i=0; i<this.graphicalController.triangleData.vIndex.length; i++){
                if(this.graphicalController.triangleData.fIndex[i]==faceId){
                    //console.log(i);
                    let v1_id = this.graphicalController.triangleData.vIndex[3*i];
                    let v2_id = this.graphicalController.triangleData.vIndex[3*i+1];
                    let v3_id = this.graphicalController.triangleData.vIndex[3*i+2];
                    
                    let p1_id = this.graphicalController.vertexData.pIndex.getX(v1_id);
                    let p2_id = this.graphicalController.vertexData.pIndex.getX(v2_id);
                    let p3_id = this.graphicalController.vertexData.pIndex.getX(v3_id);

                    let e1_id = Utils.computeEdgeRank(p1_id, p2_id);
                    let e2_id = Utils.computeEdgeRank(p2_id, p3_id);
                    let e3_id = Utils.computeEdgeRank(p3_id, p1_id);
                    
    
                    let [x1,y1,z1] = this.graphicalController.vertexData.coords.getXYZ(v1_id);
                    let [x2,y2,z2] = this.graphicalController.vertexData.coords.getXYZ(v2_id);
                    let [x3,y3,z3] = this.graphicalController.vertexData.coords.getXYZ(v3_id);

                    if(this.graphicalController.edgeData.halfEdgeIndex[2*e1_id]){
                        let d = raycaster.ray.distanceSqToSegment(new THREE.Vector3(x1,y1,z1), new THREE.Vector3(x2,y2,z2));
                        if(d<distMin){
                            selectedPointId1 = v1_id;
                            selectedPointId2 = v2_id;
                            distMin = d;
                        }
                    }

                    if(this.graphicalController.edgeData.halfEdgeIndex[2*e2_id]){
                        let d = raycaster.ray.distanceSqToSegment(new THREE.Vector3(x2,y2,z2), new THREE.Vector3(x3,y3,z3));
                        if(d<distMin){
                            selectedPointId1 = v2_id;
                            selectedPointId2 = v3_id;
                            distMin = d;
                        }
                    }

                    if(this.graphicalController.edgeData.halfEdgeIndex[2*e3_id]){
                        let d = raycaster.ray.distanceSqToSegment(new THREE.Vector3(x3,y3,z3), new THREE.Vector3(x1,y1,z1));
                        if(d<distMin){
                            selectedPointId1 = v3_id;
                            selectedPointId2 = v1_id;
                            distMin = d;
                        }
                    }
                }
            }
        }
        if(distMin<this.distThreshold){
            let p1 = this.graphicalController.vertexData.pIndex.getX(selectedPointId1);
            let p2 = this.graphicalController.vertexData.pIndex.getX(selectedPointId2);
            let e_id = Utils.computeEdgeRank(p1,p2);
            this.graphicalController.changeSelectedEdge(e_id, this.flipEdgeMaterial);
            this.selectedEdge = e_id;
        }
        else{
            this.graphicalController.changeSelectedEdge(-1, this.flipEdgeMaterial);
            this.selectedEdge = -1;
        }

        
        //console.log(this.flipEdgeMaterial.uniforms.selectedEdgeId.value);
        
    }

    onSelect(){
        super.onSelect();
        this.scene.add( this.edges );
    }
    onUnselect(){
        super.onUnselect();
        this.scene.remove(this.edges);
    }

    createLines(graphicalController){
        let vertices = [];
        let pIndex = [];
        let eIndex = [];
        let flipable = [];

        let n = graphicalController.edgeData.count;
        for(let i=0; i<n; i++){
            if(graphicalController.edgeData.halfEdgeIndex[2*i]!=null){
                let hfId1 = graphicalController.edgeData.halfEdgeIndex[2*i];
                let v1Id = graphicalController.halfEdgeData.vIndex[2*hfId1];
                let v2Id = graphicalController.halfEdgeData.vIndex[2*hfId1+1];
    
                let hfId2 = graphicalController.edgeData.halfEdgeIndex[2*i+1];
                let v3Id = graphicalController.halfEdgeData.vIndex[2*hfId2];
    
                let f1 = graphicalController.vertexData.fIndex.getX(v1Id);
                let f3 = graphicalController.vertexData.fIndex.getX(v3Id);
    
                if(f1!=f3){
                    let v1 = graphicalController.vertexData.coords.getXYZ(v1Id);
                    let v2 = graphicalController.vertexData.coords.getXYZ(v2Id);
    
                    vertices.push(...v1);
                    vertices.push(...v2);
    
                    let p1 = graphicalController.vertexData.pIndex.getX(v1Id);
                    let p2 = graphicalController.vertexData.pIndex.getX(v2Id);
    
                    pIndex.push(p1, p2);
    
                    eIndex.push(i,i);

                    flipable.push(graphicalController.edgeData.flipable[i],graphicalController.edgeData.flipable[i]);
                }
            }
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
        let j=0;
        let n = this.graphicalController.edgeData.count;
        for(let i=0; i<n; i++){
            if(this.graphicalController.edgeData.halfEdgeIndex[2*i]!=null){
                
                let hfId1 = this.graphicalController.edgeData.halfEdgeIndex[2*i];
                let v1Id = this.graphicalController.halfEdgeData.vIndex[2*hfId1];
                let v2Id = this.graphicalController.halfEdgeData.vIndex[2*hfId1+1];
    
                let hfId2 = this.graphicalController.edgeData.halfEdgeIndex[2*i+1];
                let v3Id = this.graphicalController.halfEdgeData.vIndex[2*hfId2];
    
                let f1 = this.graphicalController.vertexData.fIndex.getX(v1Id);
                let f3 = this.graphicalController.vertexData.fIndex.getX(v3Id);
    
                if(v1Id==v3Id){
                    console.log(j,":",i);
                    let p1 = this.graphicalController.vertexData.pIndex.getX(v1Id);
                    let p2 = this.graphicalController.vertexData.pIndex.getX(v2Id);
                    console.log(p1,"====",p2);
                    let v4Id = this.graphicalController.halfEdgeData.vIndex[2*hfId2+1];
                    console.log(v1Id,"----",v2Id);
                    console.log(v3Id,"----",v4Id);
                    console.log(f1,f3);
                }
               
                j++;


                if(f1!=f3){
                    let v1 = this.graphicalController.vertexData.coords.getXYZ(v1Id);
                    let v2 = this.graphicalController.vertexData.coords.getXYZ(v2Id);
    
                    vertices.push(...v1);
                    vertices.push(...v2);
    
                    let p1 = this.graphicalController.vertexData.pIndex.getX(v1Id);
                    let p2 = this.graphicalController.vertexData.pIndex.getX(v2Id);
    
                    pIndex.push(p1, p2);
    
                    eIndex.push(i,i);

                    flipable.push(this.graphicalController.edgeData.flipable[i],this.graphicalController.edgeData.flipable[i]);
                }
            }
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