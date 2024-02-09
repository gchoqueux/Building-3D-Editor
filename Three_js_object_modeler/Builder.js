import { Point3D, Polygon, LinearRing, MultiSurface } from "./CityGMLGeometricModel";
import { VertexData, TriangleData } from "./graphicalModels";
import { PointData, FaceData, HalfEdgeData, EdgeData } from "./GeometricalProxy";
import { Building, BuildingPart, ClosureSurface, WallSurface, FloorSurface, OuterFloorSurface, GroundSurface, RoofSurface } from "./CityGMLLogicalModel";
import { Controller } from "./controller";
import * as Utils from './utils/utils';
import matrix from 'matrix-js';
import Earcut from "earcut";
import * as GeomUtils from './utils/3DGeometricComputes';

class SceneBuilder{
    constructor(){
        this.vertex_data = {};
    }
    build(geometricalController, material){
        this.computeTriangulation(geometricalController);
        this.vertex_data = {'position':[], 'normal':[], 'uv':[], 'fIndex':[], 'pIndex':[]}
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

            let normal = Utils.normalize(geometricalController.faceData.planeEquation[faceId].slice(0,3));
            
            this.vertex_data.normal.push(...normal);
            this.vertex_data.normal.push(...normal);
            this.vertex_data.normal.push(...normal);
            //console.log(faceId,":",p1_id,p2_id,p3_id);
            /*console.log(faceId,":",p1,p2,p3);*/
            //console.log(p1_id, geometricalController.findAdjacentFaces(p1_id));

        }
        //console.log(this.vertex_data.position);

        this.vertexData_object = new VertexData(this.vertex_data.position, this.vertex_data.normal,
                                                this.vertex_data.uv, this.vertex_data.fIndex, 
                                                this.vertex_data.pIndex, material)
    }
    update(geometricalController, material){
        this.computeTriangulation(geometricalController);
        this.vertex_data = {'position':[], 'normal':[], 'uv':[], 'fIndex':[], 'pIndex':[]}
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

            let normal = Utils.normalize(geometricalController.faceData.planeEquation[faceId].slice(0,3));
            this.vertex_data.normal.push(...normal);
            this.vertex_data.normal.push(...normal);
            this.vertex_data.normal.push(...normal);
        }
        this.vertexData_object.update(this.vertex_data.position, this.vertex_data.normal,
            this.vertex_data.uv, this.vertex_data.fIndex, 
            this.vertex_data.pIndex, material);
    }
    computeTriangulation(geometricalController){
        this.triangle_data = {'pIndex':[], 'fIndex':[]};
        for(let i=0; i<geometricalController.faceData.count; i++){
            //////On triangule la face
            let [exterior,interiors] = geometricalController.getFaceBorders(i);
            //console.log(i, exterior);
            let exterior_coords = geometricalController.computeBorderCoords(exterior);
            let interiors_coords = [];
            interiors.forEach(interior=>{
                interiors_coords.push(geometricalController.computeBorderCoords(interior));
            });
            let triangulation = this.triangulateFace(exterior_coords, interiors_coords, geometricalController.faceData.planeEquation[i]);
            //On remplace la valeur représentant les points (indice dans le tableau positions) par leur indice (attribut de l'objet point3D)
            let points = exterior;
            interiors.forEach(interior=>{
                points.push(interior);
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
        
        if(planeEquation[2]!=0){  
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

class GeometryBuilder{
    constructor(){
        this.triangle_data        = {};
        this.face_data            = {};
        this.point_data           = {};
        this.halfedge_data        = {};
        this.edge_data            = {};
        this.triangle_data_object = {};
        this.face_data_object     = {};
        this.point_data_object    = {};
        this.geometricalModel     = {};
    } 
    build(Buildings, LoD){
        let nPts = Point3D.maxId;
        this.face_data        = {'hExtIndex': new Array(Polygon.maxId), 'hIntIndices':new Array(Polygon.maxId),'planeEquation':new Array(Polygon.maxId)};
        this.point_data       = {'heIndex' : new Array(nPts),'nbAdjacentFaces': new Array(nPts), 'coords':new Array(nPts)};
        this.halfedge_data    = {'fIndex':[],'pIndex' : [], 'oppIndex' : [], 'nextIndex' : [], 'eIndex':[]};
        this.edge_data        = {'heIndex':[]}
        this.geometricalModel = Buildings;
        this.LoD = LoD;

        //First we fill the points data coords
        Point3D.pointsList.forEach(point3D=>{
            this.point_data.coords[point3D.id]=[point3D.x, point3D.y, point3D.z];
        })

        
        Buildings.forEach(building=>{
            let boundaryThematicSurfaces = building.getBoundary();
            

            boundaryThematicSurfaces.forEach(thematicSurface=>{
                //let type = thematicSurface.getType();
                let boundarySurfaces = thematicSurface.getLoD(LoD).surfaces;

                boundarySurfaces.forEach(polygon=>{

                    //this.face_data filling
                    //this.face_data.bIndex[polygon.id] = building.id;
                    //this.face_data.type[polygon.id]   = type;
                    this.face_data.planeEquation[polygon.id] = polygon.planeEquation;

                    //Creation of the half edges
                    let n_ext_he = polygon.exterior.size;
                    let nb_he = this.halfedge_data.pIndex.length;
                    this.face_data.hExtIndex[polygon.id] = nb_he;
                    for(let i=0; i<n_ext_he; i++){
                        let point3D = polygon.exterior.positions[i];
                        let origin = point3D.id;
                        let next = nb_he + ((i+1)%n_ext_he);
                        this.halfedge_data.pIndex.push(origin);
                        this.halfedge_data.nextIndex.push(next);
                        this.halfedge_data.fIndex.push(polygon.id);
                        this.point_data.heIndex[origin]=nb_he+i;
                    }

                    this.face_data.hIntIndices[polygon.id]=[];
                    polygon.interiors.forEach(interior=>{
                        let n_int_he = interior.size;
                        let nb_he = this.halfedge_data.pIndex.length;
                        this.face_data.interiors[polygon.id].push(nb_he);
                        for(let i=0; i<n_int_he; i++){
                            let point3D = interior.positions[i];
                            let origin = point3D.id;
                            let next = nb_he + ((i+1)%n_int_he);
                            this.halfedge_data.pIndex.push(origin);
                            this.halfedge_data.nextIndex.push(next);
                        }
                    })

                })
            })
        })

        //On remplit les données opposite edge des half edges

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
        for(let i=0; i<this.point_data.nbAdjacentFaces.length; i++){

            let he_0 = this.point_data.heIndex[i];
            let he = he_0;
            let faces = [];
            do{
                faces = Utils.mergeListsWithoutDoubles(faces,[this.halfedge_data.fIndex[he]]);
                he = this.halfedge_data.oppIndex[he];
                he = this.halfedge_data.nextIndex[he];
                
            }while(he!=he_0)
            
            this.point_data.nbAdjacentFaces[i]=faces.length;
        }

        console.log("face arrity computed");

        

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
        return (new Controller(this.face_data_object, this.point_data_object, this.halfedge_data_object, this.edge_data_object, this.LoD, material));
        
    }

}

class ModelBuilder{
    constructor(){
        this.buildings = [];
    }

    build(buildingJsObject){
        let buildingParts = [];

        
        buildingJsObject.buildingParts.forEach(
            buildingPart=>{
                let bp_points = [];
                let bp_polygons = [];
                buildingPart.points.forEach(
                    p=>{
                        bp_points.push(new Point3D(p[0], p[1], p[2]));
                })

                //Creation of the polygons
                buildingPart.faces.forEach(
                    f=>{
                        let exteriorPointsList = [];
                        f[0].forEach(
                            p_index=>{
                                exteriorPointsList.push(bp_points[p_index]);
                            }
                        )
                        let exterior = new LinearRing(exteriorPointsList);

                        let interiors = [];
                        f[1].forEach(interior=>{
                            let interiorPoints = [];
                            interior.forEach(p_index=>{
                                interiorPoints.push(bp_points[p_index]);
                            })
                            interiors.push(new LinearRing(interiorPoints));
                        })

                        bp_polygons.push(new Polygon(interiors, exterior));
                })

                //On corrige l'orientation des normales si besoin
                /*bp_polygons.forEach(
                    //Pour chaque polygon, on vérifie combien d'autres polygon sa normale 
                    //va croiser
                    polygon=>{
                        let nb_crossed_polygons = 0;
                        bp_polygons.forEach(polygon2=>{
                            if(polygon2.id != polygon.id){
                                let pt = polygon.exterior.positions[0];
                                let t = polygon2.intersectRay([pt.x, pt.y, pt.z], polygon.planeEquation.slice(0,3));
                                if(!isNaN(t) && t>0){
                                    nb_crossed_polygons+=1;
                                }
                            }
                            
                        });
                        if(nb_crossed_polygons%2==1){
                            console.log("invert "+polygon);
                            polygon.invertPlaneEquation();
                        }
                    }
                );*/

                //Pour l'instant, on ne regroupe pas les faces en multi surfaces
                let bp_thematicSurfaces = [];
                bp_polygons.forEach(
                    polygon=>{
                        let multi_polygon = new MultiSurface([polygon]);
                        //Pour l'instant on ne s'occupe pas des LoD
                        bp_thematicSurfaces.push(new WallSurface(multi_polygon, multi_polygon, multi_polygon, multi_polygon));
                    }
                )
                buildingParts.push(new BuildingPart(bp_thematicSurfaces));
            })
            this.buildings.push(new Building(buildingParts));
    }
    getBuildings(){
        return this.buildings;
    }
}

export {ModelBuilder, GeometryBuilder,SceneBuilder}