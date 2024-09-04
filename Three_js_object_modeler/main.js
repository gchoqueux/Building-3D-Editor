import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


import { dualMaterial, buildingMaterialDebug, buildingMaterial, pointsMaterial, buildingNotSelectedMaterial } from './materials/materials.js';

import { mock_builds } from './objectCreation.js';

import { GeometryBuilder,MockModelBuilder, CityJSONModelBuilder } from './Builders/Builder.js';

import { ToolBar } from './tools.js';
import { CityJSONParser } from './Parser.js';
import { ControllersCollection } from './controllers/controllersCollection.js';
import { loaders } from './loaders/loaders.js';

import * as Utils from './utils/utils.js';

const w = window;

{

    //Test Values
    let triangleId = 15;
    let delta      = 0.05;

    let screen_split_ratio = 1.;

    //Pour le debug graphique
    const material_debug = buildingMaterialDebug;
    //material_debug.side = THREE.DoubleSide;

    /*let material_building = new BuildingMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
    let material = material_building;
    

    material_building.side = THREE.DoubleSide;*/
    let material_building = buildingMaterial;
    let material = material_building;


    //////////////////////////////Scene creation

    //let containerDiv = document.getElementById("three_container");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    const camera = new THREE.PerspectiveCamera( 75, (window.innerWidth*screen_split_ratio) / window.innerHeight, 0.1, 100000 );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth*screen_split_ratio, window.innerHeight );
    //renderer.setScissorTest( true );
    //containerDiv.appendChild( renderer.domElement );
    document.body.appendChild( renderer.domElement );


    let sun_power = 0.3;
    let dist_sun  = 1000;

    const light = new THREE.AmbientLight( 0xaaaaaa ); // soft white light
    scene.add( light );

    var pLight1 = new THREE.PointLight( 0xffffff, sun_power );
    pLight1.position.set( 50*dist_sun, 50*dist_sun, 50*dist_sun );  
    scene.add( pLight1 );

    var pLight2 = new THREE.PointLight( 0xffffff, sun_power );
    pLight2.position.set( -50*dist_sun, 50*dist_sun, 50*dist_sun );
    scene.add( pLight2 );

    var pLight3 = new THREE.PointLight( 0xffffff, sun_power );
    pLight3.position.set( 50*dist_sun, -50*dist_sun, 50*dist_sun );
    scene.add( pLight3 );


    camera.position.y = 10;
    

    //Controls

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.update();

    /////////////////////Scene Dual
    const dualRenderer = new THREE.WebGLRenderer({ antialias: true });
    const dualCamera = new THREE.PerspectiveCamera( 75, window.innerWidth*(1.-screen_split_ratio) / window.innerHeight, 0.1, 1000 );
    const dualControls = new OrbitControls( dualCamera, dualRenderer.domElement );

    dualRenderer.setPixelRatio( window.devicePixelRatio );
    dualRenderer.setSize( window.innerWidth*(1.-screen_split_ratio), window.innerHeight );
    document.body.appendChild( dualRenderer.domElement );
    dualControls.update();

    dualCamera.position.y = 10;

    const dualScene = new THREE.Scene();
    dualScene.background = new THREE.Color(0xbbbbbb);
    

    let controllers = new ControllersCollection([],3, scene, dualScene, dualMaterial, pointsMaterial);
    let threeObjects = [];
    console.log(controllers);



    //Ray casting

    const raycaster = new THREE.Raycaster();
    raycaster.layers.enableAll();
    const pointer = new THREE.Vector2();

    function onPointerMove( event ) {

        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components

        pointer.x = ( event.clientX / (window.innerWidth*screen_split_ratio) ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    }

    function render() {
        raycaster.setFromCamera( pointer, camera );
    
        toolBar.selectedTool.onRender(raycaster, material);
        
    }

    w.addEventListener( 'pointermove', onPointerMove );


    let toolBar = new ToolBar(camera, controllers, controls, scene, dualScene);
    //toolBar.changeTool("Shift");

    

    function onMove(event){
        
        /*for(let i=0; i<geometricalController.dualController.vertexData.count; i++){
            if(geometricalController.dualController.vertexData.pIndex.getX(i)==1){
                let [x,y,z] = geometricalController.dualController.vertexData.coords.getXYZ(i);
                console.log("==>",x,",",y,",",z);
            }
        }*/
        /*let [x,y,z] = geometricalController.dualController.pointData.coords[3];
        console.log("==>",x,",",y,",",z);*/
        //recomputeDualPoints(geometricalController, dualPoints)
        if(controllers.getSelectedController()){
            dualScene.remove(controllers.getSelectedController().dualController.vertexData);
        }
        toolBar.onMove(event,scene);
        if(controllers.getSelectedController()){
            dualScene.add(controllers.getSelectedController().dualController.vertexData);
        }
    }
    function onMouseUp(event){
        toolBar.onMouseUp(event,scene);
    }
    function onMouseDown(event){
        toolBar.onMouseDown(event,scene);
    }
    function onClick(event){
        if(toolBar.onClick(event,scene)){
            if(controllers.getSelectedController()){
                let vertex_data = controllers.getSelectedController().vertexData;
                vertex_data.geometry.computeBoundingSphere();
                let center = vertex_data.geometry.boundingSphere.center;
                let r = vertex_data.geometry.boundingSphere.radius;
                

                /*let diag = new THREE.Vector3();
                camera.getWorldDirection(diag);
                diag.multiplyScalar(2*r);
                let pos = center.clone().add(diag);*/


                let camTarget = controls.target;
                let camPos = camera.position;
                let camLookAtVect = new THREE.Vector3().copy(camTarget);
                camLookAtVect.sub(camPos).normalize().multiplyScalar(-2*r);

                let pos = center.clone().add(camLookAtVect);
                moveCam(pos, center); 
            }
            
        }
    }

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup'  , onMouseUp);
    document.addEventListener('click'  , onClick);


    

    let t=0;
    function animate() {
        t+=0.01;
        //graphicalController.faceShift(triangleId, delta);
        requestAnimationFrame( animate );
        controls.update();
        dualControls.update();
        render();

        renderer.render( scene, camera );
        dualRenderer.render( dualScene, dualCamera );
    }
    animate();






    //Tool selection
    let navigationButton   = document.getElementById("navigation_button");
    let shiftButton        = document.getElementById("shift_button");
    let selectObjectButton = document.getElementById("select_object_button");
    let flipEdgeButton     = document.getElementById("flip_edge_button");

    navigationButton.onclick = function(ev){
        toolBar.changeTool("Navigation");
    }
    shiftButton.onclick = function(ev){
        toolBar.changeTool("Shift");
    }
    selectObjectButton.onclick = function(ev){
        toolBar.changeTool("ObjectSelection");
    }
    flipEdgeButton.onclick = function(ev){
        toolBar.changeTool("FlipEdge");
    }

    //File selection
    const fileInput = document.querySelector("input");
    fileInput.addEventListener("change", createFromFile);

    function createFromFile(){
        const files = fileInput.files;
        //console.log(files[0]);
        const file = URL.createObjectURL(files[0]);
        let parser = new CityJSONParser();
        let cityJSON_promise = parser.loadFile(file);
        
        
        cityJSON_promise.then(cityJSON_array=>{
            console.log(cityJSON_array);
            cityJSON_array.forEach(cityJSON_object=>{
                let threeGroup = loaders.CityJSONLoader.loadObjectGraphics(cityJSON_object, scene);
            
                
                //scene.add( threeGroup );
                //console.log(centerJSON);
                threeGroup.traverse(threeObj=>{
                    if(threeObj.geometry){
                        threeObj.geometry.computeBoundingBox();
                        ControllersCollection.threeObjects.push(threeObj);
                        scene.add( threeObj );
                        threeObj.geometry.computeBoundingSphere()
                        threeObj.material = buildingNotSelectedMaterial;



                        let center = threeObj.geometry.boundingSphere.center;
                        let r = threeObj.geometry.boundingSphere.radius;
                        

                        /*let diag = new THREE.Vector3();
                        camera.getWorldDirection (diag);
                        diag.multiplyScalar(2*r);
                        let pos = center.clone().add(diag);*/


                        let camTarget = controls.target;
                        let camPos = camera.position;
                        let camLookAtVect = new THREE.Vector3().copy(camTarget);
                        camLookAtVect.sub(camPos).normalize().multiplyScalar(-2*r);

                        let pos = center.clone().add(camLookAtVect);

                        moveCam(pos, center);
                    }
                })
            })
            console.log('file loaded');
        })
        
        
    }
    console.log(scene);

    //Mock Object import
    const mockList = document.getElementById("mockSelect");
    function importMockObject(){
        const mockName = mockList.value;
        if(mockName!=""){
            loaders.MockLoader.loadObject(mock_builds[mockName], controllers);
        }
        moveCam(new THREE.Vector3(20,40,20),new THREE.Vector3(0,0,0))      
    }

    mockList.addEventListener("change", importMockObject);

    

    //Embedding Selection
    const embeddingList = document.getElementById("embeddingSelect");
    function chooseEmbedding(){
        const embeddingName = embeddingList.value;
        if(controllers.getSelectedController()){
            controllers.getSelectedController().setEmbedding(embeddingName);
        }
    }

    embeddingList.addEventListener("change", chooseEmbedding);

    let displayDualSwitch = document.getElementById("display_dual_switch");
    displayDualSwitch.onchange = function(e){
        if(e.target.checked){
            screen_split_ratio=0.5;
        }
        else{
            screen_split_ratio=1.0;
        }
        toolBar.setScreenSplitRatio(screen_split_ratio);
        onWindowResize();
    }

    //Debug tools
    let wireframe_switch = document.getElementById("wireframe_switch");
    wireframe_switch.onchange = function(e){
        //material_building.uniforms.wireframe.value = e.target.checked;
        material_building.wireframe = e.target.checked;
        material_debug.uniforms.wireframe.value = e.target.checked;
        dualMaterial.uniforms.wireframe.value = e.target.checked;
    }
    
    let debug_material_switch = document.getElementById("debug_material_switch");
    debug_material_switch.onchange = function(e){
        if(e.target.checked){
            material = material_debug;
        }
        else{
            material = material_building;
        }
        controllers.changeMaterial(material);
    }




    function onWindowResize() {

        camera.aspect = window.innerWidth*screen_split_ratio / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth*screen_split_ratio, window.innerHeight );

        dualCamera.aspect = window.innerWidth*(1.-screen_split_ratio) / window.innerHeight;
        dualCamera.updateProjectionMatrix();

        dualRenderer.setSize( window.innerWidth*(1.-screen_split_ratio), window.innerHeight );

    }
    window.addEventListener( 'resize', onWindowResize );

    function moveCam(newPos, newCenter){

        controls.target.copy(newCenter);
        controls.update();
        camera.position.copy(newPos);


        pLight1.position.set( newCenter.x+50*dist_sun, newCenter.y+50*dist_sun, newCenter.z+50*dist_sun );  
    
        pLight2.position.set( newCenter.x-50*dist_sun, newCenter.y+50*dist_sun, newCenter.z+50*dist_sun );
    
        pLight3.position.set( newCenter.x+50*dist_sun, newCenter.y-50*dist_sun, newCenter.z+50*dist_sun );
    }
    
}
