import matrix from 'matrix-js';
import * as Utils from './utils/utils'
import * as GeomUtils from './utils/3DGeometricComputes'
import { Point3D, Polygon } from './CityGMLGeometricModel';
import { SceneBuilder } from './Builder';
import { HalfEdgeData } from './GeometricalProxy';

class Controller{
    constructor(faceData, pointData, halfEdgeData, edgeData, LoD, material){

        this.faceData     = faceData;
        this.pointData    = pointData;
        this.halfEdgeData = halfEdgeData;
        this.edgeData     = edgeData;

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

    }

    rebuildScene(){
        this.sceneBuilder.build(this, this.material);
    }

    updateScene(){
        this.sceneBuilder.update(this, this.material);
    }




    //Manipulation functions
    faceShift2(faceId, delta){
        

        //On commence par faire un split sur les points quadruples
        for(let i=0; i<this.pointData.count; i++){
            let adjFaces = this.findAdjacentFaces(i);
            if(adjFaces.includes(faceId)&&adjFaces.length==4){
                this.splitPointOnMvt(i, faceId);
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
        if(able_to_shift){
            //On commence par vérifier qu'on fait un décalage autorisé

            let [tmin, tmax] = this.findTValidityInterval(faceId);

            if(delta>tmin && delta<tmax){
                let [a,b,c,d] = this.faceData.planeEquation[faceId];
                this.faceData.planeEquation[faceId][3] -= delta*(a*a+b*b+c*c);
            }
        }


    }

    findAdjacentFaces(pointId){
        let faces = [];
        let he_0 = this.pointData.heIndex[pointId];
        let he = he_0;
        do{
            //console.log(pointId, he);
            let face_id = this.halfEdgeData.fIndex[he];
            faces = Utils.mergeListsWithoutDoubles(faces, [face_id]);
            he = this.halfEdgeData.opposite(he);
            he = this.halfEdgeData.next(he);
        }while(he!=he_0)
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
        let A = matrix([fEquation1.slice(0,3),fEquation2.slice(0,3),fEquation3.slice(0,3)]);
        //console.log(A());
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


    /**
     * 
     * @param {int} p_id 
     * @param {int} f_id 
     * @param {float} shift 
     */
    splitPointOnMvt(p_id, face_id){
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

        let f1_id = this.halfEdgeData.fIndex[h_po];
        let f2_id = this.halfEdgeData.fIndex[h_on];



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
        //console.log(p1_id, p2_id, faces1, faces2);

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

                let i_ext_1 = new_exterior_increased_face1.indexOf(p2_id);
                let i_int_1 = new_interior_increased_face1.indexOf(p2_id);
                let i_ext_2 = new_exterior_increased_face2.indexOf(p1_id);
                let i_int_2 = new_interior_increased_face2.indexOf(p1_id);

                //On remplace les anciennes coordonnées par les nouvelles
                if(i_ext_1!=-1){
                    border1_ext_coords[i_ext_1] = new_point2;
                }
                if(i_int_1!=-1){
                    border1_int_coords[i_int_1] = new_point2;
                }
                if(i_ext_2!=-1){
                    border2_ext_coords[i_ext_2] = new_point1;
                }
                if(i_int_2!=-1){
                    border2_int_coords[i_int_2] = new_point1;
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
            if(this.faceData.hExtIndex[face_1] == he){
                this.faceData.hExtIndex[face_1] = he_n;
            }
            else{
                for(let i=0; i<this.faceData.hIntIndices[face_1].length; i++){
                    if(this.faceData.hIntIndices[face_1][i] == he){
                        this.faceData.hIntIndices[face_1][i] = he_n;
                        break;
                    }
                }
            }
            if(this.faceData.hExtIndex[face_2] == he_o){
                this.faceData.hExtIndex[face_2] = he_on;
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

    triangulateNewface(faceId, newExterior, newInterior){
        let exteriorPts = [];
        let interiorPts = [];

        newExterior.forEach(p_id=>{
            let v_id = this.pointData.vIndex[p_id];
            let coord = this.vertexData.coords.getXYZ(v_id);
            exteriorPts.push(coord);
        });

        newInterior.forEach(p_id=>{
            let v_id = this.pointData.vIndex[p_id];
            let coord = this.vertexData.coords.getXYZ(v_id);
            interiorPts.push(coord);
        });

        let planeEquation = this.faceData.planeEquation[faceId];

        let triangulation_result = GeomUtils.triangulate(exteriorPts, interiorPts, planeEquation);

        let pt_indices = newExterior.concat(newInterior);

        let triangulation_indices = [];
        triangulation_result.forEach(id=>{
            triangulation_indices.push(pt_indices[id]);
        });


        //On réoriente les triangles si ils ne sont pas dans le meme sens que les faces.


        for (let i=0; i<triangulation_indices.length/3; i++){
            let p1_id = triangulation_indices[3*i  ];
            let p2_id = triangulation_indices[3*i+1];
            let p3_id = triangulation_indices[3*i+2];
            let e1 = [p2_id, p1_id];
            let e2 = [p3_id, p2_id];
            let e3 = [p1_id, p3_id];
            if(Utils.isSubArray(newExterior,e1)||Utils.isSubArray(newExterior,e2)||Utils.isSubArray(newExterior,e3)){
                let mem = triangulation_indices[3*i+1];
                triangulation_indices[3*i+1] = triangulation_indices[3*i+2];
                triangulation_indices[3*i+2] = mem;
            }
            if(Utils.isSubArray(newInterior,e1)||Utils.isSubArray(newInterior,e2)||Utils.isSubArray(newInterior,e3)){
                let mem = triangulation_indices[3*i+1];
                triangulation_indices[3*i+1] = triangulation_indices[3*i+2];
                triangulation_indices[3*i+2] = mem;
            }
        }



        return(triangulation_indices);

    }

    

    removeHalfEdge(hf_id){
        let e_id = this.halfEdgeData.eIndex[hf_id];

        this.halfEdgeData.remove(hf_id);

        if(this.edgeData.halfEdgeIndex[2*e_id] == hf_id){
            this.edgeData.halfEdgeIndex[2*e_id]=null;
        }
        else{
            this.edgeData.halfEdgeIndex[2*e_id+1]=null;
        }


    }

    removeVertex(v_id){

        let p_id = this.vertexData.pIndex.getX(v_id);
        let n_v_id = -1;

        for(let i=0; i<this.vertexData.count; i++){
            if(i!=v_id && this.vertexData.pIndex.getX(i)==p_id){
                n_v_id = i;
                break;
            }
        }
        if(n_v_id>v_id){
            n_v_id-=1;
        }

        this.vertexData.remove(v_id);
        
        for(let i=0; i<this.pointData.count; i++){
            if(this.pointData.vIndex[i]==v_id){
                this.pointData.vIndex[i]=n_v_id;
            }
            else if(this.pointData.vIndex[i]>v_id){
                this.pointData.vIndex[i]-=1;
            }
        }

        for(let i=0; i<this.triangleData.count; i++){
            if(this.triangleData.vIndex[3*i]==v_id){
                this.triangleData.vIndex[3*i]=-1;
            }
            else if(this.triangleData.vIndex[3*i]>v_id){
                this.triangleData.vIndex[3*i]-=1;
            }

            if(this.triangleData.vIndex[3*i+1]==v_id){
                this.triangleData.vIndex[3*i+1]=-1;
            }
            else if(this.triangleData.vIndex[3*i+1]>v_id){
                this.triangleData.vIndex[3*i+1]-=1;
            }

            if(this.triangleData.vIndex[3*i+2]==v_id){
                this.triangleData.vIndex[3*i+2]=-1;
            }
            else if(this.triangleData.vIndex[3*i+2]>v_id){
                this.triangleData.vIndex[3*i+2]-=1;
            }
        }

        for(let i=0; i<this.halfEdgeData.count; i++){
            if(this.halfEdgeData.vIndex[2*i]==v_id){
                this.halfEdgeData.vIndex[2*i]=-1;
            }
            else if(this.halfEdgeData.vIndex[2*i]>v_id){
                this.halfEdgeData.vIndex[2*i]-=1;
            }

            if(this.halfEdgeData.vIndex[2*i+1]==v_id){
                this.halfEdgeData.vIndex[2*i+1]=-1;
            }
            else if(this.halfEdgeData.vIndex[2*i+1]>v_id){
                this.halfEdgeData.vIndex[2*i+1]-=1;
            }
        }


    }

    getFaceBorders(faceId){
        return [this.getExterior(faceId),this.getInteriors(faceId)];   
    }

    getExterior(faceId){
        let he_0 = this.faceData.hExtIndex[faceId];
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


    findTriangleNeighbours(points){

        let neighbours = [-1,-1,-1];

        for(let i=0; i<this.triangleData.count; i++){
            let [t_v1,t_v2,t_v3] = this.triangleData.vIndex.slice(3*i,3*i+3);
            let t_p1 = this.vertexData.pIndex.getX(t_v1);
            let t_p2 = this.vertexData.pIndex.getX(t_v2);
            let t_p3 = this.vertexData.pIndex.getX(t_v3);

            let local_id1 = points.indexOf(t_p1);
            let local_id2 = points.indexOf(t_p2);
            let local_id3 = points.indexOf(t_p3);

            let neighbourhoud_ids = Utils.removeElements([0,1,2], [local_id1, local_id2, local_id3]);

            

            if(neighbourhoud_ids.length==1){
                let n_id = neighbourhoud_ids[0];
                neighbours[n_id]=i;
            }
        }
        return neighbours;
    }

    findVertexNeighbours(p_id, triangleNeighbours, v_position_in_triangle){
        let neighbours = [-1,-1];

        let pos = [1,2,3].splice([1,2,3].indexOf[v_position_in_triangle],1);
        

        let t1_v1 = this.triangleData.vIndex[3*triangleNeighbours[pos[0]]];
        let t1_v2 = this.triangleData.vIndex[3*triangleNeighbours[pos[0]]+1];
        let t1_v3 = this.triangleData.vIndex[3*triangleNeighbours[pos[0]]+2];

        let t1_p1 = this.vertexData.vIndex[t1_v1];
        let t1_p2 = this.vertexData.vIndex[t1_v2];
        let t1_p3 = this.vertexData.vIndex[t1_v3];

        if(t1_p1==p_id){
            neighbours[0]=t1_v1;
        }
        else if(t1_p2==p_id){
            neighbours[0]=t1_v2;
        }
        else if(t1_p3==p_id){
            neighbours[0]=t1_v3;
        }



        let t2_v1 = this.triangleData.vIndex[3*triangleNeighbours[pos[1]]];
        let t2_v2 = this.triangleData.vIndex[3*triangleNeighbours[pos[1]]+1];
        let t2_v3 = this.triangleData.vIndex[3*triangleNeighbours[pos[1]]+2];
    
        let t2_p1 = this.vertexData.vIndex[t2_v1];
        let t2_p2 = this.vertexData.vIndex[t2_v2];
        let t2_p3 = this.vertexData.vIndex[t2_v3];

        if(t2_p1==p_id){
            neighbours[1]=t1_v1;
        }
        else if(t2_p2==p_id){
            neighbours[1]=t1_v2;
        }
        else if(t2_p3==p_id){
            neighbours[1]=t1_v3;
        }

        return neighbours;

    }

    recomputeEdges(){
        this.edgeData.reset();
        this.halfEdgeData.reset();
        for(let i=0; i<this.triangleData.count; i++){
            let v1 = this.triangleData.vIndex[3*i];
            let v2 = this.triangleData.vIndex[3*i+1];
            let v3 = this.triangleData.vIndex[3*i+2];

            let p1 = this.vertexData.pIndex.getX(v1);
            let p2 = this.vertexData.pIndex.getX(v2);
            let p3 = this.vertexData.pIndex.getX(v3);

            let e1 = Utils.computeEdgeRank(p1,p2);
            let e2 = Utils.computeEdgeRank(p2,p3);
            let e3 = Utils.computeEdgeRank(p3,p1);

            let he1 = Utils.computeHalfEdgeRank(p1,p2);
            let he2 = Utils.computeHalfEdgeRank(p2,p3);
            let he3 = Utils.computeHalfEdgeRank(p3,p1);

            this.halfEdgeData.set(he1,e1, [v1,v2]);
            this.halfEdgeData.set(he2,e2, [v2,v3]);
            this.halfEdgeData.set(he3,e3, [v3,v1]);

            

            if(this.edgeData.halfEdgeIndex[2*e1]==null){
                this.edgeData.halfEdgeIndex[2*e1]=he1;
            }
            else if(this.edgeData.halfEdgeIndex[2*e1+1]==null){
                this.edgeData.halfEdgeIndex[2*e1+1]=he1;
            }
            else{
                console.error("Problème de non validité du modèle topologique : Pas une variété");
            }

            if(this.edgeData.halfEdgeIndex[2*e2]==null){
                this.edgeData.halfEdgeIndex[2*e2]=he2;
            }
            else if(this.edgeData.halfEdgeIndex[2*e2+1]==null){
                this.edgeData.halfEdgeIndex[2*e2+1]=he2;
            }
            else{
                console.error("Problème de non validité du modèle topologique : Pas une variété");
            }

            if(this.edgeData.halfEdgeIndex[2*e3]==null){
                this.edgeData.halfEdgeIndex[2*e3]=he3;
            }
            else if(this.edgeData.halfEdgeIndex[2*e3+1]==null){
                this.edgeData.halfEdgeIndex[2*e3+1]=he3;
            }
            else{
                console.error("Problème de non validité du modèle topologique : Pas une variété");
            }
        }
    } 


    recomputeVerticesNeighbourhood(){

        
        for(let i=0; i<this.triangleData.count ;i++){
            let id_v1 = this.triangleData.vIndex[3*i];
            let id_v2 = this.triangleData.vIndex[3*i+1];
            let id_v3 = this.triangleData.vIndex[3*i+2];

            let neighbours_v1 = this.findVertexNeighbour(0, i);
            let neighbours_v2 = this.findVertexNeighbour(1, i);
            let neighbours_v3 = this.findVertexNeighbour(2, i);

            this.vertexData.vIndex.setXY(id_v1,neighbours_v1[0],neighbours_v1[1]);
            this.vertexData.vIndex.setXY(id_v2,neighbours_v2[0],neighbours_v2[1]);
            this.vertexData.vIndex.setXY(id_v3,neighbours_v3[0],neighbours_v3[1]);


        }
    }

    /**
     * Retrouve les 2 vertex voisins du vertex actuel (voisins par triangles adjacents)
     * @param {*} vertex_id : position of the vertex in the triangle
     * @param {*} id_triangle : position of the triangle in the triangleData object
     */
    findVertexNeighbour(vertex_pos, id_triangle){

        let result = [null, null];

        let neighbour_1, neighbour_2;
        let vertex_index = this.triangleData.vIndex[3*id_triangle+vertex_pos];
        if(vertex_pos == 0){
            neighbour_1 = 1;
            neighbour_2 = 2;
        }
        if(vertex_pos == 1){
            neighbour_1 = 0;
            neighbour_2 = 2;
        }
        if(vertex_pos == 2){
            neighbour_1 = 0;
            neighbour_2 = 1;
        }

        let neighbour_id1 = this.triangleData.tIndex[3*id_triangle+neighbour_1];
        let neighbour_id2 = this.triangleData.tIndex[3*id_triangle+neighbour_2];

        let id_pt = this.vertexData.pIndex.getX(vertex_index);

        


        let n1_vert_1 = this.triangleData.vIndex[3*neighbour_id1];
        let n1_vert_2 = this.triangleData.vIndex[3*neighbour_id1+1];
        let n1_vert_3 = this.triangleData.vIndex[3*neighbour_id1+2];

        let id_n1_vert_1 = this.vertexData.pIndex.getX(n1_vert_1);
        let id_n1_vert_2 = this.vertexData.pIndex.getX(n1_vert_2);
        let id_n1_vert_3 = this.vertexData.pIndex.getX(n1_vert_3);


        if(id_n1_vert_1==id_pt){
            result[0] = n1_vert_1;
        }
        else if(id_n1_vert_2==id_pt){
            result[0] = n1_vert_2;
        }
        else if(id_n1_vert_3==id_pt){
            result[0] = n1_vert_3;
        }

    
        let n2_vert_1 = this.triangleData.vIndex[3*neighbour_id2];
        let n2_vert_2 = this.triangleData.vIndex[3*neighbour_id2+1];
        let n2_vert_3 = this.triangleData.vIndex[3*neighbour_id2+2];

        let id_n2_vert_1 = this.vertexData.pIndex.getX(n2_vert_1);
        let id_n2_vert_2 = this.vertexData.pIndex.getX(n2_vert_2);
        let id_n2_vert_3 = this.vertexData.pIndex.getX(n2_vert_3);

        if(id_n2_vert_1==id_pt){
            result[1] = n2_vert_1;
        }
        else if(id_n2_vert_2==id_pt){
            result[1] = n2_vert_2;
        }
        else if(id_n2_vert_3==id_pt){
            result[1] = n2_vert_3;
        }
        

        return(result);

    }

    recomputeTrianglesNeighbourhood(){
        //Compute the neighbours of each triangle
        let nb_t = this.triangleData.count;
        let globalTriangulation = [];
        
        for(let i=0; i<nb_t ;i++){
            let v1 = this.triangleData.vIndex[3*i];
            let v2 = this.triangleData.vIndex[3*i+1];
            let v3 = this.triangleData.vIndex[3*i+2];
            globalTriangulation.push(this.vertexData.pIndex.getX(v1), this.vertexData.pIndex.getX(v2), this.vertexData.pIndex.getX(v3));
        }
        for(let i=0; i<nb_t ;i++){
            let triangle = [globalTriangulation[3*i], globalTriangulation[3*i+1], globalTriangulation[3*i+2]];
            let neighbours = this.findTrianglesNeighbours(triangle, globalTriangulation);
            this.triangleData.tIndex[3*i  ] = neighbours[0];
            this.triangleData.tIndex[3*i+1] = neighbours[1];
            this.triangleData.tIndex[3*i+2] = neighbours[2];
        }

    }

    /**
     * 
     * @param {int[]} triangle : tableau des indices des points formant le triangle
     * @param {int[]} triangles_array : tableau des indices des points formant tout les triangle
     * @returns 
     */
    findTrianglesNeighbours(triangle, triangles_array){
        let neighbours = [null,null,null];

        let nb_neighbours = 0;
        

        for(let i=0; i<triangles_array.length/3; i++){
            let common_pts = [false, false, false];

            let common1 = triangle.indexOf(triangles_array[3*i  ]);
            let common2 = triangle.indexOf(triangles_array[3*i+1]);
            let common3 = triangle.indexOf(triangles_array[3*i+2]);

            if(common1!=-1){
                common_pts[common1] = true;
            }
            if(common2!=-1){
                common_pts[common2] = true;
            }
            if(common3!=-1){
                common_pts[common3] = true;
            }
            

            //Pour savoir de quel "côté" du triangle se trouve le voisin, on stocke l'indice du voisin
            //à l'indice correspondant au point opposé au voisin 
            //ex : on stocke dans la case 2 le voisin collé sur l'arrête 0-1, car le point 2 est le point qui lui est opposé.
            if(common_pts[0]&&common_pts[1]&&(!common_pts[2])){
                neighbours[2] = i;
                nb_neighbours+=1;
            }
            else if(common_pts[0]&&(!common_pts[1])&&common_pts[2]){
                neighbours[1] = i;
                nb_neighbours+=1;
            }
            else if((!common_pts[0])&&common_pts[1]&&common_pts[2]){
                neighbours[0] = i;
                nb_neighbours+=1;
            }
            if(nb_neighbours==3){
                break;
            }
        }
        return neighbours;

    }

    /**
     * Mets à jour le modèle GML avec les modifications faites par l'utilisateur
     */
    updateGeomModel(){
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



}



export {Controller}