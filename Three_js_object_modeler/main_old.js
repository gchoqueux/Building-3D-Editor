import * as THREE from 'three';
import * as utils from'./utils.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { EditableMesh } from './editableObject.js';

import { computeIdMap, picking } from './Picking.js';

import { BuildingMaterial } from './materials.js';

import { buildingsJs } from './objectCreation.js';

const w = window;

{

//Scene creation

var objects = [];

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

//const material = new THREE.MeshPhongMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
const material = new BuildingMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});
//const materialSelected = new THREE.MeshPhongMaterial({color:0xff0000, reflectivity:0.5, shininess : 40, specular : 0x00ff00});


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


//Ray casting

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerMove( event ) {

	// calculate pointer position in normalized device coordinates
	// (-1 to +1) for both components

	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    /*var zone = {
        x : event.clientX,
        y : event.clientY,
        width : 0,
        height : 0
    }


    var idImg = computeIdMap(renderer, zone, objects, scene, camera);*/

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

    //console.log(intersects);
    

    objects.forEach(o=>{
        o.changeSelectedFace(-1);
    })

	for ( let i = 0; i < intersects.length; i ++ ) {
        let face = intersects[ i ].object.geometricalModel.getFaceFromGLTriangleIndices(intersects[i].face.a, intersects[i].face.b, intersects[i].face.c);
        console.log(face);
        console.log(intersects[ i ].object);
        intersects[ i ].object.changeSelectedFace(face);
		//intersects[ i ].object.material=materialSelected;
	}

    

	renderer.render( scene, camera );
}

w.addEventListener( 'pointermove', onPointerMove );


var t=0;

//Object Loader

var file = 'res/test.obj'
var object = await EditableMesh.createFromFile(file, material);

console.log(object);



//object.splitFace(3,100,-100,100);

object.addToScene(scene, objects);


//object.useRandomColoration();


function animate() {
    t+=0.01;
	requestAnimationFrame( animate );
    if ((t%0.5)<=0.01){
        /*var x = ( Math.random()*2 )+0.5;
        var y = ( Math.random()*2 )+0.5;
        var z = ( Math.random()*2 )+0.5;

        editableCube.pushVertex(3,x,y,z);*/

        /*var i = Math.floor(Math.random()*8)

        var x =  Math.random()*0.3-0.15;
        var y =  Math.random()*0.3-0.15;
        var z =  Math.random()*0.3-0.15;

        editableCube.translatePoint(i,x,y,z)*/

    }
    
    //pLight.position.set( 10*Math.cos(t)*Math.cos(0.5), 10*Math.cos(t)*Math.sin(0.5), 10*Math.sin(t) );
    
    //console.log(utils.computeDirection(camera));
    controls.update();
    //object.translatePoint(1,0.1,0.1,0.1);
    render();
	renderer.render( scene, camera );
}
animate();

/*const colorationMod = document.getElementById("colorationMods");

colorationMod.onchange = function(e){
    if(e.target.value=="normal"){
        selectedObject.useMaterial(material);
    }
    else if(e.target.value=="triangles"){
        selectedObject.useRandomColoration();
    }
    else{
        selectedObject.useRandomFaceColoration();
    }

}*/


}



