import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { EditableMesh } from './editableObject.js';

import { computeIdMap, picking } from './Picking.js';

import { BuildingMaterial } from './materials.js';

import { buildingsJs } from './objectCreation.js';

import { ModelBuilder, SceneBuilder } from './Builder.js';

import { Controller } from './controller.js';

import * as Utils from './utils/utils';
import * as GeomUtils from './utils/3DGeometricComputes.js'
import matrix from 'matrix-js';

const w = window;

{

    //Test Values
    let triangleId = 15;
    let delta      = 0.05;




    let modelBuilder = new ModelBuilder();
    buildingsJs.forEach(
        building=>{
            modelBuilder.build(building);
        }
    )
    let buildingsModel = modelBuilder.getBuildings();
    console.log(buildingsModel[0]);

    let sceneBuilder = new SceneBuilder();


    const material = new BuildingMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
    //const material = new THREE.MeshPhongMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
    material.side = THREE.DoubleSide;
    sceneBuilder.build(buildingsModel, 3, material);

    let graphicalController = sceneBuilder.getScene();



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


    camera.position.z = 5;

    //Ground creation

    const geometry = new THREE.PlaneGeometry( 1000, 1000 );
    const texture = new THREE.TextureLoader().load('textures/texture.jpg' ); 

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
    const pointer = new THREE.Vector2();

    function onPointerMove( event ) {

        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components

        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    }

    var last_intersected = [];

    function render() {

        // update the picking ray with the camera and pointer position
        raycaster.setFromCamera( pointer, camera );
    
        //reset the color of last intersected objects
    
        for (var i=0; i<last_intersected.length; i++){
            last_intersected[i].object.material = material;
        }
    
        // calculate objects intersecting the picking ray
        //const intersects = raycaster.intersectObjects( scene.children );
        const intersects = raycaster.intersectObjects( objects );
        last_intersected = intersects;

        if(intersects.length!=0){
            pickedPoint = intersects[0].point;
        }

        if(!clicked){
            graphicalController.changeSelectedFace(-1, material);

            if(intersects.length!=0){
                let triangleIndex = intersects[0].face.a/3;
                graphicalController.changeSelectedFace(triangleIndex, material);
            }
        }
        

    
        renderer.render( scene, camera );
    }

    w.addEventListener( 'pointermove', onPointerMove );





    //event listeners
    let clicked = false;
    let lastPicked = new THREE.Vector3();
    let pickedPoint = new THREE.Vector3();
    let lastPos = new THREE.Vector2();


    let verticesPPT = [];
    let geometryPPT = new THREE.BufferGeometry();
    let materialPPT = new THREE.PointsMaterial( { color: 0x00FF00 , size: 0.5} );
    let projectedPointThree = new THREE.Points(geometryPPT, materialPPT);

    scene.add(projectedPointThree);

    function onMouseDown(event){
        if(graphicalController.faceData.selectedFace != -1){
            clicked = true;
            controls.enabled = false;
            lastPos.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            lastPos.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        }
    }

    function onMove(event){
        if(clicked){
            let faceId = graphicalController.faceData.selectedFace;
            if(faceId!=-1){
                let debugInfo = {};
                let x = ( event.clientX / window.innerWidth ) * 2 - 1;
                let y = - ( event.clientY / window.innerHeight ) * 2 + 1;
                let z = 1;

                debugInfo["screen coords"] = [x,y,z];

                //To Do passer en view proj 3*3
                let m = new THREE.Vector3(x,y,z);
                m.unproject(camera);
                debugInfo["world pointer coords"] = [m.x, m.y, m.z];
                debugInfo["world camera coords"] = [camera.position.x, camera.position.y, camera.position.z];
                m.sub(camera.position);
                /*let m = new THREE.Vector3();
                m.copy(pickedPoint);
                m.sub(camera.position);*/
                m.normalize();
                debugInfo["picking line vector"] = [m.x, m.y, m.z];


                let n = graphicalController.faceData.planeEquation[faceId].slice(0,3);
                n = Utils.normalize(n);

                debugInfo["normale"] = n;
                
                let cx = graphicalController.faceData.center[3*faceId];
                let cy = graphicalController.faceData.center[3*faceId+1];
                let cz = graphicalController.faceData.center[3*faceId+2];
                /*let cx = lastPicked.x;
                let cy = lastPicked.y;
                let cz = lastPicked.z;*/
                debugInfo["face center"] = [cx,cy,cz];

                let pickingLine = [[camera.position.x,camera.position.y,camera.position.z],[m.x,m.y,m.z]];
                
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
                
                console.log(debugInfo);

                

                graphicalController.faceShift2(faceId, delta);
                lastPicked.copy(pickedPoint);

                verticesPPT.push(projectedPoint[0], projectedPoint[1], projectedPoint[2]);

                geometryPPT.setAttribute( 'position', new THREE.Float32BufferAttribute( verticesPPT, 3 ) );
                
                geometryPPT.getAttribute("position").needsUpdate = true;
            }
            
        }
    }

    function onMove_easy(event){
        if(clicked){
            let faceId = graphicalController.faceData.selectedFace;
            if(faceId!=-1){
                
                let x = ( event.clientX / window.innerWidth ) * 2 - 1;
                let y = - ( event.clientY / window.innerHeight ) * 2 + 1;

                let v = new THREE.Vector2(x,y);
                v.sub(lastPos);

                let delta = 4*v.length();

                if(v.x<0){
                    delta = -delta;
                }

                graphicalController.faceShift2(faceId, delta);
                lastPos.x = x;
                lastPos.y = y;

            }
            
        }
    }

    function onMouseUp(event){
        clicked = false;
        controls.enabled = true;
    }

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup'  , onMouseUp);


    

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



    


}





