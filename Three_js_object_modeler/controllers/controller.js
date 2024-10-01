import matrix from 'matrix-js';
import * as Utils from '../utils/utils'
import * as GeomUtils from '../utils/3DGeometricComputes'
import { Point3D, Polygon } from '../CityGMLGeometricModel';
import { SceneBuilder } from '../Builders/Builder';
import { HalfEdgeData } from '../GeometricalProxy';
import { DualBuilder } from '../Builders/Builder';
import { embeddings } from '../GeometricalEmbedding';
import * as Certificats from "../certificats";
import { isTopologicallyValid } from '../validityCheck';
import * as THREE from 'three'
import { pointsMaterial } from '../materials/materials';
import { Vector2 } from 'three';
import { ExactNumber as N } from 'exactnumber/dist/index.umd';

import * as ExactMathUtils from '../utils/exactMathUtils';
import { ExactMatrix } from '../utils/exactMatrix';

class Controller{
    static epsilon = N(0);
    static maxId = 0;
    constructor(faceData, pointData, halfEdgeData, edgeData, LoD, material, isCopy=false, isDual=false){
        this.id=Controller.maxId;
        Controller.maxId++;
        this.faceData     = faceData;
        this.pointData    = pointData;
        this.halfEdgeData = halfEdgeData;
        this.edgeData     = edgeData;
        this.dualController = null;
        this.dualBuilder = new DualBuilder(embeddings["Trivial"]);
        this.isCopy = isCopy;
        this.isDual = isDual;
        
        if(!isCopy){
            this.stop = false;
            this.reorientNormals();

            this.sceneBuilder = new SceneBuilder();


            //this.geometricalModel = geometricalModel;
            this.LoD = LoD;
            //On calcule la flippabilité des arrêtes
            if(!isDual){
                for(let i=0; i<this.pointData.count; i++){
                    this.pointData.embeddedPlanEquation[i] = this.computeDefaultEmbeddedPlan(0, i);
                }
                for(let i=0; i<this.edgeData.count; i++){
                    this.edgeData.embeddedPlanEquation[i] = this.computeDefaultEmbeddedPlan(1, i);
                }
                for(let i=0; i<this.edgeData.count; i++){
                    this.edgeData.flipable[i] = this.isflipable(i);
                }
                this.updateEmbeddedPlans();

            }
            
            this.material = material;
            this.sceneBuilder.build(this, this.material);
    
            this.vertexData = this.sceneBuilder.getScene();
        }
        

    }

    update(faceData, pointData, halfEdgeData, edgeData, LoD, material){
        this.faceData     = faceData;
        this.pointData    = pointData;
        this.halfEdgeData = halfEdgeData;
        this.edgeData     = edgeData;
        this.LoD = LoD;
        //On calcule la flippabilité des arrêtes
        if(!this.isDual){
            for(let i=0; i<this.edgeData.count; i++){
                this.edgeData.flipable[i] = this.isflipable(i);
            }
            this.updateEmbeddedPlans();
        }
        this.material = material;
    }

    //callback Functions
    onChange(){
        //console.log("begin onChange");
        //On recalcul la flippabilité des arrêtes
        if(!this.isDual){
            for(let i=0; i<this.edgeData.count; i++){
                this.edgeData.flipable[i] = this.isflipable(i);
            }
        }

        //Recalcul du nombre de faces que chaque point touche
        //console.log("before arrity compute");
        for(let i=0; i<this.pointData.count; i++){
            this.pointData.nbAdjacentFaces[i]=this.findAdjacentFaces(i).length;
        }
        //console.log("before update scene");
        this.updateScene();
        //console.log("before get scene");
        this.vertexData = this.sceneBuilder.getScene();
        
        if(!(this.dualController == null)){
            //console.log("before dual build");
            this.dualBuilder.build(this);
            //console.log("before dual update");
            this.dualBuilder.updateScene(this.dualController.material, this.dualController);
            //console.log("before dual onChange");
            this.dualController.onChange();
        }
        //console.log("end onChange");

        for(let i=0; i<this.faceData.count; i++){
            this.printFace(i);
        }
        for(let i=0; i<this.pointData.count; i++){
            this.printVertex(i);
        }
    }

    rebuildScene(){
        this.sceneBuilder.build(this, this.material);
    }

    updateScene(){
        this.sceneBuilder.update(this, this.material);
    }


    setEmbedding(embeddingName){
        this.dualBuilder.setEmbedding(embeddings[embeddingName]);
        if(!(this.dualController == null)){
            this.dualBuilder.build(this);
            this.dualBuilder.updateScene(this.dualController.material, this.dualController);
            this.dualController.onChange();
        }
    }

    buildDual(dualMaterial){
        this.dualBuilder.build(this);
        this.dualController = this.dualBuilder.getScene(dualMaterial, pointsMaterial);
    }



    //Manipulation functions
    faceShift2(faceId, delta){
        console.log("===MOVING FACE "+String(faceId)+"===");

        let faceDeleted = Infinity;

        //We verify that all points which must be splitted can be without any issue
        let splittable = true;
        for(let i=0; i<this.pointData.count; i++){
            //console.log(i);
            let adjFaces = this.findAdjacentFaces(i);
            //console.log(adjFaces);
            if(adjFaces.includes(faceId)&&(adjFaces.length==4) && !this.stop){
                //console.log("before split");
                splittable = (this.chooseSplitPointStrat(i, faceId, delta)!=-1);
            }
            else if(adjFaces.includes(faceId)&&(adjFaces.length>=5) && !this.stop){
                splittable = false;
            }
            if(!splittable){
                break;
            }
        }



         
        if(splittable){
            
            //If it's ok, we check that all the points can be spiltted
            let able_to_shift = true;

            for(let i=0; i<this.pointData.count; i++){
                let adjFaces = this.findAdjacentFaces(i);
                if(adjFaces.includes(faceId)&&(adjFaces.length==4) && !this.stop){
                    //console.log("before split");
                    //console.log("split strat ========>",this.splitPointOnMvt(i, faceId, delta));
                    let strat = this.chooseSplitPointStrat(i, faceId, delta);
                    able_to_shift = (strat!=-1);
                }
                if(able_to_shift){
                    break;
                }
            }


            if(able_to_shift && !this.stop){
                //If it is ok, we split the points
                for(let i=0; i<this.pointData.count; i++){
                    let adjFaces = this.findAdjacentFaces(i);
                    if(adjFaces.includes(faceId)&&(adjFaces.length==4) && !this.stop){
                        this.splitPointOnMvt(i, faceId, delta)
                    }
                }
                //First we check that the required shift value is ok
                //console.log("before tMin tMax");
                let [tmin, tmax] = this.findTValidityInterval(faceId);
                ExactMathUtils.print(tmin, tmax);
                if(ExactMathUtils.gte(tmin,N(0))){
                    tmin=N(0);
                }
                if(ExactMathUtils.lte(tmax,N(0))){
                    tmax=N(0);
                }
                let delta_final = delta;
                let printM = false;
                if(ExactMathUtils.lte(delta,tmin)){
                    delta_final = tmin;
                    //console.log("EVENT min");
                    //printM = true;
                    //delta_final = 0;
                }
                else if(ExactMathUtils.gte(delta,tmax)){
                    delta_final = tmax;
                    //console.log("EVENT max");
                    //printM = true;
                    //delta_final = 0;
                }
                this.faceData.planeEquation[faceId][3] = this.faceData.planeEquation[faceId][3].sub(delta_final);
                //Si nécesaire, fusionner les points qui sont confondus
    
               // console.log("============================", this.edgeData.count);
                for(let i=0; i<this.edgeData.count; i++){
                    let he_p = this.edgeData.heIndex[i];
                    //console.log("---------- edge "+String(i)+", he "+String(he_p)+", length :"+ String(this.edgeLength(i)));
                    //console.log(i);
                    if(this.edgeNullified(i, printM)){
                        let degenerated_face = Certificats.faceDegenerated(this, i);
                        if(degenerated_face==-1){
                            this.degenerateEdge(i);
                            i=-1;
                        }
                        else{
                            faceDeleted = degenerated_face;
                            this.degenerateEdge(i);
                            this.degenerateFace(degenerated_face);
                            //isTopologicallyValid(this);
                            i=-1;
                        }
                        /*console.log("=*".repeat(8));
                        console.log("=*".repeat(8));
                        for(let i=0; i<this.faceData.count; i++){
                            this.printFace(i);
                        }
                        console.log("=*".repeat(8));
                        console.log("=*".repeat(8));*/
                    }
                }
                
                /*if(faceDeleted==Infinity){
                    //console.log("end shift", delta, delta_final);
                    this.faceData.planeEquation[faceId][3] = this.faceData.planeEquation[faceId][3].sub((delta.sub(delta_final)));
                }*/
                
                
               //}
            }
    
        }
        //isTopologicallyValid(this);
        return faceDeleted;
        
    }

    findAdjacentFaces(pointId){
        let faces = [];
        //console.log(">>>>>>>>>>>>>>>>>", pointId);
        let he_0 = this.pointData.heIndex[pointId][0];
        let he = he_0;
        let i=0;
        do{
            i++;
            let face_id = this.halfEdgeData.fIndex[he];
            //console.log("      ", he, face_id);
            faces = Utils.mergeListsWithoutDoubles(faces, [face_id]);
            he = this.halfEdgeData.opposite(he);
            he = this.halfEdgeData.next(he);
            /*if(i>100){
                console.log(">>>>>>>>>>>>>>>>>!!!!", pointId);
            }*/
        }while(he!=he_0&&i<100)
        if(i==100){
            console.log(">>>>>>>>>>>>>>>>>", pointId, he_0);
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

    edgeNullified(e_id, print = false){
        let he1 = this.edgeData.heIndex[e_id];
        let he2 = this.halfEdgeData.opposite(he1);

        let p1 = this.halfEdgeData.vertex(he1);
        let p2 = this.halfEdgeData.vertex(he2);

        let faces1 = this.findAdjacentFaces(p1);
        let faces2 = this.findAdjacentFaces(p2);

        let faces = Utils.mergeListsWithoutDoubles(faces1, faces2);
        let planeEquations = [];
        faces.forEach(face=>{
            planeEquations.push([...this.faceData.planeEquation[face]]);
        })
        let m = new ExactMatrix(planeEquations);
        /*if(print){
            console.log(e_id);
            m.print();
            console.log("rank : "+String(m.rank()));
        }*/

        
        return (m.rank(print)==3);
    }

    edgeLength(e_id){
        let h = this.edgeData.heIndex[e_id];
        let h_o = this.halfEdgeData.opposite(h);
        let p1_id = this.halfEdgeData.pIndex[h];
        let p2_id = this.halfEdgeData.pIndex[h_o];

        let p1 = [];
        let p2 = [];
        
        try{
            p1 = this.computeCoords(p1_id);
            p2 = this.computeCoords(p2_id);
        }
        catch(e){
            console.log("####DEBUG INFO####");
            console.log(p1_id,p2_id);
            console.log(this.copy());
            console.log(this.findAdjacentFaces(p1_id),this.findAdjacentFaces(p2_id));
            console.log("##################");
            console.error(e);
        }
        

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
        let plans = [];
        faces.forEach(f=>{
            plans.push([...this.faceData.planeEquation[f]]);
        });
        let p=[0,0,0];
        //plans.push(this.pointData.embeddedPlanEquation[point_id]);
        if(plans.length>=3) {
            p = GeomUtils.computeIntersectionPoint(...plans);
        }
        
        
        /*try{
            p = GeomUtils.computeIntersectionPoint(...plans);
        }
        catch(e){
            console.log("#### Debug computeCoords ####");
            console.log("p_id : ",point_id);
            console.log("faces : ",...faces);
            console.log("plans : ",...plans);
            isTopologicallyValid(this.copy());
            console.log("####  ####");
            //throw e;
            p=[0,0,0];
        }*/
        
        /*let fEquation1 = this.faceData.planeEquation[faces[0]];
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
        p = matrix(p).trans()[0];*/
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

    computeFaceCenter(faceID){
        let he_0 = this.faceData.hExtIndex[faceID][0];
        let [cx,cy,cz]= [0,0,0];
        let n=0;
        let he = he_0;
        do{
            let p_id = this.halfEdgeData.vertex(he);
            let [x,y,z] = this.computeCoords(p_id);
            cx+=x;
            cy+=y;
            cz+=z;
            n+=1;
            he = this.halfEdgeData.next(he);
        }while(he!=he_0 && n<999)
        return [cx/n, cy/n, cz/n];
        
    }

    updateEmbeddedPlans(){
        for(let i=0; i<this.pointData.count; i++){
            if(typeof(this.pointData.embeddedPlanEquation[i][0])=="number"){
                this.pointData.embeddedPlanEquation[i] = this.computeDefaultEmbeddedPlan(0,i);
            }
            let [x,y,z] = this.computeCoords(i);
            let [a,b,c,d] = this.pointData.embeddedPlanEquation[i];
            this.pointData.embeddedPlanEquation[i][3] = a.neg().mul(N(String(x))).sub(b.mul(N(String(y)))).sub(c.mul(N(String(z))));
        }

        for(let i=0; i<this.edgeData.count; i++){
            if(typeof(this.edgeData.embeddedPlanEquation[i][0])=="number"){
                this.edgeData.embeddedPlanEquation[i] = this.computeDefaultEmbeddedPlan(1,i);
            }
            let h  = this.edgeData.heIndex[i];
            let ho = this.halfEdgeData.opposite(h);

            let p0 = this.halfEdgeData.vertex(h);
            let p1 = this.halfEdgeData.vertex(ho);

            let [x0,y0,z0] = this.computeCoords(p0);
            let [x1,y1,z1] = this.computeCoords(p1);
            let [a,b,c,d]  = this.edgeData.embeddedPlanEquation[i];
            let d0 = a.neg().mul(N(String(x0))).sub(b.mul(N(String(y0)))).sub(c.mul(N(String(z0))));
            let d1 = a.neg().mul(N(String(x1))).sub(b.mul(N(String(y1)))).sub(c.mul(N(String(z1))));
            this.edgeData.embeddedPlanEquation[i][3] = d0.add(d1).div(N(2));
        }

    }

    computeDefaultEmbeddedPlan(cellType, cell_id){
        
        if(cellType==0){
            let faces = this.findAdjacentFaces(cell_id);

            let planEquation = [N(0),N(0),N(0),N(0)];
            let n = faces.length;
            for(let i=0; i<n; i++){
                planEquation[0]=planEquation[0].add(this.faceData.planeEquation[faces[i]][0]);
                planEquation[1]=planEquation[1].add(this.faceData.planeEquation[faces[i]][1]);
                planEquation[2]=planEquation[2].add(this.faceData.planeEquation[faces[i]][2]);
                planEquation[3]=planEquation[3].add(this.faceData.planeEquation[faces[i]][3]);
            }
            planEquation[0]=planEquation[0].div(N(n));
            planEquation[1]=planEquation[1].div(N(n));
            planEquation[2]=planEquation[2].div(N(n));
            planEquation[3]=planEquation[3].div(N(n));
            return(planEquation);
        }
        if(cellType==1){
            let planEquation = [N(0),N(0),N(0),N(0)];

            let he0 = this.edgeData.heIndex[cell_id];
            let he1 = this.halfEdgeData.opposite(he0);

            let planEquation0 = this.faceData.planeEquation[this.halfEdgeData.face(he0)];
            let planEquation1 = this.faceData.planeEquation[this.halfEdgeData.face(he1)];
            
            planEquation[0]=planEquation0[0].add(planEquation1[0]);
            planEquation[1]=planEquation0[1].add(planEquation1[1]);
            planEquation[2]=planEquation0[2].add(planEquation1[2]);
            planEquation[3]=planEquation0[3].add(planEquation1[3]);

            let n = Utils.norme(planEquation.slice(0,3));
            planEquation[0]=planEquation[0].div(n);
            planEquation[1]=planEquation[1].div(n);
            planEquation[2]=planEquation[2].div(n);
            planEquation[3]=planEquation[3].div(n);

            return(planEquation);
        }

    }

    findTValidityInterval(fIndex){
        let tmax=[];
        let tmin=[];
        //TODO : réécrire sans triangles 
        let paramPlanM = this.faceData.planeEquation[fIndex];
        //On vérifie que les triangles ne s'applatissent pas
        //console.log(this.sceneBuilder.triangleData);
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
                    //console.log(t_lim);
                    if((typeof(t_lim)=="number"&&t_lim==Infinity) || (typeof(t_lim)!="number"&&t_lim.gt(N(0)))){
                        tmax.push(t_lim);
                    }
                    else if((typeof(t_lim)=="number"&&t_lim==-Infinity) || (typeof(t_lim)=="number"&&t_lim.lt(N(0)))){
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
                let t_lim = a.mul(N(String(x))).add(b.mul(N(String(y)))).add(c.mul(N(String(z)))).add(d);
                if(t_lim.gte(N(0))){
                    tmax.push(t_lim);
                }
                else if(t_lim.lte(0)){
                    tmin.push(t_lim);
                }
            }
        }


        return ([ExactMathUtils.max(...tmin), ExactMathUtils.min(...tmax)]);
    }

    /**
     * Degenerate a face by degenerating a given edge
     * @param {*} faceId 
     * @param {*} edgeId 
     */
    degenerateFace(faceId){
        console.log("degenerate face "+String(faceId));

        let planEquation = [...this.faceData.planeEquation[faceId]];
        
        let h   = this.faceData.hExtIndex[faceId][0];
        let h_o = this.halfEdgeData.opposite(h);
        let h_n = this.halfEdgeData.next(h);
        let h_no = this.halfEdgeData.opposite(h_n);
        let e1   = this.halfEdgeData.eIndex[h];
        let e2   = this.halfEdgeData.eIndex[h_n];


        let p1 = this.halfEdgeData.vertex(h);
        let p2 = this.halfEdgeData.vertex(h_n);



        //change the half-edges and edges pointers
        this.halfEdgeData.oppIndex[h_o] = h_no;
        this.halfEdgeData.oppIndex[h_no] = h_o;
        this.halfEdgeData.eIndex[h_no] = e1;

        this.edgeData.heIndex[e1] = h_o;

        //change the vertices pointers
        
        if(this.pointData.heIndex[p1]==h){
            this.pointData.heIndex[p1]=[h_no];
        }
        if(this.pointData.heIndex[p2]==h_n){
            this.pointData.heIndex[p2]=[h_o];
        }

        this.edgeData.embeddedPlanEquation[e1] = planEquation;

        //Delete edges, half-edges and face
        this.deleteFace(faceId);
        this.deleteEdge(e2);
        this.deleteHalfEdge(h);
        if(h_n>h){
            h_n-=1;
        }
        this.deleteHalfEdge(h_n);
        


    }

    degenerateEdge(e_id){
        let h1_s   = this.edgeData.heIndex[e_id];
        let h2_s = this.halfEdgeData.opposite(h1_s);
        console.log("degenerate edge "+String(e_id)+", he : "+String(h1_s)+", "+String(h2_s));
        let planEquation = [...this.edgeData.embeddedPlanEquation[e_id]];

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

        this.pointData.embeddedPlanEquation[p1] = planEquation;
    }


    /**
     * 
     * @param {int} p_id 
     * @param {int} f_id 
     * @param {float} shift 
     */
    splitPointOnMvt(p_id, face_id, t){
        console.log("creation of an edge from point "+p_id);
        //console.log("before choose strat");
        let strat = this.chooseSplitPointStrat(p_id, face_id, t);
        if(strat!=-1){
            //console.log("before apply strat");
            this.splitPoint_changeGeomModel(p_id, face_id, strat); 
        }
        //console.log("end");
        return strat;
    }

    /**
     * 
     * @param {int} p_id 
     * @param {int} f_id 
     * @param {float} shift 
     */
    splitPoint_changeGeomModel(p_id, face_id, strat){
        let planEquation = [...this.pointData.embeddedPlanEquation[p_id]];
        let h = this.pointData.heIndex[p_id][0];
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
            let e_id  = this.edgeData.count;
            let p1_id = p_id;
            let p2_id = this.pointData.count;

            this.edgeData.add(h1_id, planEquation);
            this.pointData.add(h2_id,[0,0,0,0]);
            this.halfEdgeData.add(p1_id,h2_id,h_po,f1_id,e_id)//add h1
            this.halfEdgeData.add(p2_id,h1_id,h_on,f2_id,e_id)//add h2

            //Update of the other half edges
            this.halfEdgeData.nextIndex[h_pop] = h1_id;
            this.halfEdgeData.nextIndex[h_o]   = h2_id;
            this.halfEdgeData.pIndex[h]        = p2_id;
            this.halfEdgeData.pIndex[h_po]     = p2_id;

            //update the point splitted
            if(this.pointData.heIndex[p1_id][0]==h || this.pointData.heIndex[p1_id][0]==h_po){
                this.pointData.heIndex[p1_id] = [h1_id];
            }

            this.pointData.embeddedPlanEquation[p1_id] = this.computeDefaultEmbeddedPlan(0,p1_id);
            this.pointData.embeddedPlanEquation[p2_id] = this.computeDefaultEmbeddedPlan(0,p2_id);


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

            this.edgeData.add(h1_id, planEquation);
            this.pointData.add(h2_id,[0,0,0,0]);
            this.halfEdgeData.add(p1_id,h2_id,h,face_id,e_id)//add h1
            this.halfEdgeData.add(p2_id,h1_id,h_onon,f3_id,e_id)//add h2

            //Update of the other half edges
            this.halfEdgeData.nextIndex[h_p]   = h1_id;
            this.halfEdgeData.nextIndex[h_ono] = h2_id;
            this.halfEdgeData.pIndex[h]        = p2_id;
            this.halfEdgeData.pIndex[h_on]     = p2_id;

             //update the point splitted
             if(this.pointData.heIndex[p1_id][0]==h || this.pointData.heIndex[p1_id][0]==h_on){
                this.pointData.heIndex[p1_id] = [h1_id];
            }

            this.pointData.embeddedPlanEquation[p1_id] = this.computeDefaultEmbeddedPlan(0,p1_id);
            this.pointData.embeddedPlanEquation[p2_id] = this.computeDefaultEmbeddedPlan(0,p2_id);


            //Update of the graphical data of p2
            this.pointData.coords[p2_id] = this.computeCoords(p2_id);
            this.pointData.nbAdjacentFaces[p2_id] = this.findAdjacentFaces(p2_id).length;

        }
        else{
            console.error("Wrong strategy code");
        }
    }

    chooseSplitPointStrat(pt_id, moving_face, t){
        //console.log("begin strat", pt_id, moving_face);
        let he = this.pointData.heIndex[pt_id][0];
        let he_moving_face = he;
        while(this.halfEdgeData.fIndex[he_moving_face]!=moving_face){
            he_moving_face = this.halfEdgeData.opposite(he_moving_face);
            he_moving_face = this.halfEdgeData.next(he_moving_face);
        }
        let he_mp_o = this.halfEdgeData.opposite(he_moving_face);

        


        let acceptable_strat = []; 
        //strat 1
        let geom_copy = this.copy();
        geom_copy.faceData.planeEquation[moving_face][3]=geom_copy.faceData.planeEquation[moving_face][3].sub(t);
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
        he2 = geom_copy.halfEdgeData.opposite(he2);
        he1 = geom_copy.halfEdgeData.previous(he2);
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
        geom_copy2.faceData.planeEquation[moving_face][3]=geom_copy2.faceData.planeEquation[moving_face][3].sub(t);
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
        he3 = geom_copy2.halfEdgeData.next(he2);
        he4 = geom_copy2.halfEdgeData.next(he3);
        
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


    splitCellIntoFace(cellId, cellType){
        let cell_name = "";
        if(cellType==0){
            cell_name = "point";
        }
        else{
            cell_name = "edge";
        }

        console.log("creation of a face from "+cell_name+" "+cellId);


        if(cellType==0){
            let pointId = cellId;
            let planEquation = this.pointData.embeddedPlanEquation[pointId];
            console.log("pe : ",planEquation);

            let h = this.pointData.heIndex[pointId];

            //Creation of the n-1 other points
            let pointsIds = [pointId];
            let he = this.halfEdgeData.opposite(h);
            he = this.halfEdgeData.next(he);
            do{
                pointsIds.push(this.pointData.count);
                this.halfEdgeData.pIndex[he] = this.pointData.count;
                this.pointData.add(he, [NaN,NaN,NaN,NaN]);
                he = this.halfEdgeData.opposite(he);
                he = this.halfEdgeData.next(he);
            }while(he!=h)

            //Création of the 2n new halfEdges, the n new edges, 
            //and update of the others, plus the point's halfEdge pointers
            let halfEdges = [];
            he = h;
            let i=0;
            let newFace_id = this.faceData.count;
            let n_he = this.halfEdgeData.count;
            let n    = pointsIds.length;
            let n_e  = this.edgeData.count;
            do{
                halfEdges.push(this.halfEdgeData.count,this.halfEdgeData.count+1);
                let he_o = this.halfEdgeData.opposite(he);
                let he_on = this.halfEdgeData.next(he_o);
                //f_id of the external he
                let f_id = this.halfEdgeData.fIndex[he_on];
                //opposites id
                let oppId1 = this.halfEdgeData.count-1;
                if(i==0){
                    oppId1 = this.halfEdgeData.count+(2*n-1)
                }
                let oppId2 = this.halfEdgeData.count+2;
                if(i==n-1){
                    oppId2 = this.halfEdgeData.count-(2*(n-1))
                }
                //next id
                let nextId1 = this.halfEdgeData.count-2;
                if(i==0){
                    nextId1 = this.halfEdgeData.count+(2*(n-1));
                }

                let nextId2 = he_on;
                /*console.log(this.halfEdgeData.count, "---->",oppId1);
                console.log(this.halfEdgeData.count+1, "---->", oppId2);
                */
                //update
                this.halfEdgeData.nextIndex[he_o] = this.halfEdgeData.count+1;
                this.halfEdgeData.pIndex[he] = pointsIds[i];
                this.pointData.heIndex[pointsIds[i]] = [this.halfEdgeData.count];

                //creation
                this.edgeData.add(this.halfEdgeData.count, [NaN,NaN,NaN,NaN]);
                this.halfEdgeData.add(pointsIds[i], oppId1, nextId1, newFace_id, n_e+i);
                this.halfEdgeData.add(pointsIds[i], oppId2, nextId2, f_id, n_e+((i+1)%n));
                
                
                
                he = he_on;
                i++;
            }while(he!=h)

            //Creation of the face
            this.faceData.add([halfEdges[0]],[],planEquation);


        }




        if(cellType==1){
            let edgeId = cellId;
            let planEquation = this.edgeData.embeddedPlanEquation[edgeId];
            let h  = this.edgeData.heIndex[edgeId];
            let ho = this.halfEdgeData.opposite(h);

            let p0 = this.halfEdgeData.vertex(h);
            let p1 = this.halfEdgeData.vertex(ho);

            //Creation of the new points

            let pointsIds0 = [p0];
            let he = this.halfEdgeData.opposite(h);
            he = this.halfEdgeData.next(he);
            let h_p = this.halfEdgeData.previous(h);
            let h_po = this.halfEdgeData.opposite(h_p);
            do{
                pointsIds0.push(this.pointData.count);
                this.halfEdgeData.pIndex[he] = this.pointData.count;
                this.pointData.add(he, [NaN,NaN,NaN,NaN]);
                he = this.halfEdgeData.opposite(he);
                he = this.halfEdgeData.next(he);
            }while(he!=h_po)

            let pointsIds1 = [p1];
            he = this.halfEdgeData.opposite(ho);
            he = this.halfEdgeData.next(he);
            let h_op = this.halfEdgeData.previous(ho);
            let h_opo = this.halfEdgeData.opposite(h_op);
            do{
                pointsIds1.push(this.pointData.count);
                this.halfEdgeData.pIndex[he] = this.pointData.count;
                this.pointData.add(he, [NaN,NaN,NaN,NaN]);
                he = this.halfEdgeData.opposite(he);
                he = this.halfEdgeData.next(he);
            }while(he!=h_opo)

            //Création of the 2n new halfEdges, the n new edges, 
            //and update of the others, plus the point's halfEdge pointers
            //for each vertex of the edge

            //for P0
            let i=1;
            he = this.halfEdgeData.next(ho);
            let newFace_id = this.faceData.count;
            let n_he = this.halfEdgeData.count;
            let n0    = pointsIds0.length;
            let n_e  = this.edgeData.count;


            let halfEdges0 = [this.halfEdgeData.count, h];


            this.halfEdgeData.add(p0, n_he+2*(n0-1) , n_he+2*n0-3, newFace_id, n_e);
            this.edgeData.add(halfEdges0[0]);

            
            do{
                halfEdges0.push(this.halfEdgeData.count,this.halfEdgeData.count+1);
                let he_o = this.halfEdgeData.opposite(he);
                let he_on = this.halfEdgeData.next(he_o);
                //f_id of the external he
                let f_id = this.halfEdgeData.fIndex[he_on];
                //opposites id
                let oppId1 = this.halfEdgeData.count-1;
                if(i==1){
                    oppId1 = ho;
                }
                let oppId2 = this.halfEdgeData.count+2;
                if(i==n0-1){
                    oppId2 = this.halfEdgeData.count-(2*n0-3)
                }
                //next id
                let nextId1 = this.halfEdgeData.count-2;
                if(i==1){
                    nextId1 = this.halfEdgeData.count+(2*(n0-1));
                }

                let nextId2 = he_on;

                //update
                this.halfEdgeData.nextIndex[he_o] = this.halfEdgeData.count+1;
                this.halfEdgeData.pIndex[he] = pointsIds0[i];
                this.pointData.heIndex[pointsIds0[i]] = [this.halfEdgeData.count];

                //creation
                this.edgeData.add(this.halfEdgeData.count, [NaN,NaN,NaN,NaN]);
                this.halfEdgeData.add(pointsIds0[i], oppId1, nextId1, newFace_id, n_e+i);
                this.halfEdgeData.add(pointsIds0[i], oppId2, nextId2, f_id, n_e+((i+1)%(n0)));
                
                he = he_on;
                i++;
            }while(he!=h_po)

            //console.log(this.halfEdgeData.count);


            //For P1

            he = this.halfEdgeData.next(h);
            i=1;
            n_he = this.halfEdgeData.count;
            let n1    = pointsIds1.length;
            n_e  = this.edgeData.count;


            let halfEdges1 = [this.halfEdgeData.count, ho];

            this.halfEdgeData.eIndex[ho] = this.halfEdgeData.eIndex[halfEdges0[2]];


            this.halfEdgeData.add(p1, n_he+2*(n1-1) , n_he+2*n1-3, newFace_id, n_e);
            this.edgeData.add(halfEdges1[0]);


            
            do{
                halfEdges1.push(this.halfEdgeData.count,this.halfEdgeData.count+1);
                let he_o = this.halfEdgeData.opposite(he);
                let he_on = this.halfEdgeData.next(he_o);
                //f_id of the external he
                let f_id = this.halfEdgeData.fIndex[he_on];
                //opposites id
                let oppId1 = this.halfEdgeData.count-1;
                if(i==1){
                    oppId1 = h;
                }
                let oppId2 = this.halfEdgeData.count+2;
                if(i==n1-1){
                    oppId2 = this.halfEdgeData.count-(2*n1-3)
                }
                //next id
                let nextId1 = this.halfEdgeData.count-2;
                if(i==1){
                    nextId1 = halfEdges0[0];
                }

                let nextId2 = he_on;

                //update
                this.halfEdgeData.nextIndex[he_o] = this.halfEdgeData.count+1;
                this.halfEdgeData.pIndex[he] = pointsIds1[i];
                this.pointData.heIndex[pointsIds1[i]] = [this.halfEdgeData.count];

                //creation
                let e_id1 = n_e+i-2;
                if(i==1){
                    e_id1 = edgeId;
                }
                else{
                    this.edgeData.add(this.halfEdgeData.count, [NaN,NaN,NaN,NaN]);
                }
                this.halfEdgeData.add(pointsIds1[i], oppId1, nextId1, newFace_id, e_id1);
                this.halfEdgeData.add(pointsIds1[i], oppId2, nextId2, f_id, n_e+((i)%(n1-1)));
                //console.log(((i-1)%(n1-2)))
                
                
                //console.log(i);
                he = he_on;
                i++;
            }while(he!=h_opo)

            //change h and ho opposites
            this.halfEdgeData.oppIndex[h]  = halfEdges1[2];
            this.halfEdgeData.oppIndex[ho] = halfEdges0[2];

            //change ho edge
            this.halfEdgeData.eIndex[ho] = this.halfEdgeData.eIndex[this.halfEdgeData.opposite(ho)];

            //change p0, p1 halfEdge pointer
            this.pointData.heIndex[p0]  = [h];
            this.pointData.heIndex[p1]  = [ho];

            //Creation of the face
            this.faceData.add([halfEdges0[0]],[],planEquation);


        }

        this.updateEmbeddedPlans();

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
     *  without creating topological or geometrical issues.
     */
    isflipable(edge_id){
        let flipable = true;
        //first we limit to the case where the 2 points are adjacents to only 3 faces
        let he1   = this.edgeData.heIndex[edge_id];
        let he2 = this.halfEdgeData.opposite(he1);

        let p1_id = this.halfEdgeData.vertex(he1);
        let p2_id = this.halfEdgeData.vertex(he2);

        let faces1 = this.findAdjacentFaces(p1_id);
        let faces2 = this.findAdjacentFaces(p2_id);

        if(faces1.length==3 && faces2.length==3){
            //then we simulate the flip, and verify for auto-intersections
            //and points definition
            let controllerCopy = this.copy();
            controllerCopy.edgeData.flipable[edge_id] = true;
            controllerCopy.edgeFlip(edge_id);

            let faces = Utils.mergeListsWithoutDoubles(faces1, faces2);

            for(let i=0; i<faces.length; i++){
                flipable = !Certificats.autoIntersects(controllerCopy, faces[i])&&Certificats.pointsWellDefined(controllerCopy, faces[i]);
                if(!flipable){
                    break;
                }
            }
        }
        else{
            flipable=false;
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
        //console.log(edge_id);
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
            if(this.pointData.heIndex[p1][0] == he_po){
                this.pointData.heIndex[p1] = [he];
            }
            if(this.pointData.heIndex[p2][0] == he_opo){
                this.pointData.heIndex[p2] = [he_o];
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
        if( this.faceData.hExtIndex[faceId]==undefined){
            console.log(faceId);
        }
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

    deleteFace(f_id){
        this.faceData.delete(f_id);
        for(let i=0; i<this.halfEdgeData.count; i++){
            if(this.halfEdgeData.fIndex[i]==f_id){
                this.halfEdgeData.fIndex[i]=-1;
            }
            else if(this.halfEdgeData.fIndex[i]>f_id){
                this.halfEdgeData.fIndex[i]-=1;
            }
        }
    }

    reorientNormals(){
        for(let i=0; i<this.faceData.count; i++){
            let h_o = this.faceData.hExtIndex[i][0];
            let h    = h_o;
            let h_n  = this.halfEdgeData.next(h);
            let h_nn = this.halfEdgeData.next(h_n);

            let cross = new THREE.Vector3();
            do{
                let p0_id = this.halfEdgeData.vertex(h);
                let p1_id = this.halfEdgeData.vertex(h_n);
                let p2_id = this.halfEdgeData.vertex(h_nn);

                let p0 = this.computeCoords(p0_id);
                let p1 = this.computeCoords(p1_id);
                let p2 = this.computeCoords(p2_id);

                let v1 = new THREE.Vector3(p0[0]-p1[0],p0[1]-p1[1],p0[2]-p1[2]); //p0-p1
                let v2 = new THREE.Vector3(p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]); //p2-p1

                v1.normalize();
                v2.normalize();

                let a = v1.angleTo(v2);

                if(a>0.01 && Math.abs(a-Math.PI)>0.01){
                    cross.crossVectors(v1,v2);
                    cross.normalize();
                    break;
                }

                h    = h_n;
                h_n  = h_nn;
                h_nn = this.faceData.next(h_n);
            }while(h!=h_o)

            let [a,b,c,d] = this.faceData.planeEquation[i];
            let normal = new THREE.Vector3(a.toNumber(),b.toNumber(),c.toNumber());
            if(normal.angleTo(cross)>=Math.PI/2){
                let old = [...this.faceData.planeEquation[i]];
                this.faceData.planeEquation[i] = [a.neg(),b.neg(),c.neg(),d.neg()];
                //console.log("old/new", old, this.faceData.planeEquation[i]);
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

    center(){
        let [cx,cy,cz] = [0,0,0];
        let n = this.pointData.count;
        for(let i=0; i<n; i++){
            let [x,y,z] = this.computeCoords(i);
            //let [x,y,z] = this.pointData.coords[i];
            console.log(i," : ",x,y,z, this.findAdjacentFaces(i).length);
            cx+=x;
            cy+=y;
            cz+=z;
        }
        return [cx/n,cy/n,cz/n];
    }

    bbox(){
        let [minx, miny, minz] = [0,0,0];
        let [maxx, maxy, maxz] = [0,0,0];
        let n = this.pointData.count;
        for(let i=0; i<n; i++){
            let [x,y,z] = this.computeCoords(i);
            //let [x,y,z] = this.pointData.coords[i];
            if(x<minx){
                minx=x;
            }
            if(y<miny){
                miny=y;
            }
            if(z<maxz){
                minz=z;
            }

            if(x>maxx){
                maxx=x;
            }
            if(y>maxy){
                maxy=y;
            }
            if(z>maxz){
                maxz=z;
            }
        }
        return [[minx, miny, minz], [maxx, maxy, maxz]];
    }


    copy(){
        
        return new Controller(this.faceData.copy(), this.pointData.copy(), this.halfEdgeData.copy(), this.edgeData.copy(), this.LoD, this.material, true);
    }


    //print fonctions

    printFace(f_id){
        console.log("===========FACE "+String(f_id)+"===========");
        let planEquationFloat = [...this.faceData.planeEquation[f_id]];
        if(typeof(planEquationFloat[0])!="number"){
            planEquationFloat[0]=planEquationFloat[0].toNumber();
        }
        if(typeof(planEquationFloat[1])!="number"){
            planEquationFloat[1]=planEquationFloat[1].toNumber();
        }
        if(typeof(planEquationFloat[2])!="number"){
            planEquationFloat[2]=planEquationFloat[2].toNumber();
        }
        if(typeof(planEquationFloat[3])!="number"){
            planEquationFloat[3]=planEquationFloat[3].toNumber();
        }
        console.log("Plane equation : "+String(planEquationFloat));


        let h_o_ext = this.faceData.hExtIndex[f_id];
        let he = h_o_ext;
        let he_ext = [];
        do{
            he_ext.push(he);
            he = this.halfEdgeData.next(he);
        }while(he!=h_o_ext)

        let s_ext = this.ringToString(he_ext);
        
        console.log(s_ext);


        let s_int = [];
        let h_o_int = this.faceData.hIntIndices[f_id];
        h_o_int.forEach(h_o_i=>{
            let he = h_o_i;
            let he_int = [];
            do{
                he_int.push(he);
                he = this.halfEdgeData.next(he);
            }while(he!=h_o_i)
            s_int.push(this.ringToString(he_int));
        })

        s_int.forEach(s_i=>{
            console.log(s_i);
        })

        console.log("=============================");

    }

    printEdge(e_id){
        
    }

    printVertex(v_id){
        console.log("===========Vertex "+String(v_id)+"===========");
        let faces = this.findAdjacentFaces(v_id);
        console.log("Adjacent faces : "+String(faces));
        let values = [];
        for(let i=0; i<faces.length; i++){
            values.push([...this.faceData.planeEquation[faces[i]]]);
        }
        let M = new ExactMatrix(values);
        console.log("Plane equations : ");
        M.print();
        let rank = M.rank(false);
        console.log("Rank : "+rank);
        if(rank>3){
            M.rank(true);
        }
        /*console.log("Reduced matrix : ");
        let M_reduced = M.reducedMatrix();
        M_reduced.print();*/
        console.log("=============================");
    }

    ringToString(ring ){
        let n = ring.length;
        let height = Math.floor(n/2);
        let diff = ring.length%2;
        let v_middle = this.halfEdgeData.vertex(ring[height]);
        let connector  = "-".repeat(3+diff*8)+">";
        let space      = " ".repeat(2+4+diff*8);
        
        let res = " ".repeat(4+4*diff)+("    "+ring[n-1]).slice(-3)+" ".repeat(4+4*diff)+"\n";
        //console.log(ring);
        if(n<=3){
            res+=" ".repeat(4)+connector+" ".repeat(4)+"\n";
        }

        for(let i=0; i<height; i++){
            let l = "";
            let p1 = " "+("    "+String(this.halfEdgeData.vertex(ring[n-1-i]))).slice(-3);
            let p2 = ("    "+String(this.halfEdgeData.vertex(ring[i]))).slice(-3)+" ";
            
            if(i==height-1){
                if(diff == 0){
                    l+=String(p1)+"<---"+String(p2)+"\n";
                    l+=" ".repeat(4)+("    "+ring[i]).slice(-3)+" ".repeat(4);
                }
                else{
                    l+=String(p1)+"<---"+(" ".repeat(4)+v_middle).slice(-3)+"<---"+String(p2)+"\n";
                    l+=" ".repeat(4)+(" ".repeat(4)+ring[i+1]).slice(-3)+" ".repeat(3)+("    "+ring[i]).slice(-3)+" ".repeat(4);
                }
            }
            else{
                if(i==0){
                    l+=String(p1)+connector+String(p2);
                }
                else{
                    l+=String(p1)+space+String(p2);
                }
                l+="\n";
                l+=                 " ".repeat(3)+"^"+space+"|"+("    "+ring[i]).slice(-3)+"\n";
                l+=("    "+ring[n-2-i]).slice(-3)+"|"+space+"v\n";
            }
            res+=l;
            
        }
        return res;
    }



}


class DualController extends Controller{
    constructor(faceData, pointData, halfEdgeData, edgeData, LoD, material, isCopy, isDual, pointsMaterial){
        super(faceData, pointData, halfEdgeData, edgeData, LoD, material, isCopy, isDual)
        
        for (let i=0; i<this.vertexData.count; i++){
            let p_id = this.vertexData.pIndex.getX(i);
            let [x,y,z] = this.pointData.coords[p_id];
            this.vertexData.coords.setX(i, x);
            this.vertexData.coords.setY(i, y);
            this.vertexData.coords.setZ(i, z);
        }
        this.vertexData.applyChanges();
        //console.log("Dual creation");

                
        let dualPointsGeom = new THREE.BufferGeometry();
        dualPointsGeom.setAttribute( 'position', this.vertexData.coords);
        dualPointsGeom.setAttribute( 'pIndex', this.vertexData.pIndex);
        this.dualPoints = new THREE.Points( dualPointsGeom, pointsMaterial );

        this.dualPoints.material = pointsMaterial;
        pointsMaterial.uniforms.maxPointId.value = this.pointData.count;
        pointsMaterial.uniforms.size.value = 20;
        this.pointMaterial = pointsMaterial;
    }

    onChange(){
        //console.log("begin dual onChange");
        super.onChange();
        //console.log("before dual onChange sup");

        for (let i=0; i<this.vertexData.count; i++){
            let p_id = this.vertexData.pIndex.getX(i);
            let [x,y,z] = this.pointData.coords[p_id];
            this.vertexData.coords.setX(i, x);
            this.vertexData.coords.setY(i, y);
            this.vertexData.coords.setZ(i, z);
        }
        this.vertexData.applyChanges();
        this.dualPoints.geometry.setAttribute( 'position', this.vertexData.coords);
        this.dualPoints.geometry.setAttribute( 'pIndex', this.vertexData.pIndex);
        
        this.dualPoints.geometry.getAttribute('position').needsUpdate = true;
        this.dualPoints.geometry.getAttribute('pIndex').needsUpdate = true;

    }
    
}



export {Controller, DualController}