
import * as THREE from 'three';


///////Chargement des shaders et création des materials

class Picking{
    constructor(vPath, fPath){
        var loader = new THREE.FileLoader();

        this.material = new THREE.ShaderMaterial({

            vertexShader : `
            attribute float vIndex;
            attribute float fIndex;
            varying vec3 vColor;
            
            void main() {
            
                vColor = vec3(vIndex,fIndex,0.);
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            
                gl_Position = projectionMatrix * mvPosition;
            
            }`,
            fragmentShader : `
            #include <packing>
                varying vec3 vColor;

                void main() {

                    vec4 color = vec4(vColor.y/35.,vColor.y/35.,vColor.y/35.,1.) ;

                    //vec4 color = packDepthToRGBA(vColor.x/ 16777216.0);


                    gl_FragColor = color;

                }

            `
        });
/*
        var scope = this;

        // onProgress callback
        function onProgress( xhr ) {
            console.log( (xhr.loaded / xhr.total * 100) + '% loaded shader' );
        }

        // onError callback
        function onError( err ) {
            console.error( 'An error happened on shader load' );
        }

        //onSuccess callback
        function onVSuccess(data){
            scope.material.vertexShader =  data;
        }
        function onFSuccess(data){
            scope.material.fragmentShader =  data;
        }

        loader.load(vPath,onFSuccess,onProgress, onError);
        loader.load(fPath,onVSuccess,onProgress, onError);*/

        

        //console.log(this.material);

        
    }
}
const material = new THREE.MeshPhongMaterial({color:0x00ff00, reflectivity:0.5, shininess : 40, specular : 0xff0000});

const picking = new Picking('shaders/pickingVS.vertexshader','shaders/pickingFS.fragmentshader');




function changeMaterial(objects, material){
    objects.forEach(obj => {
        obj.material = material;
    });
}

function computeIdMap(renderer, zone, objects, scene, camera){

    changeMaterial(objects, picking.material);

    
    var size = new THREE.Vector2(0,0);
    
    renderer.getSize(size);
    var width  = size.x;
    var height = size.y;
    var target = new THREE.WebGLRenderTarget(width, height/*, {format:THREE.AlphaFormat }*/);



    target.scissor.set(
        zone.x-zone.width,
        zone.y-zone.height,
        zone.x+zone.width,
        zone.y+zone.height
    );



    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);




    var buffer = new Uint8Array(4 * (2*zone.width+1) * (2*zone.height+1));

    renderer.readRenderTargetPixels(target, zone.x-zone.width, zone.y-zone.height, 2*zone.width+1, 2*zone.height+1, buffer);

    //changeMaterial(objects, material);

    console.log(buffer);

    return buffer;
}







////Fonctions utilisées avec le picking de Three








export {computeIdMap, picking};
