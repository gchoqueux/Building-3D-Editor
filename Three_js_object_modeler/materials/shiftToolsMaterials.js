import * as THREE from 'three';


class ShiftFaceEdgeMaterial extends THREE.LineDashedMaterial{
    constructor(parameters){
        super();

        this.type = "ShiftFaceEdgeMaterial";
        
        this.uniforms = THREE.UniformsUtils.merge([THREE.ShaderLib.dashed.uniforms,
            {
                selectedEdgeId:{value: -1},
                selectedFaceId:{value: -1}
            }
        ]) ;

        this.vertexShader = `
        #define ShiftFaceEdgeMaterial
        uniform float amplitude;

        attribute float eIndex;
        attribute float f1Index;
        attribute float f2Index;
        flat varying float edgeIndex;
        flat varying float faceIndex1;
        flat varying float faceIndex2;

        attribute vec3 displacement;
        attribute vec3 customColor;

        varying vec3 vColor;

        void main() {

            edgeIndex = eIndex+0.5;
            faceIndex1 = f1Index+0.5;
            faceIndex2 = f2Index+0.5;

            vec3 newPosition = position + amplitude * displacement;

            vColor = customColor;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );

        }
        `
        
        this.fragmentShader =`
        #define ShiftFaceEdgeMaterial
        uniform vec3 color;
        uniform float opacity;

        flat varying float edgeIndex;
        flat varying float faceIndex1;
        flat varying float faceIndex2;
        
        uniform int selectedEdgeId;
        uniform int selectedFaceId;

        varying vec3 vColor;

        void main() {

            gl_FragColor = vec4( color, opacity );


            gl_FragColor = vec4(0.2,0.5,0.2,1);
            if(int(faceIndex1)!=selectedFaceId && int(faceIndex2)!=selectedFaceId){
                if (int(edgeIndex)==selectedEdgeId){
                    gl_FragColor.rgb = vec3(0,1,0);
                }
                else{
                    discard;
                }
            }
        }
        `
		
    this.setValues( parameters );
    }
}



class ShiftFacePointMaterial extends THREE.PointsMaterial{
    constructor(parameters){
        super();

        this.type = "FacePointMaterial";
        
        this.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.points.uniforms,
            {
                selectedFaceId:{value: -1},
                selectedPointId:{value: -1}
            }
        ]) 
        

        this.vertexShader = 
        `#define FacePoint
        uniform float size;
        uniform float scale;
        attribute float pIndex;
        attribute float fIndex;
        attribute float pointArrity;
        attribute float faceArrity;
        varying float pointIndex;
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
            pointIndex = pIndex+0.5;
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
        varying float pointIndex;
        varying float faceIndex;
        varying float vFaceArrity;
        uniform int selectedFaceId;
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
            gl_FragColor = vec4(0,0.5,0,1);
            if(int(vFaceArrity)!=3){
                gl_FragColor.rgb = vec3(1,0,0);
            }
            if (int(faceIndex)!=selectedFaceId){
                if (int(pointIndex)==selectedPointId){
                    gl_FragColor = vec4(0,1,0,1);
                }
                else{
                    discard;
                }
            }
        }
        `

    this.setValues( parameters );
    }
}


let shiftFaceEdgeMaterial = new ShiftFaceEdgeMaterial({ color: 0x00BB00, linewidth: 10 });
let shiftFacePointMaterial = new ShiftFacePointMaterial({ color: 0x00BB00 });


export{shiftFacePointMaterial, shiftFaceEdgeMaterial};
