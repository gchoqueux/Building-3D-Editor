import matrix from 'matrix-js';
import * as Utils from './utils/utils'
import * as GeomUtils from './utils/3DGeometricComputes'
import { Point3D, Polygon } from './CityGMLGeometricModel';
import { SceneBuilder } from './Builder';
import { HalfEdgeData } from './GeometricalProxy';
import { DualBuilder } from './Builder';

class Controller{
    static epsilon = 0.000001;
    constructor(faceData, pointData, halfEdgeData, edgeData, LoD, material){

        this.faceData     = faceData;
        this.pointData    = pointData;
        this.halfEdgeData = halfEdgeData;
        this.edgeData     = edgeData;
        this.dualController = null;

        this.dualBuilder = new DualBuilder();

        this.stop = false;

        this.sceneBuilder = new SceneBuilder();

        //this.geometricalModel = geometricalModel;
        this.LoD = LoD;
        //On calcule la flippabilité des arrêtes
        for(let i=0; i<this.edgeData.count; i++){
            this.edgeData.flipable[i] = this.isflipable(i);
        }
        this.material = material;
        this.sceneBuilder.build(this, this.material);
   
        this.vertexData = this.sceneBuilder.getScene();

    }

    //callback Functions
    onChange(){
        //On recalcul la flippabilité des arrêtes
        for(let i=0; i<this.edgeData.count; i++){
            this.edgeData.flipable[i] = this.isflipable(i);
        }
        //Recalcul du nombre de faces que chaque point touche
        for(let i=0; i<this.pointData.count; i++){
            this.pointData.nbAdjacentFaces[i]=this.findAdjacentFaces(i).length;
        }
        this.updateScene();
        this.vertexData = this.sceneBuilder.getScene();
        
        if(!(this.dualController == null)){
            this.dualBuilder.build(this);
            this.dualController = this.dualBuilder.getScene(this.dualController.material);
        }
    }

    rebuildScene(){
        this.sceneBuilder.build(this, this.material);
    }

    updateScene(){
        this.sceneBuilder.update(this, this.material);
    }




    //Manipulation functions
    faceShift2(faceId, delta){
        //console.log(faceId);

        //On commence par faire un split sur les points quadruples
        for(let i=0; i<this.pointData.count; i++){
            let adjFaces = this.findAdjacentFaces(i);
            if(adjFaces.includes(faceId)&&(adjFaces.length==4) && !this.stop){
                this.splitPointOnMvt(i, faceId, delta);
            }
        }

        let faces = [];
        let able_to_shift = true;
        for(let i=0; i<this.pointData.count; i++){
            faces.push(this.findAdjacentFaces(i));
            if(faces[i].includes(faceId)&&faces[i].length>=4){
                able_to_shift=false;
            }

        }
        if(able_to_shift && !this.stop){
            //On commence par vérifier qu'on fait un décalage autorisé

            let [tmin, tmax] = this.findTValidityInterval(faceId);
            if(tmin>=-Controller.epsilon){
                tmin=0;
            }
            if(tmax<=Controller.epsilon){
                tmax=0;
            }
            let delta_final = delta;
            if(delta<=0 && delta<=tmin){
                delta_final = tmin;
            }
            else if(delta>0 && delta>=tmax){
                delta_final = tmax;
            }
            //console.log(tmin, tmax, delta, delta_final);
            let [a,b,c,d] = this.faceData.planeEquation[faceId];
            this.faceData.planeEquation[faceId][3] -= delta_final*(a*a+b*b+c*c);
            
            //Si nécesaire, fusionner les points qui sont confondus

            //if((delta_final!= delta) ||delta <Controller.epsilon){
            for(let i=0; i<this.edgeData.count; i++){
                //console.log(i," : ", this.edgeLength(i));
                if(this.edgeLength(i)<Controller.epsilon){
                    this.degenerateEdge(i);
                }
            }
           //}
        }


    }

    findAdjacentFaces(pointId){
        let faces = [];
        let he_0 = this.pointData.heIndex[pointId];
        let he = he_0;
        let i=0;
        //console.log(">>>>>>>>>>>>>>>>>", pointId);
        do{
            i++;
            //console.log("      ", he);
            let face_id = this.halfEdgeData.fIndex[he];
            faces = Utils.mergeListsWithoutDoubles(faces, [face_id]);
            he = this.halfEdgeData.opposite(he);
            he = this.halfEdgeData.next(he);
        }while(he!=he_0&&i<100)
        if(i==100){
            console.log(">>>>>>>>>>>>>>>>>", pointId);
        }
        return faces;
    }

    /**
     * 
     * @param {int} pointId the id of the point that will be updated
     * @param {Array} newCoord the new coords of the point : [x,y,z]
     * Updates all the vertices coordinates corresponding to the given point id.
     */
    updatePoint(pointId, newCoord){
        this.pointData.coords[pointId] = newCoord;
        //Update faces plane equations

    }
    edgeLength(e_id){
        let h = this.edgeData.heIndex[e_id];
        let h_o = this.halfEdgeData.opposite(h);
        let p1_id = this.halfEdgeData.pIndex[h];
        let p2_id = this.halfEdgeData.pIndex[h_o];

        let p1 = this.computeCoords(p1_id);
        let p2 = this.computeCoords(p2_id);

        return Utils.distance(p1,p2);
    }

    /**
     * TODO : Passer à un calcul pour n équations de plans
     * @param {Array[float]} fEquation1 
     * @param {Array[float]} fEquation2 
     * @param {Array[float]} fEquation3 
     * @returns 
     */
    computeCoords(point_id){
        let faces = this.findAdjacentFaces(point_id);
        let fEquation1 = this.faceData.planeEquation[faces[0]];
        let fEquation2 = this.faceData.planeEquation[faces[1]];
        let fEquation3 = this.faceData.planeEquation[faces[2]]; 
        if(faces.length<3){
            console.log(point_id, faces);
        }
         
        let A = matrix([fEquation1.slice(0,3),fEquation2.slice(0,3),fEquation3.slice(0,3)]);
        //console.log("A",A());
        let D = matrix([[-fEquation1[3]],[-fEquation2[3]],[-fEquation3[3]]]);
        //console.log(D());
        let p = matrix(A.inv()).prod(D);
        p = matrix(p).trans()[0];
        //console.log(point_id, p);
        return p;
    }


    
    changeSelectedFace(triangleId, material){
        if(triangleId == -1){
            this.faceData.changeSelectedFace(-1, material);
        }
        else{
            let newFaceId = this.sceneBuilder.triangleData.fIndex[triangleId];
            this.faceData.changeSelectedFace(newFaceId, material);
        }
    }

    changeSelectedPoint(pointId, material){
        this.pointData.changeSelectedPoint(pointId, material);
    }

    changeSelectedEdge(e_id, material){
        this.edgeData.changeSelectedEdge(e_id, material);
    }

    /*updateFaceCenter(faceID){
        let he_0 = this.faceData.hExtIndex;
        let [cx,cy,cz]= [0,0,0];
        let n=0;
        let he = he_0;
        do{

        }while(he!=he_0)
        
    }*/

    findTValidityInterval(fIndex){
        let tmax=[];
        let tmin=[];
        //TODO : réécrire sans triangles 
        let paramPlanM = this.faceData.planeEquation[fIndex];
        //On vérifie que les triangles ne s'applatissent pas
        for(let i=0; i<this.sceneBuilder.triangleData.fIndex.length; i++){
            if(this.sceneBuilder.triangleData.fIndex[i]==fIndex){
                let p1=this.sceneBuilder.triangleData.pIndex[3*i  ];
                let p2=this.sceneBuilder.triangleData.pIndex[3*i+1];
                let p3=this.sceneBuilder.triangleData.pIndex[3*i+2];

                let faces1 = this.findAdjacentFaces(p1);
                let faces2 = this.findAdjacentFaces(p2);
                let faces3 = this.findAdjacentFaces(p3);

                
                faces1.splice(faces1.indexOf(fIndex),1);
                faces2.splice(faces2.indexOf(fIndex),1);
                faces3.splice(faces3.indexOf(fIndex),1);

                let ptFaces = [faces1, faces2, faces3];

                let edges = [[0,1],[1,2],[0,2]]

                for(let i=0; i<3; i++){
                    let [id_pt1, id_pt2] = edges[i];
                    if(Utils.nbCommonElts(ptFaces[id_pt1], ptFaces[id_pt2])==0){
                        edges.splice(i,1);
                        break;
                    }
                }

                edges.forEach(e=>{
                    let [id_pt1, id_pt2] = e;
                    let planes = Utils.mergeListsWithoutDoubles(ptFaces[id_pt1], ptFaces[id_pt2]);
                    let paramPlan1 = this.faceData.planeEquation[planes[0]];
                    let paramPlan2 = this.faceData.planeEquation[planes[1]];
                    let paramPlan3 = this.faceData.planeEquation[planes[2]];
                    let t_lim = GeomUtils.computeShiftTValidity(paramPlanM, paramPlan1, paramPlan2, paramPlan3);
                    
                    if(t_lim>0){
                        tmax.push(t_lim);
                    }
                    else if(t_lim<0){
                        tmin.push(t_lim);
                    }
                    
                    
                })
                
            }
        }

        //On vérifie également qu'on ne traverse pas un autre plan
        let [a,b,c,d] = paramPlanM;
        for(let i=0; i<this.pointData.count; i++){
            let faces = this.findAdjacentFaces(i);
            
            if(faces.indexOf(fIndex)==-1){
                let [x,y,z] = this.computeCoords(i);
                let t_lim = a*x+b*y+c*z+d;
                if(t_lim>=0){
                    tmax.push(t_lim);
                }
                else if(t_lim<=0){
                    tmin.push(t_lim);
                }
            }
        }

        //console.log([Math.max(...tmin), Math.min(...tmax)]);
        return ([Math.max(...tmin), Math.min(...tmax)]);
    }


    degenerateEdge(e_id){
        let h   = this.edgeData.heIndex[e_id];
        let h_o = this.halfEdgeData.opposite(h);
        let p1  = this.halfEdgeData.pIndex[h];
        let p2  = this.halfEdgeData.pIndex[h_o];
        let f1  = this.halfEdgeData.fIndex[h];
        let f2  = this.halfEdgeData.fIndex[h_o];
        
        let h_p   = this.halfEdgeData.previous(h);
        let h_n   = this.halfEdgeData.next(h);
        let h_op  = this.halfEdgeData.previous(h_o);
        let h_on  = this.halfEdgeData.next(h_o);
        let h_no  = this.halfEdgeData.opposite(h_n);
        let h_non = this.halfEdgeData.next(h_no);

        this.halfEdgeData.nextIndex[h_p] = h_n;
        this.halfEdgeData.nextIndex[h_op] = h_on;
        this.halfEdgeData.pIndex[h_n] = p1;
        this.halfEdgeData.pIndex[h_non] = p1;

        if(this.faceData.hExtIndex[f1][0]==h){
            this.faceData.hExtIndex[f1]=[h_n];
        }
        if(this.faceData.hExtIndex[f2][0]==h_o){
            this.faceData.hExtIndex[f2]=[h_on];
        }

        if(this.pointData.heIndex[p1][0]==h){
            this.pointData.heIndex[p1]=[h_n];
        }

        for(let i=0; i<this.faceData.hIntIndices[f1].length; i++){
            if(this.faceData.hIntIndices[f1][i]==h){
                this.faceData.hIntIndices[f1][i]=h_n
            }
        }
        for(let i=0; i<this.faceData.hIntIndices[f2].length; i++){
            if(this.faceData.hIntIndices[f2][i]==h_o){
                this.faceData.hIntIndices[f2][i]=h_on
            }
        }

        this.deleteEdge(e_id);
        this.deleteHalfEdge(h);
        if(h_o>h){
            h_o-=1;
        }
        this.deleteHalfEdge(h_o);
        this.deletePoint(p2);
    }

    /**
     * 
     * @param {int} p_id 
     * @param {int} f_id 
     * @param {float} shift 
     */
    splitPointOnMvt(p_id, face_id, t){
        let strat = this.chooseSplitPointStrat(p_id, face_id, t);
        if(strat!=-1){
            this.splitPoint_changeGeomModel(p_id, face_id, strat); 
        }
    }

    /**
     * 
     * @param {int} p_id 
     * @param {int} f_id 
     * @param {float} shift 
     */
    splitPoint_changeGeomModel(p_id, face_id, strat){
        let h = this.pointData.heIndex[p_id];
        while(this.halfEdgeData.fIndex[h]!=face_id){
            h = this.halfEdgeData.opposite(h);
            h = this.halfEdgeData.next(h);
        }
        
        //We get the usefull indices
        let h_p = this.halfEdgeData.previous(h);
        let h_po = this.halfEdgeData.opposite(h_p);
        let h_pop = this.halfEdgeData.previous(h_po);

        let h_o = this.halfEdgeData.opposite(h);
        let h_on = this.halfEdgeData.next(h_o);
        let h_ono = this.halfEdgeData.opposite(h_on);
        let h_onon = this.halfEdgeData.next(h_ono);

        let f1_id = this.halfEdgeData.fIndex[h_po];
        let f2_id = this.halfEdgeData.fIndex[h_on];
        let f3_id = this.halfEdgeData.fIndex[h_onon];

        if(strat == 1){
            //Create the new edge and half edges
            let h1_id = this.halfEdgeData.count;
            let h2_id = this.halfEdgeData.count+1;
            let e_id  = this.halfEdgeData.count;
            let p1_id = p_id;
            let p2_id = this.pointData.count;

            this.edgeData.add(h1_id);
            this.pointData.add(h2_id);
            this.halfEdgeData.add(p1_id,h2_id,h_po,f1_id,e_id)//add h1
            this.halfEdgeData.add(p2_id,h1_id,h_on,f2_id,e_id)//add h2

            //Update of the other half edges
            this.halfEdgeData.nextIndex[h_pop] = h1_id;
            this.halfEdgeData.nextIndex[h_o]   = h2_id;
            this.halfEdgeData.pIndex[h]        = p2_id;
            this.halfEdgeData.pIndex[h_po]     = p2_id;

            //update the point splitted
            if(this.pointData.heIndex[p1_id]==h || this.pointData.heIndex[p1_id]==h_po){
                this.pointData.heIndex[p1_id] = h1_id;
            }


            //Update of the graphical data of p2
            this.pointData.coords[p2_id] = this.computeCoords(p2_id);
            this.pointData.nbAdjacentFaces[p2_id] = this.findAdjacentFaces(p2_id).length;
        }
        else if(strat==2){
            //Create the new edge and half edges
            let h1_id = this.halfEdgeData.count;
            let h2_id = this.halfEdgeData.count+1;
            let e_id  = this.halfEdgeData.count;
            let p1_id = p_id;
            let p2_id = this.pointData.count;

            this.edgeData.add(h1_id);
            this.pointData.add(h2_id);
            this.halfEdgeData.add(p1_id,h2_id,h,face_id,e_id)//add h1
            this.halfEdgeData.add(p2_id,h1_id,h_onon,f3_id,e_id)//add h2

            //Update of the other half edges
            this.halfEdgeData.nextIndex[h_p]   = h1_id;
            this.halfEdgeData.nextIndex[h_ono] = h2_id;
            this.halfEdgeData.pIndex[h]        = p2_id;
            this.halfEdgeData.pIndex[h_on]     = p2_id;

             //update the point splitted
             if(this.pointData.heIndex[p1_id]==h || this.pointData.heIndex[p1_id]==h_on){
                this.pointData.heIndex[p1_id] = h1_id;
            }


            //Update of the graphical data of p2
            this.pointData.coords[p2_id] = this.computeCoords(p2_id);
            this.pointData.nbAdjacentFaces[p2_id] = this.findAdjacentFaces(p2_id).length;

        }
        else{
            console.error("Wrong strategy code");
        }
    }

    chooseSplitPointStrat(pt_id, moving_face, t){
        let he = this.pointData.heIndex[pt_id];
        let he_moving_face = he;
        while(this.halfEdgeData.fIndex[he_moving_face]!=moving_face){
            he_moving_face = this.halfEdgeData.opposite(he_moving_face);
            he_moving_face = this.halfEdgeData.next(he_moving_face);
        }
        let he_mp_o = this.halfEdgeData.opposite(he_moving_face);

        


        let acceptable_strat = []; 

        //strat 1
        let geom_copy = this.copy();
        geom_copy.faceData.planeEquation[moving_face][3]-=t;
        geom_copy.splitPoint_changeGeomModel(pt_id, moving_face, 1);
            //first face
        let he1 = he_mp_o;
        let he2 = geom_copy.halfEdgeData.next(he1);
        let he3 = geom_copy.halfEdgeData.next(he2);
        let he4 = geom_copy.halfEdgeData.next(he3);
        
        let p1_id = geom_copy.halfEdgeData.pIndex[he1];
        let p2_id = geom_copy.halfEdgeData.pIndex[he2];
        let p3_id = geom_copy.halfEdgeData.pIndex[he3];
        let p4_id = geom_copy.halfEdgeData.pIndex[he4];

        let p1 = geom_copy.computeCoords(p1_id);
        let p2 = geom_copy.computeCoords(p2_id);
        let p3 = geom_copy.computeCoords(p3_id);
        let p4 = geom_copy.computeCoords(p4_id);



        let auto_intersects1 = GeomUtils.intersects([p1,p2],[p3,p4]);

            //second face
        he1 = he_mp_o;
        he2 = geom_copy.halfEdgeData.next(he1);
        he3 = geom_copy.halfEdgeData.next(he2);
        he4 = geom_copy.halfEdgeData.next(he3);
        
        p1_id = geom_copy.halfEdgeData.pIndex[he1];
        p2_id = geom_copy.halfEdgeData.pIndex[he2];
        p3_id = geom_copy.halfEdgeData.pIndex[he3];
        p4_id = geom_copy.halfEdgeData.pIndex[he4];

        p1 = geom_copy.computeCoords(p1_id);
        p2 = geom_copy.computeCoords(p2_id);
        p3 = geom_copy.computeCoords(p3_id);
        p4 = geom_copy.computeCoords(p4_id);



        let auto_intersects2 = GeomUtils.intersects([p1,p2],[p3,p4]);

        if(!auto_intersects1 && !auto_intersects2){
            acceptable_strat.push(1);
        }

        //strat 2

        let geom_copy2 = this.copy();
        geom_copy2.faceData.planeEquation[moving_face][3]-=t;
        geom_copy2.splitPoint_changeGeomModel(pt_id, moving_face, 2);

            //first face

        he3 = he_moving_face;
        he4 = geom_copy2.halfEdgeData.next(he3);
        he2 = geom_copy2.halfEdgeData.previous(he3);
        he1 = geom_copy2.halfEdgeData.previous(he2);
        
        p1_id = geom_copy2.halfEdgeData.pIndex[he1];
        p2_id = geom_copy2.halfEdgeData.pIndex[he2];
        p3_id = geom_copy2.halfEdgeData.pIndex[he3];
        p4_id = geom_copy2.halfEdgeData.pIndex[he4];

        p1 = geom_copy2.computeCoords(p1_id);
        p2 = geom_copy2.computeCoords(p2_id);
        p3 = geom_copy2.computeCoords(p3_id);
        p4 = geom_copy2.computeCoords(p4_id);



        let auto_intersects3 = GeomUtils.intersects([p1,p2],[p3,p4]);

            //second face

        he2 = geom_copy2.halfEdgeData.opposite(he2);
        he1 = geom_copy2.halfEdgeData.previous(he2);
        he3 = geom_copy2.halfEdgeData.next(he3);
        he4 = geom_copy2.halfEdgeData.next(he2);
        
        p1_id = geom_copy2.halfEdgeData.pIndex[he1];
        p2_id = geom_copy2.halfEdgeData.pIndex[he2];
        p3_id = geom_copy2.halfEdgeData.pIndex[he3];
        p4_id = geom_copy2.halfEdgeData.pIndex[he4];

        p1 = geom_copy2.computeCoords(p1_id);
        p2 = geom_copy2.computeCoords(p2_id);
        p3 = geom_copy2.computeCoords(p3_id);
        p4 = geom_copy2.computeCoords(p4_id);



        let auto_intersects4 = GeomUtils.intersects([p1,p2],[p3,p4]);
            
        if(!auto_intersects3 && !auto_intersects4){
            acceptable_strat.push(2);
        }

        //si les 2 strats sont acceptables, on prend celle qui crée le
        //segment de moins grande longueur
        if(acceptable_strat.length==2){
            //longueur pour la strat 1
            he1 = geom_copy.halfEdgeData.next(he_mp_o);
            he2 = geom_copy.halfEdgeData.next(he2);
            
            p1_id = geom_copy.halfEdgeData.pIndex[he1];
            p2_id = geom_copy.halfEdgeData.pIndex[he2];

            
            p1 = geom_copy.computeCoords(p1_id);
            p2 = geom_copy.computeCoords(p2_id);

            let length_strat1 = Utils.distance(p1,p2);
            
            //longueur pour la strat 2
            he1 = geom_copy2.halfEdgeData.previous(he_moving_face);
            he2 = he_moving_face;
            
            p1_id = geom_copy2.halfEdgeData.pIndex[he1];
            p2_id = geom_copy2.halfEdgeData.pIndex[he2];

            p1 = geom_copy2.computeCoords(p1_id);
            p2 = geom_copy2.computeCoords(p2_id);

            let length_strat2 = Utils.distance(p1,p2);
            

            if(length_strat1>length_strat2){
                acceptable_strat.splice(0,1);
            }
            else{
                acceptable_strat.splice(1,1);
            }
        }
        
        if(acceptable_strat.length==0){
            return -1;
        }
        else{
            return acceptable_strat[0];
        }
    }

    findEdge(face1, face2){
        for(let i=0; i<this.edgeData.count; i++){
            let he = this.edgeData.halfEdgeIndex[i];
            let f1 = this.halfEdgeData.fIndex[he];
            let he_o = this.halfEdgeData.opposite(he);
            let f2 = this.halfEdgeData.fIndex[he_o];

            if((f1==face1 && f2==face2)||(f1==face2 && f2==face1)){
                return i;
            }
        }
        return -1;
    }

    /**
     * 
     * @param {*} edge_id 
     * @returns a boolean telling if the edge can be flipped
     *  without creating topological issues.
     */
    isflipable(edge_id){
        let flipable = false;

        let he1 = this.edgeData.heIndex[edge_id];
        let he2 = this.halfEdgeData.opposite(he1);
        
        let p1_id = this.halfEdgeData.pIndex[he1];
        let p2_id = this.halfEdgeData.pIndex[he2];
        
        let faces1 = this.findAdjacentFaces(p1_id);
        let faces2 = this.findAdjacentFaces(p2_id);

        let commonFaces = Utils.getCommonElts(faces1, faces2);

        let faces = Utils.mergeListsWithoutDoubles(faces1, faces2);

        let newFaces = Utils.removeElements(faces, commonFaces);

        if(newFaces.length == 2){

            let new_faces1 = Utils.mergeListsWithoutDoubles(newFaces,[commonFaces[0]]);
            let new_faces2 = Utils.mergeListsWithoutDoubles(newFaces,[commonFaces[1]]);
            
            //console.log(new_faces1);
            let new_face1_equation = this.faceData.planeEquation[new_faces1[0]];
            let new_face2_equation = this.faceData.planeEquation[new_faces1[1]];
            let new_face3_equation = this.faceData.planeEquation[new_faces1[2]];

            let new_point1 = GeomUtils.computeIntersectionPoint(new_face1_equation,new_face2_equation,new_face3_equation);


            let new_face4_equation = this.faceData.planeEquation[new_faces2[0]];
            let new_face5_equation = this.faceData.planeEquation[new_faces2[1]];
            let new_face6_equation = this.faceData.planeEquation[new_faces2[2]];

            let new_point2 = GeomUtils.computeIntersectionPoint(new_face4_equation,new_face5_equation,new_face6_equation);

            flipable = (!isNaN(new_point1[0]))&&(!isNaN(new_point2[0]));


            if(flipable){
                //console.log(edge_id, p1_id, new_point1,p2_id,new_point2)
                //Faces diminuées
                let decreased_face1 = Utils.removeElements(faces, new_faces1)[0];
                let decreased_face2 = Utils.removeElements(faces, new_faces2)[0];


                let [exterior_decreased_face1,interior_decreased_face1] = this.getFaceBorders(decreased_face1);
                let [exterior_decreased_face2,interior_decreased_face2] = this.getFaceBorders(decreased_face2);


                
                let new_exterior_decreased_face1 = Utils.removeElements(exterior_decreased_face1, [p1_id]);
                let new_exterior_decreased_face2 = Utils.removeElements(exterior_decreased_face2, [p2_id]);

                let new_interior_decreased_face1 = Utils.removeElements(interior_decreased_face1, [p1_id]);
                let new_interior_decreased_face2 = Utils.removeElements(interior_decreased_face2, [p2_id]);
                
                let border1_ext_coords = this.computeBorderCoords(new_exterior_decreased_face1);
                let border1_int_coords = this.computeBorderCoords(new_interior_decreased_face1);
                let border2_ext_coords = this.computeBorderCoords(new_exterior_decreased_face2);
                let border2_int_coords = this.computeBorderCoords(new_interior_decreased_face2);

                let i1_ext_1 = new_exterior_decreased_face1.indexOf(p1_id);
                let i1_int_1 = new_interior_decreased_face1.indexOf(p1_id);
                let i1_ext_2 = new_exterior_decreased_face2.indexOf(p1_id);
                let i1_int_2 = new_interior_decreased_face2.indexOf(p1_id);

                let i2_ext_1 = new_exterior_decreased_face1.indexOf(p2_id);
                let i2_int_1 = new_interior_decreased_face1.indexOf(p2_id);
                let i2_ext_2 = new_exterior_decreased_face2.indexOf(p2_id);
                let i2_int_2 = new_interior_decreased_face2.indexOf(p2_id);

                

                //On remplace les anciennes coordonnées par les nouvelles
                if(i1_ext_1!=-1){
                    border1_ext_coords[i1_ext_1] = new_point1;
                }
                if(i1_int_1!=-1){
                    border1_int_coords[i1_int_1] = new_point1;
                }
                if(i1_ext_2!=-1){
                    border2_ext_coords[i1_ext_2] = new_point1;
                }
                if(i1_int_2!=-1){
                    border2_int_coords[i1_int_2] = new_point1;
                }
                if(i2_ext_1!=-1){
                    border1_ext_coords[i2_ext_1] = new_point2;
                }
                if(i2_int_1!=-1){
                    border1_int_coords[i2_int_1] = new_point2;
                }
                if(i2_ext_2!=-1){
                    border2_ext_coords[i2_ext_2] = new_point2;
                }
                if(i2_int_2!=-1){
                    border2_int_coords[i2_int_2] = new_point2;
                }


                
                flipable = !GeomUtils.checkAutoIntersection(border1_ext_coords)
                            && !GeomUtils.checkAutoIntersection(border1_int_coords)
                            && !GeomUtils.checkAutoIntersection(border2_ext_coords)
                            && !GeomUtils.checkAutoIntersection(border2_int_coords);
            }

            
            //Faces augmentées
            if(flipable){
                let increased_face1 = Utils.removeElements(Utils.getCommonElts(faces1, new_faces1),commonFaces)[0];
                let increased_face2 = Utils.removeElements(Utils.getCommonElts(faces2, new_faces2),commonFaces)[0];

                let [new_exterior_increased_face1,new_interior_increased_face1] = this.getFaceBorders(increased_face1);
                let [new_exterior_increased_face2,new_interior_increased_face2] = this.getFaceBorders(increased_face2);


                this.addPointInBorder(new_exterior_increased_face1, p2_id, new_faces2, p1_id);
                this.addPointInBorder(new_exterior_increased_face2, p1_id, new_faces1, p2_id);

                this.addPointInBorder(new_interior_increased_face1, p2_id, new_faces2, p1_id);
                this.addPointInBorder(new_interior_increased_face2, p1_id, new_faces1, p2_id);




                let border1_ext_coords = this.computeBorderCoords(new_exterior_increased_face1);
                let border1_int_coords = this.computeBorderCoords(new_interior_increased_face1);
                let border2_ext_coords = this.computeBorderCoords(new_exterior_increased_face2);
                let border2_int_coords = this.computeBorderCoords(new_interior_increased_face2);

                let i1_ext_1 = new_exterior_increased_face1.indexOf(p1_id);
                let i1_int_1 = new_interior_increased_face1.indexOf(p1_id);
                let i1_ext_2 = new_exterior_increased_face2.indexOf(p1_id);
                let i1_int_2 = new_interior_increased_face2.indexOf(p1_id);

                let i2_ext_1 = new_exterior_increased_face1.indexOf(p2_id);
                let i2_int_1 = new_interior_increased_face1.indexOf(p2_id);
                let i2_ext_2 = new_exterior_increased_face2.indexOf(p2_id);
                let i2_int_2 = new_interior_increased_face2.indexOf(p2_id);

                

                //On remplace les anciennes coordonnées par les nouvelles
                if(i1_ext_1!=-1){
                    border1_ext_coords[i1_ext_1] = new_point1;
                }
                if(i1_int_1!=-1){
                    border1_int_coords[i1_int_1] = new_point1;
                }
                if(i1_ext_2!=-1){
                    border2_ext_coords[i1_ext_2] = new_point1;
                }
                if(i1_int_2!=-1){
                    border2_int_coords[i1_int_2] = new_point1;
                }
                if(i2_ext_1!=-1){
                    border1_ext_coords[i2_ext_1] = new_point2;
                }
                if(i2_int_1!=-1){
                    border1_int_coords[i2_int_1] = new_point2;
                }
                if(i2_ext_2!=-1){
                    border2_ext_coords[i2_ext_2] = new_point2;
                }
                if(i2_int_2!=-1){
                    border2_int_coords[i2_int_2] = new_point2;
                }

                flipable = !GeomUtils.checkAutoIntersection(border1_ext_coords)
                            && !GeomUtils.checkAutoIntersection(border1_int_coords)
                            && !GeomUtils.checkAutoIntersection(border2_ext_coords)
                            && !GeomUtils.checkAutoIntersection(border2_int_coords);
                }

        }


        return flipable;
    }

    computeBorderCoords(pointIdList){
        let border_coords = [];
        for (let i=0; i<pointIdList.length; i++){
            if(pointIdList[i]===undefined){
                console.log("bad id",i);
                console.log(pointIdList);
            }
            let coord = this.computeCoords(pointIdList[i]);
            border_coords.push(coord);
        }
        return(border_coords);
    }
    

    /**
     * 
     * @param {int} edge_id 
     */
    edgeFlip(edge_id){
        console.log(edge_id);
        if(this.edgeData.flipable[edge_id]){
            //edge selected
            let he = this.edgeData.heIndex[edge_id];
            let he_o = this.halfEdgeData.opposite(he);

            //neighbour edge 1
            let he_n = this.halfEdgeData.next(he);
            let he_no = this.halfEdgeData.opposite(he_n);

            //neighbour edge 2
            let he_op = this.halfEdgeData.previous(he_o);
            let he_opo = this.halfEdgeData.opposite(he_op);

            //neighbour edge 3
            let he_on = this.halfEdgeData.next(he_o);
            let he_ono = this.halfEdgeData.opposite(he_on);

            //neighbour edge 4
            let he_p = this.halfEdgeData.previous(he);
            let he_po = this.halfEdgeData.opposite(he_p);

            let face_1 = this.halfEdgeData.fIndex[he];
            let face_2 = this.halfEdgeData.fIndex[he_o];
            let face_3 = this.halfEdgeData.fIndex[he_no];
            let face_4 = this.halfEdgeData.fIndex[he_ono];

            let p1 = this.halfEdgeData.pIndex[he];
            let p2 = this.halfEdgeData.pIndex[he_o];

            //Faces update
            if(this.faceData.hExtIndex[face_1][0] == he){
                this.faceData.hExtIndex[face_1] = [he_n];
            }
            else{
                for(let i=0; i<this.faceData.hIntIndices[face_1].length; i++){
                    if(this.faceData.hIntIndices[face_1][i] == he){
                        this.faceData.hIntIndices[face_1][i] = he_n;
                        break;
                    }
                }
            }
            if(this.faceData.hExtIndex[face_2][0] == he_o){
                this.faceData.hExtIndex[face_2] = [he_on];
            }
            else{
                for(let i=0; i<this.faceData.hIntIndices[face_2].length; i++){
                    if(this.faceData.hIntIndices[face_2][i] == he_o){
                        this.faceData.hIntIndices[face_2][i] = he_on;
                        break;
                    }
                }
            }

            //Points update
            if(this.pointData.heIndex[p1] == he_po){
                this.pointData.heIndex[p1] = he;
            }
            if(this.pointData.heIndex[p2] == he_opo){
                this.pointData.heIndex[p2] = he_o;
            }

            //Half edges update
            this.halfEdgeData.fIndex[he] = face_4;
            this.halfEdgeData.fIndex[he_o] = face_3;

            this.halfEdgeData.nextIndex[he] = he_po;
            this.halfEdgeData.nextIndex[he_o] = he_opo;
            this.halfEdgeData.nextIndex[he_no] = he_o;
            this.halfEdgeData.nextIndex[he_ono] = he;
            this.halfEdgeData.nextIndex[he_p] = he_n;
            this.halfEdgeData.nextIndex[he_op] = he_on;

            this.halfEdgeData.pIndex[he_opo] = p1;
            this.halfEdgeData.pIndex[he_po] = p2;

        }
    }



    changeMaterial(newMaterial){
        this.vertexData.material = newMaterial;
    }   

    getFaceBorders(faceId){
        return [this.getExterior(faceId),this.getInteriors(faceId)];   
    }

    getExterior(faceId){
        let he_0 = this.faceData.hExtIndex[faceId][0];
        let exterior = [];
        let he = he_0;
        do{
            exterior.push(this.halfEdgeData.pIndex[he]);
            he = this.halfEdgeData.next(he);
        }while(he!=he_0)
        return exterior;
    }

    getInteriors(faceId){
        let interiors = [];
        this.faceData.hIntIndices[faceId].forEach(he_0=>{
            let interior = [];
            let he = he_0;
            do{
                interior.push(this.halfEdgeData.pIndex[he]);
                he = this.halfEdgeData.next(he);
            }while(he!=he_0)
            interiors.push(interior);
        })
        return interiors;
    }

    addPointInBorder(border, pointId, pointAdjFaces, previousPointId){
        let insert_id = -1;
        let pp_i = border.indexOf(previousPointId);
        if(pp_i!=-1){
            let rp_i = (pp_i+1)%border.length;
            let lp_i = (pp_i-1+border.length)%border.length;
            let rp_adj_f = this.findAdjacentFaces(border[rp_i]);
            let lp_adj_f = this.findAdjacentFaces(border[lp_i]);
            
            if(Utils.nbCommonElts(rp_adj_f, pointAdjFaces)==2){
                insert_id = rp_i;
            }
            else if(Utils.nbCommonElts(lp_adj_f, pointAdjFaces)==2){
                insert_id = pp_i;
            }
            if(insert_id!=-1){
                border.splice(insert_id,0,pointId);
            }  
        }
        return border;
    }

    deletePoint(p_id){
        this.pointData.delete(p_id);
        for(let i=0; i<this.halfEdgeData.count; i++){
            if(this.halfEdgeData.pIndex[i]==p_id){
                this.halfEdgeData.pIndex[i]=-1;
            }
            else if(this.halfEdgeData.pIndex[i]>p_id){
                this.halfEdgeData.pIndex[i]-=1;
            }
        }
    }

    deleteHalfEdge(he_id){
        this.halfEdgeData.delete(he_id);
        for(let i=0; i<this.pointData.count; i++){
            if(this.pointData.heIndex[i][0]==he_id){
                this.pointData.heIndex[i][0]=-1;
            }
            else if(this.pointData.heIndex[i][0]>he_id){
                this.pointData.heIndex[i][0]-=1;
            }
        }

        for(let i=0; i<this.edgeData.count; i++){
            if(this.edgeData.heIndex[i]==he_id){
                this.edgeData.heIndex[i]=-1;
            }
            else if(this.edgeData.heIndex[i]>he_id){
                this.edgeData.heIndex[i]-=1;
            }
        }

        for(let i=0; i<this.faceData.count; i++){
            if(this.faceData.hExtIndex[i][0]==he_id){
                this.faceData.hExtIndex[i]=[-1];
            }
            else if(this.faceData.hExtIndex[i][0]>he_id){
                this.faceData.hExtIndex[i][0]-=1;
            }
            for(let j=0; j<this.faceData.hIntIndices[i].length; j++){
                if(this.faceData.hIntIndices[i][j]==he_id){
                    this.faceData.hIntIndices[i][j]=-1;
                }
                else if(this.faceData.hIntIndices[i][j]>he_id){
                    this.faceData.hIntIndices[i][j]-=1;
                }
            }
        }

    }

    deleteEdge(e_id){
        this.edgeData.delete(e_id);
        for(let i=0; i<this.halfEdgeData.count; i++){
            if(this.halfEdgeData.eIndex[i]==e_id){
                this.halfEdgeData.eIndex[i]=-1;
            }
            else if(this.halfEdgeData.eIndex[i]>e_id){
                this.halfEdgeData.eIndex[i]-=1;
            }
        }
    }

    /**
     * Mets à jour le modèle GML avec les modifications faites par l'utilisateur
     */
    updateGmlModel(){
        for(let p_id=0; p_id<this.pointData.count; p_id++){
            let v_id = this.pointData.vIndex[p_id];
            let [x,y,z] = this.vertexData.coords.getXYZ(v_id);
            if(p_id<Point3D.maxId){
                Point3D.pointsList[p_id].x = x;
                Point3D.pointsList[p_id].y = y;
                Point3D.pointsList[p_id].z = z;
            }
            else{
                new Point3D(x,y,z);
            }
        }
        //TODO : gérer la suppression de points

        this.geometricalModel.buildingParts.forEach(bp=>{
            bp.surfaces.forEach(multisurface=>{
                multisurface.surfaces.forEach(polygon=>{
                    let face_id = polygon.id;
                    let exterior = [];
                    let interior = [];

                    //TODO : recalculer l'intérieur et l'extérieur

                    polygon.exterior = exterior;
                    polygon.interior = interior;

                })
            })
                
            
        })
    }


    copy(){
        return new Controller(this.faceData.copy(), this.pointData.copy(), this.halfEdgeData.copy(), this.edgeData.copy(), this.LoD, this.material);
    }



}


class DualController extends Controller{
    constructor(faceData, pointData, halfEdgeData, edgeData, LoD, material){
        super(faceData, pointData, halfEdgeData, edgeData, LoD, material)
        
        for (let i=0; i<this.vertexData.count; i++){
            let p_id = this.vertexData.pIndex.getX(i);
            let [x,y,z] = this.pointData.coords[p_id];
            this.vertexData.coords.setX(i, x);
            this.vertexData.coords.setY(i, y);
            this.vertexData.coords.setZ(i, z);
        }
        this.vertexData.applyChanges();
    }

    onChange(){
        super.onChange();

        for (let i=0; i<this.vertexData.count; i++){
            let p_id = this.vertexData.pIndex.getX(i);
            let [x,y,z] = this.pointData.coords[p_id];
            this.vertexData.coords.setX(i, x);
            this.vertexData.coords.setY(i, y);
            this.vertexData.coords.setZ(i, z);
        }
        this.vertexData.applyChanges();

    }
}



export {Controller, DualController}