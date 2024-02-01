import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


import { BuildingMaterial, DebugBuildingMaterial } from './materials.js';

import { buildingsJs } from './objectCreation.js';

import { ModelBuilder, SceneBuilder } from './Builder.js';

import { ToolBar } from './tools.js';


const w = window;

{

    //Test Values
    let triangleId = 15;
    let delta      = 0.05;




    //Reading of the object data
    let modelBuilder = new ModelBuilder();
    buildingsJs.forEach(
        building=>{
            modelBuilder.build(building);
        }
    )
    let buildingsModel = modelBuilder.getBuildings();
    console.log(buildingsModel[0]);

    let sceneBuilder = new SceneBuilder();

    //Pour le debug graphique
    const material_debug = new DebugBuildingMaterial({color:0x00ff00, reflectivity:1, shininess : 60, specular : 0x000000});
  

    const material_building = new BuildingMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
    let material = material_building;
    material_debug.side = THREE.DoubleSide;
    material_building.side = THREE.DoubleSide;
    sceneBuilder.build(buildingsModel, 3, material);

    let graphicalController = sceneBuilder.getScene();
    console.log(graphicalController);
    
    //Pour le debug graphique
    material_debug.uniforms.maxPointId.value = Math.max(...graphicalController.vertexData.pIndex.array);
    material_debug.uniforms.maxFaceId.value = Math.max(...graphicalController.vertexData.fIndex.array);
    


    let objects = [graphicalController.vertexData];



    //Scene creation

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
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
    
    const groundMaterial = new THREE.MeshPhongMaterial({color:0x888888, reflectivity:0.5, shininess : 40, specular : 0x000000});
    const plane = new THREE.Mesh( geometry, groundMaterial );
    scene.add( plane );

    //Controls

    const controls = new OrbitControls( camera, renderer.domElement );
    //const controls = new FlyControls( camera, renderer.domElement );
    controls.update();


    scene.add(graphicalController.vertexData);


    //Ray casting

    const raycaster = new THREE.Raycaster();
    raycaster.layers.enableAll();
    const pointer = new THREE.Vector2();

    function onPointerMove( event ) {

        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components

        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    }

    console.log(objects[0]);
    function render() {

        //objects = [graphicalController.vertexData];

        // update the picking ray with the camera and pointer position
        raycaster.setFromCamera( pointer, camera );
    
        //reset the color of last intersected objects
    
        toolBar.selectedTool.onRender(raycaster, objects, material);
        

    
        //renderer.render( scene, camera );
    }

    w.addEventListener( 'pointermove', onPointerMove );





    //event listeners


    let toolBar = new ToolBar(camera, graphicalController, controls, scene);
    toolBar.changeTool("Shift");

    

    function onMove(event){
        toolBar.onMove(event);
    }
    function onMouseUp(event){
        toolBar.onMouseUp(event);
    }
    function onMouseDown(event){
        toolBar.onMouseDown(event);
    }
    function onClick(event){
        toolBar.onClick(event);
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
        render();
        renderer.render( scene, camera );
    }
    animate();






    //Tool selection
    let navigationButton = document.getElementById("navigation_button");
    let shiftButton      = document.getElementById("shift_button");
    let splitPointButton = document.getElementById("split_point_button");
    let flipEdgeButton   = document.getElementById("flip_edge_button");

    navigationButton.onclick = function(ev){
        toolBar.changeTool("Navigation");
    }
    shiftButton.onclick = function(ev){
        toolBar.changeTool("Shift");
    }
    splitPointButton.onclick = function(ev){
        toolBar.changeTool("SplitPoint");
    }
    flipEdgeButton.onclick = function(ev){
        toolBar.changeTool("FlipEdge");
    }


    //Debug tools
    let wireframe_switch = document.getElementById("wireframe_switch");
    wireframe_switch.onchange = function(e){
        material_building.wireframe = e.target.checked;
        material_debug.wireframe = e.target.checked;
    }
    
    let debug_material_switch = document.getElementById("debug_material_switch");
    debug_material_switch.onchange = function(e){
        if(e.target.checked){
            material = material_debug;
        }
        else{
            material = material_building;
        }
        graphicalController.changeMaterial(material);
    }
}
