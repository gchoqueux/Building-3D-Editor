import { VertexData, TriangleData } from "../graphicalModels";
import { PointData, FaceData, HalfEdgeData, EdgeData } from "../GeometricalProxy";
import { DualController } from "../controllers/controller";
import * as Utils from '../utils/utils';
import matrix from 'matrix-js';
import Earcut from "earcut";
import * as GeomUtils from '../utils/3DGeometricComputes';
import {GeometryBuilder} from "./GeometryBuilders";
import {ModelBuilder, MockModelBuilder, CityJSONModelBuilder} from "./ModelBuilder"
import { ExactNumber as N } from "exactnumber/dist/index.umd";

class SceneBuilder{
    constructor(){
        this.vertex_data = {};
    }
    build(geometricalController, material){
        let objId = geometricalController.id;
        this.computeTriangulation(geometricalController);
        this.vertex_data = {'position':[], 'normal':[], 'uv':[], 'fIndex':[], 'pIndex':[], /*'objIndex':[],*/ 'faceBorder':[]}
        for(let i=0; i<this.triangleData.count; i++){
            //console.log(String(i)+"/"+String(this.triangleData.count));
            let p1_id = this.triangleData.pIndex[3*i];
            let p2_id = this.triangleData.pIndex[3*i+1];
            let p3_id = this.triangleData.pIndex[3*i+2];
            this.vertex_data.pIndex.push(p1_id,p2_id,p3_id);

            let p1 = geometricalController.computeCoords(p1_id);
            let p2 = geometricalController.computeCoords(p2_id);
            let p3 = geometricalController.computeCoords(p3_id);

            
            this.vertex_data.position.push(...p1);
            this.vertex_data.position.push(...p2);
            this.vertex_data.position.push(...p3);
            this.vertex_data.uv.push(0,0,0,0,0,0);

            let faceId = this.triangleData.fIndex[i];
            this.vertex_data.fIndex.push(faceId,faceId,faceId);
            //this.vertex_data.objIndex.push(objId,objId,objId);

            let normal = Utils.normalize(geometricalController.faceData.planeEquation[faceId].slice(0,3));
            
            this.vertex_data.normal.push(...normal);
            this.vertex_data.normal.push(...normal);
            this.vertex_data.normal.push(...normal);

            //edge1
            let selected1 = this.isBorder(geometricalController, p2_id, p3_id);
            if(selected1){
                this.vertex_data.faceBorder.push(0);
            }
            else{
                this.vertex_data.faceBorder.push(1);
            }

            //edge2
            let selected2 = this.isBorder(geometricalController, p1_id, p3_id);
            if(selected2){
                this.vertex_data.faceBorder.push(0);
            }
            else{
                this.vertex_data.faceBorder.push(1);
            }

            //edge3
            let selected3 = this.isBorder(geometricalController, p1_id, p2_id);
            if(selected3){
                this.vertex_data.faceBorder.push(0);
            }
            else{
                this.vertex_data.faceBorder.push(1);
            }
        }
        

        this.vertexData_object = new VertexData(this.vertex_data.position, this.vertex_data.normal,
                                                this.vertex_data.uv, this.vertex_data.fIndex, 
                                                this.vertex_data.pIndex, objId, this.vertex_data.faceBorder, material)
    }
    update(geometricalController, material){
        let objId = geometricalController.id;
        this.computeTriangulation(geometricalController);
        this.vertex_data = {'position':[], 'normal':[], 'uv':[], 'fIndex':[], 'pIndex':[], /*'objIndex':[],*/ 'faceBorder':[]}
        for(let i=0; i<this.triangleData.count; i++){
            let p1_id = this.triangleData.pIndex[3*i];
            let p2_id = this.triangleData.pIndex[3*i+1];
            let p3_id = this.triangleData.pIndex[3*i+2];
            this.vertex_data.pIndex.push(p1_id,p2_id,p3_id);

            let p1 = geometricalController.computeCoords(p1_id);
            let p2 = geometricalController.computeCoords(p2_id);
            let p3 = geometricalController.computeCoords(p3_id);

            this.vertex_data.position.push(...p1);
            this.vertex_data.position.push(...p2);
            this.vertex_data.position.push(...p3);
            this.vertex_data.uv.push(0,0,0,0,0,0);


            let faceId = this.triangleData.fIndex[i];
            this.vertex_data.fIndex.push(faceId,faceId,faceId);
            //this.vertex_data.objIndex.push(objId,objId,objId);

            let normal = Utils.normalize(geometricalController.faceData.planeEquation[faceId].slice(0,3));
            this.vertex_data.normal.push(...normal);
            this.vertex_data.normal.push(...normal);
            this.vertex_data.normal.push(...normal);
             
            
            //edge1
            let selected1 = this.isBorder(geometricalController, p2_id, p3_id);
            if(selected1){
                this.vertex_data.faceBorder.push(0);
            }
            else{
                this.vertex_data.faceBorder.push(1);
            }

            //edge2
            let selected2 = this.isBorder(geometricalController, p1_id, p3_id);
            if(selected2){
                this.vertex_data.faceBorder.push(0);
            }
            else{
                this.vertex_data.faceBorder.push(1);
            }

            //edge3
            let selected3 = this.isBorder(geometricalController, p1_id, p2_id);
            if(selected3){
                this.vertex_data.faceBorder.push(0);
            }
            else{
                this.vertex_data.faceBorder.push(1);
            }
        }
        this.vertexData_object.update(this.vertex_data.position, this.vertex_data.normal,
            this.vertex_data.uv, this.vertex_data.fIndex, 
            this.vertex_data.pIndex, objId, this.vertex_data.faceBorder, material);
    }
    computeTriangulation(geometricalController){
        this.triangle_data = {'pIndex':[], 'fIndex':[]};
        for(let i=0; i<geometricalController.faceData.count; i++){
            //////On triangule la face
            let [exterior,interiors] = geometricalController.getFaceBorders(i);
            if(exterior[0]===undefined){
                console.log(i, exterior);
            }
            let exterior_coords = geometricalController.computeBorderCoords(exterior);
            let interiors_coords = [];
            interiors.forEach(interior=>{
                interiors_coords.push(geometricalController.computeBorderCoords(interior));
            });
            let triangulation = this.triangulateFace(exterior_coords, interiors_coords, geometricalController.faceData.planeEquation[i]);
            

            //On remplace la valeur représentant les points (indice dans le tableau positions) par leur indice (attribut de l'objet point3D)
            
            let points = exterior;
            interiors.forEach(interior=>{
                points.push(...interior);
            })
            for (let i=0; i<triangulation.length; i++){
                triangulation[i]=points[triangulation[i]];
            }
            //////On ajoute les données de triangulation dans triangle data
            this.triangle_data.pIndex.push(...triangulation);
            this.triangle_data.fIndex.push(...(new Array(triangulation.length/3).fill(i)));
        }
        this.triangleData = new TriangleData(this.triangle_data.fIndex, this.triangle_data.pIndex);
    }


    isBorder(geometricalController, p1_id,p2_id){
        let he1 = geometricalController.pointData.heIndex[p1_id][0];
        let targetPoint = geometricalController.halfEdgeData.targetPoint(he1);
        let selected1 = false;
        do{
            selected1 = (targetPoint == p2_id);
            he1 = geometricalController.halfEdgeData.opposite(he1);
            he1 = geometricalController.halfEdgeData.next(he1);
            targetPoint = geometricalController.halfEdgeData.targetPoint(he1);
        }while(he1!=geometricalController.pointData.heIndex[p1_id][0] && !selected1);
        return selected1;
    }


    triangulateFace(exterior, interiors, planeEquation){
        let pointsCoordinates = [];
        exterior.forEach(coord=>{
            pointsCoordinates.push(...coord);
        })
        interiors.forEach(interior=>{
            interior.forEach(coord=>{
                pointsCoordinates.push(...coord);
            })
        })
        
        let holes=[];
        let hole_index = exterior.length;
        interiors.forEach(interior=>{
            holes = [hole_index];
            hole_index+=interior.length;
        })

        let triangulation;

        
        if(!planeEquation[2].isZero()){  
            triangulation = Earcut(pointsCoordinates, holes, 3);
        }
        //Si la face est verticale, il faut la rendre horizontale
        else{
            let M = GeomUtils.computeToHorizontalMatrix(planeEquation);
            
            for(let i=0; i<pointsCoordinates.length/3; i++){
                let pt = matrix([[pointsCoordinates[3*i]], [pointsCoordinates[3*i+1]], [pointsCoordinates[3*i+2]],[1]]);
                let h_pt = matrix(M.prod(pt));
                pointsCoordinates[3*i    ] = h_pt(0,0);
                pointsCoordinates[3*i + 1] = h_pt(1,0);
                pointsCoordinates[3*i + 2] = h_pt(2,0);
            }
            triangulation = Earcut(pointsCoordinates, holes, 3);
        }
        return triangulation;
        
    }
    getScene(){
        return this.vertexData_object;
    }
}





class DualBuilder{
    constructor(embedding){
        this._embedding = embedding;
    }
    setEmbedding(embedding){
        this._embedding = embedding;
    }
    build(geometricalController){
        this.point_data = {'coords' : [], 'heIndices' : [], 'nbAdjacentFaces' : []};
        this.face_data = {'hExtIndex': [], 'hIntIndices':[],'planeEquation':[]};
        this.edge_data  = {'heIndex':[]};
        this.halfedge_data = {'nextIndex':[], 'oppositeIndex':[], 'eIndex':[], 'pIndex':[], 'fIndex':[]};
        this.LoD = geometricalController.LoD;
        //console.log("before point data");
        for(let i=0; i<geometricalController.faceData.count; i++){
            this.point_data.coords.push(this._embedding.transform(i, geometricalController));
            let heIndices = [];
            heIndices.push(...geometricalController.faceData.hExtIndex[i]);
            heIndices.push(...geometricalController.faceData.hIntIndices[i]);
            this.point_data.heIndices.push(heIndices);
        }
        //console.log("before half-edge data");
        for(let i=0; i<geometricalController.halfEdgeData.count; i++){
            let f_id = geometricalController.halfEdgeData.vertex(i);
            let p_id = geometricalController.halfEdgeData.fIndex[i];
            let oppositeIndex = geometricalController.halfEdgeData.opposite(i);
            let nextIndex = geometricalController.halfEdgeData.next(oppositeIndex);
            let eIndex = geometricalController.halfEdgeData.eIndex[i];

            this.halfedge_data.nextIndex.push(nextIndex);
            this.halfedge_data.oppositeIndex.push(oppositeIndex);
            this.halfedge_data.eIndex.push(eIndex);
            this.halfedge_data.pIndex.push(p_id);
            this.halfedge_data.fIndex.push(f_id);
        }
        //console.log("before edge data");
        for(let i=0; i<geometricalController.edgeData.count; i++){
            let h_id = geometricalController.edgeData.heIndex[i];
            
            this.edge_data.heIndex.push(h_id);
        }
        //console.log("before face data");
        for(let i=0; i<geometricalController.pointData.count; i++){
            let h_id = geometricalController.pointData.heIndex[i][0];
            this.face_data.hExtIndex.push([h_id]);
            this.face_data.hIntIndices.push([]);
            let [x,y,z] = geometricalController.computeCoords(i);
            this.face_data.planeEquation.push([N(String(x)),N(String(y)),N(String(z)),N(1)]);
        }
        //console.log("before arrity");
        //computes the number of faces adjacent to the points
        for(let i=0; i<this.point_data.heIndices.length; i++){
            let nbFaces = 0;
            this.point_data.heIndices[i].forEach(he_0=>{
                let he = he_0;
                let faces = [];
                let j=0;
                do{
                    j++;
                    faces = Utils.mergeListsWithoutDoubles(faces,[this.halfedge_data.fIndex[he]]);
                    he = this.halfedge_data.oppositeIndex[he];
                    he = this.halfedge_data.nextIndex[he];
                    if(j>100){
                        console.log(i);
                        break;
                    }
                    
                }while(he!=he_0)
                nbFaces+=faces.length;
            })
            
            
            this.point_data.nbAdjacentFaces[i]=nbFaces;
        }

        //console.log("end");

        this.face_data_object = new FaceData(this.face_data.planeEquation, this.face_data.hExtIndex, this.face_data.hIntIndices);
        this.edge_data_object = new EdgeData(this.edge_data.heIndex);
        this.halfedge_data_object = new HalfEdgeData(this.halfedge_data.pIndex, this.halfedge_data.oppositeIndex,
                                                     this.halfedge_data.nextIndex, this.halfedge_data.fIndex, this.halfedge_data.eIndex);
        this.point_data_object = new PointData(this.point_data.coords, this.point_data.heIndices, this.point_data.nbAdjacentFaces);
    }


    /**
     * 
     * @returns A Controller object corresponding to this scene.
     */
    getScene(material, pointsMaterial){
        return (new DualController(this.face_data_object, this.point_data_object, this.halfedge_data_object, this.edge_data_object, this.LoD, material, false, true, pointsMaterial));   
    }

    updateScene(material, controller){
        controller.update(this.face_data_object, this.point_data_object, this.halfedge_data_object, this.edge_data_object, this.LoD, material)
    }
}

export {ModelBuilder, GeometryBuilder,SceneBuilder, DualBuilder, MockModelBuilder, CityJSONModelBuilder}