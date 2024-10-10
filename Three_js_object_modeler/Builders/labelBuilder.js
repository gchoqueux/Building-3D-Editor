import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as THREE from 'three';
class LabelBuilder{
    constructor(){
        this.label_data =  new THREE.Group();
    }
    build(geometricalController, material){
        let objId = geometricalController.id;
        
        
        this.vertex_data = {'position':[], 'normal':[], 'uv':[], 'fIndex':[], 'pIndex':[], /*'objIndex':[],*/ 'faceBorder':[]}
        for(let i=0; i<geometricalController.pointData.count; i++){
            const text = document.createElement('div');
            text.className = 'labelPoint';
            text.id = "pointLabel_"+i;
            let color = this.computeFontColor(i, 0, geometricalController.pointData.count);
            let bgColor = this.computeBackgroundColor(i, 0, geometricalController.pointData.count);
            text.style.color = 'rgb(' + color.x + ',' + color.y + ',' + color.z + ')';
            text.style.backgroundColor = 'rgb(' + bgColor.x + ',' + bgColor.y + ',' + bgColor.z + ')';
            text.textContent = String(i);

            const label = new CSS2DObject( text );
            let position = new THREE.Vector3();
            let [x,y,z] = geometricalController.computeCoords(i);
            position.setX(x);
            position.setY(y);
            position.setZ(z);
            label.position.copy( position );
            this.label_data.add( label );
        }

        for(let i=0; i<geometricalController.faceData.count; i++){
            const text = document.createElement('div');
            text.className = 'labelFace';
            text.id = "faceLabel_"+i;
            let color = this.computeFontColor(i, 2, geometricalController.faceData.count);
            let bgColor = this.computeBackgroundColor(i, 2, geometricalController.faceData.count);
            text.style.color = 'rgb(' + color.x + ',' + color.y + ',' + color.z + ')';
            text.style.backgroundColor = 'rgb(' + bgColor.x + ',' + bgColor.y + ',' + bgColor.z + ')';
            text.textContent = String(i);

            const label = new CSS2DObject( text );
            let position = new THREE.Vector3();
            let [x,y,z] = geometricalController.computeFaceCenter(i);
            position.setX(x);
            position.setY(y);
            position.setZ(z);
            label.position.copy( position );
            this.label_data.add( label );
        }

        for(let i=0; i<geometricalController.edgeData.count; i++){
            const text = document.createElement('div');
            text.className = 'labelEdge';
            text.id = "edgeLabel_"+i;
            let color = this.computeFontColor(i, 1, geometricalController.edgeData.count);
            text.style.color = 'rgb(' + color.x + ',' + color.y + ',' + color.z + ')';
            text.textContent = String(i);

            const label = new CSS2DObject( text );
            let position = new THREE.Vector3();
            let [x,y,z] = geometricalController.computeEdgeCenter(i);
            position.setX(x);
            position.setY(y);
            position.setZ(z);
            label.position.copy( position );
            this.label_data.add( label );
        }

        
        
    }

    computeFontColor(cellId, cellType, maxId){
            let max_value = 16777215.; //value of 255*256^2+255*256+255, which is the value encrypting the white.
            let new_id = max_value*cellId/maxId;
            let b = Math.floor(new_id/65536.);
            let g = Math.floor((new_id-65536.*b)/256.);
            let r = new_id-65536.*b-256.*g;
            r = (r)%255;
            g = (g)%255;
            b = (b)%255;

            return new THREE.Vector3(r,g,b);
    }
    computeBackgroundColor(cellId, cellType, maxId){
        let max_value = 16777215.; //value of 255*256^2+255*256+255, which is the value encrypting the white.
        let new_id = max_value*cellId/maxId;
        let b = Math.floor(new_id/65536.);
        let g = Math.floor((new_id-65536.*b)/256.);
        let r = new_id-65536.*b-256.*g;
        r = (r+127)%255;
        g = (g+127)%255;
        b = (b+127)%255;

        return new THREE.Vector3(r,g,b);
}

    update(geometricalController, material){
        while(this.label_data.children.length!=0){
            let child = this.label_data.children[0];
            this.label_data.remove(child);
        }
        for(let i=0; i<geometricalController.pointData.count; i++){
            let text = document.getElementById("pointLabel_"+i);
            if(!text){
                text = document.createElement( 'div' );
                text.className = 'labelPoint';
                let bgColor = this.computeBackgroundColor(i, 0, geometricalController.pointData.count);
                let color = this.computeFontColor(i, 0, geometricalController.pointData.count);
                text.style.color = 'rgb(' + color.x + ',' + color.y + ',' + color.z + ')';
                text.style.backgroundColor = 'rgb(' + bgColor.x + ',' + bgColor.y + ',' + bgColor.z + ')';
                text.textContent = String(i);
            }

            const label = new CSS2DObject( text );
            let position = new THREE.Vector3();
            let [x,y,z] = geometricalController.computeCoords(i);
            position.setX(x);
            position.setY(y);
            position.setZ(z);
            label.position.copy( position );
            this.label_data.add( label );
        }


        for(let i=0; i<geometricalController.faceData.count; i++){
            let text = document.getElementById("faceLabel_"+i);
            if(!text){
                text = document.createElement( 'div' );
                text.className = 'labelFace';
                text.id = "faceLabel_"+i;
                let color = this.computeFontColor(i, 2, geometricalController.faceData.count);
                let bgColor = this.computeBackgroundColor(i, 2, geometricalController.faceData.count);
                text.style.color = 'rgb(' + color.x + ',' + color.y + ',' + color.z + ')';
                text.style.backgroundColor = 'rgb(' + bgColor.x + ',' + bgColor.y + ',' + bgColor.z + ')';
                text.textContent = String(i);
            }
            

            const label = new CSS2DObject( text );
            let position = new THREE.Vector3();
            let [x,y,z] = geometricalController.computeFaceCenter(i);
            position.setX(x);
            position.setY(y);
            position.setZ(z);
            label.position.copy( position );
            this.label_data.add( label );
        }

        for(let i=0; i<geometricalController.edgeData.count; i++){
            let text = document.getElementById("faceLabel_"+i);
            if(!text){
                text = document.createElement('div');
                text.className = 'labelEdge';
                text.id = "edgeLabel_"+i;
                let color = this.computeFontColor(i, 1, geometricalController.edgeData.count);
                text.style.color = 'rgb(' + color.x + ',' + color.y + ',' + color.z + ')';
                text.textContent = String(i);
            }
            
            

            const label = new CSS2DObject( text );
            let position = new THREE.Vector3();
            let [x,y,z] = geometricalController.computeEdgeCenter(i);
            position.setX(x);
            position.setY(y);
            position.setZ(z);
            label.position.copy( position );
            this.label_data.add( label );
        }




        
        
    }
    


    
    getLabel(){
        return this.label_data;
    }
}


export {LabelBuilder}