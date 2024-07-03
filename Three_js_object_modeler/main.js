import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


import { buildingMaterialDebug, buildingMaterial, pointsMaterial, buildingNotSelectedMaterial } from './materials.js';

import { buildingsJs } from './objectCreation.js';

import { GeometryBuilder,MockModelBuilder, CityJSONModelBuilder } from './Builders/Builder.js';

import { ToolBar } from './tools.js';
import { CityJSONParser } from './Parser.js';
import { ControllersCollection } from './controllers/controllersCollection.js';


const w = window;

{

    //Test Values
    let triangleId = 15;
    let delta      = 0.05;

    let screen_split_ratio = 1.;




    //Reading of the object data
    let modelBuilder = new MockModelBuilder();
    buildingsJs.forEach(
        building=>{
            modelBuilder.build(building);
        }
    )
    let buildingsModel = modelBuilder.getBuildings();
    console.log(buildingsModel[0]);

    let geometryBuilder = new GeometryBuilder();

    //Pour le debug graphique
    const material_debug = buildingMaterialDebug;
    material_debug.side = THREE.DoubleSide;

    /*let material_building = new BuildingMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
    let material = material_building;
    

    material_building.side = THREE.DoubleSide;*/
    let material_building = buildingMaterial;
    let material = material_building;

    let controllers = new ControllersCollection([],3);

    geometryBuilder.build(buildingsModel[0], 3);
    console.log(geometryBuilder);
    let geometricalController = geometryBuilder.getScene(material);
    
    //Pour le debug graphique
    material_debug.uniforms.maxPointId.value = geometricalController.pointData.count;
    material_debug.uniforms.maxFaceId.value = geometricalController.faceData.count;
    


    //////////////////////////////Scene creation

    //let containerDiv = document.getElementById("three_container");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    const camera = new THREE.PerspectiveCamera( 75, (window.innerWidth*screen_split_ratio) / window.innerHeight, 0.1, 1000 );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth*screen_split_ratio, window.innerHeight );
    //renderer.setScissorTest( true );
    //containerDiv.appendChild( renderer.domElement );
    document.body.appendChild( renderer.domElement );

    const light = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( light );

    var pLight = new THREE.PointLight( 0xffffff, 1, 100 );
    pLight.position.set( 50, 50, 50 );  
    scene.add( pLight );

    var pLight2 = new THREE.PointLight( 0xffffff, 1, 100 );
    pLight2.position.set( -50, 50, 50 );
    scene.add( pLight2 );

    var pLight3 = new THREE.PointLight( 0xffffff, 1, 100 );
    pLight3.position.set( 50, -50, 50 );
    scene.add( pLight3 );


    camera.position.y = 10;

    //Ground creation

    const geometry = new THREE.PlaneGeometry( 1000, 1000 );
    geometry.rotateX(-Math.PI/2);
    
    const groundMaterial = new THREE.MeshPhongMaterial({color:0xffffff, reflectivity:0.5, shininess : 40, specular : 0x000000});
    const plane = new THREE.Mesh( geometry, groundMaterial );
    //scene.add( plane );

    //Controls

    const controls = new OrbitControls( camera, renderer.domElement );
    //const controls = new FlyControls( camera, renderer.domElement );
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
    let dualMaterial = material_debug.clone();
    geometricalController.buildDual(dualMaterial, pointsMaterial);
    console.log(controllers);

    controllers.addController(geometricalController, scene);
    controllers.changeSelectedController(geometricalController.id, dualScene);
    console.log(controllers.getSelectedController());
    
    



   /*

    geometricalController.dualBuilder.build(geometricalController);
   
    let dualController = geometricalController.dualBuilder.getScene(dualMaterial);
    geometricalController.dualController = dualController;
    
    
    let dualPointsGeom = new THREE.BufferGeometry();
    dualPointsGeom.setAttribute( 'position', dualController.vertexData.coords);
    dualPointsGeom.setAttribute( 'pIndex', dualController.vertexData.pIndex);
    let dualPoints = new THREE.Points( dualPointsGeom, pointsMaterial );

    dualPoints.material = pointsMaterial;
    pointsMaterial.uniforms.maxPointId.value = dualController.pointData.count;
    pointsMaterial.uniforms.size.value = 20;
    dualController.pointMaterial = pointsMaterial;
    console.log(dualPoints);
    
    dualScene.add(geometricalController.dualController.vertexData);
    dualScene.add(dualPoints);*/







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
    toolBar.changeTool("Shift");

    

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
        dualScene.remove(geometricalController.dualController.vertexData);
        toolBar.onMove(event,scene);
        dualScene.add(geometricalController.dualController.vertexData)
    }
    function onMouseUp(event){
        toolBar.onMouseUp(event,scene);
    }
    function onMouseDown(event){
        toolBar.onMouseDown(event,scene);
    }
    function onClick(event){
        toolBar.onClick(event,scene);
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
        
        cityJSON_promise.then(cityJSON_object=>{
            let cityJSONbuilder = new CityJSONModelBuilder();
            cityJSONbuilder.build(cityJSON_object);
            let buildings = cityJSONbuilder.getBuildings();
            console.log(buildings);
            let geometryBuilder = new GeometryBuilder();
            buildings.forEach(building=>{
                geometryBuilder.build(building,3);//TO DO : Gérer le LOD
                console.log(geometryBuilder);
                let geometricalController = geometryBuilder.getScene(buildingNotSelectedMaterial);
                geometricalController.buildDual(dualMaterial, pointsMaterial);
                console.log(geometricalController);
                controllers.addController(geometricalController, scene);
                controllers.changeSelectedController(geometricalController.id, dualScene);
            })
            console.log("IMPORT SUCCEED");
            
        })
    }

    //Embedding Selection
    const embeddingList = document.getElementById("embeddingSelect");
    function chooseEmbedding(){
        const embeddingName = embeddingList.value;
        geometricalController.setEmbedding(embeddingName);
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
}
