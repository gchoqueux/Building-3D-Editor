import { Point3D, Polygon, LinearRing, MultiSurface } from "../CityGMLGeometricModel";
import { VertexData, TriangleData } from "../graphicalModels";
import { PointData, FaceData, HalfEdgeData, EdgeData } from "../GeometricalProxy";
import { Building, BuildingPart, ClosureSurface, WallSurface, FloorSurface, OuterFloorSurface, GroundSurface, RoofSurface } from "../CityGMLLogicalModel";
import { Controller, DualController } from "../controllers/controller";
import * as Utils from '../utils/utils';
import matrix from 'matrix-js';
import Earcut from "earcut";
import * as GeomUtils from '../utils/3DGeometricComputes';
import { embeddings } from "../GeometricalEmbedding";


class GeometryBuilder{
    constructor(){
        this.face_data            = {};
        this.point_data           = {};
        this.halfedge_data        = {};
        this.edge_data            = {};
        this.face_data_object     = {};
        this.point_data_object    = {};
        this.GMLModel     = {};
    } 
    build(building, LoD){
        let minPointId = building.minPointId;
        let maxPointId = building.maxPointId;
        let minFaceId = building.minFaceId;
        let maxFaceId = building.maxFaceId;
        let nPts = maxPointId-minPointId+1;
        let nFaces = maxFaceId-minFaceId+1;
        this.face_data        = {'hExtIndex': new Array(nFaces), 'hIntIndices':new Array(nFaces),'planeEquation':new Array(nFaces)};
        this.point_data       = {'heIndex' : new Array(nPts),'nbAdjacentFaces': new Array(nPts), 'coords':new Array(nPts)};
        this.halfedge_data    = {'fIndex':[],'pIndex' : [], 'oppIndex' : [], 'nextIndex' : [], 'eIndex':[]};
        this.edge_data        = {'heIndex':[]}
        this.GMLModel = building;
        this.LoD = LoD;

        //console.log("Build Begin");

        //First we fill the points data coords
        for(let i=minPointId; i<=maxPointId; i++){
            let point3D=Point3D.pointsList[i];
            this.point_data.coords[point3D.id-minPointId]=[point3D.x, point3D.y, point3D.z];
        }

        
        let boundaryThematicSurfaces = building.getBoundary();
        
        
        //console.log("Surface loop");
        boundaryThematicSurfaces.forEach(thematicSurface=>{
            //let type = thematicSurface.getType();
            let boundarySurfaces = thematicSurface.getLoD(LoD).surfaces;

            boundarySurfaces.forEach(polygon=>{

                //this.face_data filling
                //this.face_data.bIndex[polygon.id] = building.id;
                //this.face_data.type[polygon.id]   = type;
                this.face_data.planeEquation[polygon.id-minFaceId] = polygon.planeEquation;

                //Creation of the half edges
                let n_ext_he = polygon.exterior.size;
                let nb_he = this.halfedge_data.pIndex.length;
                this.face_data.hExtIndex[polygon.id-minFaceId] = [nb_he];
                for(let i=0; i<n_ext_he; i++){
                    let point3D = polygon.exterior.positions[i];
                    let origin = point3D.id-minPointId;
                    let next = nb_he + ((i+1)%n_ext_he);
                    this.halfedge_data.pIndex.push(origin);
                    this.halfedge_data.nextIndex.push(next);
                    this.halfedge_data.fIndex.push(polygon.id-minFaceId);
                    this.point_data.heIndex[origin]=[nb_he+i];
                }

                this.face_data.hIntIndices[polygon.id-minFaceId]=[];
                polygon.interiors.forEach(interior=>{
                    let n_int_he = interior.size;
                    let nb_he = this.halfedge_data.pIndex.length;
                    console.log(this.face_data);
                    this.face_data.hIntIndices[polygon.id-minFaceId].push(nb_he);
                    for(let i=0; i<n_int_he; i++){
                        let point3D = interior.positions[i];
                        let origin = point3D.id-minPointId;
                        let next = nb_he + ((i+1)%n_int_he);
                        this.halfedge_data.pIndex.push(origin);
                        this.halfedge_data.nextIndex.push(next);
                        this.halfedge_data.fIndex.push(polygon.id-minFaceId);
                    }
                })

            })
        })

        //On remplit les données opposite edge des half edges
        //console.log("half_edge loop");
        this.halfedge_data.oppIndex = new Array(this.halfedge_data.pIndex.length);

        for(let i=0; i<this.halfedge_data.pIndex.length; i++){
            let origin = this.halfedge_data.pIndex[i];
            let target = this.halfedge_data.pIndex[this.halfedge_data.nextIndex[i]];
            for(let j=0; j<i; j++){
                let origin2 = this.halfedge_data.pIndex[j];
                let target2 = this.halfedge_data.pIndex[this.halfedge_data.nextIndex[j]];
                if(origin2==target && target2==origin){
                    this.halfedge_data.oppIndex[i]=j;
                    this.halfedge_data.oppIndex[j]=i;
                    break;
                }
            }
        }

        //Compute the edge data
        //console.log("Edge loop");
        this.halfedge_data.eIndex = new Array(this.halfedge_data.pIndex.length).fill(-1);
        for(let i=0; i<this.halfedge_data.pIndex.length; i++){
            if(this.halfedge_data.eIndex[i]==-1){
                let opp_id = this.halfedge_data.oppIndex[i];

                this.edge_data.heIndex.push(i);
                let e_id = this.edge_data.heIndex.length-1;

                this.halfedge_data.eIndex[i] = e_id;
                this.halfedge_data.eIndex[opp_id] = e_id;
            }
        }

        //computes the number of faces adjacent to the points
        //console.log("Arrity loop");
        for(let i=0; i<this.point_data.nbAdjacentFaces.length; i++){
            let he_0 = this.point_data.heIndex[i][0];
            let he = he_0;
            //console.log(he);
            let faces = [];
            let j=0;
            do{
                j++;
                faces = Utils.mergeListsWithoutDoubles(faces,[this.halfedge_data.fIndex[he]]);
                if(this.halfedge_data.oppIndex[he]==undefined&&he!=undefined){
                    console.log("opp",he);
                }
                he = this.halfedge_data.oppIndex[he];
                if(this.halfedge_data.nextIndex[he]==undefined&&he!=undefined){
                    console.log("next",he);
                }
                he = this.halfedge_data.nextIndex[he];
                
            }while(he!=he_0 && j<100)
            
            this.point_data.nbAdjacentFaces[i]=faces.length;
        }

        //console.log("face arrity computed");
        

        this.face_data_object     = new FaceData(this.face_data.planeEquation,this.face_data.hExtIndex, this.face_data.hIntIndices);
        this.point_data_object    = new PointData(this.point_data.coords, this.point_data.heIndex, this.point_data.nbAdjacentFaces);
        this.halfedge_data_object = new HalfEdgeData(this.halfedge_data.pIndex, this.halfedge_data.oppIndex, this.halfedge_data.nextIndex, this.halfedge_data.fIndex, this.halfedge_data.eIndex);
        this.edge_data_object     = new EdgeData(this.edge_data.heIndex);
        
    }

    /**
     * 
     * @returns A Controller object corresponding to this scene.
     */
    getScene(material){
        let c = new Controller(this.face_data_object, this.point_data_object, this.halfedge_data_object, this.edge_data_object, this.LoD, material);
        //c.reorientNormals();
        return (c);
    }

}




export {GeometryBuilder}