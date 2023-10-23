import matrix from 'matrix-js';
import * as Utils from './utils/utils'

class Controller{
    constructor(vertexData, triangleData, faceData, pointData){
        this.vertexData   = vertexData;
        this.triangleData = triangleData;
        this.faceData     = faceData;
        this.pointData    = pointData;
    }

    faceShift(faceId, delta){
        let planeEquation = this.faceData.planeEquation[faceId];
        let n = Utils.normalize(planeEquation.slice(0,3));

        let delta_v = [delta*n[0],delta*n[1],delta*n[2]];

        //On remets à false le tableau moving, qui sert à désigner les points 3D concernés par le shift
        for (let i=0; i<this.pointData.count; i++){
            this.pointData.moving[i] = false;
        }

        //ensuite on mets à true les attributs des points concernés par le shift
        for(let i=0; i<this.vertexData.count; i++){
            if(this.vertexData.fIndex.getX(i)==faceId){
                let p = this.vertexData.pIndex.getX(i);
                this.pointData.moving[p] = true;
            }
        }

        //Enfin, on bouge les vertex associés
        for(let i=0; i<this.vertexData.count; i++){
            let p = this.vertexData.pIndex.getX(i);
            
            if(this.pointData.moving[p]){
                let coord    = this.vertexData.coords.getXYZ(i);
                let newCoord = [coord[0]+delta_v[0],coord[1]+delta_v[1],coord[2]+delta_v[2]];
                this.vertexData.coords.setXYZ(i, newCoord[0], newCoord[1], newCoord[2]);
                this.faceData.center[3*faceId  ]+=delta_v[0];
                this.faceData.center[3*faceId+1]+=delta_v[1];
                this.faceData.center[3*faceId+2]+=delta_v[2];
            }
        }
        this.vertexData.applyChanges();

        //ToDo : recalculer les equations de plan

    }


    faceShift2(faceId, delta){
        let [a,b,c,d] = this.faceData.planeEquation[faceId];

        this.faceData.planeEquation[faceId][3] -= delta*(a*a+b*b+c*c);

        //ToDo : checker la range de modif valables

        let faces = [];
        let able_to_shift = true;
        for(let i=0; i<this.pointData.count; i++){
            faces.push(this.findAdjacentFaces(i));
            if(faces[i].includes(faceId)&&faces[i].length!=3){
                able_to_shift=false;
            }

        }
        if(able_to_shift){
            for(let i=0; i<this.pointData.count; i++){
                //console.log(i, faces);
                if(faces[i].includes(faceId)){
                    //Pour l'instant on ne traite que les points ayant 3 faces
                    //console.log(faceId,i, faces);
                    if(faces[i].length==3){
                        let fEquation1 = this.faceData.planeEquation[faces[i][0]];
                        let fEquation2 = this.faceData.planeEquation[faces[i][1]];
                        let fEquation3 = this.faceData.planeEquation[faces[i][2]];  
                        let A = matrix([fEquation1.slice(0,3),fEquation2.slice(0,3),fEquation3.slice(0,3)]);
                        //console.log(A());
                        let D = matrix([[-fEquation1[3]],[-fEquation2[3]],[-fEquation3[3]]]);
                        //console.log(D());
                        let p = matrix(A.inv()).prod(D);
                        p = matrix(p).trans()[0];
                        //console.log(i, p);
                        this.updatePoint(i, p);
    
                    }
    
                }
            }
        }

        this.updateFaceCenter(faceId);
        
        this.vertexData.applyChanges();
    }

    findAdjacentFaces(pointId){
        let firstVIndex = this.pointData.vIndex[pointId];
        let faces  = [this.vertexData.fIndex.getX(firstVIndex)];
        let oldVIndex_1 = firstVIndex;
        let oldVIndex_2 = firstVIndex;

        let vIndex1 = this.vertexData.vIndex.getX(firstVIndex);
        let vIndex2 = this.vertexData.vIndex.getY(firstVIndex);
        let ended = false;
        while(!ended){
            //console.log(pointId + ': '+vIndex1+' | '+vIndex2);
            let face1 = this.vertexData.fIndex.getX(vIndex1);
            let face2 = this.vertexData.fIndex.getX(vIndex2);
   
            if(!faces.includes(face1)){
                faces.push(face1);
            }
            if(!faces.includes(face2)){
                faces.push(face2);
            }

            
            
            //On cherche les points suivants dans la rotation
            if(this.vertexData.vIndex.getX(vIndex1)==oldVIndex_1){
                oldVIndex_1 = vIndex1;
                vIndex1 = this.vertexData.vIndex.getY(vIndex1);
            }
            else{
                oldVIndex_1 = vIndex1;
                vIndex1 = this.vertexData.vIndex.getX(vIndex1);
            }
            if(this.vertexData.vIndex.getX(vIndex2)==oldVIndex_2){
                oldVIndex_2 = vIndex2;
                vIndex2 = this.vertexData.vIndex.getY(vIndex2);
            }
            else{
                oldVIndex_2 = vIndex2;
                vIndex2 = this.vertexData.vIndex.getX(vIndex2);
            }

            //On a fini lorsque la rotation gauche et la droite se finissent, cad lorsque
            //les 2 vIndex sont égaux, ou lorsque qu'ils valent l'ancienne valeur de l'autre
            //(v1old = v2 et v2old = v1)
            ended = (oldVIndex_1 == oldVIndex_2)||(vIndex1==oldVIndex_2);
            

        }
        return faces;

    }

    updatePoint(pointId, newCoord){
        let [x,y,z] = newCoord;
        let firstVIndex = this.pointData.vIndex[pointId];
        let oldVIndex_1 = firstVIndex;
        let oldVIndex_2 = firstVIndex;
        this.vertexData.coords.setXYZ(firstVIndex,x,y,z);
        let vIndex1 = this.vertexData.vIndex.getX(firstVIndex);
        let vIndex2 = this.vertexData.vIndex.getY(firstVIndex);
        let ended = false;
        while(!ended){
            this.vertexData.coords.setXYZ(vIndex1,x,y,z);
            this.vertexData.coords.setXYZ(vIndex2,x,y,z);
            //console.log(pointId + ': '+vIndex1+' | '+vIndex2+' |||| '+oldVIndex_1+' | '+oldVIndex_2);
            //On cherche les points suivants dans la rotation
            if(this.vertexData.vIndex.getX(vIndex1)==oldVIndex_1){
                oldVIndex_1 = vIndex1;
                vIndex1 = this.vertexData.vIndex.getY(vIndex1);
            }
            else{
                oldVIndex_1 = vIndex1;
                vIndex1 = this.vertexData.vIndex.getX(vIndex1);
            }
            if(this.vertexData.vIndex.getX(vIndex2)==oldVIndex_2){
                oldVIndex_2 = vIndex2;
                vIndex2 = this.vertexData.vIndex.getY(vIndex2);
            }
            else{
                oldVIndex_2 = vIndex2;
                vIndex2 = this.vertexData.vIndex.getX(vIndex2);
            }


            //On a fini lorsque la rotation gauche et la droite se finissent, cad lorsque
            //les 2 vIndex sont égaux, ou lorsque qu'ils valent l'ancienne valeur de l'autre
            //(v1old = v2 et v2old = v1)
            ended = (oldVIndex_1 == oldVIndex_2)||(vIndex1==oldVIndex_2);
            

        }

    }


    
    changeSelectedFace(triangleId, material){
        if(triangleId == -1){
            this.faceData.changeSelectedFace(-1, material);
        }
        else{
            let newFaceId = this.triangleData.fIndex[triangleId];
            this.faceData.changeSelectedFace(newFaceId, material);
        }
    }

    updateFaceCenter(faceID){
        let [cx,cy,cz]=[0,0,0];
        let n=0;
        let visited_points = [];
        for(let i=0; i<this.vertexData.coords.count; i++){
            let p_id = this.vertexData.pIndex.getX(i);
            if(!visited_points.includes(p_id)&&this.vertexData.fIndex.getX(i)==faceID){
                visited_points.push(p_id);
                let [x,y,z] = this.vertexData.coords.getXYZ(i);
                console.log(x,y,z);
                cx+=x;
                cy+=y;
                cz+=z;
                n+=1;
            }
        }
        this.faceData.center[3*faceID  ] = cx/n;
        this.faceData.center[3*faceID+1] = cy/n;
        this.faceData.center[3*faceID+2] = cz/n;
    }
}

export {Controller}