import * as THREE from 'three';





// utiliser des chuncks
let vShader_buildingDebug = `
    varying vec3 vViewPosition;
    attribute float fIndex;
    attribute vec3 center;
    varying float faceIndex;
    varying vec3 vCenter;
    varying vec3 vEdge;
    varying vec3 debug_color;

    attribute float pIndex;
    uniform float maxPointId;
    uniform float maxFaceId;

    
    vec3 computeColor(float i, float max_i){
        float max_value = 16777215.; //value of 255*256^2+255*256+255, which is the value encrypting the white.
        float new_i = max_value*i/max_i;
        float b = floor(new_i/65536.);
        float g = floor((new_i-65536.*b)/256.);
        float r = new_i-65536.*b-256.*g;
        return vec3(r/255.,g/255.,b/255.);
    }


    void main() {

        faceIndex = fIndex+0.5;
        vCenter = mod(center, 2.);;
        vEdge = center;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        
        //debug_color = computeColor(pIndex, maxPointId);
        debug_color = computeColor(fIndex, maxFaceId);
    }
        `;

let fShader_buildingDebug = `
    //uniform vec3 diffuse;
    uniform vec3 emissive;
    uniform vec3 specular;
    uniform float shininess;
    uniform float opacity;
    uniform float thickness;
    uniform int selectedFaceId;
    uniform bool wireframe;
    varying float faceIndex;
    varying vec3 vCenter;
    varying vec3 vEdge;
    varying vec3 debug_color;


    void main() {

        vec3 afwidth = fwidth( vCenter );
        vec3 all3 = smoothstep( ( thickness - 1.0 ) * afwidth, thickness * afwidth, vCenter );
        vec3 sel3 = all3 + vEdge;
        
        float all = 1.0 - min( min( all3.x, all3.y ), all3.z );
        float sel = 1.0 - min( min( sel3.x, sel3.y ), sel3.z );

        vec4 diffuseColor = vec4( debug_color, 1. );
        /*if (int(faceIndex)==selectedFaceId){
            diffuseColor = vec4( vec3(1.,1.,1.)-diffuseColor.xyz, diffuseColor.w);
        }*/
        gl_FragColor.rgb = diffuseColor.rgb;//*(gl_FrontFacing ? 1. : 0.5);
        gl_FragColor.a = 1.;
        if(wireframe){
            gl_FragColor.a = mix(all, sel, 1.);
        }
        

    }
`;


let buildingMaterialDebug = new THREE.ShaderMaterial({
    uniforms: { 
        'thickness': { value: 6 },
        'selectedFaceId':{value: -1},
        'wireframe':{value: false},
        'maxPointId' : {value:0},
        'maxFaceId' : {value:0}
        },
    vertexShader: vShader_buildingDebug,
    fragmentShader: fShader_buildingDebug,
    side: THREE.DoubleSide,
    alphaToCoverage: true // only works when WebGLRenderer's "antialias" is set to "true"
});

buildingMaterialDebug.extensions.derivatives = true;





        

let vShader_pointMaterial = 
    `#define FacePoint
    uniform float size;
    uniform float scale;
    attribute float fIndex;
    attribute float faceArrity;
    varying float faceIndex;
    varying float vFaceArrity;

    varying vec3 pointColor;

    attribute float pIndex;
    uniform float maxPointId;
    uniform int selectedFaceId;

    #include <common>
    #include <color_pars_vertex>
    #include <fog_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>

    #ifdef USE_POINTS_UV

        varying vec2 vUv;
        uniform mat3 uvTransform;

    #endif

    vec3 computeColor(float i, float max_i){
        float max_value = 16777215.; //value of 255*256^2+255*256+255, which is the value encrypting the white.
        float new_i = max_value*i/max_i;
        float b = floor(new_i/65536.);
        float g = floor((new_i-65536.*b)/256.);
        float r = new_i-65536.*b-256.*g;
        return vec3(r/255.,g/255.,b/255.);
    }

    void main() {
        faceIndex = fIndex+0.5;
        vFaceArrity = faceArrity+0.5;
        pointColor = computeColor(pIndex, maxPointId);

        #ifdef USE_POINTS_UV

            vUv = ( uvTransform * vec3( uv, 1 ) ).xy;

        #endif

        

        #include <color_vertex>
        #include <morphcolor_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <project_vertex>

        gl_PointSize = size;

        if(int(pIndex)==selectedFaceId){
            gl_PointSize*=2.;
        }

        #ifdef USE_SIZEATTENUATION

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );

            if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );

        #endif

        #include <logdepthbuf_vertex>
        #include <clipping_planes_vertex>
        #include <worldpos_vertex>
        #include <fog_vertex>

    }`;

// Use the original MeshPhongMaterial's fragmentShader.
let fShader_pointMaterial = `
    #define FacePoint
    uniform vec3 diffuse;
    uniform float opacity;
    varying float faceIndex;
    varying float vFaceArrity;
    varying vec3 pointColor;
    uniform int selectedFaceId;

    #include <common>
    #include <color_pars_fragment>
    #include <map_particle_pars_fragment>
    #include <alphatest_pars_fragment>
    // #include <alphahash_pars_fragment>
    #include <fog_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>

    void main() {

        #include <clipping_planes_fragment>

        vec3 outgoingLight = vec3( 0.0 );
        vec4 diffuseColor = vec4( diffuse, opacity );

        gl_FragColor.rgb = pointColor;
        gl_FragColor.a = 1.;

        
        
    }
`

let pointsMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.points.uniforms,
        {
            maxPointId:{value: -1},
            selectedFaceId:{value: -1}
        }
    ]),
    vertexShader: vShader_pointMaterial,
    fragmentShader: fShader_pointMaterial,
    side: THREE.DoubleSide,
    alphaToCoverage: true // only works when WebGLRenderer's "antialias" is set to "true"
});



















class BuildingMaterial extends THREE.MeshPhongMaterial{
    constructor(parameters){
        super();

        this.type = "BuildingMaterial";

        this.wireframe = false;
        this.side = THREE.DoubleSide;

        
        this.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.phong.uniforms,
            {
                selectedFaceId:{value: -1},
                thickness:{value: 0.1}
            }
        ]) 
        

        this.vertexShader = 
        `#define BUILDING
        varying vec3 vViewPosition;
        attribute float fIndex;
        attribute vec3 center;
        varying float faceIndex;
        varying vec3 vCenter;
        varying vec3 vEdge;

        #include <common>
        #include <uv_pars_vertex>
        #include <displacementmap_pars_vertex>
        #include <envmap_pars_vertex>
        #include <color_pars_vertex>
        #include <fog_pars_vertex>
        #include <normal_pars_vertex>
        #include <morphtarget_pars_vertex>
        #include <skinning_pars_vertex>
        #include <shadowmap_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        #include <clipping_planes_pars_vertex>
        void main() {
            #include <uv_vertex>
            #include <color_vertex>
            #include <morphcolor_vertex>
            #include <beginnormal_vertex>
            #include <morphnormal_vertex>
            #include <skinbase_vertex>
            #include <skinnormal_vertex>
            #include <defaultnormal_vertex>
            #include <normal_vertex>
            #include <begin_vertex>
            #include <morphtarget_vertex>
            #include <skinning_vertex>
            #include <displacementmap_vertex>
            #include <project_vertex>
            #include <logdepthbuf_vertex>
            #include <clipping_planes_vertex>
            faceIndex = fIndex+0.5;
            vViewPosition = - mvPosition.xyz;
            vCenter = vec3(center.xy, 1.-center.x-center.y );
            vEdge = floor(mod(center.z*vec3(8.,4.,2.),2.));
            #include <worldpos_vertex>
            #include <envmap_vertex>
            #include <shadowmap_vertex>
            #include <fog_vertex>
        }`;

		// Use the original MeshPhongMaterial's fragmentShader.
		this.fragmentShader = `
        #define BUILDING
        uniform vec3 diffuse;
        uniform vec3 emissive;
        uniform vec3 specular;
        uniform float shininess;
        uniform float opacity;
        uniform float thickness;
        uniform int selectedFaceId;
        varying float faceIndex;
        varying vec3 vCenter;
        varying vec3 vEdge;

        #include <common>
        #include <packing>
        #include <dithering_pars_fragment>
        #include <color_pars_fragment>
        #include <uv_pars_fragment>
        #include <map_pars_fragment>
        #include <alphamap_pars_fragment>
        #include <alphatest_pars_fragment>
        #include <aomap_pars_fragment>
        #include <lightmap_pars_fragment>
        #include <emissivemap_pars_fragment>
        #include <envmap_common_pars_fragment>
        #include <envmap_pars_fragment>
        #include <fog_pars_fragment>
        #include <bsdfs>
        #include <lights_pars_begin>
        #include <normal_pars_fragment>
        #include <lights_phong_pars_fragment>
        #include <shadowmap_pars_fragment>
        #include <bumpmap_pars_fragment>
        #include <normalmap_pars_fragment>
        #include <specularmap_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <clipping_planes_pars_fragment>
        void main() {
            #include <clipping_planes_fragment>

            vec3 afwidth = fwidth( vCenter );
            vec3 all3 = smoothstep( ( thickness - 1.0 ) * afwidth, thickness * afwidth, vCenter );
            vec3 sel3 = all3 + vEdge;
            
            float all = 1.0 - min( min( all3.x, all3.y ), all3.z );
            float sel = 1.0 - min( min( sel3.x, sel3.y ), sel3.z );

            vec4 diffuseColor = vec4( diffuse, opacity );
            if (int(faceIndex)==selectedFaceId){
                diffuseColor = vec4( vec3(1.,1.,1.)-diffuseColor.xyz, diffuseColor.w);
            }
            diffuseColor.a = mix(all, sel, 1.);
            ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
            vec3 totalEmissiveRadiance = emissive;


            
            #include <logdepthbuf_fragment>
            #include <map_fragment>
            #include <color_fragment>
            #include <alphamap_fragment>
            #include <alphatest_fragment>
            #include <specularmap_fragment>
            #include <normal_fragment_begin>
            #include <normal_fragment_maps>
            #include <emissivemap_fragment>
            #include <lights_phong_fragment>
            #include <lights_fragment_begin>
            #include <lights_fragment_maps>
            #include <lights_fragment_end>
            #include <aomap_fragment>
            vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
            #include <envmap_fragment>
            #include <output_fragment>
            #include <tonemapping_fragment>
            #include <encodings_fragment>
            #include <fog_fragment>
            #include <premultiplied_alpha_fragment>
            #include <dithering_fragment>

            //gl_FragColor = diffuseColor;
        }
        `

    this.setValues( parameters );
    }
}

class FacePointMaterial extends THREE.PointsMaterial{
    constructor(parameters){
        super();

        this.type = "FacePointMaterial";
        
        this.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.points.uniforms,
            {
                selectedFaceId:{value: -1}
            }
        ]) 
        

        this.vertexShader = 
        `#define FacePoint
        uniform float size;
        uniform float scale;
        attribute float fIndex;
        attribute float faceArrity;
        varying float faceIndex;
        varying float vFaceArrity;
        
        #include <common>
        #include <color_pars_vertex>
        #include <fog_pars_vertex>
        #include <morphtarget_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        #include <clipping_planes_pars_vertex>
        
        #ifdef USE_POINTS_UV
        
            varying vec2 vUv;
            uniform mat3 uvTransform;
        
        #endif
        
        void main() {
            faceIndex = fIndex+0.5;
            vFaceArrity = faceArrity+0.5;
        
            #ifdef USE_POINTS_UV
        
                vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
        
            #endif

            
        
            #include <color_vertex>
            #include <morphcolor_vertex>
            #include <begin_vertex>
            #include <morphtarget_vertex>
            #include <project_vertex>
        
            gl_PointSize = size;
        
            #ifdef USE_SIZEATTENUATION
        
                bool isPerspective = isPerspectiveMatrix( projectionMatrix );
        
                if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
        
            #endif
        
            #include <logdepthbuf_vertex>
            #include <clipping_planes_vertex>
            #include <worldpos_vertex>
            #include <fog_vertex>
        
        }`;
        this.fragmentShader = THREE.ShaderChunk.points_frag;

		// Use the original MeshPhongMaterial's fragmentShader.
		this.fragmentShader = `
        #define FacePoint
        uniform vec3 diffuse;
        uniform float opacity;
        varying float faceIndex;
        varying float vFaceArrity;
        uniform int selectedFaceId;

        #include <common>
        #include <color_pars_fragment>
        #include <map_particle_pars_fragment>
        #include <alphatest_pars_fragment>
       // #include <alphahash_pars_fragment>
        #include <fog_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <clipping_planes_pars_fragment>

        void main() {

            #include <clipping_planes_fragment>

            vec3 outgoingLight = vec3( 0.0 );
            vec4 diffuseColor = vec4( diffuse, opacity );

            diffuseColor.rgb = vec3(1,1,1);

            
            

            #include <logdepthbuf_fragment>
            #include <map_particle_fragment>
            #include <color_fragment>
            #include <alphatest_fragment>
            //#include <alphahash_fragment>

            outgoingLight = diffuseColor.rgb;

            //#include <opaque_fragment>
            #include <tonemapping_fragment>
            //#include <colorspace_fragment>
            #include <fog_fragment>
            #include <premultiplied_alpha_fragment>
            if (int(faceIndex)!=selectedFaceId){
                discard;
            }

            gl_FragColor = vec4(0,1,0,1);
            if(int(vFaceArrity)!=3){
                gl_FragColor.rgb = vec3(1,0,0);
            }



        }
        `

    this.setValues( parameters );
    }
}


class SplitPointMaterial extends THREE.PointsMaterial{
    constructor(parameters){
        super();

        this.type = "FacePointMaterial";
        
        this.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.points.uniforms,
            {
                selectedPointId:{value: -1}
            }
        ]) 
        

        this.vertexShader = 
        `#define SplitPoint
        uniform float size;
        uniform float scale;
        attribute float pIndex;
        attribute float faceArrity;
        varying float pointIndex;
        varying float vFaceArrity;
        
        #include <common>
        #include <color_pars_vertex>
        #include <fog_pars_vertex>
        #include <morphtarget_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        #include <clipping_planes_pars_vertex>
        
        #ifdef USE_POINTS_UV
        
            varying vec2 vUv;
            uniform mat3 uvTransform;
        
        #endif
        
        void main() {
            
            pointIndex = pIndex+0.5;
            vFaceArrity = faceArrity+0.5;
        
            #ifdef USE_POINTS_UV
        
                vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
        
            #endif

            
        
            #include <color_vertex>
            #include <morphcolor_vertex>
            #include <begin_vertex>
            #include <morphtarget_vertex>
            #include <project_vertex>
        
            gl_PointSize = size;
        
            #ifdef USE_SIZEATTENUATION
        
                bool isPerspective = isPerspectiveMatrix( projectionMatrix );
        
                if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
        
            #endif
        
            #include <logdepthbuf_vertex>
            #include <clipping_planes_vertex>
            #include <worldpos_vertex>
            #include <fog_vertex>
        
        }`;
        this.fragmentShader = THREE.ShaderChunk.points_frag;

		// Use the original MeshPhongMaterial's fragmentShader.
		this.fragmentShader = `
        #define SplitPoint
        uniform vec3 diffuse;
        uniform float opacity;
        varying float pointIndex;
        varying float vFaceArrity;
        uniform int selectedPointId;

        #include <common>
        #include <color_pars_fragment>
        #include <map_particle_pars_fragment>
        #include <alphatest_pars_fragment>
       // #include <alphahash_pars_fragment>
        #include <fog_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <clipping_planes_pars_fragment>

        void main() {

            #include <clipping_planes_fragment>

            vec3 outgoingLight = vec3( 0.0 );
            vec4 diffuseColor = vec4( diffuse, opacity );

            diffuseColor.rgb = vec3(1,1,1);

            
            

            #include <logdepthbuf_fragment>
            #include <map_particle_fragment>
            #include <color_fragment>
            #include <alphatest_fragment>
            //#include <alphahash_fragment>

            outgoingLight = diffuseColor.rgb;

            //#include <opaque_fragment>
            #include <tonemapping_fragment>
            //#include <colorspace_fragment>
            #include <fog_fragment>
            #include <premultiplied_alpha_fragment>
            if (int(pointIndex)!=selectedPointId){
                discard;
            }
            gl_FragColor = vec4(0,1,0,1);
            if(int(vFaceArrity)!=3){
                gl_FragColor.rgb = vec3(1,0,0);
            }



        }
        `

    this.setValues( parameters );
    }
}







class FlipEdgeMaterial extends THREE.LineDashedMaterial{
    constructor(parameters){
        super();

        this.type = "FlipEdgeMaterial";
        
        this.uniforms = THREE.UniformsUtils.merge([THREE.ShaderLib.dashed.uniforms,
            {
                selectedEdgeId:{value: -1}
            }
        ]) ;

        this.vertexShader = `
        #define FlipEdgeTest
        uniform float amplitude;

        attribute float eIndex;
        attribute float flipable;
        flat varying float edgeIndex;
        varying float vflipable;

        attribute vec3 displacement;
        attribute vec3 customColor;

        varying vec3 vColor;

        void main() {

            edgeIndex = eIndex+0.5;
            vflipable = flipable+0.5;

            vec3 newPosition = position + amplitude * displacement;

            vColor = customColor;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );

        }
        `
        
        this.fragmentShader =`
        #define FlipEdgeTest
        uniform vec3 color;
        uniform float opacity;

        flat varying float edgeIndex;
        varying float vflipable;
        uniform int selectedEdgeId;

        varying vec3 vColor;

        void main() {

            gl_FragColor = vec4( color, opacity );

            gl_FragColor = vec4(0.2,0.5,0.2,1);

            if(int(vflipable)==0){
                gl_FragColor.rgb = vec3(0.5,0.2,0.2);
            }
            else{
                if (int(edgeIndex)==selectedEdgeId){
                    gl_FragColor.rgb = vec3(0,1,0);
                }
            }

        }
        `

        

		
    this.setValues( parameters );
    }
}









class DebugFlipMaterial extends THREE.LineDashedMaterial{
    constructor(parameters){
        super();

        this.type = "DebugFlipMaterial";
        


        this.uniforms = THREE.UniformsUtils.merge([THREE.ShaderLib.dashed.uniforms,
            {
                selectedEdgeId:{value: -1},
                amplitude: { value: 5.0 },
                opacity: { value: 0.3 },
                color: { value: new THREE.Color( 0xffffff )},
                maxEdgeId : {value:0},
                maxPointId : {value:0}
            }
        ]) ;

        this.vertexShader = `
        #define DebugFlipMaterial
        uniform float amplitude;
        uniform float maxEdgeId;
        uniform float maxPointId;


        attribute float eIndex;
        attribute float pIndex;
        flat varying float edgeIndex;
        varying vec3 edge_color;

        attribute vec3 displacement;
        attribute vec3 customColor;

        varying vec3 vColor;

        vec3 computeColor(float i, float max_i){
            float max_value = 16777215.; //value of 255*256^2+255*256+255, which is the value encrypting the white.
            float new_i = max_value*i/max_i;
            float b = floor(new_i/65536.);
            float g = floor((new_i-65536.*b)/256.);
            float r = new_i-65536.*b-256.*g;
            return vec3(r/255.,g/255.,b/255.);
        }

        void main() {

            edgeIndex = eIndex+0.5;

            vec3 newPosition = position + amplitude * displacement;

            vColor = customColor;

            //edge_color = vec3(eIndex2/maxEdgeId,1.-eIndex2/maxEdgeId,0.);
            //edge_color = vec3(eIndex/maxEdgeId,1.-eIndex/maxEdgeId,0.);
            edge_color = computeColor(pIndex, maxPointId);

            gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );

        }
        `
        
        this.fragmentShader =`
        #define DebugFlipMaterial
        uniform vec3 color;
        uniform float opacity;

        flat varying float edgeIndex1;
        flat varying float edgeIndex2;
        varying vec3 edge_color;
        uniform int selectedEdgeId;

        varying vec3 vColor;

        void main() {

            gl_FragColor = vec4( color, opacity );
            /*if (int(edgeIndex2)!=selectedEdgeId){
                discard;
            }*/
            gl_FragColor = vec4(edge_color,1);
        }
        `
        

		
    this.setValues( parameters );
    }
}






//let buildingMaterial = new BuildingMaterial({color:0x00aa00, reflectivity:0.5, shininess : 5, specular : 0xff0000});

let buildingMaterial = new THREE.ShaderMaterial({
    uniforms: { 
        'thickness': { value: 6 },
        'selectedFaceId':{value: -1},
        'wireframe':{value: false},
        'maxPointId' : {value:0},
        'maxFaceId' : {value:0}
        },
    vertexShader: vShader_buildingDebug,
    fragmentShader: fShader_buildingDebug,
    side: THREE.DoubleSide,
    alphaToCoverage: true // only works when WebGLRenderer's "antialias" is set to "true"
});

buildingMaterial.extensions.derivatives = true;

let buildingNotSelectedMaterial = new THREE.MeshPhongMaterial({color:0x888888, reflectivity:0.3, shininess : 10, specular : 0x888888});
let buildingPointedMaterial = new THREE.MeshPhongMaterial({color:0xffff00, reflectivity:0.8, shininess : 10, specular : 0xffff00});
let buildingSelectedMaterial = new THREE.MeshPhongMaterial({color:0x00ff00, reflectivity:0.8, shininess : 10, specular : 0x00ff00});

buildingNotSelectedMaterial.side = THREE.DoubleSide;
buildingPointedMaterial.side = THREE.DoubleSide;
buildingSelectedMaterial.side = THREE.DoubleSide;
pointsMaterial.uniforms.size.value = 20;
let dualMaterial = buildingMaterialDebug.clone();

export {dualMaterial, buildingPointedMaterial, buildingSelectedMaterial, buildingNotSelectedMaterial, pointsMaterial, buildingMaterial, buildingMaterialDebug, DebugFlipMaterial, FlipEdgeMaterial, FacePointMaterial, SplitPointMaterial}




	