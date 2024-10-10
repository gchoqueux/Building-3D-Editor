import * as Utils from './utils/utils';
import * as GeomUtils from './utils/3DGeometricComputes';
import * as THREE from 'three';
import { FacePointMaterial, FlipEdgeMaterial, buildingMaterial, buildingMaterialDebug, buildingNotSelectedMaterial, buildingPointedMaterial, buildingSelectedMaterial, dualMaterial } from './materials/materials.js';
import { Float32ArrayDynamicBufferAttribute } from './dynamicBufferArrays.js';
import { ControllersCollection } from './controllers/controllersCollection.js';
import { CityJSONModelBuilder } from './Builders/ModelBuilder.js';
import { GeometryBuilder } from './Builders/GeometryBuilders.js';
import { shiftFaceEdgeMaterial, shiftFacePointMaterial } from './materials/shiftToolsMaterials.js';
import { isTopologicallyValid } from './validityCheck.js';
import { ExactNumber as N } from 'exactnumber/dist/index.umd.js';

class ToolBar{
    constructor(camera, geometricalControllers, controls, scene, dualScene){
        this.tools = {
            "Navigation":new NavigationTool(), 
            "Shift":new ShiftTool(camera, geometricalControllers, controls, scene),
            "FlipEdge":new FlipEdgeTool(geometricalControllers, scene),
            "ObjectSelection":new ObjectSelectionTool(geometricalControllers, dualScene, scene)
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

    setGeometricalController(new_geometricalController){
        Object.values(this.tools).forEach(tool=>{
            tool.setGeometricalController(new_geometricalController);
        })
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
        return this.selectedTool.onClick(event);
    }

    setScreenSplitRatio(new_screenSplitRatio){
        Object.values(this.tools).forEach(tool=>{
            tool.screen_split_ratio = new_screenSplitRatio;
        })
    }

}



class Tool{
    constructor(){
        this.intersectionPoint = new THREE.Vector3(0,0,0);
        this.clicked = false;
        this.selected = false;
        this.screen_split_ratio = 1.0;

    }


    onMove(event){

    }

    onMouseDown(event){

    }

    onMouseUp(event){

    }

    onClick(event){
        return 0;
    }

    onRender(raycaster, material){

    }

    onSelect(){
        this.selected = true;
    }
    onUnselect(){
        this.selected = false;
    }

    setGeometricalController(new_geometricalController){
        this.geometricalController = new_geometricalController;
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
    constructor(camera, geometricalControllers, controls, scene){
        super();
        this.distThreshold = 0.1;
        this.globalDelta = N(0);
        this.camera = camera;
        this.geometricalControllers = geometricalControllers;
        this.controls = controls;
        this.lastPos = new THREE.Vector2();
        this.lastPicked = new THREE.Vector3();

        this.last_intersected = [];

        this.selectedFace = -1;
        this.selectedEdge = -1;
        this.selectedPoint = -1;

        const geometryEdges = new THREE.BufferGeometry();
        
        this.shiftEdgeMaterial = shiftFaceEdgeMaterial;
        this.edges = new THREE.LineSegments( geometryEdges, this.shiftEdgeMaterial );
        
        


        /*this.verticesPPT = [];
        this.geometryPPT = new THREE.BufferGeometry();
        this.materialPPT = new THREE.PointsMaterial( { color: 0x00FF00 , size: 0.5} );
        this.projectedPointThree = new THREE.Points(this.geometryPPT, this.materialPPT);
        scene.add(this.projectedPointThree);*/

        

        this.scene = scene;
        /*for(let i=0; i<this.geometricalControllers.getSelectedController().vertexData.count; i++){
            let pt_index = this.geometricalControllers.getSelectedController().vertexData.pIndex.getX(i);
            faceArrity.push(this.geometricalControllers.getSelectedController().pointData.nbAdjacentFaces[pt_index]);
        }*/
        const geometry = new THREE.BufferGeometry();
        this.faceVerticesMaterial = shiftFacePointMaterial;
        this.faceVertices = new THREE.Points( geometry, this.faceVerticesMaterial );
        

    }

    setGeometricalController(new_geometricalController){
        super.setGeometricalController(new_geometricalController);
        this.recomputeFacePoints();
        this.updateLines();
    }

    updateMaterials(){
        buildingMaterialDebug.uniforms.maxPointId.value = this.geometricalControllers.getSelectedController().pointData.count;
        buildingMaterialDebug.uniforms.maxFaceId.value = this.geometricalControllers.getSelectedController().faceData.count;
        buildingMaterial.uniforms.maxPointId.value = this.geometricalControllers.getSelectedController().pointData.count;
        buildingMaterial.uniforms.maxFaceId.value = this.geometricalControllers.getSelectedController().faceData.count;
    }

    onMove(event){
        //console.log("begin onMove");
        if(this.clicked){
            let faceId = this.selectedFace;
            let recomputeOriginPoint = this.selectedPoint!=-1 || this.selectedEdge!=-1;
            
            if(this.selectedPoint!=-1){
                this.selectedFace = this.geometricalControllers.getSelectedController().faceData.count;
                this.geometricalControllers.getSelectedController().splitCellIntoFace(this.selectedPoint,0);
                /*let copy = this.geometricalControllers.getSelectedController().copy();
                copy.splitCellIntoFace(this.selectedPoint,0);
                isTopologicallyValid(copy);*/
                this.selectedPoint=-1;
                this.updateMaterials();
            }
            else if(this.selectedEdge!=-1){
                this.selectedFace = this.geometricalControllers.getSelectedController().faceData.count;
                this.geometricalControllers.getSelectedController().splitCellIntoFace(this.selectedEdge,1);
                /*let copy = this.geometricalControllers.getSelectedController().copy();
                copy.splitCellIntoFace(this.selectedEdge,1);
                isTopologicallyValid(copy);*/
                this.selectedEdge=-1;
                this.updateMaterials();
            }
            else if(faceId!=-1){
                
                let debugInfo = {};
                let x = ( event.clientX / (window.innerWidth*this.screen_split_ratio) ) * 2 - 1;
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

                let n;
                try{
                    n = this.geometricalControllers.getSelectedController().faceData.planeEquation[faceId].slice(0,3);
                }
                catch(e){
                    console.log(faceId,this.geometricalControllers.getSelectedController().faceData.planeEquation[faceId]);
                    throw e;
                }
                let norme = Utils.norme(n);
                n = Utils.normalize(n);

                debugInfo["normale"] = n;
                
                /*let cx = this.geometricalController.faceData.center[3*faceId];
                let cy = this.geometricalController.faceData.center[3*faceId+1];
                let cz = this.geometricalController.faceData.center[3*faceId+2];*/
                let cx = N(String(this.intersectionPoint.x));
                let cy = N(String(this.intersectionPoint.y));
                let cz = N(String(this.intersectionPoint.z));
                if(recomputeOriginPoint){
                    cx = N(String(this.geometricalController.faceData.center[3*faceId]));
                    cy = N(String(this.geometricalController.faceData.center[3*faceId+1]));
                    cz = N(String(this.geometricalController.faceData.center[3*faceId+2]));
                }
                debugInfo["face center"] = [cx,cy,cz];

                let pickingLine = [[N(String(this.camera.position.x)),N(String(this.camera.position.y)),N(String(this.camera.position.z))],[N(String(m.x)),N(String(m.y)),N(String(m.z))]];
                
                let faceLine    = [[cx,cy,cz],n];
                let closestPoint = GeomUtils.findClosestPointToNLines(pickingLine, faceLine);
               

                let projectedPoint = GeomUtils.projectPointOnLine(closestPoint, faceLine);

                debugInfo["P*"] = closestPoint;
                debugInfo["P* projete"] = projectedPoint;


                let shiftVect = [projectedPoint[0].sub(cx),projectedPoint[1].sub(cy), projectedPoint[2].sub(cz)];
                let orientation = Utils.dotProduct(shiftVect, n);
                
                let delta = Utils.norme(shiftVect);
                let sv = [...shiftVect];
                sv[0] = sv[0].toNumber();
                sv[1] = sv[1].toNumber();
                sv[2] = sv[2].toNumber();
                //console.log(orientation.toNumber());
                if(orientation.lt(N(0))){
                    delta = delta.neg();
                }
                delta = delta.mul(norme);
                

                debugInfo["delta"] = delta;

                //console.log(debugInfo);


                
                //console.log("before shift");

                let faceDeleted = this.geometricalControllers.getSelectedController().faceShift(faceId, delta.sub(this.globalDelta));
                //console.log("before onChange");
                this.geometricalControllers.getSelectedController().onChange();
                //this.lastPicked.copy(pickedPoint);
                this.globalDelta = delta;
                for(let i=0; i<faceDeleted.length; i++){
                    let face = faceDeleted[i]-i;
                    if(face==faceId){
                        console.log("Deselect face");
                        this.geometricalControllers.getSelectedController().changeSelectedFace(-1, this.geometricalControllers.getSelectedController().material);
                        this.geometricalControllers.getSelectedController().changeSelectedFace(-1, this.geometricalControllers.getSelectedController().dualController.pointMaterial);
                        this.geometricalControllers.getSelectedController().changeSelectedFace(-1, this.faceVerticesMaterial);
                        this.selectedFace=-1;
                        break;
                    }
                    else if(faceId>face){
                        this.geometricalControllers.getSelectedController().changeSelectedFace(faceId-1, this.geometricalControllers.getSelectedController().material);
                        this.geometricalControllers.getSelectedController().changeSelectedFace(faceId-1, this.geometricalControllers.getSelectedController().dualController.pointMaterial);
                        this.geometricalControllers.getSelectedController().changeSelectedFace(faceId-1, this.faceVerticesMaterial);
                        this.selectedFace-=1;
                    }
                }
                

                //this.geometricalController.updateScene();

                /*this.verticesPPT.push(projectedPoint[0], projectedPoint[1], projectedPoint[2]);

                this.geometryPPT.setAttribute( 'position', new THREE.Float32BufferAttribute( this.verticesPPT, 3 ) );
                
                this.geometryPPT.getAttribute("position").needsUpdate = true;
                */
                //console.log("before recompute face points");
                this.recomputeFacePoints();
                this.updateLines();


            }
            
        }
        //console.log("end onMove");
    }

    onMouseDown(event){
        if(this.geometricalControllers.getSelectedController() && (this.selectedFace!=-1 || this.selectedEdge!=-1 || this.selectedPoint!=-1)){
            this.clicked = true;
            this.controls.enabled = false;
            this.globalDelta = 0;
            /*this.verticesPPT = [];
            this.geometryPPT.setAttribute( 'position', new THREE.Float32BufferAttribute( this.verticesPPT, 3 ) );
            this.geometryPPT.getAttribute("position").needsUpdate = true;
            */
        }
    }

    onMouseUp(event){
        this.clicked = false;
        this.controls.enabled = true;
    }

    onRender(raycaster, material){
        //reset the color of last intersected objects
        /*const material = new BuildingMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
    
        for (var i=0; i<this.last_intersected.length; i++){
            this.last_intersected[i].object.material = material;
        }*/


        // calculate objects intersecting the picking ray
        //const intersects = raycaster.intersectObjects( scene.children );
        if(this.geometricalControllers.getSelectedController()){
            const intersects = raycaster.intersectObject( this.geometricalControllers.getSelectedController().vertexData );
        
            //console.log(intersects);
            this.last_intersected = intersects;
            

            if(!this.clicked){
                this.geometricalControllers.getSelectedController().changeSelectedEdge(-1, this.shiftEdgeMaterial);
                this.selectedEdge = -1;

                this.geometricalControllers.getSelectedController().changeSelectedFace(-1, this.geometricalControllers.getSelectedController().material);
                this.geometricalControllers.getSelectedController().changeSelectedFace(-1, this.geometricalControllers.getSelectedController().dualController.pointMaterial);
                this.geometricalControllers.getSelectedController().changeSelectedFace(-1, this.faceVerticesMaterial);
                this.geometricalControllers.getSelectedController().changeSelectedFace(-1, this.shiftEdgeMaterial);
                this.selectedFace = -1;

                this.pointSelected(raycaster, intersects);
                if(this.selectedPoint==-1){
                    this.edgeSelected(raycaster, intersects);
                    if(this.selectedEdge==-1){
                        this.faceSelected(intersects);
                    }
                }
            }
        }
    }

    recomputeFacePoints(){
        if(this.geometricalControllers.getSelectedController()){
        let faceArrity = [];
        for(let i=0; i<this.geometricalControllers.getSelectedController().vertexData.count; i++){
            let pt_index = this.geometricalControllers.getSelectedController().vertexData.pIndex.getX(i);
            faceArrity.push(this.geometricalControllers.getSelectedController().pointData.nbAdjacentFaces[pt_index]);
        }
        this.faceVertices.geometry.setAttribute( 'position', this.geometricalControllers.getSelectedController().vertexData.coords);
        this.faceVertices.geometry.setAttribute( 'fIndex', this.geometricalControllers.getSelectedController().vertexData.fIndex);
        this.faceVertices.geometry.setAttribute( 'pIndex', this.geometricalControllers.getSelectedController().vertexData.pIndex);
        this.faceVertices.geometry.setAttribute( 'faceArrity', new THREE.Float32BufferAttribute(faceArrity,1));
        
        this.faceVertices.geometry.getAttribute('position').needsUpdate = true;
        this.faceVertices.geometry.getAttribute('fIndex').needsUpdate = true;
        this.faceVertices.geometry.getAttribute('pIndex').needsUpdate = true;
        this.faceVertices.geometry.getAttribute('faceArrity').needsUpdate = true;
        }

        //console.log(this.faceVertices);
    }

    updateLines(){
        let vertices = [];
        let pIndex = [];
        let eIndex = [];
        let f1Index = [];
        let f2Index = [];
        let n = this.geometricalControllers.getSelectedController().edgeData.count;
        for(let i=0; i<n; i++){
            let he_id = this.geometricalControllers.getSelectedController().edgeData.heIndex[i];
            let he_next_id = this.geometricalControllers.getSelectedController().halfEdgeData.next(he_id);
            let he_opp_id = this.geometricalControllers.getSelectedController().halfEdgeData.opposite(he_id);
            let p1Id = this.geometricalControllers.getSelectedController().halfEdgeData.pIndex[he_id];
            let p2Id = this.geometricalControllers.getSelectedController().halfEdgeData.pIndex[he_next_id];
            let f1 = this.geometricalControllers.getSelectedController().halfEdgeData.face(he_id);
            let f2 = this.geometricalControllers.getSelectedController().halfEdgeData.face(he_opp_id);
            let coord1 = this.geometricalControllers.getSelectedController().computeCoords(p1Id);
            let coord2 = this.geometricalControllers.getSelectedController().computeCoords(p2Id);


            
            vertices.push(...coord1);
            vertices.push(...coord2);

            pIndex.push(p1Id, p2Id);
            f1Index.push(f1, f1);
            f2Index.push(f2, f2);
            eIndex.push(i,i);

        }
        vertices = new Float32Array(vertices);
        pIndex = new Float32Array(pIndex);
        eIndex = new Float32Array(eIndex);
        f1Index = new Float32Array(f1Index);
        f2Index = new Float32Array(f2Index);

        
        
        this.edges.geometry.setAttribute( 'position', new Float32ArrayDynamicBufferAttribute(vertices, 3, false));
        this.edges.geometry.setAttribute( 'pIndex',   new Float32ArrayDynamicBufferAttribute(pIndex, 1, false));
        this.edges.geometry.setAttribute( 'eIndex', new Float32ArrayDynamicBufferAttribute(eIndex, 1, false));
        this.edges.geometry.setAttribute( 'f1Index', new Float32ArrayDynamicBufferAttribute(f1Index, 1, false));
        this.edges.geometry.setAttribute( 'f2Index', new Float32ArrayDynamicBufferAttribute(f2Index, 1, false));
        
        this.edges.geometry.getAttribute( 'position').needsUpdate = true;
        this.edges.geometry.getAttribute( 'pIndex').needsUpdate = true;
        this.edges.geometry.getAttribute( 'eIndex').needsUpdate = true;
        this.edges.geometry.getAttribute( 'f1Index').needsUpdate = true;
        this.edges.geometry.getAttribute( 'f2Index').needsUpdate = true;

        this.edges.updateMatrixWorld();
        this.edges.geometry.computeBoundingBox();
        this.edges.geometry.computeBoundingSphere();

        //console.log(this.edges);
    }

    edgeSelected(raycaster, intersects){
        let selectedEdge = -1;
        let distMin = Infinity;
        if(intersects.length!=0){
            let faceId = this.geometricalControllers.getSelectedController().vertexData.fIndex.getX(intersects[0].face.a);
            
            for(let i=0; i<this.geometricalControllers.getSelectedController().edgeData.count; i++){
                let he1_id = this.geometricalControllers.getSelectedController().edgeData.heIndex[i];
                let he2_id = this.geometricalControllers.getSelectedController().halfEdgeData.opposite(he1_id);
                if(this.geometricalControllers.getSelectedController().halfEdgeData.fIndex[he1_id]==faceId || this.geometricalControllers.getSelectedController().halfEdgeData.fIndex[he2_id]==faceId){
                    //console.log(i);
                    let p1_id = this.geometricalControllers.getSelectedController().halfEdgeData.pIndex[he1_id];
                    let p2_id = this.geometricalControllers.getSelectedController().halfEdgeData.pIndex[he2_id];
                    

                    let [x1,y1,z1] = this.geometricalControllers.getSelectedController().computeCoords(p1_id);
                    let [x2,y2,z2] = this.geometricalControllers.getSelectedController().computeCoords(p2_id);
                    
                    let d = raycaster.ray.distanceSqToSegment(new THREE.Vector3(x1,y1,z1), new THREE.Vector3(x2,y2,z2));
                    if(d<distMin){
                        selectedEdge = i;
                        distMin = d;
                    }
                }
            }
        }
        if(distMin<this.distThreshold){
            this.geometricalControllers.getSelectedController().changeSelectedEdge(selectedEdge, this.shiftEdgeMaterial);
            this.selectedEdge = selectedEdge;
        }
        else{
            this.geometricalControllers.getSelectedController().changeSelectedEdge(-1, this.shiftEdgeMaterial);
            this.selectedEdge = -1;
        }
    }

    pointSelected(raycaster, intersects){
        let selectedPoint = -1;
        let distMin = Infinity;
        if(intersects.length!=0){
            let faceId = this.geometricalControllers.getSelectedController().vertexData.fIndex.getX(intersects[0].face.a);
            
            for(let i=0; i<this.geometricalControllers.getSelectedController().pointData.count; i++){
                let faces = this.geometricalControllers.getSelectedController().findAdjacentFaces(i);
                if(faces.indexOf(faceId)!=-1 ){
                    //console.log(i);
                     

                    let [x,y,z] = this.geometricalControllers.getSelectedController().computeCoords(i);
                    
                    let d = raycaster.ray.distanceToPoint(new THREE.Vector3(x,y,z));
                    if(d<distMin){
                        selectedPoint = i;
                        distMin = d;
                    }
                }
            }
        }
        if(distMin<this.distThreshold){
            this.geometricalControllers.getSelectedController().changeSelectedPoint(selectedPoint, this.faceVerticesMaterial);
            this.selectedPoint = selectedPoint;
        }
        else{
            this.geometricalControllers.getSelectedController().changeSelectedPoint(-1, this.faceVerticesMaterial);
            this.selectedPoint = -1;
        }
    }
    faceSelected(intersects){
        
        if(intersects.length!=0){
            this.intersectionPoint.copy(intersects[0].point);
            let triangleIndex = intersects[0].face.a/3;
            this.geometricalControllers.getSelectedController().changeSelectedFace(triangleIndex, this.geometricalControllers.getSelectedController().material);
            this.geometricalControllers.getSelectedController().changeSelectedFace(triangleIndex, this.geometricalControllers.getSelectedController().dualController.pointMaterial);
            this.geometricalControllers.getSelectedController().changeSelectedFace(triangleIndex, this.faceVerticesMaterial);
            this.geometricalControllers.getSelectedController().changeSelectedFace(triangleIndex, this.shiftEdgeMaterial);
            this.selectedFace = this.geometricalControllers.getSelectedController().faceData.selectedFace;
        }
    }

    onSelect(){
        super.onSelect();

        if(this.geometricalControllers.getSelectedController()!=null){
            this.geometricalControllers.getSelectedController().material = buildingMaterial;
            this.geometricalControllers.getSelectedController().vertexData.material = buildingMaterial;
        }
        this.recomputeFacePoints();
        this.scene.add( this.faceVertices );


        this.updateLines();
        this.scene.add( this.edges );
    }
    onUnselect(){
        this.scene.remove( this.faceVertices );
        this.scene.remove( this.edges );
    }
}



class FlipEdgeTool extends Tool{
    constructor(geometricalControllers, scene){
        super();
        this.distThreshold = 10;
        this.geometricalControllers = geometricalControllers;

        this.scene = scene;

       

        
        const geometry = new THREE.BufferGeometry();

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
        if(this.selectedEdge!=-1&&this.geometricalControllers.getSelectedController().edgeData.flipable[this.selectedEdge]){

            this.geometricalControllers.getSelectedController().edgeFlip(this.selectedEdge);
            
            
            this.geometricalControllers.getSelectedController().onChange();
            this.updateLines();
            
        }
        return 0;

        
    }
    onRender(raycaster, material){

        
        let selectedEdge = -1;
        let distMin = Infinity;

        const intersects = raycaster.intersectObject( this.geometricalControllers.getSelectedController().vertexData );
        if(intersects.length!=0){
            let faceId = this.geometricalControllers.getSelectedController().vertexData.fIndex.getX(intersects[0].face.a);
            
            for(let i=0; i<this.geometricalControllers.getSelectedController().edgeData.count; i++){
                let he1_id = this.geometricalControllers.getSelectedController().edgeData.heIndex[i];
                let he2_id = this.geometricalControllers.getSelectedController().halfEdgeData.opposite(he1_id);
                if(this.geometricalControllers.getSelectedController().halfEdgeData.fIndex[he1_id]==faceId || this.geometricalControllers.getSelectedController().halfEdgeData.fIndex[he2_id]==faceId){
                    //console.log(i);
                    let p1_id = this.geometricalControllers.getSelectedController().halfEdgeData.pIndex[he1_id];
                    let p2_id = this.geometricalControllers.getSelectedController().halfEdgeData.pIndex[he2_id];
                    
    
                    let [x1,y1,z1] = this.geometricalControllers.getSelectedController().computeCoords(p1_id);
                    let [x2,y2,z2] = this.geometricalControllers.getSelectedController().computeCoords(p2_id);
                    
                    let d = raycaster.ray.distanceSqToSegment(new THREE.Vector3(x1,y1,z1), new THREE.Vector3(x2,y2,z2));
                    if(d<distMin){
                        selectedEdge = i;
                        distMin = d;
                    }
                }
            }
        }
        if(distMin<this.distThreshold){
            this.geometricalControllers.getSelectedController().changeSelectedEdge(selectedEdge, this.flipEdgeMaterial);
            this.selectedEdge = selectedEdge;
        }
        else{
            this.geometricalControllers.getSelectedController().changeSelectedEdge(-1, this.flipEdgeMaterial);
            this.selectedEdge = -1;
        }

        
        //console.log(this.flipEdgeMaterial.uniforms.selectedEdgeId.value);
        
    }

    onSelect(){
        super.onSelect();
        if(this.geometricalControllers.getSelectedController()!=null){
            this.geometricalControllers.getSelectedController().material = buildingMaterial;
            this.geometricalControllers.getSelectedController().vertexData.material = buildingMaterial;
        }
        this.updateLines();
        this.scene.add( this.edges );
    }
    onUnselect(){
        super.onUnselect();
        this.scene.remove(this.edges);
    }

    

    updateLines(){
        let vertices = [];
        let pIndex = [];
        let eIndex = [];
        let flipable = [];
        let n = this.geometricalControllers.getSelectedController().edgeData.count;
        for(let i=0; i<n; i++){
            let he_id = this.geometricalControllers.getSelectedController().edgeData.heIndex[i];
            let he_next_id = this.geometricalControllers.getSelectedController().halfEdgeData.next(he_id);
            let p1Id = this.geometricalControllers.getSelectedController().halfEdgeData.pIndex[he_id];
            let p2Id = this.geometricalControllers.getSelectedController().halfEdgeData.pIndex[he_next_id];
    
            let coord1 = this.geometricalControllers.getSelectedController().computeCoords(p1Id);
            let coord2 = this.geometricalControllers.getSelectedController().computeCoords(p2Id);


            
            vertices.push(...coord1);
            vertices.push(...coord2);

            pIndex.push(p1Id, p2Id);

            eIndex.push(i,i);

            flipable.push(this.geometricalControllers.getSelectedController().edgeData.flipable[i],this.geometricalControllers.getSelectedController().edgeData.flipable[i]);
        
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

class ObjectSelectionTool extends Tool{
    constructor(controllersCollection, dualScene, scene){
        super();
        this.intersectionPoint = new THREE.Vector3(0,0,0);
        this.controllers = controllersCollection;
        this.selectedControllerId = -1;
        this.selectedThreeObject = null;
        this.dualScene = dualScene;
        this.last_intersected = [];
        this.scene = scene;

    }

    onMove(event){

    }

    onMouseDown(event){

    }

    onMouseUp(event){

    }

    onClick(event){
        if(this.selectedControllerId!=-1){
            this.last_intersected = [];
            if(this.controllers.getSelectedController()){
                this.controllers.getSelectedController().material = buildingNotSelectedMaterial;
                this.controllers.getSelectedController().vertexData.material = buildingNotSelectedMaterial;
            }
            this.controllers.changeSelectedController(this.selectedControllerId);
            this.controllers.getSelectedController().material = buildingSelectedMaterial;     
            this.controllers.getSelectedController().vertexData.material = buildingSelectedMaterial;
            return 1;
        }
        else if(!(this.selectedThreeObject == null)){
            this.last_intersected = [];
            if(this.controllers.getSelectedController()){
                this.controllers.getSelectedController().material = buildingNotSelectedMaterial;
                this.controllers.getSelectedController().vertexData.material = buildingNotSelectedMaterial;
            }
            let cityJSON_object = this.selectedThreeObject.citymodel
            let cityJSONbuilder = new CityJSONModelBuilder();
            cityJSONbuilder.build(cityJSON_object);
            let buildings = cityJSONbuilder.getBuildings();
            let geometryBuilder = new GeometryBuilder();
            buildings.forEach(building=>{
                //try{
                    geometryBuilder.build(building,3);//TO DO : Gérer le LOD
                    let geometricalController = geometryBuilder.getScene(buildingNotSelectedMaterial);
                    geometricalController.buildDual(dualMaterial);
                    console.log(geometricalController);
                    this.controllers.addController(geometricalController);
                    //this.controllers.changeSelectedController(geometricalController.id);
                    this.selectedControllerId = geometricalController.id;
                    this.scene.remove(this.selectedThreeObject);
                    ControllersCollection.threeObjects.splice(ControllersCollection.threeObjects.indexOf(this.selectedThreeObject),1);
                    console.log(this.scene);
                    this.selectedThreeObject = null;
                    this.controllers.changeSelectedController(this.selectedControllerId);
                    this.controllers.getSelectedController().material = buildingSelectedMaterial;
                    this.controllers.getSelectedController().vertexData.material = buildingSelectedMaterial;
                    console.log(this.controllers.getSelectedController().vertexData);
                    return 1;
                /*}
                catch(error){
                    console.error("Failed to import the building "+building.id+" because of "+error);
                    return 0;
                }*/
            })  
        }
        else{
            return 0;
        }
        
        
    }

    onRender(raycaster){
        let selControllerId = -1;
        if(this.controllers.getSelectedController()!=null){
            selControllerId = this.controllers.getSelectedController().id;
        }
        if(this.last_intersected.length!=0 && this.last_intersected[0].object.objectId!=selControllerId){
            this.last_intersected[0].object.material = buildingNotSelectedMaterial;
        }
        
        const intersects = raycaster.intersectObjects( this.controllers.getVertexDataArray().concat(ControllersCollection.threeObjects) );

        this.last_intersected = intersects;
        


        this.selectedControllerId = -1;
        this.selectedThreeObject  = null;
        if(intersects.length!=0){
            if(!(intersects[0].object.objectId===undefined)){
                
                //console.log(intersects[0].object.objectId,selControllerId);
                
                if(intersects[0].object.objectId!=selControllerId){
                    this.selectedControllerId = intersects[0].object.objectId;
                    intersects[0].object.material = buildingPointedMaterial;
                }
            }
            else{
                intersects[0].object.material = buildingPointedMaterial;
                this.selectedThreeObject = intersects[0].object;
            }
            
        }
        

    }
    onSelect(){
        if(this.controllers.getSelectedController()!=null){
            this.controllers.getSelectedController().vertexData.material = buildingSelectedMaterial;
        }
    }

}

export{ToolBar, ShiftTool}